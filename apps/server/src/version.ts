import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pkg = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'),
) as { version: string; name: string };

export const VERSION: string = pkg.version;
export const APP_NAME: string = pkg.name;
