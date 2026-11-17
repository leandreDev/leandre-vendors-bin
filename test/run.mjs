import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readdir, rename, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(testDirectory);
const image = 'leandre-vendors-bin-tests';

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} failed (${result.signal ?? result.status})`);
  }
}

let context;
try {
  context = await mkdtemp(path.join(tmpdir(), 'leandre-vendors-bin-tests-'));
  // Pack only the runtime installer, using the package's existing files allowlist.
  run('npm', ['pack', '--ignore-scripts', '--pack-destination', context]);
  const archive = (await readdir(context)).find((name) => name.endsWith('.tgz'));
  if (!archive) throw new Error('npm pack did not produce a package archive');
  await rename(path.join(context, archive), path.join(context, 'vendor.tgz'));
  await cp(testDirectory, path.join(context, 'test'), { recursive: true });

  run('docker', [
    'build', '--file', path.join(context, 'test', 'Dockerfile'),
    '--tag', image, context,
  ]);
  run('docker', ['run', '--rm', '--network', 'none', image]);
} catch (error) {
  console.error(`[binary tests] ${error.message}`);
  process.exitCode = 1;
} finally {
  if (context) await rm(context, { recursive: true, force: true });
}
