import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode, useState } from 'react';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import { StoppedAnsweringNote } from '../stopped-answering-note/stopped-answering-note';
import { useStoppedAnswering } from './canvas-page-hooks';

const SLUG = 'my-gateway';

const GATEWAY = 'My Gateway';

const WENT_QUIET = `${GATEWAY} stopped answering`;

const STILL_ANSWERING = 'Still answering';

/**
 * The notice wired to the watch, with the engine's word driven by a control beside it.
 *
 * @summary The watch folds across commits rather than inside one, so what it decides can only be
 * read off a tree that has actually painted twice. The control stands in for the engine push,
 * which is the one thing a scenario here has to be able to move.
 */
function GatewayUnderWatch() {
  const [serving, setServing] = useState(true);
  const { putAway, stoppedAnswering } = useStoppedAnswering(SLUG, serving);

  return (
    <div>
      <button
        onClick={() => {
          setServing((held) => !held);
        }}
        type="button"
      >
        Turn the engine over
      </button>
      {stoppedAnswering ? (
        <StoppedAnsweringNote
          gateway={GATEWAY}
          onPutAway={putAway}
          onStartAgain={() => {
            setServing(true);
          }}
        />
      ) : (
        <p>{STILL_ANSWERING}</p>
      )}
    </div>
  );
}

async function aWatchedGateway() {
  const screen = await render(
    <StrictMode>
      <QueryClientProvider client={new QueryClient()}>
        <GatewayUnderWatch />
      </QueryClientProvider>
    </StrictMode>,
  );

  await expect.element(screen.getByText(STILL_ANSWERING)).toBeVisible();

  return screen;
}

async function turnedTheEngineOver(
  screen: Awaited<ReturnType<typeof aWatchedGateway>>,
): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: 'Turn the engine over' }));
}

test('a gateway that goes down with nothing asking raises the notice on the canvas', async () => {
  const screen = await aWatchedGateway();

  await turnedTheEngineOver(screen);

  await expect.element(screen.getByText(WENT_QUIET)).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Start again' })).toBeVisible();
});

test('serving again puts the notice away, so no notice outlives what it explains', async () => {
  const screen = await aWatchedGateway();

  await turnedTheEngineOver(screen);
  await expect.element(screen.getByText(WENT_QUIET)).toBeVisible();

  await turnedTheEngineOver(screen);

  await expect.element(screen.getByText(STILL_ANSWERING)).toBeVisible();
});

test('starting it again from the notice leaves the gateway answering', async () => {
  const screen = await aWatchedGateway();

  await turnedTheEngineOver(screen);
  await expect.element(screen.getByText(WENT_QUIET)).toBeVisible();

  await userEvent.click(screen.getByRole('button', { name: 'Start again' }));

  await expect.element(screen.getByText(STILL_ANSWERING)).toBeVisible();
});

test('a person who has read the notice puts it away and is left alone', async () => {
  const screen = await aWatchedGateway();

  await turnedTheEngineOver(screen);
  await expect.element(screen.getByText(WENT_QUIET)).toBeVisible();

  await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

  await expect.element(screen.getByText(STILL_ANSWERING)).toBeVisible();
});

test('it returns once the gateway has served and gone quiet a second time', async () => {
  const screen = await aWatchedGateway();

  await turnedTheEngineOver(screen);
  await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
  await expect.element(screen.getByText(STILL_ANSWERING)).toBeVisible();

  await turnedTheEngineOver(screen);
  await turnedTheEngineOver(screen);

  await expect.element(screen.getByText(WENT_QUIET)).toBeVisible();
});
