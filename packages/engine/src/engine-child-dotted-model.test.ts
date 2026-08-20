import type { EngineRouteNode, EngineVirtualModel } from '@recompose/contracts';

import {
  engineBranchPinReportSchema,
  engineCooldownReportSchema,
  engineReportSchema,
  engineSpendRequestSchema,
  engineTrafficReportSchema,
} from '@recompose/contracts';
import { describe, expect, test } from 'vitest';

import type { Parent } from './engine-child.testkit';
import type { ParentPort } from './parent-port';

import { urlOf } from './asked-url.testkit';
import { attachEngineChild } from './engine-child';
import { aParent, reportsReach } from './engine-child.testkit';
import {
  aCredentialedGrant,
  aGatewayHolding,
  aLoopbackCapturing,
  openedApp,
} from './gateway-app.testkit';
import { childOverloaded, childServing, judgeNaming } from './gateway-judged-router.testkit';
import { ORIGIN } from './gateway-router.testkit';

const DOTTED_MODEL = 'claude-5.6-sol';

const JUDGE_ORIGIN = 'http://judge.test';

const CODER_ORIGIN = 'http://coder.test';

const ORIGIN_PER_NODE: Readonly<Record<string, string>> = {
  judge: JUDGE_ORIGIN,
  coder: CODER_ORIGIN,
  catchall: 'http://catchall.test',
};

function aBoundTarget(providerModel: string): EngineRouteNode {
  return { kind: 'target', standing: { standing: 'bound', providerModel } };
}

function aDottedModelUnderAJudge(): EngineVirtualModel {
  return {
    id: DOTTED_MODEL,
    displayName: 'Claude 5.6 Sol',
    routing: {
      entry: 'ladder',
      nodes: {
        ladder: {
          kind: 'router',
          policy: {
            mode: 'conditional',
            judge: 'judge',
            branches: [{ label: 'code', rule: 'asks to write or change code', child: 'coder' }],
            elseChild: 'catchall',
            judgeBoundMs: 2_000,
            rejudgeEveryRequest: false,
          },
          children: ['coder', 'catchall'],
        },
        judge: aBoundTarget('gpt-5-nano'),
        coder: aBoundTarget('gpt-5-codex'),
        catchall: aBoundTarget('gpt-5'),
      },
    },
  };
}

function answeringPerOrigin(): { reached: string[]; fetchLike: typeof fetch } {
  const reached: string[] = [];
  const judge = judgeNaming('code');
  const overloaded = childOverloaded();
  const serving = childServing();

  return {
    reached,
    fetchLike: async (input) => {
      const url = urlOf(input);

      reached.push(url);

      if (url.startsWith(JUDGE_ORIGIN)) return Promise.resolve(judge());

      return Promise.resolve(url.startsWith(CODER_ORIGIN) ? overloaded() : serving());
    },
  };
}

function aParentGrantingEveryAsk(): Parent {
  const parent = aParent();
  const port: ParentPort = {
    postMessage: (message) => {
      parent.port.postMessage(message);

      const ask = engineSpendRequestSchema.safeParse(message);

      if (!ask.success) return;

      parent.send({
        kind: 'spend-grant',
        answers: ask.data.id,
        grant: aCredentialedGrant(ORIGIN_PER_NODE[ask.data.routeNode] ?? 'http://nowhere.test'),
      });
    },
    on: parent.port.on,
  };

  return { reports: parent.reports, send: parent.send, port };
}

function aChildServingTheDottedModel() {
  const parent = aParentGrantingEveryAsk();
  const capturing = aLoopbackCapturing();
  const answering = answeringPerOrigin();

  attachEngineChild(parent.port, capturing.openListeners, answering.fetchLike);
  parent.send({ kind: 'start', id: 'd1', gateway: aGatewayHolding(aDottedModelUnderAJudge()) });

  return { parent, capturing, answering };
}

function statesIn(reports: readonly unknown[]) {
  return reports.flatMap((report) => {
    const read = engineReportSchema.safeParse(report);

    return read.success ? [read.data] : [];
  });
}

function trafficIn(reports: readonly unknown[]) {
  return reports.flatMap((report) => {
    const read = engineTrafficReportSchema.safeParse(report);

    return read.success ? [read.data] : [];
  });
}

function talliesIn(reports: readonly unknown[]) {
  return reports.flatMap((report) => {
    const read = engineBranchPinReportSchema.safeParse(report);

    return read.success ? [read.data] : [];
  });
}

function cooldownsIn(reports: readonly unknown[]) {
  return reports.flatMap((report) => {
    const read = engineCooldownReportSchema.safeParse(report);

    return read.success ? [read.data] : [];
  });
}

async function servedOneRequest(child: ReturnType<typeof aChildServingTheDottedModel>) {
  await reportsReach(child.parent, 1);

  const answer = await openedApp(child.capturing).request(`${ORIGIN}/v1/messages`, {
    method: 'POST',
    body: JSON.stringify({
      model: DOTTED_MODEL,
      messages: [{ role: 'user', content: 'rename this function' }],
    }),
  });

  await answer.text();

  return answer;
}

describe('a stored gateway whose virtual model wears the dots a real model name carries', () => {
  test('the start directive is read rather than refused, so the gateway comes up', async () => {
    const child = aChildServingTheDottedModel();

    await reportsReach(child.parent, 1);

    expect(statesIn(child.parent.reports)).toEqual([
      { kind: 'state', answers: 'd1', slug: 'codex', state: { status: 'running' } },
    ]);
  });

  test('a request through it reaches the branch its judge named, then the else beneath it', async () => {
    const child = aChildServingTheDottedModel();

    const answer = await servedOneRequest(child);

    expect(answer.status).toBe(200);
    expect(child.answering.reached.map((url) => new URL(url).host)).toEqual([
      'judge.test',
      'coder.test',
      'catchall.test',
    ]);
  });

  test('every traffic word it files names the very id the client sent', async () => {
    const child = aChildServingTheDottedModel();

    await servedOneRequest(child);

    const traffic = trafficIn(child.parent.reports);

    expect(traffic.map((one) => one.virtualModel)).not.toEqual([]);
    expect(new Set(traffic.map((one) => one.virtualModel))).toEqual(new Set([DOTTED_MODEL]));
  });

  test('the branch the judge decided is pinned under that same id', async () => {
    const child = aChildServingTheDottedModel();

    await servedOneRequest(child);

    expect(talliesIn(child.parent.reports)).toEqual([
      {
        kind: 'branch-pins',
        slug: 'codex',
        virtualModel: DOTTED_MODEL,
        routeNode: 'ladder',
        pinned: { coder: 1 },
      },
    ]);
  });

  test('the child that stood down cools under that same id', async () => {
    const child = aChildServingTheDottedModel();

    await servedOneRequest(child);

    expect(
      cooldownsIn(child.parent.reports).map(({ virtualModel, routeNode }) => ({
        virtualModel,
        routeNode,
      })),
    ).toEqual([{ virtualModel: DOTTED_MODEL, routeNode: 'coder' }]);
  });
});
