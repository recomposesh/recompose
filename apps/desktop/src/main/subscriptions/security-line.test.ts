import { fc, test } from '@fast-check/vitest';
import { describe, expect } from 'vitest';

import { readSecurityLine, securityWriteLine } from './security-line';

const item = { service: 'recompose-parked-credentials', account: 'acc-one' };

/**
 * Values the real `security -i` was fed by hand, whose round trip this suite pins deterministically.
 *
 * @summary The property below proves the codec agrees with itself. These are the ones the tool
 * itself answered, so the codec stays pinned to the lexer it writes for rather than to a model of it.
 */
const VERIFIED_AGAINST_THE_TOOL = [
  '{"a":"b c","d":"e\\"f"}',
  '{"p":"a\\\\b $HOME \'q\' \\"z\\""}',
  'sk-ant-oat01-plain',
];

describe('the line a keychain write hands the tool on its standard input', () => {
  test('the line names the operation the refusal will name', () => {
    expect(securityWriteLine(item, 'a-blob')).toContain('add-generic-password');
  });

  test('the line updates rather than refusing an item that already stands', () => {
    expect(securityWriteLine(item, 'a-blob')).toContain('-U');
  });

  test('the line names the item it writes under, so the blob lands where a read looks', () => {
    expect(securityWriteLine(item, 'a-blob')).toContain(
      `-s "${item.service}" -a "${item.account}"`,
    );
  });

  test('the line ends where the tool reads a command, which is one newline', () => {
    expect(securityWriteLine(item, 'a-blob').endsWith('\n')).toBe(true);
  });

  test('a blank blob still writes, because an empty credential is the caller s to judge', () => {
    expect(securityWriteLine(item, '')).toContain('-w ""');
  });

  test('a blob carrying a newline is refused rather than cut in half', () => {
    expect(() => securityWriteLine(item, 'first\nsecond')).toThrow(/newline/u);
  });

  test('a blob carrying a carriage return is refused for the same reason', () => {
    expect(() => securityWriteLine(item, 'first\rsecond')).toThrow(/newline/u);
  });
});

describe('what the tool reads back out of that line', () => {
  test.each(VERIFIED_AGAINST_THE_TOOL)('the tool answered this blob unchanged: %s', (blob) => {
    expect(readSecurityLine(securityWriteLine(item, blob))).toBe(blob);
  });

  test.prop([fc.string().filter((value) => !/[\r\n]/u.test(value))])(
    'whatever a blob holds, the line carries it whole',
    (blob) => {
      expect(readSecurityLine(securityWriteLine(item, blob))).toBe(blob);
    },
  );

  test.prop([fc.string().filter((value) => !/[\r\n]/u.test(value))])(
    'the blob never ends the quoting it stands inside',
    (blob) => {
      const line = securityWriteLine(item, blob);
      const quoted = line.slice(line.indexOf('-w ') + 3).trimEnd();

      expect(quoted.startsWith('"')).toBe(true);
      expect(quoted.endsWith('"')).toBe(true);
    },
  );
});
