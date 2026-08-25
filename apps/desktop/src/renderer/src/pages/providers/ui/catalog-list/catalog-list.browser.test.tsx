import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import type { AccountKind } from '../../../../entities/account';
import type { CatalogEntry } from '../../../../entities/provider';

import { CatalogList } from './catalog-list';

function picksMadeOn(kind: AccountKind) {
  const picked: CatalogEntry[] = [];

  return {
    picked,
    screen: render(
      <CatalogList
        kind={kind}
        onPick={(entry) => {
          picked.push(entry);
        }}
      />,
    ),
  };
}

test('every destination leads with the providers it connects today', async () => {
  const { screen } = picksMadeOn('local');

  await expect.element((await screen).getByRole('button', { name: /^Ollama/ })).toBeVisible();
});

test('the runtime this machine can serve answers a pick like any other card', async () => {
  const { picked, screen } = picksMadeOn('local');

  await (await screen).getByRole('button', { name: /^Ollama/ }).click();

  expect(picked.map((entry) => entry.id)).toEqual(['ollama']);
});

test('every hosted catalog stands beside the one that shipped first, and all of them connect', async () => {
  const { screen } = picksMadeOn('aggregator');

  const resolved = await screen;

  for (const named of [/^OpenRouter/, /Together AI/, /Cerebras/, /Custom aggregator/]) {
    await expect.element(resolved.getByRole('button', { name: named })).toBeVisible();
    await expect
      .element(resolved.getByRole('button', { name: named }))
      .not.toHaveAttribute('aria-disabled');
  }
});

test('a card that once stood inert now answers a pointer', async () => {
  const { picked, screen } = picksMadeOn('aggregator');

  await (await screen).getByRole('button', { name: /Cerebras/ }).click();

  expect(picked.map((entry) => entry.id)).toEqual(['cerebras']);
});

test('a card that once stood inert now answers the keyboard as well', async () => {
  const { picked, screen } = picksMadeOn('aggregator');

  const card = (await screen).getByRole('button', { name: /Cerebras/ }).element();

  if (!(card instanceof HTMLElement)) {
    throw new Error('the card is not an element that can be pressed');
  }

  card.focus();
  await userEvent.keyboard('{Enter}');

  expect(picked.map((entry) => entry.id)).toEqual(['cerebras']);
});

test('nothing on the surface stands under a Soon badge any more', async () => {
  for (const kind of ['subscription', 'api-key', 'aggregator', 'local'] as const) {
    const { screen } = picksMadeOn(kind);
    const resolved = await screen;

    expect(resolved.container.textContent, kind).not.toContain('Soon');
    expect(resolved.container.querySelector('[aria-disabled]'), kind).toBeNull();
  }
});

test('every card stays at full strength, so none reads as inert', async () => {
  const { screen } = picksMadeOn('local');

  const card = (await screen).getByRole('button', { name: /Custom local server/ }).element();

  expect(getComputedStyle(card).opacity).toBe('1');

  for (const part of card.querySelectorAll('*')) {
    expect(getComputedStyle(part).opacity).toBe('1');
  }
});

test('a vendor draws its own mark rather than the glyph a category stands under', async () => {
  const { screen } = picksMadeOn('local');

  const withAMark = (await screen).getByRole('button', { name: /LM Studio/ }).element();
  const category = (await screen).getByRole('button', { name: /Custom local server/ }).element();

  expect(withAMark.querySelector('svg')?.innerHTML).not.toBe(
    category.querySelector('svg')?.innerHTML,
  );
});

test('a card is announced as the words it prints, never as the vendor behind its mark', async () => {
  const { screen } = picksMadeOn('subscription');

  await expect
    .element((await screen).getByRole('button', { name: /^Claude/ }))
    .toHaveAccessibleName('ClaudeSign in with your Pro or Max plan');
});
