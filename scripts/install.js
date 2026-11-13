'use strict';

const { createHash } = require('node:crypto');
const { createReadStream, createWriteStream } = require('node:fs');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pipeline } = require('node:stream/promises');
const { execFileSync } = require('node:child_process');
const { getPlatform } = require('./platform');

const root = path.resolve(__dirname, '..');
const { vendorRelease } = require('../package.json');
const releaseUrl = `https://github.com/leandreDev/leandre-vendors-bin/releases/download/${vendorRelease}`;

async function sha256(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

async function verifyBundle(directory, platform) {
  try {
    const manifestPath = path.join(directory, 'manifest.json');
    if (await sha256(manifestPath) !== platform.manifestSha256) return false;
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    for (const [name, expected] of Object.entries(manifest)) {
      if (await sha256(path.join(directory, name)) !== expected) return false;
    }
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function makeExecutable(directory) {
  for (const name of ['pandoc', 'exiftool', 'perl/bin/perl']) {
    await fs.chmod(path.join(directory, name), 0o755);
  }
}

async function install() {
  const platform = getPlatform();
  const destination = path.join(root, 'bin');
  if (await verifyBundle(destination, platform)) {
    await makeExecutable(destination);
    console.log(`Vendor binaries already installed for ${platform.name}.`);
    return;
  }

  const temporary = await fs.mkdtemp(path.join(root, '.vendor-install-'));
  try {
    const archive = path.join(temporary, 'bundle.tar.gz');
    console.log(`Downloading vendor binaries for ${platform.name}...`);
    const response = await fetch(`${releaseUrl}/${platform.name}.tar.gz`, {
      signal: AbortSignal.timeout(180_000),
    });
    if (!response.ok || !response.body) {
      throw new Error(`Download failed: HTTP ${response.status}.`);
    }
    await pipeline(response.body, createWriteStream(archive));
    if (await sha256(archive) !== platform.archiveSha256) {
      throw new Error('Archive SHA-256 mismatch. Installation aborted.');
    }
    const extracted = path.join(temporary, 'extracted');
    await fs.mkdir(extracted);
    execFileSync('tar', ['-xzf', archive, '-C', extracted], { stdio: 'pipe' });
    if (!await verifyBundle(extracted, platform)) {
      throw new Error('Bundle manifest or file SHA-256 mismatch. Installation aborted.');
    }
    await makeExecutable(extracted);
    await fs.rm(destination, { recursive: true, force: true });
    await fs.rename(extracted, destination);
    console.log(`Installed Pandoc and ExifTool with bundled Perl for ${platform.name}.`);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
}

install().catch((error) => {
  console.error(`[leandre-vendors-bin] ${error.message}`);
  process.exitCode = 1;
});
