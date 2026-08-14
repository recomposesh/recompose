import type { KeychainItem } from './credential-custody';

const CARRIES_A_LINE_BREAK = /[\r\n]/u;

/**
 * One value, quoted the way the tool's own reader takes it back apart.
 *
 * @summary `security -i` lexes a line the way a shell does inside double quotes: a backslash escapes
 * the character after it, and an unescaped quote ends the word. Doubling the backslashes first is
 * what keeps a value ending in one from escaping its own closing quote.
 */
function quotedForSecurity(value: string): string {
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

/**
 * The command a keychain write hands the tool on its standard input.
 *
 * @summary The whole point is that the blob rides here rather than in the argument vector, where any
 * process reading the process table would see it whole while the child ran. `security -i` takes the
 * command itself on standard input, so the vector carries nothing but the flag.
 *
 * The protocol is one command per line, so a blob holding a line break would arrive as two commands
 * and write half a credential. A stored blob is `JSON.stringify` output and never holds a raw break,
 * so the guard names an impossibility rather than a case: it exists because a silent half-write is
 * the one failure this line could hide.
 */
export function securityWriteLine(item: KeychainItem, blob: string): string {
  if (CARRIES_A_LINE_BREAK.test(blob)) {
    throw new Error('the keychain refused a credential carrying a newline, which it cannot carry');
  }

  const named = `-s ${quotedForSecurity(item.service)} -a ${quotedForSecurity(item.account)}`;

  return `add-generic-password -U ${named} -w ${quotedForSecurity(blob)}\n`;
}

/**
 * The blob a written line carries, read back the way the tool reads it.
 *
 * @summary It exists for the specs rather than for the app, which never parses one of these. A codec
 * that only ever encodes is a codec nothing can hold to account, and the round trip is the law worth
 * proving: what the line carries is what the caller handed over, whatever the caller handed over.
 */
export function readSecurityLine(line: string): string {
  const opened = line.indexOf('-w "') + '-w "'.length;
  const quoted = line.slice(opened, line.lastIndexOf('"'));

  return quoted.replaceAll(/\\(.)/gu, (_whole, character: string) => character);
}
