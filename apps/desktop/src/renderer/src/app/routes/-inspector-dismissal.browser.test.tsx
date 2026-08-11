import { beforeEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import { inspectorOpen, showSidebar, sidebarHidden, toggleInspector } from '../../shared/lib';
import { gatewaySeed } from '../../shared/testing';
import { renderAt } from '../testing/render-app';

const codex = gatewaySeed({ slug: 'codex', displayName: 'Codex', port: 51234 });

function pressOn(target: Element) {
  target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
}

function clickedThePane(container: HTMLElement): void {
  const pane = container.querySelector('.react-flow__pane');

  if (pane === null) {
    throw new Error('the canvas pane is not on screen');
  }

  pane.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

async function renderGateway() {
  return renderAt('/gateways/codex', { gateways: [codex] });
}

const theEndpoint = { exact: true } as const;

vi.setConfig({ testTimeout: 40_000 });

beforeEach(() => {
  localStorage.clear();
  showSidebar();

  if (!inspectorOpen()) {
    toggleInspector();
  }
});

test('a click on the pane behind the cards puts the inspector away', async () => {
  const screen = await renderGateway();

  await expect.element(screen.getByText('Endpoint', theEndpoint)).toBeVisible();

  clickedThePane(screen.container);

  await expect.element(screen.getByText('Endpoint', theEndpoint)).not.toBeInTheDocument();
});

test('a press on the toolbar leaves the inspector standing, since that is using the app', async () => {
  const screen = await renderGateway();

  pressOn(screen.getByRole('toolbar', { name: 'Codex' }).element());

  await expect.element(screen.getByText('Endpoint', theEndpoint)).toBeVisible();
});

test('a press on the status bar leaves the inspector standing too', async () => {
  const screen = await renderGateway();

  pressOn(screen.getByText(/latency/).element());

  await expect.element(screen.getByText('Endpoint', theEndpoint)).toBeVisible();
});

test('pressing a real toolbar control runs it and leaves the inspector standing', async () => {
  const screen = await renderGateway();

  await userEvent.click(screen.getByRole('button', { name: 'Sidebar' }));

  expect(sidebarHidden()).toBe(true);
  await expect.element(screen.getByText('Endpoint', theEndpoint)).toBeVisible();
});

test('the toolbar control that opens the inspector closes it once, never twice', async () => {
  const screen = await renderGateway();

  await userEvent.click(screen.getByRole('button', { name: 'Inspector' }));

  await expect.element(screen.getByText('Endpoint', theEndpoint)).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Inspector' }));

  await expect.element(screen.getByText('Endpoint', theEndpoint)).toBeVisible();
});

test('closing the inspector from the toolbar clears the glowing canvas selection', async () => {
  const screen = await renderGateway();
  const gateway = screen.getByRole('button', { name: /Codex/ });

  await userEvent.click(gateway);
  await expect.element(gateway).toHaveAttribute('aria-pressed', 'true');

  await userEvent.click(screen.getByRole('button', { name: 'Inspector' }));

  await expect.element(screen.getByText('Endpoint', theEndpoint)).not.toBeInTheDocument();
  await expect.element(gateway).toHaveAttribute('aria-pressed', 'false');
});

test('a press inside the inspector leaves it standing, since that is not looking away', async () => {
  const screen = await renderGateway();

  pressOn(screen.getByText('Base URL', theEndpoint).element());

  await expect.element(screen.getByText('Endpoint', theEndpoint)).toBeVisible();
});

test('taking hold of the border that sizes the inspector never puts it away', async () => {
  const screen = await renderGateway();

  pressOn(screen.getByRole('separator', { name: 'Inspector width' }).element());

  await expect.element(screen.getByText('Endpoint', theEndpoint)).toBeVisible();
});

test('selecting the gateway card opens a closed inspector back up', async () => {
  const screen = await renderGateway();

  clickedThePane(screen.container);
  await expect.element(screen.getByText('Endpoint', theEndpoint)).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /Codex/ }));

  await expect.element(screen.getByText('Endpoint', theEndpoint)).toBeVisible();
});

test('choosing another gateway puts the inspector away with the page it was reading', async () => {
  const claude = gatewaySeed({ slug: 'claude', displayName: 'Claude', port: 51235 });
  const screen = await renderAt('/gateways/codex', { gateways: [codex, claude] });

  await expect.element(screen.getByText('Endpoint', theEndpoint)).toBeVisible();

  await userEvent.click(screen.getByRole('link', { name: /Claude/ }));

  await expect.element(screen.getByRole('button', { name: /Claude/ })).toBeVisible();
  await expect.element(screen.getByText('Endpoint', theEndpoint)).not.toBeInTheDocument();
});

test('a draft in flight survives the inspector closing and answers the next selection', async () => {
  const screen = await renderGateway();

  await expect.element(screen.getByLabelText('Add a virtual model')).toBeVisible();
  await userEvent.click(screen.getByLabelText('Add a virtual model'));
  await screen.getByRole('textbox', { name: 'Name' }).fill('Fast Sonnet');

  clickedThePane(screen.container);

  await expect.element(screen.getByRole('textbox', { name: 'Name' })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /Fast Sonnet/ }));

  await expect.element(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Fast Sonnet');
});
