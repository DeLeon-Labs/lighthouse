import { copyFile, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';

const releaseDirectory = path.resolve('dist');
const defaultTargetDirectory =
  '/Users/jon/Library/Mobile Documents/iCloud~md~obsidian/Documents/TestVault/.obsidian/plugins/lighthouse';
const targetDirectory =
  process.env.LIGHTHOUSE_TEST_PLUGIN_DIR || defaultTargetDirectory;
const releaseFiles = ['main.js', 'manifest.json', 'styles.css'];
const optionalDevelopmentFiles = ['build-info.json'];

if (!path.isAbsolute(targetDirectory)) {
  throw new Error('LIGHTHOUSE_TEST_PLUGIN_DIR must be an absolute path.');
}

const actualFiles = (await readdir(releaseDirectory)).sort();
const allowedFiles = [...releaseFiles, ...optionalDevelopmentFiles].sort();
const unexpectedFiles = actualFiles.filter((file) => !allowedFiles.includes(file));
const missingReleaseFiles = releaseFiles.filter((file) => !actualFiles.includes(file));

if (missingReleaseFiles.length || unexpectedFiles.length) {
  throw new Error(
    `Run pnpm run build:dev or pnpm run build before updating the test vault. Missing: ${missingReleaseFiles.join(', ') || 'none'}. Unexpected: ${unexpectedFiles.join(', ') || 'none'}.`,
  );
}

await mkdir(targetDirectory, { recursive: true });

for (const file of actualFiles) {
  await copyFile(path.join(releaseDirectory, file), path.join(targetDirectory, file));
}

for (const file of optionalDevelopmentFiles) {
  if (!actualFiles.includes(file)) {
    await rm(path.join(targetDirectory, file), { force: true });
  }
}

console.log(`Updated test plugin files in ${targetDirectory}. Existing vault state was left untouched.`);
