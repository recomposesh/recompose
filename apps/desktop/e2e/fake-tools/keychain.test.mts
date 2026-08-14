import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

const fake = fileURLToPath(new URL('./keychain.mts', import.meta.url));
const item = ['-s', 'recompose-parked-credentials', '-a', 'acc-one'];
const PIPE_HOLDS = 65_536;
// Linux caps a single argument at 32 pages, so the blob has to stay under 131_072 bytes.
const A_LONG_BLOB = 'x'.repeat(PIPE_HOLDS + PIPE_HOLDS / 2);
const STORE_REFUSED = 51;

let root: string;
let store: string;
let desk: string;

type Answer = { said: string; status: number };

async function ask(argv: readonly string[], input?: string): Promise<Answer> {
  const child = spawn(process.execPath, [fake, ...argv], {
    env: {
      ...process.env,
      RECOMPOSE_FAKE_KEYCHAIN_DIR: store,
      RECOMPOSE_FAKE_TOOLS_DESK: desk,
    },
  });
  let said = '';

  if (input === undefined) {
    child.stdin.end();
  } else {
    child.stdin.end(input);
  }

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => {
    said += chunk;
  });

  const status = await new Promise<number>((resolve) => {
    child.on('close', (code) => {
      resolve(code ?? 0);
    });
  });

  return { said, status };
}

async function opens(): Promise<number> {
  const written = await readFile(join(desk, 'keychain-opens.log'), 'utf8').catch(() => '');

  return written.split('\n').filter((line) => line !== '').length;
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'recompose-fake-keychain-'));
  store = join(root, 'keychain');
  desk = join(root, 'desk');
  await mkdir(store, { recursive: true });
  await mkdir(desk, { recursive: true });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('the fake security tool', () => {
  test('given a credential longer than a pipe holds, the read hands back every byte of it', async () => {
    await ask(['add-generic-password', '-U', ...item, '-w', A_LONG_BLOB]);

    const read = await ask(['find-generic-password', ...item, '-w']);

    expect(read.said).toHaveLength(A_LONG_BLOB.length + 1);
  });

  test('given a store that refuses to open, a read answers the refusal rather than an empty store', async () => {
    await ask(['add-generic-password', '-U', ...item, '-w', 'a-credential']);
    await writeFile(join(desk, 'keychain-refuses'), '', 'utf8');

    const read = await ask(['find-generic-password', ...item, '-w']);

    expect(read.status).toBe(STORE_REFUSED);
    expect(read.said).toBe('');
  });

  test('given a read that asks for the secret, the store records the open it would prompt for', async () => {
    await ask(['add-generic-password', '-U', ...item, '-w', 'a-credential']);

    await ask(['find-generic-password', ...item, '-w']);

    expect(await opens()).toBe(1);
  });

  test('given a read that asks only whether the item exists, the store records no open', async () => {
    await ask(['add-generic-password', '-U', ...item, '-w', 'a-credential']);

    await ask(['find-generic-password', ...item]);

    expect(await opens()).toBe(0);
  });

  test('given a second look that reads no secret, the store stands at the opens the first one made', async () => {
    await ask(['add-generic-password', '-U', ...item, '-w', 'a-credential']);
    await ask(['find-generic-password', ...item, '-w']);

    await ask(['find-generic-password', ...item]);

    expect(await opens()).toBe(1);
  });
});

describe('the command a real security reads off its standard input', () => {
  test('a write handed on standard input stores what a write handed in argv would', async () => {
    const blob = '{"a":"b c","d":"e\\"f"}';

    await ask(
      ['-i'],
      `add-generic-password -U -s "recompose-parked-credentials" -a "acc-one" -w "{\\"a\\":\\"b c\\",\\"d\\":\\"e\\\\\\"f\\"}"\n`,
    );

    const read = await ask(['find-generic-password', ...item, '-w']);

    expect(read.said).toBe(`${blob}\n`);
  });

  test('a standard input carrying no command answers that it read no request', async () => {
    const answered = await ask(['-i'], '\n');

    expect(answered.status).not.toBe(0);
  });
});
