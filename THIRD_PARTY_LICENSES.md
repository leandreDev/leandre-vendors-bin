# Third-party licenses

## Pandoc 3.6.3

- Binary: `pandoc`, distributed in `linux-x64.tar.gz`, `linux-arm64.tar.gz` and `darwin-arm64.tar.gz`.
- Copyright (C) 2006-2024 John MacFarlane and the contributors listed in the upstream notices.
- License: GNU General Public License, version 2 or later (`GPL-2.0-or-later`), with the component notices and exceptions documented in `licenses/pandoc/COPYRIGHT`.
- Project: https://pandoc.org
- Upstream release: https://github.com/jgm/pandoc/releases/tag/3.6.3
- Source code: https://github.com/jgm/pandoc/tree/3.6.3
- Source archive: https://github.com/jgm/pandoc/archive/refs/tags/3.6.3.tar.gz
- Linux upstream binary package: https://github.com/jgm/pandoc/releases/download/3.6.3/pandoc-3.6.3-linux-amd64.tar.gz
- Linux ARM64 upstream binary package: https://github.com/jgm/pandoc/releases/download/3.6.3/pandoc-3.6.3-linux-arm64.tar.gz
- macOS upstream binary package: https://github.com/jgm/pandoc/releases/download/3.6.3/pandoc-3.6.3-arm64-macOS.zip

The complete upstream copyright notices and GPL text are included in
`licenses/pandoc/COPYRIGHT` and `licenses/pandoc/COPYING.md` in each platform
archive. These notices apply to the bundled third-party software independently
of the license of the future npm installer.

Linux x64, Linux ARM64 and macOS Apple Silicon binaries are provided in this release.
Windows and macOS Intel binaries are not included.

## ExifTool 13.63

- Copyright 2003-2026, Phil Harvey.
- Distributed under the same terms as Perl: the Perl Artistic License or GPL,
  as stated in the upstream README. The upstream repository also includes a
  GPLv3 license text, retained without modification.
- Project: https://exiftool.org
- Exact source: https://github.com/exiftool/exiftool/tree/1da714924f67763b6a8a7013dd2aa1983a16f87b
- Notices: `licenses/exiftool/README`, `licenses/exiftool/LICENSE`, and
  `licenses/perl/Artistic`.
- The ExifTool application, complete module tree and runtime data (including the
  geolocation database) are included under `exiftool-runtime/`. Documentation,
  tests, examples and build scripts are omitted; retained application/module/data
  bytes are unchanged. Complete upstream sources remain in the GitHub release
  asset `third-party-sources.tar.gz`. The custom `exiftool` shell launcher invokes
  the bundled Perl runtime.

## Perl 5.44.0 / relocatable-perl 5.44.0.0

- Perl copyright 1993-2026 Larry Wall and others; see `licenses/perl/README`.
- Perl license: Perl Artistic License or GPL (version 1 or later); full texts
  are in `licenses/perl/Artistic` and `licenses/perl/Copying`.
- Perl source: https://github.com/Perl/perl5/tree/v5.44.0
- Portable runtime distribution: https://github.com/skaji/relocatable-perl/releases/tag/5.44.0.0
- Relocation build scripts copyright Shoichi Kaji, licensed under the same terms
  as Perl; see `licenses/relocatable-perl/LICENSE`.
- Build scripts and patches: https://github.com/skaji/relocatable-perl/tree/5.44.0.0
- The original Perl executable and selected runtime modules, shared objects and
  Unicode data are bundled under `perl/`. The selection is defined in the source
  repository’s `scripts/perl-runtime.json`; executable and retained library bytes
  are unchanged. Development headers, static archives, POD manuals, test frameworks,
  unrelated modules, package-manager executables and `site_perl` are omitted.
  App::cpanminus and App::ChangeShebang are not redistributed.
- Runtime platform support is documented in `licenses/relocatable-perl/SUPPORT.md`.

## libxcrypt 4.5.2 (Linux Perl runtime)

- Statically linked into the upstream Linux Perl runtime; not included on macOS.
- License: LGPL version 2.1 or later, with additional compatible notices for
  individual source files; see `licenses/libxcrypt/COPYING.LIB` and `LICENSING`.
- Individual source-file notices are retained in
  `licenses/libxcrypt/SOURCE-NOTICES.txt` in the Linux bundles.
- Complete upstream source remains in the repository at
  `licenses/libxcrypt/libxcrypt-4.5.2.tar.xz` and in the GitHub release asset
  `third-party-sources.tar.gz`. Source archives are not installed.
- Release source download (matching the installed npm package’s vendorRelease):
  https://github.com/leandreDev/leandre-vendors-bin/releases
- The libxcrypt notices are included only in the Linux bundles.
- Source: https://github.com/besser82/libxcrypt/releases/tag/v4.5.2
- The upstream relocatable-perl build scripts linked above describe the static
  build and can be used to rebuild Perl against a modified libxcrypt.

Runtime notice paths above are relative to the installed package’s `bin/`
directory. Repository-only source archives are explicitly identified.
No duplicate license tree is included at the npm package root.
