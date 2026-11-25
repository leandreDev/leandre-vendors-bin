"""Apply the repository's SQLite reader to the pinned ExifTool at build time."""
from pathlib import Path


def add_sqlite_reader(files):
    target = 'exiftool-runtime/lib/Image/ExifTool.pm'
    original, mode = files[target]
    marker = b'# Leandre SQLite registration v1\n'
    if marker not in original:
        replacements = (
            (b'JSON MP3 KVAR TNEF DICOM PCD NKA ICO TXT AAC);',
             b'SQLite JSON MP3 KVAR TNEF DICOM PCD NKA ICO TXT AAC);'),
            (b'%fileTypeLookup = (\n', b'%fileTypeLookup = (\n' + marker +
             b"    DB => 'SQLITE', SQLITE3 => 'SQLITE',\n"
             b"    SQLITE => ['SQLite', 'SQLite 3 database'],\n"),
            (b'%magicNumber = (\n', b'%magicNumber = (\n'
             b"    SQLite => 'SQLite format 3\\0',\n"),
            (b'%mimeType = (\n', b'%mimeType = (\n'
             b"    SQLITE => 'application/vnd.sqlite3',\n"),
        )
        for before, after in replacements:
            if original.count(before) != 1:
                raise ValueError('SQLite integration needs review for this ExifTool version')
            original = original.replace(before, after, 1)
    files[target] = (original, mode)
    module = Path(__file__).with_name('exiftool') / 'SQLite.pm'
    files['exiftool-runtime/lib/Image/ExifTool/SQLite.pm'] = (module.read_bytes(), 0o644)
