/**
 * Parse Google Maps URLs / lat,lng from exported itinerary Markdown and patch itinerary.ts.
 *
 * Usage:
 *   node scripts/apply-source-coords.mjs path/to/source-export.md
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const itineraryPath = resolve(root, 'src/data/itinerary.ts');

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node scripts/apply-source-coords.mjs <export.md>');
  process.exit(1);
}

const text = readFileSync(resolve(root, inputPath), 'utf8');
let source = readFileSync(itineraryPath, 'utf8');

function extractCoords(line) {
  const patterns = [
    /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/,
    /q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /(-?\d{2,3}\.\d{4,})\s*[,，]\s*(-?\d{2,3}\.\d{4,})/,
  ];
  for (const re of patterns) {
    const m = line.match(re);
    if (m) return [Number(m[2] ?? m[4]), Number(m[1] ?? m[3])];
  }
  return null;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

function findPoiId(line) {
  const idMatches = [...source.matchAll(/id: '([^']+)'/g)].map((m) => m[1]);
  for (const id of idMatches) {
    const nameRe = new RegExp(
      `id: '${id}'[\\s\\S]*?name: '([^']*)'`,
    );
    const name = source.match(nameRe)?.[1];
    const nameEn = source.match(
      new RegExp(`id: '${id}'[\\s\\S]*?nameEn: '([^']*)'`),
    )?.[1];
    const googleQuery = source.match(
      new RegExp(`id: '${id}'[\\s\\S]*?googleQuery: '([^']*)'`),
    )?.[1];
    for (const frag of [name, nameEn, googleQuery, id].filter(Boolean)) {
      if (line.toLowerCase().includes(frag.toLowerCase())) return id;
    }
  }
  const heading = line.match(/^#+\s*(.+)/)?.[1];
  if (heading) {
    const slug = slugify(heading);
    const hit = idMatches.find((id) => id.includes(slug) || slug.includes(id));
    if (hit) return hit;
  }
  return null;
}

function patchPoi(id, coord) {
  const [lng, lat] = coord;
  const idLine = `id: '${id}'`;
  const idx = source.indexOf(idLine);
  if (idx === -1) return false;

  const blockStart = source.lastIndexOf('  {', idx);
  const blockEnd = source.indexOf('\n  },', idx);
  let block = source.slice(blockStart, blockEnd);

  if (block.includes('location:')) {
    block = block.replace(
      /location: \[[^\]]+\],?\n/,
      `location: [${lng}, ${lat}],\n`,
    );
  } else {
    const m = block.match(/category: '[^']+',?\n/);
    if (m) {
      const pos = block.indexOf(m[0]) + m[0].length;
      block =
        block.slice(0, pos) +
        `    location: [${lng}, ${lat}],\n    coordsConfidence: 'high',\n` +
        block.slice(pos);
    }
  }

  source = source.slice(0, blockStart) + block + source.slice(blockEnd);
  return true;
}

let patched = 0;
for (const line of text.split('\n')) {
  const coord = extractCoords(line);
  if (!coord) continue;
  const id = findPoiId(line);
  if (!id) {
    console.warn(`No POI match for line: ${line.slice(0, 60)}`);
    continue;
  }
  if (patchPoi(id, coord)) {
    patched++;
    console.log(`✓ ${id}`);
  }
}

if (patched === 0) {
  console.error('No coordinates applied. Include Google Maps links or lat,lng pairs.');
  process.exit(1);
}

writeFileSync(itineraryPath, source);
console.log(`\nPatched ${patched} POI(s).`);
