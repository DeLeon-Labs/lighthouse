import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const assets = [
  ['src/styles.css', 'styles.css'],
];

await mkdir('dist', { recursive: true });

await writeStampedManifest();

for (const [source, destination] of assets) {
  await copyFile(source, path.join('dist', destination));
}

async function writeStampedManifest() {
  const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
  const stamp = getBuildStamp();

  if (stamp) {
    manifest.description = `${manifest.description} Test build: ${stamp}.`;
  }

  await writeFile(path.join('dist', 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

function getBuildStamp() {
  const branch = getGitOutput(['branch', '--show-current']);
  const commit = getGitOutput(['rev-parse', '--short', 'HEAD']);
  const dirty = getGitOutput(['status', '--porcelain']) ? ' dirty' : '';

  if (!branch && !commit) return '';
  if (branch && commit) return `${branch} @ ${commit}${dirty}`;
  return `${branch || commit}${dirty}`;
}

function getGitOutput(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch (error) {
    return '';
  }
}
