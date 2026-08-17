import { describe, expect, it } from 'vitest';

import { launchAtLoginRow } from './row-state';

describe('the launch-at-login row tells absent apart from unavailable', () => {
  it('never renders where the platform will never support a login item', () => {
    expect(launchAtLoginRow('unsupported').rendered).toBe(false);
  });

  it('renders and moves where the operating system offers a login item', () => {
    expect(launchAtLoginRow('available')).toEqual({ rendered: true, inert: false });
  });

  it('renders inert and names the development build where the app runs unpackaged', () => {
    const row = launchAtLoginRow('unpackaged');

    expect(row.rendered).toBe(true);
    expect(row.inert).toBe(true);
    expect(row.reason).toMatch(/development build/i);
  });
});
