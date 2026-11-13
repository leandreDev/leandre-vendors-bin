#!/usr/bin/env python3
"""Restore editable platform inputs from the latest published GitHub release."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parent.parent
REPOSITORY = 'leandreDev/leandre-vendors-bin'
PLATFORMS = ('linux-x64', 'darwin-arm64')
METADATA = {'manifest.json', 'THIRD_PARTY_LICENSES.md', 'licenses'}


def digest_file(file):
    with file.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def restore(destination):
    if destination.exists():
        raise ValueError(f'{destination} already exists. Move it to a backup before restoring.')
    release = json.loads(subprocess.check_output(
        ['gh', 'api', f'repos/{REPOSITORY}/releases/latest'], text=True))
    tag = release['tag_name']
    assets = {asset['name']: asset for asset in release['assets']}
    names = [f'{platform}.tar.gz' for platform in PLATFORMS] + ['SHA256SUMS']
    if 'third-party-sources.tar.gz' in assets:
        names.append('third-party-sources.tar.gz')
    for name in names:
        if name not in assets:
            raise ValueError(f'{tag} is missing {name}.')
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.artifact-restore-', dir=destination.parent) as temporary:
        temporary = Path(temporary)
        download = temporary / 'download'
        command = ['gh', 'release', 'download', tag, '--repo', REPOSITORY, '--dir', str(download)]
        for name in names:
            command += ['--pattern', name]
        subprocess.run(command, check=True)
        sums = {}
        for line in (download / 'SHA256SUMS').read_text().splitlines():
            checksum, name = line.split(maxsplit=1)
            sums[name.lstrip('*')] = checksum
        for name in names:
            actual = digest_file(download / name)
            github_digest = assets[name].get('digest')
            if github_digest and github_digest != f'sha256:{actual}':
                raise ValueError(f'GitHub SHA-256 mismatch: {name}')
            if name != 'SHA256SUMS' and sums.get(name) != actual:
                raise ValueError(f'SHA256SUMS mismatch: {name}')
        restored = temporary / 'inputs'
        restored.mkdir()
        for platform in PLATFORMS:
            extracted = temporary / platform
            with tarfile.open(download / f'{platform}.tar.gz') as archive:
                seen = set()
                for member in archive.getmembers():
                    name = PurePosixPath(member.name)
                    if (name.is_absolute() or '..' in name.parts or not name.parts
                            or not (member.isfile() or member.isdir()) or member.name in seen):
                        raise ValueError(f'Unsafe archive entry: {member.name}')
                    seen.add(member.name)
                manifest = json.load(archive.extractfile('manifest.json'))
                for name, expected in manifest.items():
                    data = archive.extractfile(name).read()
                    if hashlib.sha256(data).hexdigest() != expected:
                        raise ValueError(f'Manifest SHA-256 mismatch: {platform}/{name}')
                regular_files = {m.name for m in archive.getmembers() if m.isfile()}
                if regular_files != set(manifest) | {'manifest.json'}:
                    raise ValueError(f'Unexpected files in {platform} archive.')
                archive.extractall(extracted, filter='data')
            platform_inputs = restored / platform
            platform_inputs.mkdir()
            for entry in extracted.iterdir():
                if entry.name not in METADATA:
                    shutil.move(str(entry), platform_inputs / entry.name)
            print(f'{platform}: verified and restored from {tag}.', flush=True)
        # Retain downloadable sources and checksum evidence for the next release.
        cache = ROOT / '.artifacts' / 'restored-releases' / tag
        cache.mkdir(parents=True, exist_ok=True)
        for name in names:
            shutil.copy2(download / name, cache / name)
        restored.rename(destination)
        print(f'Inputs: {destination}\nRelease assets and sources: {cache}', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', type=Path, default=ROOT / 'artifact-src')
    args = parser.parse_args()
    try:
        restore(args.directory.resolve())
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        parser.exit(1, f'Restore failed: {error}\n')
