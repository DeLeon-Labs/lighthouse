import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const assets = [
  ['manifest.json', 'manifest.json'],
  ['src/styles.css', 'styles.css'],
];

await mkdir('dist', { recursive: true });

for (const [source, destination] of assets) {
  await copyFile(source, path.join('dist', destination));
}
