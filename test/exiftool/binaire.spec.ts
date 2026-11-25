import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

function extractMetadata(filename: string): Record<string, unknown> {
  const binaries = process.env.VENDOR_BIN_DIR;
  assert.ok(binaries, 'VENDOR_BIN_DIR must point to the extracted bundle');
  const source = path.isAbsolute(filename) ? filename : fileURLToPath(new URL(`../resources/${filename}`, import.meta.url));
  const result = spawnSync(path.join(binaries, 'exiftool'), ['-config', '', '-json', '--', source], {
    encoding: 'utf8',
    timeout: 15_000,
    maxBuffer: 4 * 1024 * 1024,
  });

  assert.ifError(result.error);
  assert.equal(result.status, 0, `ExifTool failed: ${result.stderr}\n${result.stdout}`);

  const records = JSON.parse(result.stdout);
  assert.ok(Array.isArray(records), 'ExifTool must return a JSON array');
  assert.equal(records.length, 1, 'Expected metadata for exactly one file');
  const metadata = records[0];
  assert.ok(metadata && typeof metadata === 'object' && !Array.isArray(metadata));
  assert.equal(metadata.SourceFile, source);
  assert.equal(metadata.Error, undefined, 'Metadata must not contain an extraction error');
  return metadata;
}

test('ExifTool extracts SQLite database metadata', () => {
  const metadata = extractMetadata('test.db');

  assert.equal(metadata.Warning, undefined, String(metadata.Warning));
  assert.equal(metadata.FileType, 'SQLITE');
  assert.equal(metadata.MIMEType, 'application/vnd.sqlite3');
  assert.equal(metadata.PageSize, 4096);
  assert.equal(metadata.DatabasePageCount, 2);
  assert.equal(metadata.TextEncoding, 'UTF-8');
  assert.equal(metadata.UserVersion, 1);
  assert.equal(metadata.SchemaFormat, 4);
  assert.equal(metadata.ApplicationID, 0);
  assert.match(String(metadata.SQLiteVersion), /^3\.\d+\.\d+$/);
});

test('ExifTool reads 65536-byte SQLite pages and UTF-16 metadata', () => {
  const metadata = extractMetadata('sqlite-utf16.sqlite3');
  assert.equal(metadata.FileType, 'SQLITE');
  assert.equal(metadata.PageSize, 65536);
  assert.equal(metadata.DatabasePageCount, 2);
  assert.equal(metadata.TextEncoding, 'UTF-16LE');
  assert.equal(metadata.UserVersion, 42);
  assert.equal(metadata.ApplicationID, 123456);
});

test('ExifTool detects SQLite by contents and preserves the input', (t) => {
  const directory = mkdtempSync(path.join(tmpdir(), 'SQLite metadata '));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const input = readFileSync(new URL('../resources/test.db', import.meta.url));
  const file = path.join(directory, 'database without extension');
  writeFileSync(file, input);
  assert.equal(extractMetadata(file).UserVersion, 1);
  assert.deepEqual(readFileSync(file), input);
});

test('ExifTool ignores a stale SQLite header page count', (t) => {
  const directory = mkdtempSync(path.join(tmpdir(), 'SQLite stale count '));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const input = readFileSync(new URL('../resources/test.db', import.meta.url));
  input.writeUInt32BE(0, 92); // The version-valid-for counter no longer matches.
  const file = path.join(directory, 'stale.sqlite');
  writeFileSync(file, input);
  const metadata = extractMetadata(file);
  assert.equal(metadata.PageSize, 4096);
  assert.equal(metadata.DatabasePageCount, undefined);
});

test('ExifTool reads signed SQLite application and user identifiers', (t) => {
  const directory = mkdtempSync(path.join(tmpdir(), 'SQLite signed identifiers '));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const input = readFileSync(new URL('../resources/test.db', import.meta.url));
  input.writeInt32BE(-42, 60);
  input.writeInt32BE(-123456, 68);
  const file = path.join(directory, 'signed.sqlite');
  writeFileSync(file, input);
  const metadata = extractMetadata(file);
  assert.equal(metadata.UserVersion, -42);
  assert.equal(metadata.ApplicationID, -123456);
});

