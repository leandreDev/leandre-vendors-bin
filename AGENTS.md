# Agent instructions

## Project contract

This repository maintains `@leandredev/leandre-vendors-bin`, published to GitHub
Packages. Its only runtime job is to detect the platform, download a fixed GitHub
release archive, verify its integrity, and install its contents into the package's
`bin/` directory. Do not add a JavaScript API or `getBinaryPath` methods.

Supported bundles are `linux-x64` and `darwin-arm64`. Preserve existing tools and
their runtime files when adding another tool. ExifTool must use bundled Perl;
added tools must not rely on a developer's Homebrew installation or absolute
machine-specific paths. Keep the documented platform requirements accurate.

Read README.md for the complete maintenance and publication workflow. Inspect
package.json and git status before changing files. Preserve unrelated work.

## Local files and Git boundaries

- `artifact-src/`: editable binaries and runtime files; never track in Git or npm.
- `.artifacts/`: downloaded releases, source archives and build outputs; never
  track in Git or npm.
- `bin/`: installed binaries; never track in Git or include in the npm tarball.
- Keep the package.json `files` allowlist limited to runtime installer files.
  License collections and source archives remain in the repository; required
  text notices accompany the binary bundles once under bin/, without duplicate
  notices at the npm package root. Never put source archives in installed bundles.
  Keep source distributions in the separate GitHub source asset; retain per-file
  libxcrypt notices in the Linux bundle. Maintenance scripts and this file belong
  in the repository only.
- Commit scripts, generated pinned hashes, package metadata, documentation,
  provenance and required license notices. Never commit registry credentials.

## Adding or updating a tool

1. Requirements: Node.js 22+, Python 3.11+, tar, and an authenticated GitHub CLI.
   From a fresh checkout, run `npm run restore:artifacts`. It restores BOTH
   platforms from the latest published GitHub release and verifies the archives
   and their file manifests.
2. If artifact-src/ already exists, inspect and preserve it. Restoration must not
   overwrite local changes. Restore separately when needed:
   `npm run restore:artifacts -- --directory .artifacts/restored-inputs`.
   Downloaded assets and upstream sources are cached under
   `.artifacts/restored-releases/<release-tag>/`.
3. Perl files are filtered at build time by scripts/perl_runtime.py and
   scripts/perl-runtime.json. Review this ExifTool-specific profile when updating
   Perl/ExifTool or adding another tool that uses Perl. Retain runtime modules,
   shared objects, compression/encoding support and Unicode data. Compare the
   upstream ExifTool regression suite with the original runtime after changes.
   ExifTool inputs are also filtered by keep_exiftool_file in the builder: keep
   its application and lib/ modules/runtime data, including Geolocation.dat; omit
   documentation, tests, examples and build tooling. Keep license notices in the
   central bundle notice tree. Run upstream tests against the packaged modules.
   Never delete the original input tree just to reduce a release bundle.
4. Add the executable and required runtime files under EACH platform directory.
   Preserve executable permissions. The builder includes new files automatically;
   do not create an npm API to expose them. Keep launchers relative to their own
   location and support paths containing spaces.
5. Update THIRD_PARTY_LICENSES.md, licenses/, and artifact-sources.json with the
   exact version, source URL, checksum and copyright/license notices. Update the
   combined `.artifacts/third-party-sources.tar.gz` and its internal checksums as
   documented in README.md; retain sources for tools still present.
6. For a new binary release, choose an unused tag and run:
   `npm run build:artifacts -- --release vendors-vX.Y.Z`.
   Use `--source-directory .artifacts/restored-inputs` for separately restored
   inputs. The build generates both archives and SHA256SUMS, updates
   scripts/bundles.json, and sets package.json vendorRelease.
7. For a new npm publication, bump package.json and package-lock.json together,
   for example with `npm version minor --no-git-tag-version`. Choose the version
   increment appropriate to the change; README versions are examples, not fixed
   release targets.

## Verification

- Verify archive SHA-256 values, pinned manifest hashes and manifest entries.
- Verify new executables, runtime files and executable permissions in BOTH
  archives. Confirm existing tools remain present.
- Run the affected tools on each target platform available to you. Clearly report
  any platform that was only inspected and not executed; do not claim Linux
  execution from a macOS check.
- Run `npm pack --dry-run` and confirm artifact-src/, .artifacts/, bin/, and
  maintenance scripts are absent. Run `git diff --check` and confirm no binary
  input or generated output was added to Git.
- For an authorized publication, install the published version in a separate
  project and execute the tools from its node_modules package bin/ directory.
  If npm blocks postinstall, approve this dependency in that test project with
  `npm install-scripts approve @leandredev/leandre-vendors-bin`, then run
  `npm rebuild @leandredev/leandre-vendors-bin --foreground-scripts`.

## Publication

Publish when requested by the task. Documentation or local preparation alone does
not request publication. Existing user authorization remains valid; do not ask
again for an already authorized publication.

Publish the binary assets to GitHub BEFORE publishing the npm package. Follow the
README commands, using the newly selected tag and a pushed source commit. Include
both platform archives, notices, SHA256SUMS and updated upstream sources.

The npm installer must remain pinned to package.json vendorRelease and the hashes
in scripts/bundles.json. Never use latest for runtime installation, replace assets
of an existing release, or reuse a published npm version. The restore command alone
selects the latest release to prepare the next developer workspace.

Publish npm to `https://npm.pkg.github.com`. Report published versions, validation
results and any remaining work separately; never imply local files were committed,
pushed or published unless those actions actually completed.
