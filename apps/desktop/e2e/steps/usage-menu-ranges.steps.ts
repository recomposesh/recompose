import { expect } from '@playwright/test';

import { chooseMenuItemAt, menuItemAccelerator, menuItemEnabled } from '../app-menu';
import { Given, Then, When } from '../fixtures';
import { rememberToggledMenuItem } from '../scenario-memory';
import { rangeBecomes } from '../usage-screen';

const RANGE_ROWS = [
  'Last Hour',
  'Last 24 Hours',
  'Last 7 Days',
  'Last 30 Days',
  'This Week',
  'This Month',
] as const;

const USAGE_MENU_PICKS: Record<string, string> = {
  'Last Hour': 'Last Hour',
  'Last 24 Hours': 'Last 24 Hours',
  'Last 7 Days': 'Last 7 Days',
  'Last 30 Days': 'Last 30 Days',
  'This Week': 'This Week',
  'This Month': 'This Month',
  'Custom Range': 'Custom Range…',
  'Show Data Table': 'Show Data Table',
  'Refresh Usage': 'Refresh Usage',
};

for (const [spoken, label] of Object.entries(USAGE_MENU_PICKS)) {
  When(`the person picks ${spoken} from the Usage menu`, async ({ electronApp, page }) => {
    rememberToggledMenuItem(page, label);
    await chooseMenuItemAt(electronApp, ['Usage', label]);
  });
}

Given('the explorer stands on the last 24 hours', async ({ page }) => {
  await rangeBecomes(page, '24h');
});

Given('the explorer stands on the last 7 days', async ({ page }) => {
  await rangeBecomes(page, '7d');
});

Then(
  "the Usage menu's range group names Last Hour, Last 24 Hours, Last 7 Days, Last 30 Days, This Week, This Month, and Custom Range",
  async ({ electronApp }) => {
    await expect
      .poll(async () => menuItemEnabled(electronApp, ['Usage', 'Custom Range…']))
      .not.toBeNull();

    for (const row of RANGE_ROWS) {
      expect(await menuItemEnabled(electronApp, ['Usage', row])).not.toBeNull();
    }
  },
);

Then(
  'the address reads the same search the on-screen range control would write',
  async ({ page }) => {
    await expect(
      page.getByRole('radiogroup', { name: 'Range' }).getByRole('radio', { name: '7d' }),
    ).toBeChecked();
    await expect.poll(() => new URL(page.url()).hash).toContain('range=7d');
  },
);

Then(
  'the six preset ranges print 1 through 6 under the command and Option modifiers, in menu order',
  async ({ electronApp }) => {
    for (const [seat, row] of RANGE_ROWS.entries()) {
      expect(await menuItemAccelerator(electronApp, ['Usage', row])).toBe(
        `Alt+CmdOrCtrl+${String(seat + 1)}`,
      );
    }
  },
);

Then('Custom Range prints no shortcut', async ({ electronApp }) => {
  expect(await menuItemAccelerator(electronApp, ['Usage', 'Custom Range…'])).toBeNull();
});

Then('the explorer stands on the custom window with its calendar open', async ({ page }) => {
  await expect(page.getByLabel('Custom window')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Apply' })).toBeVisible();
});
