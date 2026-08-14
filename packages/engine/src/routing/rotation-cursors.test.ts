import { describe, expect, test } from 'vitest';

import { createRotationCursors } from './rotation-cursors';

describe('the turn a round-robin router remembers between requests', () => {
  test('a router that never spun starts at the child it declared first', () => {
    const cursors = createRotationCursors();

    expect(cursors.cursorAt({ slug: 'main', virtualModel: 'fast', routeNode: 'ladder' })).toBe(0);
  });

  test('a router remembers the turn it handed to the request after it', () => {
    const cursors = createRotationCursors();
    const seat = { slug: 'main', virtualModel: 'fast', routeNode: 'ladder' };

    cursors.advanceTo(seat, 3);

    expect(cursors.cursorAt(seat)).toBe(3);
  });

  test('two virtual models over the same router spin apart', () => {
    const cursors = createRotationCursors();

    cursors.advanceTo({ slug: 'main', virtualModel: 'fast', routeNode: 'ladder' }, 5);

    expect(cursors.cursorAt({ slug: 'main', virtualModel: 'slow', routeNode: 'ladder' })).toBe(0);
  });

  test('two gateways over the same virtual model spin apart', () => {
    const cursors = createRotationCursors();

    cursors.advanceTo({ slug: 'main', virtualModel: 'fast', routeNode: 'ladder' }, 5);

    expect(cursors.cursorAt({ slug: 'spare', virtualModel: 'fast', routeNode: 'ladder' })).toBe(0);
  });

  test('two routers inside one virtual model spin apart', () => {
    const cursors = createRotationCursors();

    cursors.advanceTo({ slug: 'main', virtualModel: 'fast', routeNode: 'top' }, 5);

    expect(cursors.cursorAt({ slug: 'main', virtualModel: 'fast', routeNode: 'inner' })).toBe(0);
  });
});
