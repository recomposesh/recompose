import { describe, expect, test } from 'vitest';

import { commandLineFor } from './run-command';

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
