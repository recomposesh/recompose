import type { Node } from '@xyflow/react';

import { ReactFlow } from '@xyflow/react';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { CanvasMinimap } from './canvas-minimap';

function BlankCard() {
  return <div style={{ width: 184, height: 88 }} />;
}

const cardKinds = { target: BlankCard, gateway: BlankCard, judge: BlankCard };

function targetCard(id: string, data: Node['data'], y: number): Node {
  return { id, type: 'target', position: { x: 0, y }, data, width: 184, height: 88 };
}

async function mapFillsOf(nodes: Node[]): Promise<readonly string[]> {
  const screen = await render(
    <div style={{ width: 640, height: 480 }}>
      <ReactFlow edges={[]} nodeTypes={cardKinds} nodes={nodes}>
        <CanvasMinimap />
      </ReactFlow>
    </div>,
  );

  await expect.element(screen.getByLabelText('Canvas map')).toBeInTheDocument();

  return [...screen.container.querySelectorAll('.react-flow__minimap-node')].map(
    (drawn) => drawn.getAttribute('class') ?? '',
  );
}

test('a target card draws on the map in the tint its account kind carries', async () => {
  const fills = await mapFillsOf([targetCard('held', { account: { kind: 'api-key' } }, 0)]);

  expect(fills[0]).toContain('node-tint-api-key');
});

test('a target card carrying no account draws in the plain card fill', async () => {
  const fills = await mapFillsOf([targetCard('bare', {}, 0)]);

  expect(fills[0]).toContain('minimap-node');
  expect(fills[0]).not.toContain('node-tint');
});

test('a target card whose account kind the map cannot read draws in the plain card fill', async () => {
  const fills = await mapFillsOf([targetCard('odd', { account: { kind: 'mystery' } }, 0)]);

  expect(fills[0]).toContain('minimap-node');
  expect(fills[0]).not.toContain('node-tint');
});

test('the judge draws on the map in its router tint, so the map never shows an orphan', async () => {
  const fills = await mapFillsOf([
    { id: 'judge:fast', type: 'judge', position: { x: 0, y: 0 }, data: {}, width: 96, height: 72 },
  ]);

  expect(fills[0]).toContain('node-tint-router');
});

test('a card standing outside every known role draws in the plain card fill', async () => {
  const fills = await mapFillsOf([
    { id: 'plain', position: { x: 0, y: 0 }, data: {}, width: 184, height: 88 },
  ]);

  expect(fills[0]).toContain('minimap-node');
  expect(fills[0]).not.toContain('node-tint');
});
