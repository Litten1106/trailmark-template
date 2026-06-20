/**
 * Validate itinerary.ts structure and report missing fields.
 * Usage: node scripts/validate-itinerary.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const itineraryPath = resolve(root, 'src/data/itinerary.ts');

function parseItinerary(source) {
  const title = source.match(/title:\s*'([^']*)'/)?.[1];
  const startDate = source.match(/startDate:\s*'([^']*)'/)?.[1];
  const endDate = source.match(/endDate:\s*'([^']*)'/)?.[1];

  const pois = [];
  const blocks = source.split(/\n  \{\n    id: '/).slice(1);
  for (const block of blocks) {
    const id = block.match(/^([^']+)'/)?.[1];
    const name = block.match(/name: '([^']*)'/)?.[1];
    const category = block.match(/category: '([^']*)'/)?.[1];
    const hasLocation = /location:\s*\[/.test(block);
    if (id) pois.push({ id, name, category, hasLocation });
  }

  const days = [];
  const dayBlocks = source.split(/\n  \{\n    day: /).slice(1);
  for (const block of dayBlocks) {
    const day = Number(block.match(/^(\d+)/)?.[1]);
    const date = block.match(/date: '([^']*)'/)?.[1];
    const dayTitle = block.match(/title: '([^']*)'/)?.[1];
    const poiIdsRaw = block.match(/poiIds:\s*\[([\s\S]*?)\]/)?.[1] ?? '';
    const poiIds = poiIdsRaw
      .split(',')
      .map((s) => s.trim().replace(/['"]/g, ''))
      .filter(Boolean);
    if (day) days.push({ day, date, title: dayTitle, poiIds });
  }

  return { title, startDate, endDate, pois, days };
}

const source = readFileSync(itineraryPath, 'utf8');
const data = parseItinerary(source);
const errors = [];
const warnings = [];

if (!data.title) errors.push('Missing itinerary.title');
if (!data.startDate) errors.push('Missing itinerary.startDate');
if (!data.endDate) errors.push('Missing itinerary.endDate');
if (data.pois.length === 0) errors.push('No POIs defined');
if (data.days.length === 0) errors.push('No days defined');

const poiIds = new Set(data.pois.map((p) => p.id));
for (const poi of data.pois) {
  if (!poi.name) errors.push(`POI ${poi.id}: missing name`);
  if (!poi.category) warnings.push(`POI ${poi.id}: missing category`);
  if (!poi.hasLocation)
    warnings.push(`POI ${poi.id} (${poi.name}): missing location — hidden on map`);
}

for (const day of data.days) {
  if (!day.date) errors.push(`Day ${day.day}: missing date`);
  if (!day.title) errors.push(`Day ${day.day}: missing title`);
  for (const id of day.poiIds) {
    if (!poiIds.has(id))
      errors.push(`Day ${day.day}: poiIds references unknown id "${id}"`);
  }
}

console.log(`\nTrailmark itinerary validation`);
console.log(`  POIs: ${data.pois.length}  Days: ${data.days.length}`);
console.log(`  Title: ${data.title ?? '(missing)'}`);
console.log(`  Dates: ${data.startDate ?? '?'} → ${data.endDate ?? '?'}\n`);

if (warnings.length) {
  console.log('Warnings:');
  warnings.forEach((w) => console.log(`  ⚠ ${w}`));
  console.log('');
}

if (errors.length) {
  console.log('Errors:');
  errors.forEach((e) => console.log(`  ✗ ${e}`));
  process.exit(1);
}

console.log('✓ Itinerary validation passed');
if (warnings.length) process.exit(0);
