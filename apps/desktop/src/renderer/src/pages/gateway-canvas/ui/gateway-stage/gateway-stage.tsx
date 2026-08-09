import type {
  EdgeMouseHandler,
  EdgeTypes,
  IsValidConnection,
  NodeMouseHandler,
  NodeTypes,
  OnBeforeDelete,
  OnConnect,
  OnConnectEnd,
  OnConnectStart,
  OnEdgesDelete,
  OnNodesChange,
  OnReconnect,
} from '@xyflow/react';
import type { Edge, Node } from '@xyflow/react';
import type { ReactNode } from 'react';

import { Panel, ReactFlow, ReactFlowProvider } from '@xyflow/react';

import type { BindingOutcome } from '../../lib/cable-announcements';

import { announcedOutcome, announcedUrgency } from '../../lib/cable-announcements';
import { CABLE_GRAB_SPAN } from '../../lib/cable-standing';
import { CanvasCommands } from '../../lib/use-canvas-commands';
import { BindingCable } from '../binding-cable/binding-cable';
import { CableConnectionLine } from '../cable-connection-line/cable-connection-line';
import { CanvasMinimap } from '../canvas-minimap/canvas-minimap';
import { CanvasZoomControls } from '../canvas-zoom-controls/canvas-zoom-controls';
import { DraftModelNode } from '../draft-model-node/draft-model-node';
import { GatewayNode } from '../gateway-node/gateway-node';
import { TargetNode } from '../target-node/target-node';
import { VirtualModelNode } from '../virtual-model-node/virtual-model-node';

/** Everything the controlled flow reads and every gesture it hands back, wired by the page. */
export type CanvasFlowWiring = {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onNodeClick: NodeMouseHandler;
  onEdgeClick: EdgeMouseHandler;
  onPaneClick: () => void;
  isValidConnection: IsValidConnection;
  onConnect: OnConnect;
  onConnectStart: OnConnectStart;
  onConnectEnd: OnConnectEnd;
  onReconnect: OnReconnect;
  onReconnectStart: () => void;
  onReconnectEnd: () => void;
  onBeforeDelete: OnBeforeDelete;
  onEdgesDelete: OnEdgesDelete;
  onTidy: () => void;
};

type GatewayStageProps = {
  /** The controlled flow: derived nodes and edges in, gestures out, nothing held in between. */
  flow: CanvasFlowWiring;
  /** What just became of a binding, which the live region says out loud. */
  announced: BindingOutcome | undefined;
  /** Surfaces the page anchors into the flow's own coordinates, like the drop-picker. */
  children?: ReactNode;
};

const nodeTypes: NodeTypes = {
  gateway: GatewayNode,
  'virtual-model': VirtualModelNode,
  'draft-model': DraftModelNode,
  target: TargetNode,
  'ghost-target': TargetNode,
  'pending-target': TargetNode,
};

const edgeTypes: EdgeTypes = { cable: BindingCable };

const restingViewport = { x: 48, y: 48, zoom: 1 };

const deleteKeys = ['Backspace', 'Delete'];

const withoutTheCornerBadge = { hideAttribution: true };

function attributionBadge(): ReactNode {
  return (
    <Panel className="m-4 mb-17" position="bottom-center">
      <a
        className="rounded-pill border border-line-subtle bg-canvas-card px-2.5 py-1 text-footnote font-medium text-ink-secondary shadow-canvas-card focus-ring"
        href="https://reactflow.dev"
      >
        Built with React Flow
      </a>
    </Panel>
  );
}

function liveRegions(announced: BindingOutcome | undefined): ReactNode {
  const sentence = announced === undefined ? undefined : announcedOutcome(announced);
  const interrupts = announced !== undefined && announcedUrgency(announced) === 'assertive';

  return (
    <>
      <p aria-live="polite" className="sr-only">
        {interrupts ? undefined : sentence}
      </p>
      <p aria-live="assertive" className="sr-only">
        {interrupts ? sentence : undefined}
      </p>
    </>
  );
}

/**
 * The canvas the composition stands on, holding the controlled flow and its furniture.
 *
 * @summary The stage owns no state: the page derives every node and edge from engine truth and
 * the stage hands every gesture straight back, so the library's store never grows a second copy
 * of the composition. The gestures read macOS-native, a scroll pans and a pinch zooms, and the
 * cards keep their own tab stops, so the flow adds none of its own. The attribution stands
 * restyled at the bottom center, one furniture band above the corners, because at the narrowest
 * pane the bottom row leaves no seat between the tools cluster and the map.
 */
export function GatewayStage({ flow, announced, children }: GatewayStageProps) {
  const { nodes, edges, isValidConnection, onNodesChange, onNodeClick, onEdgeClick } = flow;
  const { onPaneClick, onConnect, onConnectStart, onConnectEnd, onReconnect, onTidy } = flow;
  const { onReconnectStart, onReconnectEnd, onBeforeDelete, onEdgesDelete } = flow;

  return (
    <section className="relative flex min-w-0 flex-1 overflow-hidden bg-surface-content dot-grid">
      <ReactFlowProvider>
        <ReactFlow
          connectionLineComponent={CableConnectionLine}
          connectionRadius={CABLE_GRAB_SPAN}
          defaultViewport={restingViewport}
          deleteKeyCode={deleteKeys}
          edgeTypes={edgeTypes}
          edges={edges}
          edgesReconnectable
          elevateEdgesOnSelect
          isValidConnection={isValidConnection}
          nodeTypes={nodeTypes}
          nodes={nodes}
          nodesDraggable
          nodesFocusable={false}
          onBeforeDelete={onBeforeDelete}
          onConnect={onConnect}
          onConnectEnd={onConnectEnd}
          onConnectStart={onConnectStart}
          onEdgeClick={onEdgeClick}
          onEdgesDelete={onEdgesDelete}
          onNodeClick={onNodeClick}
          onNodesChange={onNodesChange}
          onPaneClick={onPaneClick}
          onReconnect={onReconnect}
          onReconnectEnd={onReconnectEnd}
          onReconnectStart={onReconnectStart}
          panOnScroll
          proOptions={withoutTheCornerBadge}
          reconnectRadius={CABLE_GRAB_SPAN}
          zoomOnPinch
          zoomOnScroll={false}
        >
          <CanvasZoomControls onTidy={onTidy} />
          <CanvasMinimap />
          <CanvasCommands onTidy={onTidy} />
          {attributionBadge()}
          {children}
        </ReactFlow>
      </ReactFlowProvider>
      {liveRegions(announced)}
    </section>
  );
}
