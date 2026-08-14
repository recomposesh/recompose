import { fc, test as propertyTest } from '@fast-check/vitest';
import { describe, expect, test } from 'vitest';

import { nextFailoverChild, nextRoundRobinChild } from './policies';

const everyChildEligible = () => true;

const childrenArb = fc.uniqueArray(fc.string({ minLength: 1, maxLength: 6 }), {
  minLength: 1,
  maxLength: 6,
});

function spreadOver(
  children: readonly string[],
  requests: number,
  startingCursor: number,
): readonly string[] {
  const served: string[] = [];
  let cursor = startingCursor;

  for (let request = 0; request < requests; request += 1) {
    const spun = nextRoundRobinChild(children, everyChildEligible, cursor);

    cursor = spun.cursor;

    if (spun.child !== undefined) served.push(spun.child);
  }

  return served;
}

function countsPerChild(served: readonly string[], children: readonly string[]): readonly number[] {
  return children.map((child) => served.filter((each) => each === child).length);
}

describe('the child a failover ladder offers next', () => {
  test('a ladder offers the child it declared first', () => {
    expect(nextFailoverChild(['first', 'second', 'third'], everyChildEligible)).toBe('first');
  });

  test('a ladder passes over a child that cannot serve and offers the next one declared', () => {
    const eligible = (child: string) => child !== 'first';

    expect(nextFailoverChild(['first', 'second', 'third'], eligible)).toBe('second');
  });

  test('a ladder whose children all stand down offers no child', () => {
    expect(nextFailoverChild(['first', 'second'], () => false)).toBeUndefined();
  });

  test('a ladder holding no child offers no child', () => {
    expect(nextFailoverChild([], everyChildEligible)).toBeUndefined();
  });

  propertyTest.prop([childrenArb, fc.nat({ max: 5 })])(
    'a ladder always offers the earliest child that can serve',
    (children, standDown) => {
      const blocked = new Set(children.slice(0, standDown));
      const eligible = (child: string) => !blocked.has(child);
      const offered = nextFailoverChild(children, eligible);

      expect(offered).toBe(children.find(eligible));
    },
  );

  test('a three-child ladder whose middle stands cooling still offers in declared order', () => {
    const eligible = (child: string) => child !== 'middle';

    expect(nextFailoverChild(['first', 'middle', 'last'], eligible)).toBe('first');
    expect(nextFailoverChild(['middle', 'first', 'last'], eligible)).toBe('first');
    expect(nextFailoverChild(['middle', 'last'], eligible)).toBe('last');
  });
});

describe('the child a round-robin router offers next', () => {
  test('a router hands the turn on so two requests reach two different children', () => {
    const first = nextRoundRobinChild(['left', 'right'], everyChildEligible, 0);
    const second = nextRoundRobinChild(['left', 'right'], everyChildEligible, first.cursor);

    expect([first.child, second.child]).toEqual(['left', 'right']);
  });

  test('a child that stands cooling never consumes the turn it would have taken', () => {
    const eligible = (child: string) => child !== 'left';

    const first = nextRoundRobinChild(['left', 'right', 'far'], eligible, 0);
    const second = nextRoundRobinChild(['left', 'right', 'far'], eligible, first.cursor);

    expect([first.child, second.child]).toEqual(['right', 'far']);
  });

  test('a router whose children all stand down offers no child and holds its turn', () => {
    const spun = nextRoundRobinChild(['left', 'right'], () => false, 3);

    expect(spun).toEqual({ child: undefined, cursor: 3 });
  });

  test('a router holding no child offers no child and holds its turn', () => {
    const spun = nextRoundRobinChild([], everyChildEligible, 7);

    expect(spun).toEqual({ child: undefined, cursor: 7 });
  });

  test('a turn already advanced past the children wraps back to the first', () => {
    const spun = nextRoundRobinChild(['left', 'right'], everyChildEligible, 4);

    expect(spun).toEqual({ child: 'left', cursor: 5 });
  });

  test('two children over four requests alternate exactly', () => {
    expect(spreadOver(['left', 'right'], 4, 0)).toEqual(['left', 'right', 'left', 'right']);
  });

  test('three children over six requests each take two turns', () => {
    expect(
      countsPerChild(spreadOver(['one', 'two', 'three'], 6, 0), ['one', 'two', 'three']),
    ).toEqual([2, 2, 2]);
  });

  propertyTest.prop([childrenArb, fc.integer({ min: 1, max: 30 }), fc.nat({ max: 40 })])(
    'a router spreads requests so no child serves more than one ahead of another',
    (children, requests, startingCursor) => {
      const counts = countsPerChild(spreadOver(children, requests, startingCursor), children);

      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    },
  );

  propertyTest.prop([childrenArb, fc.nat({ max: 40 })])(
    'a router never offers a child that cannot serve',
    (children, startingCursor) => {
      const blocked = new Set(children.slice(0, 1));
      const spun = nextRoundRobinChild(children, (child) => !blocked.has(child), startingCursor);

      expect(spun.child === undefined || !blocked.has(spun.child)).toBe(true);
    },
  );
});