test('ExifTool rejects truncated and invalid SQLite headers', (t) => {
  const directory = mkdtempSync(path.join(tmpdir(), 'Invalid SQLite '));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const input = readFileSync(new URL('../resources/test.db', import.meta.url));
  const invalid = Buffer.from(input);
  invalid.writeUInt16BE(513, 16);
  for (const [name, data, error] of [
    ['truncated.db', input.subarray(0, 50), 'Truncated SQLite database header'],
    ['invalid.db', invalid, 'Invalid SQLite database header'],
  ] as const) {
    const file = path.join(directory, name);
    writeFileSync(file, data);
    const result = spawnSync(path.join(process.env.VENDOR_BIN_DIR!, 'exiftool'), ['-config', '', '-json', '--', file], { encoding: 'utf8', timeout: 15_000 });
    assert.ifError(result.error);
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stdout)[0].Error, error);
    assert.deepEqual(readFileSync(file), data);
  }
});

test('ExifTool extracts image metadata', () => {
  const metadata = extractMetadata('img1.png');

  assert.equal(metadata.FileType, 'PNG');
  assert.equal(metadata.MIMEType, 'image/png');
  assert.ok(typeof metadata.ImageWidth === 'number' && metadata.ImageWidth > 0);
  assert.ok(typeof metadata.ImageHeight === 'number' && metadata.ImageHeight > 0);
});

test('ExifTool extracts PDF metadata', () => {
  const metadata = extractMetadata('pdf1.pdf');

  assert.equal(metadata.FileType, 'PDF');
  assert.equal(metadata.MIMEType, 'application/pdf');
  assert.match(String(metadata.PDFVersion), /^\d+\.\d+$/);
  assert.ok(typeof metadata.PageCount === 'number' && metadata.PageCount > 0);
});

test('ExifTool extracts Word DOCX metadata', () => {
  const metadata = extractMetadata('docx1.docx');

  assert.equal(metadata.Warning, undefined, String(metadata.Warning));
  assert.equal(metadata.FileType, 'DOCX');
  assert.equal(
    metadata.MIMEType,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  );
  assert.ok(typeof metadata.Application === 'string' && metadata.Application.length > 0);
  assert.ok(typeof metadata.Pages === 'number' && metadata.Pages > 0);
  assert.ok(typeof metadata.Words === 'number' && metadata.Words > 0);
});

test('ExifTool extracts Excel XLSX metadata', () => {
  const metadata = extractMetadata('xlsx1.xlsx');

  assert.equal(metadata.Warning, undefined, String(metadata.Warning));
  assert.equal(metadata.FileType, 'XLSX');
  assert.equal(
    metadata.MIMEType,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  assert.ok(typeof metadata.Application === 'string' && metadata.Application.length > 0);
  assert.ok(Array.isArray(metadata.HeadingPairs), 'Expected spreadsheet metadata');
  const worksheets = metadata.HeadingPairs.indexOf('Worksheets');
  assert.ok(worksheets >= 0, 'Expected a worksheet count');
  const count = metadata.HeadingPairs[worksheets + 1];
  assert.ok(typeof count === 'number' && Number.isInteger(count) && count > 0);
});

test('ExifTool extracts PowerPoint PPTX metadata', () => {
  const metadata = extractMetadata('pptx1.pptx');

  assert.equal(metadata.Warning, undefined, String(metadata.Warning));
  assert.equal(metadata.FileType, 'PPTX');
  assert.equal(
    metadata.MIMEType,
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  );
  assert.ok(typeof metadata.Application === 'string' && metadata.Application.length > 0);
  assert.ok(typeof metadata.Slides === 'number' && Number.isInteger(metadata.Slides) && metadata.Slides > 0);
  assert.ok(typeof metadata.PresentationFormat === 'string' && metadata.PresentationFormat.length > 0);
});
