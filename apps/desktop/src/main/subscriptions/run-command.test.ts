import { describe, expect, test } from 'vitest';

import { handoffFor, runsOnlyThroughAShell } from './run-command';

describe('the tool files Windows refuses to run directly', () => {
  test('a tool installed as a command script goes through a shell', () => {
    expect(runsOnlyThroughAShell('C:\\Users\\ada\\AppData\\claude.cmd', 'win32')).toBe(true);
  });

  test('a batch shim goes through a shell too', () => {
    expect(runsOnlyThroughAShell('C:\\tools\\cliproxyapi.bat', 'win32')).toBe(true);
  });

  test('the suffix reads the same whatever case the installer wrote it in', () => {
    expect(runsOnlyThroughAShell('C:\\tools\\claude.CMD', 'win32')).toBe(true);
  });

  test('an executable runs on its own', () => {
    expect(runsOnlyThroughAShell('C:\\tools\\codex.exe', 'win32')).toBe(false);
  });

  test('a file merely named like a command script elsewhere runs on its own', () => {
    expect(runsOnlyThroughAShell('/usr/local/bin/claude.cmd', 'darwin')).toBe(false);
  });

  test('a plain binary runs on its own', () => {
    expect(runsOnlyThroughAShell('/usr/local/bin/claude', 'darwin')).toBe(false);
  });
});

describe('what a command is handed to', () => {
  test('a command script is quoted and handed to the shell that can start it', () => {
    expect(handoffFor('C:\\Program Files\\claude.cmd', ['auth', 'status'], 'win32')).toEqual({
      verdict: 'through-a-shell',
      quoted: '"C:\\Program Files\\claude.cmd"',
    });
  });

  test('an executable is started directly, because no shell is involved', () => {
    expect(handoffFor('C:\\tools\\codex.exe', ['login'], 'win32')).toEqual({ verdict: 'direct' });
  });

  test('a tool found off Windows is started directly', () => {
    expect(handoffFor('/usr/local/bin/claude', ['auth'], 'darwin')).toEqual({ verdict: 'direct' });
  });

  test('a search path that closes the quote itself is refused rather than run', () => {
    expect(handoffFor('C:\\a"&calc&"b\\claude.cmd', [], 'win32').verdict).toBe('refused');
  });

  test('a refusal names the word it would not hand over', () => {
    const handoff = handoffFor('C:\\a&calc\\claude.cmd', [], 'win32');

    expect(handoff.verdict === 'refused' && handoff.because).toContain('C:\\a&calc\\claude.cmd');
  });

  test('an argument carrying a second command is refused rather than run', () => {
    expect(handoffFor('C:\\tools\\claude.cmd', ['auth', 'status | calc'], 'win32').verdict).toBe(
      'refused',
    );
  });

  test("a name carrying the shell's own escape is refused rather than run", () => {
    expect(handoffFor('C:\\tools\\a^b\\claude.cmd', [], 'win32').verdict).toBe('refused');
  });

  test('a name that would expand a variable is refused rather than run', () => {
    expect(handoffFor('C:\\tools\\%PATH%\\claude.cmd', [], 'win32').verdict).toBe('refused');
  });

  test('the same characters off Windows are just characters, because nothing parses them', () => {
    expect(handoffFor('/usr/local/bin/a&b/claude', [], 'darwin')).toEqual({ verdict: 'direct' });
  });
});
