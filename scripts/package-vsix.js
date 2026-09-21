const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const packageJson = require(path.join(root, 'package.json'));
const release = process.argv.includes('--release');

function localTimestamp(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join('');
}

const baseVersion = String(packageJson.version).split('-')[0];
const version = release ? baseVersion : `${baseVersion}-test-${localTimestamp(new Date())}`;
const releaseDir = path.join(root, 'release');
const output = path.join(releaseDir, `poly-lingo-${version}.vsix`);
const executable = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'vsce.cmd' : 'vsce');

fs.mkdirSync(releaseDir, { recursive: true });
console.log(`Packaging PolyLingo ${version}${release ? ' (release)' : ' (local test)'}...`);

const result = spawnSync(executable, [
  'package',
  version,
  '--no-update-package-json',
  '--allow-missing-repository',
  '--out',
  output
], {
  cwd: root,
  stdio: 'inherit'
});

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
console.log(`Created ${path.relative(root, output)}`);
