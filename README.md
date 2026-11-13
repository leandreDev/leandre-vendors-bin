# leandre-vendors-bin

Platform-specific third-party tools for Leandre projects, packaged as
`@leandredev/leandre-vendors-bin` (Node.js 22+). No npm dependencies.

## Bundled tools

| Tool | Version | Location inside each bundle |
| --- | --- | --- |
| Pandoc | 3.6.3 | `pandoc` |
| ExifTool | 13.63 | `exiftool` (launcher), `exiftool-runtime/` (application and libraries) |
| Perl | 5.44.0 | `perl/bin/perl` and `perl/lib/5.44.0/` |

ExifTool uses the included portable Perl runtime; system Perl is not required.
The launcher preserves arguments and exit status and resolves its runtime relative
to its own location, including paths containing spaces.

| Bundle | Supported runtime platform |
| --- | --- |
| `linux-x64.tar.gz` | glibc Linux x64: upstream lists Ubuntu 18.04+, Debian 10+, RHEL/Rocky/AlmaLinux 8+, Amazon Linux 2/2023 |
| `linux-arm64.tar.gz` | glibc Linux ARM64: upstream lists Ubuntu 18.04+, Debian 10+, RHEL/Rocky/AlmaLinux 8+, Amazon Linux 2/2023 |
| `darwin-arm64.tar.gz` | macOS 15+ on Apple Silicon |

Alpine/musl, Windows, and macOS Intel are not supported.
See [upstream Perl support](licenses/relocatable-perl/SUPPORT.md).

## Installation

