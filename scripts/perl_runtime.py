"""Select the portable Perl runtime needed by the bundled ExifTool version.

This is a build-time filter, not a deletion of the original developer inputs.
Keep the allowlist in sync with ExifTool's direct, conditional and dynamic imports.
"""
import json
from pathlib import Path

PROFILE = json.loads(Path(__file__).with_name('perl-runtime.json').read_text())
MODULES = set(PROFILE['modules'])


def keep_perl_file(relative):
    """Accept a POSIX path relative to a platform's artifact-src directory."""
    parts = Path(relative).parts
    if not parts or parts[0] != 'perl':
        return True
    if parts == ('perl', 'bin', 'perl'):
        return True
    if len(parts) < 4 or parts[1] != 'lib':
        return False
    # Layout: perl/lib/<version>/[<architecture>/]<module-or-data>.
    library = Path(*parts[3:])
    if library.parts[0] in ('darwin-2level', 'x86_64-linux'):
        library = Path(*library.parts[1:])
    name = library.as_posix()
    if library.suffix in ('.pod', '.h', '.a', '.c') or 'CORE' in library.parts:
        return False
    if name in PROFILE['excludedDataFiles']:
        return False
    if any(name.startswith(directory + '/') for directory in PROFILE['dataDirectories']):
        return True
    if name in ('Config_heavy.pl', 'Config_git.pl'):
        return True
    if library.suffix == '.pm':
        return name[:-3].replace('/', '::') in MODULES
    if library.parts[0] == 'auto':
        # Shared objects and AutoLoader .al/.ix files follow the module namespace.
        module_path = '/'.join(library.parts[1:-1])
        return any(module_path == module.replace('::', '/') or
                   module_path.startswith(module.replace('::', '/') + '/')
                   for module in MODULES)
    return False
