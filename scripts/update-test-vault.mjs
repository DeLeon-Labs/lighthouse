import { copyFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

const releaseDirectory = path.resolve('dist');
const defaultTargetDirectory =
  '/Users/jon/Library/Mobile Documents/iCloud~md~obsidian/Documents/Test Vault/.obsidian/plugins/simple-drafts-navigator';
const targetDirectory =
  process.env.LIGHTHOUSE_TEST_PLUGIN_DIR || defaultTargetDirectory;
const releaseFiles = ['main.js', 'manifest.json', 'styles.css'];

if (!path.isAbsolute(targetDirectory)) {
  throw new Error('LIGHTHOUSE_TEST_PLUGIN_DIR must be an absolute path.');
}

const actualFiles = (await readdir(releaseDirectory)).sort();
if (JSON.stringify(actualFiles) !== JSON.stringify(releaseFiles)) {
  throw new Error('Run pnpm run build and verify the three-file release output before updating the test vault.');
}

await mkdir(targetDirectory, { recursive: true });

for (const file of releaseFiles) {
  await copyFile(path.join(releaseDirectory, file), path.join(targetDirectory, file));
}

console.log(`Updated test plugin files in ${targetDirectory}. Existing vault state was left untouched.`);