The package is distributed through GitHub Packages.
Binary artifacts are published in [vendors-v1.1.0](https://github.com/leandreDev/leandre-vendors-bin/releases/tag/vendors-v1.1.0).
All three platform archives include Pandoc, ExifTool and a portable Perl runtime.
npm `1.1.0` adds Linux ARM64 and uses `vendors-v1.1.0` with reduced Perl and ExifTool runtimes.
The release also includes licenses, SHA-256 checksums and upstream sources.

Configure the consuming project's `.npmrc`:

```ini
@leandredev:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Install the package:

```sh
npm install @leandredev/leandre-vendors-bin
```

The `postinstall` script detects the OS and architecture, downloads one archive
from `https://github.com/leandreDev/leandre-vendors-bin/releases/download/vendors-v1.1.0/`,
verifies its pinned SHA-256, and extracts it into `bin/` in the installed package.
A pinned manifest verifies every bundled file, including Perl and ExifTool modules.
A complete installation is reused only when every file passes verification.
Installation requires HTTPS access to GitHub and `tar` on PATH.
Unsupported OS/architecture combinations report an explicit error.

If npm 12 blocks install scripts, approve the package and rebuild it in the
consuming project:

```sh
npm install-scripts approve @leandredev/leandre-vendors-bin
npm rebuild @leandredev/leandre-vendors-bin --foreground-scripts
```

This records the approval identity used by your installed dependency, including
local `.tgz` dependencies.
To run the installer explicitly after installation:

```sh
npm explore @leandredev/leandre-vendors-bin -- npm run install:vendors
```

## Installed layout

The package only installs files. It has no JavaScript API and does not modify
project files or the system PATH. All paths are inside the installed npm package:

```text
node_modules/@leandredev/leandre-vendors-bin/bin/
├── pandoc
├── exiftool
├── exiftool-runtime/
├── perl/
├── licenses/
├── THIRD_PARTY_LICENSES.md
└── manifest.json
```

Developers invoke the executables directly:

```sh
./node_modules/@leandredev/leandre-vendors-bin/bin/pandoc --version
./node_modules/@leandredev/leandre-vendors-bin/bin/exiftool -ver
```

The runtime directories must remain next to the ExifTool launcher.

## Reduced ExifTool distribution

The builder retains only `exiftool-runtime/exiftool` and its `lib/` modules and
runtime data, including charsets, languages and `Geolocation.dat`. Standalone
POD files and developer README files are excluded. The HTML documentation, test
fixtures, example configurations/argument/format files, Windows launchers, build
tools and package metadata are not installed. Copyright and license notices
remain under `bin/licenses/`.

Original developer inputs and the complete upstream source release are retained.
The filter accepts both the original `artifact-src/<platform>/exiftool/` layout
and restored `exiftool-runtime/` inputs. Recheck the filter and ExifTool regression
suite when upgrading so that newly introduced runtime data is not omitted.

## Reduced Perl runtime

The builder applies `scripts/perl-runtime.json` through `scripts/perl_runtime.py`
to the Perl files in the platform inputs. It retains the executable, ExifTool's
core module dependencies, available compression/digest/date modules, encoding
implementations, their shared objects and AutoLoader files, and Unicode tables.
It excludes build headers, static libraries, POD manuals, test frameworks and
unrelated core modules. Original inputs are left intact; restored bundles may
already contain the reduced runtime.

The profile is specific to ExifTool 13.63 / Perl 5.44.0. Review it when upgrading
either tool or adding another Perl application. ExifTool modules, formats and
languages are retained. Optional CPAN modules absent from the original runtime
remain absent. Custom ExifTool configurations that load unrelated Perl modules
may need the profile extended. Keep the filter and profile in Git; neither is
included in the npm package.

## Adding or updating a binary

When working through an AI coding agent, start with [AGENTS.md](AGENTS.md). It
contains the project contract, Git/npm exclusions, verification requirements and
release workflow.

Development requirements: Node.js 22+, Python 3.11+, `tar`, and the GitHub CLI
(`gh`) authenticated for this repository. Publishing also requires npm access to
GitHub Packages.

`artifact-src/` is a local working directory, ignored by Git and excluded from the
npm package through the `files` allowlist. Do not commit it. `.artifacts/` and the
installed `bin/` directory are excluded too. Only scripts, package metadata,
checksums, provenance, documentation and license files belong in Git.

### 1. Restore the latest released binaries

From a fresh clone, run:

```sh
npm run restore:artifacts
```

This command selects the latest published, non-prerelease GitHub release, downloads
**all three** platform archives, checks GitHub digests, `SHA256SUMS`, and every file in
the manifests, then recreates:

```text
artifact-src/
├── linux-x64/
│   ├── pandoc
│   ├── exiftool
│   ├── exiftool-runtime/
│   └── perl/
├── linux-arm64/
│   ├── pandoc
│   ├── exiftool
│   ├── exiftool-runtime/
│   └── perl/
└── darwin-arm64/
    ├── pandoc
    ├── exiftool
    ├── exiftool-runtime/
    └── perl/
```

The command restores editable bundle contents, excluding the old generated
manifest and license copies. Current notices are taken from the repository at
build time. Downloaded release files, including upstream sources when available,
are retained under `.artifacts/restored-releases/<release-tag>/`.

Restoration refuses to overwrite an existing `artifact-src/`. Keep your work by
moving that directory to a backup before restoring, or restore to a different path:

```sh
npm run restore:artifacts -- --directory .artifacts/restored-inputs
```

### 2. Add the new executable and its runtime files

Put a compatible version of the tool in **each** platform directory, for example:

```text
artifact-src/linux-x64/new-tool
artifact-src/linux-arm64/new-tool
artifact-src/darwin-arm64/new-tool
```

Preserve the executable permission:

```sh
chmod +x artifact-src/{linux-x64,linux-arm64,darwin-arm64}/new-tool
```

Include any shared libraries, modules or portable runtime the tool requires in
these directories too. Relative launchers must resolve dependencies next to
themselves, as ExifTool does with `exiftool-runtime/` and `perl/`. Do not depend on
a developer machine's Homebrew paths or system installation of the added tool.

The builder includes every file in each platform directory automatically, with
its executable permissions and SHA-256. No public JavaScript API is needed.
It also accepts the original input layout where `exiftool/` contains the upstream
application; restored bundles already use the final launcher/runtime layout.

Update `THIRD_PARTY_LICENSES.md`, add the upstream notices under `licenses/`,
and record the tool version, source URL and download checksum in
`artifact-sources.json`. Keep the source distributions required for the release.
For example, extract the previous source asset into `.artifacts/source-work/`,
add the new tool's source archive, then rebuild the combined source asset:

```sh
mkdir -p .artifacts/source-work
# Replace <release-tag> with the tag printed by restore:artifacts.
tar -xzf .artifacts/restored-releases/<release-tag>/third-party-sources.tar.gz -C .artifacts/source-work
# Add the new upstream source archive to .artifacts/source-work/ here.
cp artifact-sources.json .artifacts/source-work/artifact-sources.json
(cd .artifacts/source-work && shasum -a 256 *.tar.* > SHA256SUMS)
tar -czf .artifacts/third-party-sources.tar.gz -C .artifacts/source-work .
```

### 3. Build a new binary release and bump the npm version

Choose an unused binary release tag and a new npm version. They are independent:
for example, `vendors-v1.1.0` for the bundles and `0.2.0` for the npm package.

```sh
npm run build:artifacts -- --release vendors-v1.1.0
npm version minor --no-git-tag-version
```

The build generates all three platform archives, manifests, license summary and
`SHA256SUMS` in `.artifacts/`. It updates `scripts/bundles.json` with the archive
and manifest hashes and sets `package.json` → `vendorRelease` to the new tag.
The installer uses this fixed tag; installed npm versions never follow `latest`.
The combined source asset is included in `SHA256SUMS` when present.

By default the build reads `artifact-src/`. For a separate restored directory:

```sh
npm run build:artifacts -- --release vendors-v1.1.0 --source-directory .artifacts/restored-inputs
```

Verify execution of the tools on all available target platforms, including the new tool,
then check the npm payload:

```sh
npm pack --dry-run
```

Confirm that `artifact-src/`, `.artifacts/` and `bin/` are absent from the payload.
The npm tarball contains the installer, package metadata and README. License
notices accompany the downloaded binaries under `bin/`; there is no duplicate
license tree at the npm package root and no source archive is installed.

### 4. Publish the binary release, then the npm package

Commit and push the updated package files, scripts, checksums, documentation,
provenance and licenses. Keep `artifact-src/` and `.artifacts/` untracked.
Create the release from that commit, using the tag selected above:

```sh
gh release create vendors-v1.1.0 --repo leandreDev/leandre-vendors-bin \
  --target "$(git rev-parse HEAD)" \
  --title "Vendor binaries v1.1.0" \
  --notes "Add new-tool for Linux x64, Linux ARM64 and macOS ARM64." \
  .artifacts/linux-x64.tar.gz \
  .artifacts/linux-arm64.tar.gz \
  .artifacts/darwin-arm64.tar.gz \
  .artifacts/THIRD_PARTY_LICENSES.md \
  .artifacts/third-party-sources.tar.gz \
  .artifacts/SHA256SUMS

npm publish --registry=https://npm.pkg.github.com
```

Publish the GitHub assets **before** npm, so the new installer's download URLs
already exist. Do not replace assets of an existing release or reuse a published
npm version: previous npm versions depend on their pinned hashes.

Finally, install the new npm version in a separate test project, approve lifecycle
scripts if required, and run the executables directly from its installed `bin/`.
For the next addition, repeat the workflow starting with `npm run restore:artifacts`.

## Licenses

The full license collection and source archives stay in the repository and the
GitHub release source asset. The npm tarball excludes `licenses/` and
`THIRD_PARTY_LICENSES.md`. During installation, the platform bundle supplies the
required text notices once, under `bin/licenses/` and
`bin/THIRD_PARTY_LICENSES.md`. Source archives (`.tar.xz`, `.tar.gz`, etc.) are
excluded from these bundles. libxcrypt notices are installed only on Linux.

See [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) and `licenses/` for notices
and upstream sources. The installer code currently has no granted distribution
license (`UNLICENSED`); third-party software retains its own licenses.
