import type { EngineVirtualModel } from '@recompose/contracts';

import { describe, expect, it } from 'vitest';

import {
  aJudgedModel,
  childServing,
  judgeNaming,
  servingJudged,
} from './gateway-judged-router.testkit';

const DIRECTIVE = 'A stack trace is code however politely it is asked about.';

function judgedUnder(directive: string): EngineVirtualModel {
  const model = aJudgedModel();
  const router = model.routing.nodes['ladder'];

  if (router?.kind !== 'router' || router.policy.mode !== 'conditional') {
    throw new Error('the judged model no longer stands over a conditional router');
  }

  return {
    ...model,
    routing: {
      ...model.routing,
      nodes: {
        ...model.routing.nodes,
        ladder: { ...router, policy: { ...router.policy, directive } },
      },
    },
  };
}

describe('the standing directive one conditional router hands its judge', () => {
  it('travels to the judge with the branches it steers', async () => {
    const scene = servingJudged(judgedUnder(DIRECTIVE), judgeNaming('code'), childServing());

    await scene.ask();

    expect(scene.askedJudge().at(0)?.body).toContain(DIRECTIVE);
  });

  it('reaches the judge alone, never the child that carries the request', async () => {
    const scene = servingJudged(judgedUnder(DIRECTIVE), judgeNaming('code'), childServing());

    await scene.ask();

    expect(scene.sent.filter((one) => one.body.includes(DIRECTIVE))).toHaveLength(1);
  });

  it('is absent from the ask a router that wrote none makes', async () => {
    const scene = servingJudged(aJudgedModel(), judgeNaming('code'), childServing());

    await scene.ask();

    expect(scene.askedJudge().at(0)?.body).not.toContain(DIRECTIVE);
  });
});
