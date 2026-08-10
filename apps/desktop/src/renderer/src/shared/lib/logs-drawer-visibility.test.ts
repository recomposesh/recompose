import { expect, test, vi } from 'vitest';

async function aFreshDrawer() {
  vi.resetModules();

  return import('.');
}

test('the drawer stands shut with the app, because a person opens it when they want to read', async () => {
  const drawer = await aFreshDrawer();

  expect(drawer.logsDrawerOpen()).toBe(false);
});

test('turning it over opens the drawer', async () => {
  const drawer = await aFreshDrawer();

  drawer.toggleLogsDrawer();

  expect(drawer.logsDrawerOpen()).toBe(true);
});

test('turning it over again shuts it, so one answer drives the control both ways', async () => {
  const drawer = await aFreshDrawer();

  drawer.toggleLogsDrawer();
  drawer.toggleLogsDrawer();

  expect(drawer.logsDrawerOpen()).toBe(false);
});

test('closing an open drawer shuts it', async () => {
  const drawer = await aFreshDrawer();

  drawer.toggleLogsDrawer();
  drawer.closeLogsDrawer();

  expect(drawer.logsDrawerOpen()).toBe(false);
});

test('closing a shut drawer leaves it shut, so a drag that collapses it never reopens it', async () => {
  const drawer = await aFreshDrawer();

  drawer.closeLogsDrawer();
  drawer.closeLogsDrawer();

  expect(drawer.logsDrawerOpen()).toBe(false);
});

test('closing an open drawer tells the readers, so the menu item unchecks with it', async () => {
  const drawer = await aFreshDrawer();
  let heard = 0;

  drawer.toggleLogsDrawer();
  drawer.subscribeToLogsDrawerVisibility(() => {
    heard += 1;
  });
  drawer.closeLogsDrawer();

  expect(heard).toBe(1);
});

test('closing a shut drawer tells nobody, so a close that changes nothing repaints nothing', async () => {
  const drawer = await aFreshDrawer();
  let heard = 0;

  drawer.subscribeToLogsDrawerVisibility(() => {
    heard += 1;
  });
  drawer.closeLogsDrawer();

  expect(heard).toBe(0);
});

test('a reader hears every turn, so the footer control and the menu item never disagree', async () => {
  const drawer = await aFreshDrawer();
  let heard = 0;

  drawer.subscribeToLogsDrawerVisibility(() => {
    heard += 1;
  });
  drawer.toggleLogsDrawer();
  drawer.toggleLogsDrawer();

  expect(heard).toBe(2);
});

test('every reader hears the same turn, so two controls repaint together', async () => {
  const drawer = await aFreshDrawer();
  const heard: string[] = [];

  drawer.subscribeToLogsDrawerVisibility(() => {
    heard.push('footer');
  });
  drawer.subscribeToLogsDrawerVisibility(() => {
    heard.push('menu');
  });
  drawer.toggleLogsDrawer();

  expect(heard).toEqual(['footer', 'menu']);
});

test('letting go stops the hearing, so a gone surface never repaints', async () => {
  const drawer = await aFreshDrawer();
  let heard = 0;

  const letGo = drawer.subscribeToLogsDrawerVisibility(() => {
    heard += 1;
  });

  letGo();
  drawer.toggleLogsDrawer();

  expect(heard).toBe(0);
});
