# Leandre SQLite metadata reader, version 1.0.0.
# Copyright 2026 Leandre. Distributed under the same terms as Perl.
# Format reference: https://www.sqlite.org/fileformat.html#the_database_header
package Image::ExifTool::SQLite;

use strict;
use Image::ExifTool qw(:Utils);
our $VERSION = '1.0.0';

%Image::ExifTool::SQLite::Main = (
    GROUPS => { 0 => 'SQLite', 1 => 'SQLite', 2 => 'Other' },
    VARS => { NO_LOOKUP => 1 },
    PageSize => {},
    DatabasePageCount => {},
    FileChangeCounter => {},
    SchemaVersion => {},
    SchemaFormat => {},
    UserVersion => {},
    ApplicationID => {},
    SQLiteVersion => {},
    TextEncoding => { PrintConv => { 0 => 'Unspecified', 1 => 'UTF-8', 2 => 'UTF-16LE', 3 => 'UTF-16BE' } },
    ReadVersion => { PrintConv => { 1 => 'Rollback journal', 2 => 'WAL' } },
    WriteVersion => { PrintConv => { 1 => 'Rollback journal', 2 => 'WAL' } },
);

sub ProcessSQLite($$)
{
    my ($et, $dirInfo) = @_;
    my $raf = $$dirInfo{RAF};
    my $header;
    my $length = $raf->Read($header, 100);
    return 0 unless $length >= 16 and substr($header, 0, 16) eq "SQLite format 3\0";
    $et->SetFileType('SQLITE', 'application/vnd.sqlite3');
    if ($length != 100) {
        $et->Error('Truncated SQLite database header');
        return 1;
    }
    my $pageSize = unpack('n', substr($header, 16, 2));
    $pageSize = 65536 if $pageSize == 1;
    my ($write, $read, $reserved) = unpack('CCC', substr($header, 18, 3));
    my $encoding = unpack('N', substr($header, 56, 4));
    if ($pageSize < 512 or $pageSize > 65536 or ($pageSize & ($pageSize - 1))
        or $pageSize - $reserved < 480 or $write < 1 or $write > 2
        or $read < 1 or $read > 2 or $encoding > 3
        or substr($header, 21, 3) ne "\x40\x20\x20") {
        $et->Error('Invalid SQLite database header');
        return 1;
    }
    my $table = GetTagTable('Image::ExifTool::SQLite::Main');
    $et->HandleTag($table, 'PageSize', $pageSize);
    $et->HandleTag($table, 'WriteVersion', $write);
    $et->HandleTag($table, 'ReadVersion', $read);
    $et->HandleTag($table, 'TextEncoding', $encoding);
    my %offsets = (FileChangeCounter => 24, SchemaVersion => 40,
        SchemaFormat => 44, UserVersion => 60, ApplicationID => 68);
    for my $tag (sort keys %offsets) {
        my $format = ($tag eq 'UserVersion' or $tag eq 'ApplicationID') ? 'l>' : 'N';
        $et->HandleTag($table, $tag, unpack($format, substr($header, $offsets{$tag}, 4)));
    }
    # SQLite specifies that this count is valid only when the two counters match.
    my $pages = unpack('N', substr($header, 28, 4));
    if ($pages and substr($header, 24, 4) eq substr($header, 92, 4)) {
        $et->HandleTag($table, 'DatabasePageCount', $pages);
    }
    my $version = unpack('N', substr($header, 96, 4));
    $et->HandleTag($table, 'SQLiteVersion', sprintf('%d.%d.%d',
        int($version / 1000000), int($version / 1000) % 1000, $version % 1000));
    return 1;
}

1;
