import { describe, expect, test, vi } from 'vitest';

import { commandLineFor, runCommand, safeForTheCommandProcessor } from './run-command';

/** Reads its whole standard input and prints it back, on every platform this app ships to. */
const ECHOES_ITS_INPUT = [
  '-e',
  'let held = ""; process.stdin.on("data", (d) => { held += d; }); process.stdin.on("end", () => process.stdout.write(held));',
];

/** Prints one variable of its own environment back, on every platform this app ships to. */
const PRINTS_A_NAMED_VARIABLE = [
  '-e',
  'process.stdout.write(process.env.A_VARIABLE_THE_CALLER_NAMED ?? "");',
];

const A_BOUND = 30_000;

describe('handing a command something on its standard input', () => {
  test('what the caller hands over is what the tool reads', async () => {
    await expect(
      runCommand(process.execPath, ECHOES_ITS_INPUT, A_BOUND, 'a-line the tool must read\n'),
    ).resolves.toBe('a-line the tool must read\n');
  });

  test('a tool handed nothing reads nothing, because its input still closes', async () => {
    await expect(runCommand(process.execPath, ECHOES_ITS_INPUT, A_BOUND, '')).resolves.toBe('');
  });
});

describe('the environment a command runs under', () => {
  test('given an environment named by the caller, the tool runs under that one', async () => {
    await expect(
      runCommand(process.execPath, PRINTS_A_NAMED_VARIABLE, A_BOUND, undefined, {
        A_VARIABLE_THE_CALLER_NAMED: 'named-by-the-caller',
      }),
    ).resolves.toBe('named-by-the-caller');
  });

  test('given no environment named, the tool runs under the one this process carries', async () => {
    process.env['A_VARIABLE_THE_CALLER_NAMED'] = 'carried-by-the-process';

    await expect(runCommand(process.execPath, PRINTS_A_NAMED_VARIABLE, A_BOUND)).resolves.toBe(
      'carried-by-the-process',
    );

    delete process.env['A_VARIABLE_THE_CALLER_NAMED'];
  });
});

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

  test('given a file merely named like a batch shim elsewhere, it runs directly', () => {
    expect(commandLineFor('/usr/local/bin/claude.cmd', ['auth'], 'darwin')).toEqual({
      command: '/usr/local/bin/claude.cmd',
      args: ['auth'],
      verbatim: false,
    });
  });

  test('given a machine naming its own processor, that one runs the shim', () => {
    vi.stubEnv('ComSpec', 'D:\\Windows\\System32\\cmd.exe');

    expect(commandLineFor('C:\\tools\\claude.cmd', [], 'win32').command).toBe(
      'D:\\Windows\\System32\\cmd.exe',
    );
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

  test('a line the processor would read as two is never built at all', () => {
    expect(() => commandLineFor('C:\\a"&calc&"b\\claude.cmd', [], 'win32')).toThrow(
      /refused to start/,
    );
  });

  test('an argument chaining a second command is never built at all', () => {
    expect(() => commandLineFor('C:\\tools\\claude.cmd', ['auth & calc'], 'win32')).toThrow(
      /refused to start/,
    );
  });

  test('the same name off Windows builds a line, because nothing parses it', () => {
    expect(commandLineFor('/usr/local/bin/a&b/claude', [], 'darwin').verbatim).toBe(false);
  });
});
