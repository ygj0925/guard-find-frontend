const fs = require('node:fs');
const path = require('node:path');

const PAGES_DIR = path.resolve(__dirname, '../src/pages');
const OUTPUT_FILE = path.resolve(__dirname, '../src/utils/pageImports.ts');

const SKIP_DIRS = new Set([
  'components',
  'hooks',
  'utils',
  'services',
  'types',
]);

function isPageFile(name) {
  if (name.startsWith('_')) return false;
  if (!/\.(tsx|ts)$/.test(name)) return false;
  const base = name.replace(/\.(tsx|ts)$/, '');
  return base === 'index' || base === '404' || /^[A-Z]/.test(base);
}

function scanPages(dir, prefix = '') {
  const entries = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (item.isDirectory()) {
      if (SKIP_DIRS.has(item.name)) continue;
      const sub = path.join(dir, item.name);
      const subPrefix = prefix ? `${prefix}/${item.name}` : item.name;
      entries.push(...scanPages(sub, subPrefix));
    } else if (item.isFile() && isPageFile(item.name)) {
      const name = item.name.replace(/\.(tsx|ts)$/, '');
      const key = prefix ? `${prefix}/${name}` : name;
      entries.push(key);
    }
  }
  return entries;
}

const pages = scanPages(PAGES_DIR);
pages.sort();

const lines = [
  'const pageMap: Record<string, () => Promise<any>> = {',
  ...pages.map((p) => `  '${p}': () => import('@/pages/${p}'),`),
  '};',
  '',
  'export default pageMap;',
  '',
];

fs.writeFileSync(OUTPUT_FILE, lines.join('\n'), 'utf-8');
console.log(
  `Generated ${pages.length} page entries -> src/utils/pageImports.ts`,
);
