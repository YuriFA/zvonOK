import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'),
) as { version: string; name: string };

export const VERSION: string = pkg.version;
export const APP_NAME: string = pkg.name;
