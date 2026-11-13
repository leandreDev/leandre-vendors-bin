#!/usr/bin/env python3
"""Build both release bundles from artifact-src and update their pinned hashes."""
from pathlib import Path
import argparse
import gzip
import hashlib
import io
import json
import tarfile
from perl_runtime import keep_perl_file

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / '.artifacts'
SOURCE = ROOT / 'artifact-src'
PLATFORMS = ('linux-x64', 'darwin-arm64')
SOURCE_ARCHIVE_SUFFIXES = ('.tar.gz', '.tar.xz', '.tar.bz2', '.tar.zst', '.tgz', '.zip', '.7z')
LAUNCHER = b'''#!/bin/sh
set -eu
bundle_dir=$(CDPATH= cd -- "${0%/*}" && pwd)
# Ignore external Perl paths/options: use the bundled runtime and modules.
unset PERL5LIB PERLLIB PERL5OPT PERL_LOCAL_LIB_ROOT PERL_MB_OPT PERL_MM_OPT
exec "$bundle_dir/perl/bin/perl" "$bundle_dir/exiftool-runtime/exiftool" "$@"
'''


def digest(data):
    return hashlib.sha256(data).hexdigest()



def keep_exiftool_file(relative):
    """Keep the application and its full module/data tree, without developer files."""
    if relative.parts[0] != 'exiftool-runtime':
        return True
    if relative.as_posix() == 'exiftool-runtime/exiftool':
        return True
    return (len(relative.parts) > 2 and relative.parts[1] == 'lib'
            and relative.suffix != '.pod' and relative.name != 'README')


def build(platform):
    source = SOURCE / platform
    if not source.is_dir():
        raise ValueError(f'Missing {source}. Run npm run restore:artifacts first.')
    files = {}
    # Accept the initial input layout as well as restored release bundles.
    legacy_exiftool = (source / 'exiftool').is_dir()
    if legacy_exiftool:
        files['exiftool'] = (LAUNCHER, 0o755)
    for file in sorted(source.rglob('*')):
        if file.is_file():
            relative = file.relative_to(source)
            if not keep_perl_file(relative):
                continue
            if relative.parts[0] in ('licenses', 'manifest.json', 'THIRD_PARTY_LICENSES.md'):
                continue
            if legacy_exiftool and relative.parts[0] == 'exiftool':
                relative = Path('exiftool-runtime', *relative.parts[1:])
            if not keep_exiftool_file(relative):
                continue
            files[relative.as_posix()] = (file.read_bytes(), 0o755 if file.stat().st_mode & 0o111 else 0o644)
    for required in ('pandoc', 'exiftool', 'perl/bin/perl', 'exiftool-runtime/exiftool'):
        if required not in files:
            raise ValueError(f'Missing required input: {source}/{required}')
    for file in sorted((ROOT / 'licenses').rglob('*')):
        if file.is_file() and not file.name.endswith(SOURCE_ARCHIVE_SUFFIXES):
            if platform != 'linux-x64' and file.relative_to(ROOT / 'licenses').parts[0] == 'libxcrypt':
                continue
            files[file.relative_to(ROOT).as_posix()] = (file.read_bytes(), 0o644)
    files['THIRD_PARTY_LICENSES.md'] = ((ROOT / 'THIRD_PARTY_LICENSES.md').read_bytes(), 0o644)
    manifest = (json.dumps({name: digest(data) for name, (data, _) in sorted(files.items())}, indent=2) + '\n').encode()
    files['manifest.json'] = (manifest, 0o644)
    archive = OUT / f'{platform}.tar.gz'
    with archive.open('wb') as raw, gzip.GzipFile(filename='', fileobj=raw, mode='wb', mtime=0) as gz:
        with tarfile.open(fileobj=gz, mode='w') as tar:
            for name, (data, mode) in sorted(files.items()):
                info = tarfile.TarInfo(name)
                info.size, info.mode, info.mtime = len(data), mode, 0
                tar.addfile(info, io.BytesIO(data))
    print(f'{archive.name}: {archive.stat().st_size:,} bytes; {len(files)} files')
    return {'archiveSha256': digest(archive.read_bytes()), 'manifestSha256': digest(manifest)}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--release', help='New GitHub release tag to pin in package.json')
    parser.add_argument('--source-directory', type=Path, default=ROOT / 'artifact-src')
    args = parser.parse_args()
    if args.release and (not args.release.startswith('vendors-v')
                         or any(c not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-' for c in args.release)):
        parser.error('Use a release tag such as vendors-v1.1.0')
    SOURCE = args.source_directory.resolve()
    OUT.mkdir(exist_ok=True)
    config = {platform: build(platform) for platform in PLATFORMS}
    (ROOT / 'scripts/bundles.json').write_text(json.dumps(config, indent=2) + '\n')
    if args.release:
        package_file = ROOT / 'package.json'
        package = json.loads(package_file.read_text())
        package['vendorRelease'] = args.release
        package_file.write_text(json.dumps(package, indent=2) + '\n')
    (OUT / 'THIRD_PARTY_LICENSES.md').write_bytes((ROOT / 'THIRD_PARTY_LICENSES.md').read_bytes())
    checksum_files = ['linux-x64.tar.gz', 'darwin-arm64.tar.gz', 'THIRD_PARTY_LICENSES.md']
    if (OUT / 'third-party-sources.tar.gz').exists():
        checksum_files.append('third-party-sources.tar.gz')
    (OUT / 'SHA256SUMS').write_text(''.join(
        f'{digest((OUT / name).read_bytes())}  {name}\n'
        for name in checksum_files
    ))
