import { describe, expect, test } from 'vitest';

import { commandLineFor, safeForTheCommandProcessor } from './run-command';

describe('how a tool on this machine is actually run', () => {
  test('given a plain executable, it runs directly with the arguments as they stand', () => {
    expect(commandLineFor('/usr/local/bin/claude', ['auth', 'status'], 'darwin')).toEqual({
      command: '/usr/local/bin/claude',
      args: ['auth', 'status'],
      verbatim: false,
    });
  });

  test('given a Windows batch shim, it runs through the command processor', () => {
    const line = commandLineFor('C:\\tools\\claude.cmd', ['auth', 'status'], 'win32');

    expect(line.command.toLowerCase()).toContain('cmd');
    expect(line.args).toEqual(['/d', '/s', '/c', '"C:\\tools\\claude.cmd" auth status']);
    expect(line.verbatim).toBe(true);
  });

  test('given a Windows executable, it still runs directly', () => {
    expect(commandLineFor('C:\\tools\\claude.exe', ['auth'], 'win32')).toEqual({
      command: 'C:\\tools\\claude.exe',
      args: ['auth'],
      verbatim: false,
    });
  });

  test('given a path with a space, the quoting keeps it one file rather than two', () => {
    const line = commandLineFor('C:\\Program Files\\claude.cmd', ['auth'], 'win32');

    expect(line.args.at(-1)).toBe('"C:\\Program Files\\claude.cmd" auth');
  });
});

describe('what the command processor is allowed to be handed', () => {
  test('an ordinary install path is handed over', () => {
    expect(safeForTheCommandProcessor('C:\\Program Files\\claude.cmd', ['auth', 'status'])).toBe(
      true,
    );
  });

  test('a search path that closes the quote itself is refused', () => {
    expect(safeForTheCommandProcessor('C:\\a"&calc&"b\\claude.cmd', [])).toBe(false);
  });

  test('a folder chaining a second command is refused', () => {
    expect(safeForTheCommandProcessor('C:\\a&calc\\claude.cmd', [])).toBe(false);
  });

  test('an argument piping into another command is refused', () => {
    expect(safeForTheCommandProcessor('C:\\tools\\claude.cmd', ['auth', 'status | calc'])).toBe(
      false,
    );
  });

  test("a folder carrying the processor's own escape is refused", () => {
    expect(safeForTheCommandProcessor('C:\\tools\\a^b\\claude.cmd', [])).toBe(false);
  });

  test('a folder that would expand a variable is refused', () => {
    expect(safeForTheCommandProcessor('C:\\tools\\%PATH%\\claude.cmd', [])).toBe(false);
  });

  test('a folder that would open a second line is refused', () => {
    expect(safeForTheCommandProcessor('C:\\tools\\a\r\ncalc\\claude.cmd', [])).toBe(false);
  });

  test('a redirection into a file is refused', () => {
    expect(safeForTheCommandProcessor('C:\\tools\\claude.cmd', ['auth > stolen.txt'])).toBe(false);
  });
});
