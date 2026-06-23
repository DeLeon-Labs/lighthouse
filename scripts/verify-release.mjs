import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const releaseDirectory = 'dist';
const expectedFiles = ['main.js', 'manifest.json', 'styles.css'];
const entries = await readdir(releaseDirectory, { withFileTypes: true });
const actualFiles = entries.map((entry) => entry.name).sort();

if (entries.some((entry) => !entry.isFile())) {
  throw new Error('Release output must contain files only.');
}

if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
  throw new Error(
    `Release output must contain exactly ${expectedFiles.join(', ')}; found ${actualFiles.join(', ') || 'nothing'}.`,
  );
}

for (const file of expectedFiles) {
  const info = await stat(path.join(releaseDirectory, file));
  if (info.size === 0) {
    throw new Error(`Release file is empty: ${file}`);
  }
}

console.log(`Verified release output: ${expectedFiles.join(', ')}`);
