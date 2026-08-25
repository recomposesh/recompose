import { describe, expect, test } from 'vitest';

import { firstGraph } from './first-graph';

const claudePlan = { accountId: 'a1', providerModel: 'claude-opus-5' };

const ollama = { accountId: 'a2', providerModel: 'llama3.3:70b' };

const twoTargets = [claudePlan, ollama];

describe('the graph setup builds', () => {
  test('it stands a round-robin router at the entry, over every target', () => {
    const routing = firstGraph(twoTargets);
    const entry = routing.nodes[routing.entry];

    expect(entry).toEqual({
      kind: 'router',
      displayName: 'Round-robin',
      policy: { mode: 'round-robin' },
      children: ['seat:1', 'seat:2'],
    });
  });

  test('every target hangs under the router as its own node', () => {
    expect(firstGraph(twoTargets).nodes['seat:1']).toEqual({
      kind: 'target',
      accountId: 'a1',
      providerModel: 'claude-opus-5',
    });
    expect(firstGraph(twoTargets).nodes['seat:2']).toEqual({
      kind: 'target',
      accountId: 'a2',
      providerModel: 'llama3.3:70b',
    });
  });

  test('a single target still hangs under a router, so a second one drops in', () => {
    const routing = firstGraph([claudePlan]);
    const entry = routing.nodes[routing.entry];

    expect(entry).toMatchObject({ kind: 'router', children: ['seat:1'] });
  });

  test('the graph holds nothing beyond the router and its targets', () => {
    expect(Object.keys(firstGraph(twoTargets).nodes)).toEqual(['router', 'seat:1', 'seat:2']);
  });
});
