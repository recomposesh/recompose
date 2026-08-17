import type { ElectronApplication } from '@playwright/test';

import { expect } from '@playwright/test';

/**
 * Runs an application-menu item by its label.
 *
 * @summary Playwright drives no native menu, so a scenario that presses a shortcut reaches the
 * item the same way the keyboard would and runs the action hanging off it.
 */
export async function chooseMenuItem(app: ElectronApplication, label: string): Promise<void> {
  await app.evaluate(({ Menu, BrowserWindow }, wanted) => {
    type MenuItems = NonNullable<ReturnType<typeof Menu.getApplicationMenu>>['items'];

    const isMenuAction = (value: unknown): value is () => void => typeof value === 'function';

    const withNested = (items: MenuItems): MenuItems =>
      items.flatMap((item) => [item, ...withNested(item.submenu?.items ?? [])]);

    BrowserWindow.getAllWindows().at(0)?.focus();

    const applicationMenu = Menu.getApplicationMenu();

    if (applicationMenu === null) {
      throw new Error('the application menu is absent, so it carries no item to choose');
    }

    const chosen = withNested(applicationMenu.items).find((item) => item.label === wanted);

    if (chosen === undefined) {
      throw new Error(`the application menu carries no ${wanted} item`);
    }

    if (!isMenuAction(chosen.click)) {
      throw new Error(`the ${wanted} menu item carries no action to run`);
    }

    chosen.click();
  }, label);
}

/**
 * Whether a menu item's check mark stands, and nothing at all while no such item exists.
 *
 * @summary The reading answers absence rather than throwing on it, because a menu that rebuilds
 * behind a state change is worth waiting on and a step that threw could never wait.
 */
export async function menuItemChecked(
  app: ElectronApplication,
  label: string,
): Promise<boolean | null> {
  return app.evaluate(({ Menu }, wanted) => {
    type MenuItems = NonNullable<ReturnType<typeof Menu.getApplicationMenu>>['items'];

    const withNested = (items: MenuItems): MenuItems =>
      items.flatMap((item) => [item, ...withNested(item.submenu?.items ?? [])]);

    const applicationMenu = Menu.getApplicationMenu();

    if (applicationMenu === null) {
      return null;
    }

    const found = withNested(applicationMenu.items).find((item) => item.label === wanted);

    return found === undefined ? null : found.checked;
  }, label);
}

type MenuPath = readonly string[];

type MenuItemFacts = {
  enabled: boolean;
  accelerator: string | null;
  clicked: boolean;
};

/**
 * Reads or runs the item a menu path names, and answers nothing while no such item stands.
 *
 * @summary Every path-taking reader rides this one walk, because Usage now names both a menu and
 * a navigation row, so a bare label could read the wrong one. The walk descends level by level
 * from the top of the bar, the way a person opens the menus.
 */
async function menuItemAt(
  app: ElectronApplication,
  path: MenuPath,
  run: boolean,
): Promise<MenuItemFacts | null> {
  return app.evaluate(
    ({ Menu, BrowserWindow }, asked) => {
      type MenuItems = NonNullable<ReturnType<typeof Menu.getApplicationMenu>>['items'];
      type OneMenuItem = MenuItems[number];

      const isMenuAction = (value: unknown): value is () => void => typeof value === 'function';

      const walked = (items: MenuItems, segments: readonly string[]): OneMenuItem | null => {
        const [head, ...rest] = segments;
        const stood = items.find((item) => item.label === head);

        if (stood === undefined) {
          return null;
        }

        return rest.length === 0 ? stood : walked(stood.submenu?.items ?? [], rest);
      };

      const ran = (item: OneMenuItem): void => {
        BrowserWindow.getAllWindows().at(0)?.focus();

        if (!isMenuAction(item.click)) {
          throw new Error(`the ${asked.path.join(' > ')} menu item carries no action to run`);
        }

        item.click();
      };

      const applicationMenu = Menu.getApplicationMenu();
      const stood = applicationMenu === null ? null : walked(applicationMenu.items, asked.path);

      if (stood === null) {
        return null;
      }

      if (asked.run) {
        ran(stood);
      }

      return {
        enabled: stood.enabled,
        accelerator: stood.accelerator ?? null,
        clicked: asked.run,
      };
    },
    { path, run },
  );
}

/** Whether the item a menu path names renders available, or nothing while no such item stands. */
export async function menuItemEnabled(
  app: ElectronApplication,
  path: MenuPath,
): Promise<boolean | null> {
  const facts = await menuItemAt(app, path, false);

  return facts === null ? null : facts.enabled;
}

/** The chord the item a menu path names prints, or nothing while no such item stands. */
export async function menuItemAccelerator(
  app: ElectronApplication,
  path: MenuPath,
): Promise<string | null> {
  const facts = await menuItemAt(app, path, false);

  return facts === null ? null : facts.accelerator;
}

/**
 * Runs the item a menu path names, waiting for a menu that is still building.
 *
 * @summary A scenario's first step can reach the bar before boot installs it, and a menu that
 * rebuilds behind a state change is worth waiting on, so the pick polls the path before running.
 */
export async function chooseMenuItemAt(app: ElectronApplication, path: MenuPath): Promise<void> {
  await expect
    .poll(async () => menuItemAt(app, path, false), {
      message: `the application menu carries no ${path.join(' > ')} item`,
    })
    .not.toBeNull();

  await menuItemAt(app, path, true);
}

/** The top-level labels the menu bar stands, in their standing order. */
export async function menuBarShape(app: ElectronApplication): Promise<string[]> {
  return app.evaluate(({ Menu }) => {
    const applicationMenu = Menu.getApplicationMenu();

    return (applicationMenu?.items ?? []).map((item) => item.label);
  });
}
