/* Read the current HTML entry only: dist may also contain stale dev/HMR files. */
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const directory = path.resolve(
  process.argv[2] || path.join(__dirname, '../dist'),
);
const html = fs.readFileSync(path.join(directory, 'index.html'), 'utf8');
const scripts = [
  ...html.matchAll(/<script\b([^>]*?)\bsrc=["']([^"']+)["']([^>]*)>/gi),
];
const entries = scripts.flatMap(([, before, source, after]) => {
  if (/^https?:/i.test(source)) return [];
  const relative = source
    .replaceAll('\\', '/')
    .replace(/^\/+/, '')
    .split(/[?#]/)[0];
  const file = path.resolve(directory, relative);
  if (!file.startsWith(directory + path.sep) || !fs.existsSync(file)) return [];
  const bytes = fs.readFileSync(file);
  const mapFile = `${file}.map`;
  const dependencies = fs.existsSync(mapFile)
    ? [
        ...new Set(
          JSON.parse(fs.readFileSync(mapFile, 'utf8')).sources.flatMap(
            (item) => {
              const match = item
                .replaceAll('\\', '/')
                .match(/(?:^|\/)node_modules\/((?:@[^/]+\/)?[^/]+)/);
              return match ? [match[1]] : [];
            },
          ),
        ),
      ].sort()
    : [];
  return [
    {
      file: relative,
      async: /\b(?:async|defer)\b/.test(`${before} ${after}`),
      bytes: bytes.length,
      gzipBytes: zlib.gzipSync(bytes).length,
      sourceMapDependencies: dependencies,
    },
  ];
});
if (entries.length === 0)
  throw new Error('No local JavaScript entry found in index.html');
const report = {
  directory,
  entries,
  note: 'HTML entry sizes only; lazy route chunks are excluded. Gzip size does not establish server compression.',
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
