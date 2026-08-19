import { describe, expect, test } from 'vitest';

import { routingSchema } from './gateway-routing';

type Refusal = { code: string; path: PropertyKey[]; message: string };

const CODE_BRANCH = { label: 'code', rule: 'the request asks for code', child: 'coder' };

function targetNode(accountId: string): Record<string, unknown> {
  return { kind: 'target', accountId, providerModel: 'a-real-model' };
}

function conditionalPolicy(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    mode: 'conditional',
    judge: 'arbiter',
    branches: [CODE_BRANCH],
    elseChild: 'chatter',
    judgeBoundMs: 2000,
    rejudgeEveryRequest: false,
    ...over,
  };
}

function routingSortedBy(policy: Record<string, unknown>): Record<string, unknown> {
  return {
    entry: 'sorter',
    nodes: {
      sorter: { kind: 'router', policy, children: ['coder', 'chatter'] },
      coder: targetNode('acc-claude-max'),
      chatter: targetNode('acc-openrouter'),
      arbiter: targetNode('acc-cheap-judge'),
    },
  };
}

function routingSortedInto(branches: readonly Record<string, unknown>[]): Record<string, unknown> {
  return {
    entry: 'sorter',
    nodes: {
      sorter: {
        kind: 'router',
        policy: conditionalPolicy({ branches }),
        children: ['coder', 'drafter', 'chatter'],
      },
      coder: targetNode('acc-claude-max'),
      drafter: targetNode('acc-openrouter'),
      chatter: targetNode('acc-fallback'),
      arbiter: targetNode('acc-cheap-judge'),
    },
  };
}

function refusalsFor(routing: Record<string, unknown>): Refusal[] {
  const parsed = routingSchema.safeParse(routing);

  return parsed.success
    ? []
    : parsed.error.issues.map(({ code, path, message }) => ({ code, path: [...path], message }));
}

describe('a router that asks a judge which branch a request belongs to', () => {
  test('stores the judge, the labeled branches, the else, the budget, and the re-judge choice', () => {
    const policy = conditionalPolicy();
    const parsed = routingSchema.parse(routingSortedBy(policy));

    expect(parsed.nodes['sorter']).toEqual({
      kind: 'router',
      policy,
      children: ['coder', 'chatter'],
    });
  });

  test('reaches its judge through the policy that names it, though no children array holds it', () => {
    expect(refusalsFor(routingSortedBy(conditionalPolicy()))).toEqual([]);
  });
});

describe('a conditional router whose branches name what its children do not hold', () => {
  test('a router carrying no else at all is refused, and the refusal names the else', () => {
    const elseless = conditionalPolicy();

    delete elseless['elseChild'];

    expect(refusalsFor(routingSortedBy(elseless)).map((refusal) => refusal.path)).toEqual([
      ['nodes', 'sorter', 'policy', 'elseChild'],
    ]);
  });

  test('an else standing outside the children is refused, and the refusal names the else', () => {
    const strayElse = conditionalPolicy({ elseChild: 'nowhere' });

    expect(refusalsFor(routingSortedBy(strayElse))).toEqual([
      {
        code: 'custom',
        path: ['nodes', 'sorter', 'policy', 'elseChild'],
        message: "the else child nowhere stands outside this router's children",
      },
    ]);
  });

  test('a branch standing outside the children is refused, and the refusal names the branch', () => {
    const strayBranch = conditionalPolicy({
      branches: [{ label: 'code', rule: 'the request asks for code', child: 'nowhere' }],
    });

    expect(refusalsFor(routingSortedBy(strayBranch))).toEqual([
      {
        code: 'custom',
        path: ['nodes', 'sorter', 'policy', 'branches'],
        message: "the code branch names nowhere, standing outside this router's children",
      },
    ]);
  });
});

