import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test, type TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';

const markdown = fileURLToPath(new URL('../resources/pandoc.md', import.meta.url));
const word = fileURLToPath(new URL('../resources/docx1.docx', import.meta.url));

function runTool(name: string, args: string[]): string {
  const binaries = process.env.VENDOR_BIN_DIR;
  assert.ok(binaries, 'VENDOR_BIN_DIR must point to the installed bundle');
  const result = spawnSync(path.join(binaries, name), args, {
    encoding: 'utf8',
    timeout: 30_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${name} failed: ${result.stderr}`);
  return result.stdout;
}

function outputDirectory(t: TestContext): string {
  const directory = mkdtempSync(path.join(tmpdir(), 'pandoc test '));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test('Pandoc reports its bundled version', () => {
  assert.match(runTool('pandoc', ['--version']), /^pandoc 3\.6\.3\b/);
});

test('Pandoc converts Markdown to HTML with formatting and Unicode', () => {
  const html = runTool('pandoc', ['--from=markdown', '--to=html', markdown]);

  assert.match(html, /<h1\b[^>]*>Offline conversion<\/h1>/);
  assert.match(html, /<strong>bold text<\/strong>/);
  assert.match(html, /<table\b/);
  assert.ok(html.includes('Été à Paris — 中文.'));
});

test('Pandoc extracts text from the existing Word DOCX fixture', () => {
  const text = runTool('pandoc', ['--from=docx', '--to=plain', word]);

  assert.ok(text.trim().length > 0, 'Expected text extracted from the Word document');
  assert.match(text, /\p{L}{3,}/u, 'Expected document words in the extracted text');
});

test('Pandoc generates a DOCX that preserves the Markdown content', (t) => {
  const output = path.join(outputDirectory(t), 'converted document.docx');
  runTool('pandoc', ['--from=markdown', '--to=docx', markdown, '--output', output]);
  const text = runTool('pandoc', ['--from=docx', '--to=plain', output]);

  for (const expected of ['Offline conversion', 'Été à Paris — 中文.', 'bold text', 'Pandoc', 'Second slide']) {
    assert.ok(text.includes(expected), `DOCX lost expected text: ${expected}`);
  }
});

test('Pandoc generates a PPTX with two slides', (t) => {
  const output = path.join(outputDirectory(t), 'converted presentation.pptx');
  runTool('pandoc', [
    '--from=markdown', '--to=pptx', '--slide-level=1', markdown, '--output', output,
  ]);
  // Validate the generated presentation with the other bundled tool.
  const records = JSON.parse(runTool('exiftool', ['-json', output]));
  assert.ok(Array.isArray(records));
  assert.equal(records.length, 1);
  const metadata = records[0];
  assert.equal(metadata.Error, undefined);
  assert.equal(metadata.Warning, undefined, String(metadata.Warning));
  assert.equal(metadata.FileType, 'PPTX');
  assert.equal(
    metadata.MIMEType,
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  );
  // Pandoc's reference template can leave a stale Slides metadata value.
  // Inspect actual slide parts with the bundled Perl ZIP runtime instead.
  const slides = runTool('perl/bin/perl', ['-MArchive::Zip', '-e', `
    my $zip = Archive::Zip->new;
    $zip->read($ARGV[0]) == Archive::Zip::AZ_OK() or die "Cannot read PPTX";
    for my $member ($zip->members) {
      next unless $member->fileName =~ m{^ppt/slides/slide[0-9]+[.]xml$};
      print $member->fileName, "\\n", $member->contents, "\\n";
    }
  `, output]);
  assert.equal((slides.match(/^ppt\/slides\/slide\d+\.xml$/gm) ?? []).length, 2);
  assert.ok(slides.includes('Offline conversion'));
  assert.ok(slides.includes('Second slide'));
});
