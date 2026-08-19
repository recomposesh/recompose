import { routingSchema } from '@recompose/contracts';
import { describe, expect, test } from 'vitest';

import { gatewayDirectingJudge } from './routing-edits-directive';
import { codex, judged, policyOf, routingOf } from './routing-edits.testkit';

const DIRECTIVE = 'A stack trace is code however politely it is asked about.';

function conditionalIn(gateway = judged(), routerId = 'r1') {
  const policy = policyOf(routingOf(gateway), routerId);

  return policy?.mode === 'conditional' ? policy : undefined;
}

function conditionalAfter(directive: string, gateway = judged(), routerId = 'r1') {
  return conditionalIn(gatewayDirectingJudge(gateway, 'fast', routerId, directive), routerId);
}

function routedPart(policy: ReturnType<typeof conditionalIn>) {
  return { judge: policy?.judge, branches: policy?.branches, elseChild: policy?.elseChild };
}

describe('the standing directive a person writes for one router judge', () => {
  test('stores exactly the words they typed, trimmed', () => {
    expect(conditionalAfter(`  ${DIRECTIVE}  `)?.directive).toBe(DIRECTIVE);
  });

  test('leaves the judge, the branches, and the else child standing as they were', () => {
    expect(routedPart(conditionalAfter(DIRECTIVE))).toEqual(routedPart(conditionalIn(judged())));
  });

  test('a table carrying one is a table the stored shape still takes', () => {
    const written = gatewayDirectingJudge(judged(), 'fast', 'r1', DIRECTIVE);

    expect(routingSchema.safeParse(routingOf(written)).success).toBe(true);
  });

  test('erased leaves the router carrying none at all, rather than an empty one', () => {
    const written = gatewayDirectingJudge(judged(), 'fast', 'r1', DIRECTIVE);
    const cleared = gatewayDirectingJudge(written, 'fast', 'r1', '   ');
    const policy = policyOf(routingOf(cleared), 'r1');

    expect(policy?.mode === 'conditional' ? 'directive' in policy : true).toBe(false);
  });

  test('a router that reads no request has no judge to direct, so the table stands unchanged', () => {
    expect(gatewayDirectingJudge(codex, 'fast', 'node-fast', DIRECTIVE)).toEqual(codex);
  });
});
