const { execFile } = require('node:child_process');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { promisify } = require('node:util');

const run = promisify(execFile);

const ASK_EVERY_MS = 30_000;
const SUBMIT_AGAIN_AFTER_MS = 30 * 60 * 1000;
const GIVE_UP_AFTER_MS = 5 * 60 * 60 * 1000;

function credentialsFromEnvironment() {
  const secrets = {
    APPLE_API_KEY: process.env['APPLE_API_KEY'],
    APPLE_API_KEY_ID: process.env['APPLE_API_KEY_ID'],
    APPLE_API_ISSUER: process.env['APPLE_API_ISSUER'],
  };

  for (const [name, value] of Object.entries(secrets)) {
    if (!value) throw new Error(`notarization halted: ${name} is empty`);
  }

  return [
    '--key',
    secrets.APPLE_API_KEY,
    '--key-id',
    secrets.APPLE_API_KEY_ID,
    '--issuer',
    secrets.APPLE_API_ISSUER,
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

async function reasonFor(submission, credentials) {
  try {
    const log = await notarytool(['log', submission], credentials);

    return JSON.stringify(log.issues ?? log, undefined, 2);
  } catch (error) {
    return `the notary log could not be read: ${error.message}`;
  }
}

/**
 * @summary `notarytool submit --wait` ends the build on the first failed poll and offers no way to
 * ask twice, which cost seven release runs (record 0156). Apple keeps every submission it accepts,
 * so a failed question is one to ask again, and a queue that swallows one ticket answers a second.
 */
async function acceptedTicketFor(archive, credentials) {
  const deadline = Date.now() + GIVE_UP_AFTER_MS;
  const outstanding = [];
  let submitAgainAt = 0;

  while (Date.now() < deadline) {
    if (Date.now() >= submitAgainAt) {
      const { id } = await notarytool(['submit', archive, '--no-wait'], credentials);

      outstanding.push(id);
      submitAgainAt = Date.now() + SUBMIT_AGAIN_AFTER_MS;

      console.log(`notarization: submitted ${id}, ${outstanding.length} awaiting a verdict`);
    }

    await sleep(ASK_EVERY_MS);

    for (const id of outstanding) {
      let status;

      try {
        ({ status } = await notarytool(['info', id], credentials));
      } catch (error) {
        console.log(`notarization: the notary did not answer for ${id}: ${error.message}`);
        continue;
      }

      if (status === 'Accepted') return id;

      if (status !== 'In Progress') {
        const reason = await reasonFor(id, credentials);

        throw new Error(`notarization: ${id} came back ${status}\n${reason}`);
      }
    }
  }

  throw new Error(
    `notarization: none of ${outstanding.join(', ')} left In Progress within five hours`,
  );
}

module.exports = async function afterSign(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const credentials = credentialsFromEnvironment();
  const app = join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  const staging = await mkdtemp(join(tmpdir(), 'recompose-notarize-'));

  try {
    const archive = join(staging, 'app.zip');

    await run('ditto', ['-c', '-k', '--keepParent', app, archive]);

    const accepted = await acceptedTicketFor(archive, credentials);

    await run('xcrun', ['stapler', 'staple', app]);

    console.log(`notarization: ${accepted} accepted, ticket stapled onto ${app}`);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
};
