# Offline binary tests

ExifTool tests execute the bundled CLI against local PNG, PDF and DOCX files, parse
its JSON output and verify format-specific metadata: image dimensions, PDF
version and page count, and Word application, page and word counts, in addition
to the file type and MIME type. The DOCX test rejects extraction warnings,
including missing ZIP support, rather than accepting generic ZIP metadata.

```text
test/
├── Dockerfile
├── package.json
├── run.mjs
├── resources/
│   ├── img1.png
│   ├── pdf1.pdf
│   └── word1.docx
└── exiftool/
    └── binaire.spec.ts
```

Each tool gets its own directory with `binaire.spec.ts`. Shared fixture files
live in `test/resources/`. The container discovers `test/*/*.spec.ts` automatically. Use
Node's built-in test runner and assertions; no additional test framework is needed.

## Local execution

Requirements: Node.js 22+ and npm on the host, plus a running Docker engine.
From the repository root, run:

```sh
npm test
```

The command performs the complete sequence:

1. Pack the current local module with `npm pack`, using its runtime files allowlist.
2. Build a Debian slim image with Node.js 24. Inside the Docker build, run
   `npm install` on that package. Its postinstall downloads and verifies the fixed
   release selected by `vendorRelease` and `scripts/bundles.json`.
3. Run the specs in a fresh container with `--network none`, using the installed
   module's `node_modules/@leandredev/leandre-vendors-bin/bin/` directory.

No manual bundle extraction, host installation or GitHub Packages registry
credentials are needed: the npm tarball comes from the local checkout. Network
access is required during image preparation for the base image and pinned GitHub
release. Docker may reuse a cached installation when the local package is unchanged.
The tests themselves cannot download tools, sources or fixtures.

The temporary Docker build context contains only the npm tarball and `test/`;
it is removed after execution, including on failure. No host credentials or
binary input directories are copied. The final image contains the installed
module and tests, without the install-stage tarball or npm cache.

Docker selects the matching Linux x64 or ARM64 bundle, including on macOS hosts.
macOS binaries are not exercised by this container. Specs use
`process.env.VENDOR_BIN_DIR` to locate executables. Copy fixtures to a temporary
directory before testing operations that modify files.

## GitHub Actions

The manual **Offline binary tests** workflow calls the same `npm test` command
on Linux x64, including installation inside Docker and the offline test run.
ARM64 and macOS CI coverage remain to be added.
