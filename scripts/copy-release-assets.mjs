import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const assets = [
  ['src/styles.css', 'styles.css'],
];
const shouldWriteBuildInfo = process.env.LIGHTHOUSE_BUILD_INFO === '1';

await mkdir('dist', { recursive: true });

await copyFile('manifest.json', path.join('dist', 'manifest.json'));

for (const [source, destination] of assets) {
  await copyFile(source, path.join('dist', destination));
}

if (shouldWriteBuildInfo) {
  await writeBuildInfo();
}

async function writeBuildInfo() {
  const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
  const buildInfo = {
    version: manifest.version || '',
    branch: getGitOutput(['branch', '--show-current']),
    commit: getGitOutput(['rev-parse', 'HEAD']),
    buildTimestamp: new Date().toISOString(),
    dirty: getGitOutput(['status', '--porcelain']) !== '',
    brokerUrl: process.env.LIGHTHOUSE_BROKER_URL || ''
  };

  await writeFile(path.join('dist', 'build-info.json'), `${JSON.stringify(buildInfo, null, 2)}\n`);
}

function getGitOutput(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch (error) {
    return '';
  }
}
