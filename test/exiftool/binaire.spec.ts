import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

function extractMetadata(filename: string): Record<string, unknown> {
  const binaries = process.env.VENDOR_BIN_DIR;
  assert.ok(binaries, 'VENDOR_BIN_DIR must point to the extracted bundle');
  const source = fileURLToPath(new URL(`../resources/${filename}`, import.meta.url));
  const result = spawnSync(path.join(binaries, 'exiftool'), ['-json', source], {
    encoding: 'utf8',
    timeout: 15_000,
    maxBuffer: 4 * 1024 * 1024,
  });

  assert.ifError(result.error);
  assert.equal(result.status, 0, `ExifTool failed: ${result.stderr}`);

  const records = JSON.parse(result.stdout);
  assert.ok(Array.isArray(records), 'ExifTool must return a JSON array');
  assert.equal(records.length, 1, 'Expected metadata for exactly one file');
  const metadata = records[0];
  assert.ok(metadata && typeof metadata === 'object' && !Array.isArray(metadata));
  assert.equal(metadata.SourceFile, source);
  assert.equal(metadata.Error, undefined, 'Metadata must not contain an extraction error');
  return metadata;
}

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
