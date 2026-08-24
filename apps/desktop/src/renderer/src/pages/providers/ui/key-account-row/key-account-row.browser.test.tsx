import { expect, test } from 'vitest';
import { page } from 'vitest/browser';

import {
  addressedByHand,
  press,
  renderRow,
  stored,
  storedBeforeTheMask,
} from './key-account-row.testkit';

test('a stored key reads as the product it reaches over the name it was given', async () => {
  const screen = await renderRow(stored);

  await expect.element(screen.getByText('Anthropic API', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('build', { exact: true })).toBeVisible();
});

test('the mask holds four bullets and four characters, with no vendor prefix in front', async () => {
  const screen = await renderRow(stored);

  await expect.element(screen.getByText('••••7f2c', { exact: true })).toBeVisible();
});

test('a key stored before the mask existed reads the name beside the bare bullets', async () => {
  const screen = await renderRow(storedBeforeTheMask);

  await expect.element(screen.getByText('build', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('••••', { exact: true })).toBeVisible();
});

test('the bare bullets still read as a stored key to a screen reader', async () => {
  const screen = await renderRow(storedBeforeTheMask);

  await expect.element(screen.getByText('a stored key')).toBeInTheDocument();
});

test('a key the catalog never offered stands under the provider it was stored as', async () => {
  const screen = await renderRow({ ...stored, provider: 'a-plugin-vendor' });

  await expect.element(screen.getByText('a-plugin-vendor', { exact: true })).toBeVisible();

  await press('Actions for build');

  await expect.element(page.getByRole('menuitem', { name: 'Remove' })).toBeVisible();
  await expect.element(page.getByRole('menuitem', { name: 'Verify' })).not.toBeInTheDocument();
});

test('a provider whose balance wants a second key offers to take one, and none to forget yet', async () => {
  await renderRow({ ...stored, provider: 'openrouter', kind: 'aggregator' });

  await press('Actions for build');

  await expect.element(page.getByRole('menuitem', { name: 'Add credits key' })).toBeVisible();
  await expect
    .element(page.getByRole('menuitem', { name: 'Forget credits key' }))
    .not.toBeInTheDocument();
});

test('a provider already holding that key offers to replace it or to forget it', async () => {
  await renderRow({
    ...stored,
    provider: 'openrouter',
    kind: 'aggregator',
    readerCredentialRef: 'read-1',
  });

  await press('Actions for build');

  await expect.element(page.getByRole('menuitem', { name: 'Replace credits key' })).toBeVisible();
  await expect.element(page.getByRole('menuitem', { name: 'Forget credits key' })).toBeVisible();
});

test('an aggregator key takes the same row and offers no check, because no probe knows it', async () => {
  const screen = await renderRow({ ...stored, provider: 'openrouter', kind: 'aggregator' });

  await expect.element(screen.getByRole('listitem')).toHaveTextContent('OpenRouter');

  await press('Actions for build');

  await expect.element(page.getByRole('menuitem', { name: 'Remove' })).toBeVisible();
  await expect.element(page.getByRole('menuitem', { name: 'Verify' })).not.toBeInTheDocument();
});

test('a provider whose balance wants a second key offers to take one, and none to forget yet', async () => {
  await renderRow({ ...stored, provider: 'openrouter', kind: 'aggregator' });

  await press('Actions for build');

  await expect.element(page.getByRole('menuitem', { name: 'Add credits key' })).toBeVisible();
  await expect
    .element(page.getByRole('menuitem', { name: 'Forget credits key' }))
    .not.toBeInTheDocument();
});

test('a provider already holding that key offers to replace it or to forget it', async () => {
  await renderRow({
    ...stored,
    provider: 'openrouter',
    kind: 'aggregator',
    readerCredentialRef: 'read-1',
  });

  await press('Actions for build');

  await expect.element(page.getByRole('menuitem', { name: 'Replace credits key' })).toBeVisible();
  await expect.element(page.getByRole('menuitem', { name: 'Forget credits key' })).toBeVisible();
});

test('a custom aggregator row names the address a person gave it, and still offers no check', async () => {
  const screen = await renderRow(addressedByHand);

  await expect
    .element(screen.getByText('https://models.example.com', { exact: true }))
    .toBeVisible();

  await press('Actions for house pool');

  await expect.element(page.getByRole('menuitem', { name: 'Remove' })).toBeVisible();
  await expect.element(page.getByRole('menuitem', { name: 'Verify' })).not.toBeInTheDocument();
});

test('a provider whose balance wants a second key offers to take one, and none to forget yet', async () => {
  await renderRow({ ...stored, provider: 'openrouter', kind: 'aggregator' });

  await press('Actions for build');

  await expect.element(page.getByRole('menuitem', { name: 'Add credits key' })).toBeVisible();
  await expect
    .element(page.getByRole('menuitem', { name: 'Forget credits key' }))
    .not.toBeInTheDocument();
});

test('a provider already holding that key offers to replace it or to forget it', async () => {
  await renderRow({
    ...stored,
    provider: 'openrouter',
    kind: 'aggregator',
    readerCredentialRef: 'read-1',
  });

  await press('Actions for build');

  await expect.element(page.getByRole('menuitem', { name: 'Replace credits key' })).toBeVisible();
  await expect.element(page.getByRole('menuitem', { name: 'Forget credits key' })).toBeVisible();
});

test('an aggregator row the app addresses itself claims no address of its own', async () => {
  const screen = await renderRow({ ...stored, provider: 'openrouter', kind: 'aggregator' });

  await expect.element(screen.getByRole('listitem')).toBeVisible();
  expect(screen.container.textContent).not.toContain('https://');
});
