import { readFileSync, writeFileSync } from 'node:fs';

const version = process.argv[2];

if (!version) {
  console.error('Usage: node sync-version.mjs <version>');
  process.exit(1);
}

const files = ['apps/client/package.json', 'apps/server/package.json'];

for (const file of files) {
  const pkg = JSON.parse(readFileSync(file, 'utf-8'));
  pkg.version = version;
  writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`  Updated ${file} → v${version}`);
}
