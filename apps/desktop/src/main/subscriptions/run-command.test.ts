import { describe, expect, test } from 'vitest';

import { runsOnlyThroughAShell } from './run-command';

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