describe('the judge a conditional router binds', () => {
  test('a judge naming no node in the table is refused, and the refusal names the judge', () => {
    const stranded = {
      entry: 'sorter',
      nodes: {
        sorter: {
          kind: 'router',
          policy: conditionalPolicy({ judge: 'nowhere' }),
          children: ['coder', 'chatter'],
        },
        coder: targetNode('acc-claude-max'),
        chatter: targetNode('acc-openrouter'),
      },
    };

    expect(refusalsFor(stranded)).toEqual([
      {
        code: 'custom',
        path: ['nodes', 'sorter', 'policy', 'judge'],
        message: 'the judge nowhere names no node in the table',
      },
    ]);
  });

  test('a judge its own router also lists as a child is refused, and the refusal names it', () => {
    const listed = {
      entry: 'sorter',
      nodes: {
        sorter: {
          kind: 'router',
          policy: conditionalPolicy(),
          children: ['coder', 'chatter', 'arbiter'],
        },
        coder: targetNode('acc-claude-max'),
        chatter: targetNode('acc-openrouter'),
        arbiter: targetNode('acc-cheap-judge'),
      },
    };

    expect(refusalsFor(listed)).toEqual([
      {
        code: 'custom',
        path: ['nodes', 'sorter', 'policy', 'judge'],
        message: 'the judge arbiter also stands as a child',
      },
    ]);
  });
});

describe('the declared order a walk reads never meets the judge', () => {
  test('a served table lists the judge in no declared order, though the table still holds it', () => {
    const parsed = routingSchema.parse(routingSortedBy(conditionalPolicy()));
    const declared = Object.values(parsed.nodes).flatMap((node) =>
      node.kind === 'router' ? node.children : [],
    );

    expect(declared).toEqual(['coder', 'chatter']);
  });

  test('a judge some other router lists as a child is refused, and the refusal names it', () => {
    const borrowed = {
      entry: 'sorter',
      nodes: {
        sorter: {
          kind: 'router',
          policy: conditionalPolicy({
            branches: [{ label: 'code', rule: 'the request asks for code', child: 'pool' }],
          }),
          children: ['pool', 'chatter'],
        },
        pool: { kind: 'router', policy: { mode: 'failover' }, children: ['coder', 'arbiter'] },
        coder: targetNode('acc-claude-max'),
        chatter: targetNode('acc-openrouter'),
        arbiter: targetNode('acc-cheap-judge'),
      },
    };

    expect(refusalsFor(borrowed)).toEqual([
      {
        code: 'custom',
        path: ['nodes', 'sorter', 'policy', 'judge'],
        message: 'the judge arbiter also stands as a child',
      },
    ]);
  });
});

describe('the labels a conditional router hands its judge', () => {
  test('two branches wearing one label are refused, and the refusal names the label', () => {
    const twice = [
      { label: 'code', rule: 'the request asks for code', child: 'coder' },
      { label: 'code', rule: 'the request asks for a draft', child: 'drafter' },
    ];

    expect(refusalsFor(routingSortedInto(twice))).toEqual([
      {
        code: 'custom',
        path: ['nodes', 'sorter', 'policy', 'branches'],
        message: 'the label code stands on more than one branch',
      },
    ]);
  });

  test('two labels that read alike once trimmed are refused, because the judge reads one', () => {
    const spaced = [
      { label: 'code', rule: 'the request asks for code', child: 'coder' },
      { label: '  code  ', rule: 'the request asks for a draft', child: 'drafter' },
    ];

    expect(refusalsFor(routingSortedInto(spaced)).map((refusal) => refusal.message)).toEqual([
      'the label code stands on more than one branch',
    ]);
  });

  test('a label of nothing but space is refused, because it hands the judge no word', () => {
    const blank = [{ label: '   ', rule: 'the request asks for code', child: 'coder' }];

    expect(refusalsFor(routingSortedInto(blank)).map((refusal) => refusal.path)).toEqual([
      ['nodes', 'sorter', 'policy', 'branches', 0, 'label'],
    ]);
  });
});
