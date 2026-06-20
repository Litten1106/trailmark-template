/**
 * Geocode POIs via Mapbox using googleQuery in itinerary.ts.
 * Usage: node scripts/geocode-pois.mjs [--country=JP]
 * Requires PUBLIC_MAPBOX_ACCESS_TOKEN in .env.local
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const itineraryPath = resolve(root, 'src/data/itinerary.ts');

const countryArg = process.argv.find((a) => a.startsWith('--country='));
const country = countryArg?.split('=')[1] ?? '';

function loadToken() {
  try {
    const env = readFileSync(resolve(root, '.env.local'), 'utf8');
    const m = env.match(/PUBLIC_MAPBOX_ACCESS_TOKEN=(.+)/);
    if (m) return m[1].trim();
  } catch {
    /* ignore */
  }
  return process.env.PUBLIC_MAPBOX_ACCESS_TOKEN;
}

function parsePois(source) {
  const pois = [];
  const blocks = source.split(/\n  \{\n    id: '/).slice(1);
  for (const block of blocks) {
    const id = block.match(/^([^']+)'/)?.[1];
    const googleQuery = block.match(/googleQuery: '([^']*)'/)?.[1];
    const notes = block.match(/notes: '([\s\S]*?)',?\n/)?.[1];
    if (!id) continue;
    pois.push({ id, googleQuery, notes });
  }
  return pois;
}

function gpsFromNotes(notes) {
  if (!notes) return null;
  const m = notes.match(/GPS[：:]\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/i);
  if (m) return [Number(m[2]), Number(m[1])];
  return null;
}

async function geocode(query, token) {
  const countryParam = country ? `&country=${country}` : '';
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
    `?access_token=${token}&limit=1${countryParam}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const c = json.features?.[0]?.center;
  return c ? [c[0], c[1]] : null;
}

async function main() {
  const token = loadToken();
  if (!token) {
    console.error('Missing PUBLIC_MAPBOX_ACCESS_TOKEN in .env.local');
    process.exit(1);
  }

  let source = readFileSync(itineraryPath, 'utf8');
  const pois = parsePois(source);
  const coords = {};

  for (const poi of pois) {
    let loc = gpsFromNotes(poi.notes);
    if (!loc && poi.googleQuery) {
      loc = await geocode(poi.googleQuery, token);
      await new Promise((r) => setTimeout(r, 120));
    }
    if (loc) {
      coords[poi.id] = loc;
      console.log(`✓ ${poi.id}: [${loc[0]}, ${loc[1]}]`);
    } else {
      console.warn(`✗ ${poi.id}: no coordinates`);
    }
  }

  for (const [id, [lng, lat]] of Object.entries(coords)) {
    const idLine = `id: '${id}'`;
    const idx = source.indexOf(idLine);
    if (idx === -1) continue;

    const blockStart = source.lastIndexOf('  {', idx);
    const blockEnd = source.indexOf('\n  },', idx);
    const block = source.slice(blockStart, blockEnd);

    if (block.includes('location:')) {
      source =
        source.slice(0, blockStart) +
        block.replace(
          /location: \[[^\]]+\],?\n/,
          `location: [${lng}, ${lat}],\n    coordsConfidence: 'high',\n`,
        ) +
        source.slice(blockEnd);
    } else {
      const insertAfter = block.match(/category: '[^']+',?\n/)?.[0];
      if (insertAfter) {
        const pos =
          blockStart + block.indexOf(insertAfter) + insertAfter.length;
        const injection = `    location: [${lng}, ${lat}],\n    coordsConfidence: 'high',\n`;
        source = source.slice(0, pos) + injection + source.slice(pos);
      }
    }
  }

  writeFileSync(itineraryPath, source);
  console.log(`\nUpdated ${Object.keys(coords).length} POIs in itinerary.ts`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
