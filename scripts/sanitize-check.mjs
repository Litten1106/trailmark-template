/**
 * Scan template for leaked secrets or personal markers before publishing.
 * Usage: node scripts/sanitize-check.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.vercel',
  '.idea',
]);

const SECRET_PATTERNS = [
  /pk\.[a-zA-Z0-9]{20,}/,
  /sk_[a-zA-Z0-9]{20,}/,
  /cli_[a-zA-Z0-9]{10,}/,
  /FEISHU_APP_SECRET\s*=\s*[^$\s{]/,
  /PUBLIC_MAPBOX_ACCESS_TOKEN\s*=\s*pk\./,
];

const PERSONAL_PATTERNS = [
  /Spítalastígur/i,
  /Litten/i,
  /xhslink\.com/i,
  /my\.feishu\.cn\/wiki\/[A-Za-z0-9]{10,}/,
  /白日梦想家/,
  /冰岛环岛/,
];

const ALLOWED_FILES = new Set([
  'sanitize-check.mjs',
  'feishu-mcp.md',
]);

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

const hits = [];
for (const file of walk(root)) {
  const rel = file.slice(root.length + 1);
  if (!/\.(ts|tsx|js|mjs|json|md|example|css)$/.test(rel)) continue;
  const base = rel.split('/').pop() ?? '';
  const text = readFileSync(file, 'utf8');
  for (const re of SECRET_PATTERNS) {
    if (re.test(text) && !ALLOWED_FILES.has(base)) {
      hits.push({ rel, kind: 'secret', pattern: re.source });
    }
  }
  for (const re of PERSONAL_PATTERNS) {
    if (re.test(text) && !ALLOWED_FILES.has(base)) {
      hits.push({ rel, kind: 'personal', pattern: re.source });
    }
  }
}

if (hits.length === 0) {
  console.log('✓ sanitize-check passed — no secret or personal markers found');
  process.exit(0);
}

console.error('✗ sanitize-check failed:\n');
for (const h of hits) {
  console.error(`  [${h.kind}] ${h.rel} — /${h.pattern}/`);
}
process.exit(1);
