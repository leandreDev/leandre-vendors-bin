'use strict';

const platforms = require('./bundles.json');

function getPlatform(platform = process.platform, arch = process.arch) {
  const name = `${platform}-${arch}`;
  if (!Object.hasOwn(platforms, name)) {
    throw new Error(`Unsupported platform: ${name}. Supported: ${Object.keys(platforms).join(', ')}.`);
  }
  return { name, ...platforms[name] };
}

module.exports = { getPlatform };
