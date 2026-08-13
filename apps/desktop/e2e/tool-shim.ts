/**
 * The launcher a fake tool is reached through.
 *
 * @summary A scenario puts these on the search path so the app finds a fake where it would find
 * the provider's own binary. The shim names its interpreter by absolute path, because the bed
 * replaces the search path outright and nothing on it would resolve `node`.
 */
export function shimName(binary: string): string {
  return process.platform === 'win32' ? `${binary}.cmd` : binary;
}

export function shimScript(target: string): string {
  return process.platform === 'win32'
    ? `@echo off\r\n"${process.execPath}" "${target}" %*\r\n`
    : `#!/bin/sh\nexec "${process.execPath}" "${target}" "$@"\n`;
}
