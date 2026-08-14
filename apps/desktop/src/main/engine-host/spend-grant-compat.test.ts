import { expect, test } from 'vitest';

import { resolveSpendGrant } from './spend-grant';
import { aggregatorRow, contextFor, pointingAt, storageHolding } from './spend-grant.testkit';

test('a configured compatibility model marks only its matching credentialed spend', async () => {
  const userDataPath = await storageHolding(
    [pointingAt(aggregatorRow.id, 'deepseek-v4-flash(high)')],
    [aggregatorRow],
    undefined,
    {
      openrouter: {
        aliases: [
          { name: 'deepseek-v4-flash', alias: 'deepseek-alias', isCompat: true },
          { name: 'native-model', alias: 'native-alias' },
        ],
      },
    },
  );

  await expect(
    resolveSpendGrant(contextFor(userDataPath), 'personal', 'fast', 'seat'),
  ).resolves.toMatchObject({ spend: { custody: 'credentialed', isCompat: true } });
});
