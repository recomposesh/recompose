const { execFile } = require('node:child_process');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { promisify } = require('node:util');

const run = promisify(execFile);

const ASK_EVERY_MS = 30_000;
const GIVE_UP_AFTER_MS = 5 * 60 * 60 * 1000;

function credentialsFromEnvironment() {
  const credentials = {
    APPLE_API_KEY: process.env['APPLE_API_KEY'],
    APPLE_API_KEY_ID: process.env['APPLE_API_KEY_ID'],
    APPLE_API_ISSUER: process.env['APPLE_API_ISSUER'],
  };

  for (const [name, value] of Object.entries(credentials)) {
    if (!value) throw new Error(`notarization halted: ${name} is empty`);
  }

  return [
    '--key',
    credentials.APPLE_API_KEY,
    '--key-id',
    credentials.APPLE_API_KEY_ID,
    '--issuer',
    credentials.APPLE_API_ISSUER,
    '--output-format',
    'json',
  ];
}

async function notarytool(args, credentials) {
  const { stdout } = await run('xcrun', ['notarytool', ...args, ...credentials], {
    maxBuffer: 32 * 1024 * 1024,
  });

  return JSON.parse(stdout);
}

async function sleep(milliseconds) {
  await new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

/**
 * @summary `notarytool submit --wait` ends the whole build on the first failed poll, and one
 * dropped connection cost a fifty-two minute run (record 0156). Apple keeps the submission either
 * way, so this asks on its own schedule and reads a failed question as one to ask again.
 */
async function verdictOf(submission, credentials) {
  const deadline = Date.now() + GIVE_UP_AFTER_MS;
  let unanswered = 0;

  while (Date.now() < deadline) {
    await sleep(ASK_EVERY_MS);

    try {
      const { status } = await notarytool(['info', submission], credentials);

      unanswered = 0;

      if (status !== 'In Progress') return status;
    } catch (error) {
      unanswered += 1;
      console.log(`notarization: the notary did not answer (${unanswered}): ${error.message}`);
    }
  }

  throw new Error(`notarization: ${submission} stayed In Progress for five hours`);
}

async function reasonFor(submission, credentials) {
  try {
    const log = await notarytool(['log', submission], credentials);

    return JSON.stringify(log.issues ?? log, undefined, 2);
  } catch (error) {
    return `the notary log could not be read: ${error.message}`;
  }
}

module.exports = async function afterSign(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const credentials = credentialsFromEnvironment();
  const app = join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  const staging = await mkdtemp(join(tmpdir(), 'recompose-notarize-'));

  try {
    const archive = join(staging, 'app.zip');

    await run('ditto', ['-c', '-k', '--keepParent', app, archive]);

    const { id } = await notarytool(['submit', archive, '--no-wait'], credentials);

    console.log(`notarization: ${app} submitted as ${id}`);

    const status = await verdictOf(id, credentials);

    if (status !== 'Accepted') {
      throw new Error(
        `notarization: ${id} came back ${status}\n${await reasonFor(id, credentials)}`,
      );
    }

    await run('xcrun', ['stapler', 'staple', app]);

    console.log(`notarization: ${id} accepted, ticket stapled`);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
};
