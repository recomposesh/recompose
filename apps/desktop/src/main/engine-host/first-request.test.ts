import type { SpendGrant } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import type { SpendGrantFor } from './engine-spend';

import { noticingTheFirstGrant } from './first-request';

const resolved: SpendGrant = {
  verdict: 'resolved',
  providerOrigin: 'https://api.anthropic.com',
  spend: { custody: 'credentialed', provider: 'anthropic', credential: 'sk-verysecret' },
};

function answering(grant: SpendGrant): SpendGrantFor {
  return async () => Promise.resolve(grant);
}

describe('noticing the first grant', () => {
  test('the first resolved grant is reported exactly once across every later turn', async () => {
    let reports = 0;
    const grantFor = noticingTheFirstGrant(answering(resolved), () => {
      reports += 1;
    });

    await grantFor('personal', 'fast', 't1');
    await grantFor('personal', 'fast', 't1');
    await grantFor('work', 'careful', 't1');

    expect(reports).toBe(1);
  });

  test('a refusal reports nothing, because no request reached a target', async () => {
    let reports = 0;
    const grantFor = noticingTheFirstGrant(answering({ verdict: 'missing-target' }), () => {
      reports += 1;
    });

    await grantFor('personal', 'fast', 't1');
    await grantFor('personal', 'fast', 't1');

    expect(reports).toBe(0);
  });

  test('a refusal never closes the latch, so a later resolved grant still reports', async () => {
    let reports = 0;
    const grants: SpendGrant[] = [{ verdict: 'missing-credential' }, resolved, resolved];
    const grantFor = noticingTheFirstGrant(
      async () => Promise.resolve(grants.shift() ?? resolved),
      () => {
        reports += 1;
      },
    );

    await grantFor('personal', 'fast', 't1');
    expect(reports).toBe(0);

    await grantFor('personal', 'fast', 't1');
    await grantFor('personal', 'fast', 't1');
    expect(reports).toBe(1);
  });
});

describe('what the latch hands on either way', () => {
  test('the grant passes through untouched', async () => {
    const grantFor = noticingTheFirstGrant(answering(resolved), () => {});

    expect(await grantFor('personal', 'fast', 't1')).toEqual(resolved);
  });

  test('the route node the child named reaches the resolver behind the latch', async () => {
    const naming: SpendGrantFor = async (slug, virtualModel, routeNode) =>
      Promise.resolve({
        verdict: 'resolved',
        providerOrigin: `https://${slug}.example/${virtualModel}/${routeNode}`,
        spend: { custody: 'open' },
      });

    const grantFor = noticingTheFirstGrant(naming, () => {});

    expect(await grantFor('personal', 'fast', 'spare')).toMatchObject({
      providerOrigin: 'https://personal.example/fast/spare',
    });
  });
});
