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
  OnInit,
  OnMoveEnd,
  OnNodesChange,
  OnReconnect,
} from '@xyflow/react';
import type { Edge, Node, Viewport } from '@xyflow/react';
import type { ReactNode } from 'react';

import { ReactFlow, ReactFlowProvider } from '@xyflow/react';
import { useMemo } from 'react';

import type { BindingOutcome } from '../../lib/cable-announcements';

import { announcedOutcome, announcedUrgency } from '../../lib/cable-announcements';
import { CABLE_GRAB_SPAN } from '../../lib/cable-standing';
import { canvasViewport, keepCanvasViewport } from '../../lib/canvas-viewport-store';
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
  onInit: OnInit;
  onTidy: () => void;
  onNodeFocus: (nodeId: string) => void;
};

type GatewayStageProps = {
  /** The gateway whose canvas this is, which keys where its camera is remembered. */
  slug: string;
  /** The controlled flow: derived nodes and edges in, gestures out, nothing held in between. */
  flow: CanvasFlowWiring;
  /** What just became of a binding, which the live region says out loud. */
  announced: BindingOutcome | undefined;
  /** Surfaces the page stands on the canvas, above its furniture, like the drop-picker. */
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

const deleteKeys = ['Backspace', 'Delete'];

const withoutTheCornerBadge = { hideAttribution: true };

/**
 * What stands in the canvas corners beside the composition: the tools and the map.
 *
 * @summary The menu's ear stands here too, since the commands it answers drive this viewport.
 */
function canvasFurniture(onTidy: () => void): ReactNode {
  return (
    <>
      <CanvasZoomControls />
      <CanvasMinimap />
      <CanvasCommands onTidy={onTidy} />
    </>
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

const CENTER_THE_COMPOSITION = { padding: 0.2, maxZoom: 1 };

const UNMOVED_CAMERA: Viewport = { x: 0, y: 0, zoom: 1 };

function cameraKeeper(slug: string): OnMoveEnd {
  return (_, viewport) => {
    keepCanvasViewport(slug, viewport);
  };
}

function flowCanvas(stage: GatewayStageProps, rememberedCamera: Viewport | undefined): ReactNode {
  const { slug, flow, children } = stage;
  const { onBeforeDelete, onConnect, onConnectEnd, onConnectStart, onEdgeClick, onInit } = flow;
  const { onEdgesDelete, onNodeClick, onNodesChange, onPaneClick, onReconnect } = flow;
  const { onReconnectEnd, onReconnectStart } = flow;

  return (
    <ReactFlowProvider>
      <ReactFlow
        connectionLineComponent={CableConnectionLine}
        connectionRadius={CABLE_GRAB_SPAN}
        defaultViewport={rememberedCamera ?? UNMOVED_CAMERA}
        deleteKeyCode={deleteKeys}
        edgeTypes={edgeTypes}
        edges={flow.edges}
        edgesReconnectable
        elevateEdgesOnSelect
        fitView={rememberedCamera === undefined}
        fitViewOptions={CENTER_THE_COMPOSITION}
        isValidConnection={flow.isValidConnection}
        nodeTypes={nodeTypes}
        nodes={flow.nodes}
        nodesDraggable
        nodesFocusable={false}
        onBeforeDelete={onBeforeDelete}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        onConnectStart={onConnectStart}
        onEdgeClick={onEdgeClick}
        onEdgesDelete={onEdgesDelete}
        onInit={onInit}
        onMoveEnd={cameraKeeper(slug)}
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
        {canvasFurniture(flow.onTidy)}
        {children}
      </ReactFlow>
    </ReactFlowProvider>
  );
}

/**
 * The canvas the composition stands on, holding the controlled flow and its furniture.
 *
 * @summary The stage owns no state: the page derives every node and edge from engine truth and
 * the stage hands every gesture straight back, so the library's store never grows a second copy
 * of the composition. The gestures read macOS-native, a scroll pans and a pinch zooms, and the
 * cards keep their own tab stops, so the flow adds none of its own. Whatever the page anchors onto
 * the canvas stands after the furniture, because a surface a gesture opened answers the pointer
 * that opened it rather than falling under the corner the gesture happened to end over. The camera
 * opens where the person left it, and a first visit centers the composition instead of pinning it
 * to the page's corner.
 */
export function GatewayStage(props: GatewayStageProps) {
  const { slug, flow, announced } = props;
  const rememberedCamera = useMemo(() => canvasViewport(slug), [slug]);

  return (
    <section
      className="relative flex min-w-0 flex-1 overflow-hidden bg-surface-content dot-grid"
      data-focus-group="spatial"
      onFocusCapture={(event) => {
        const nodeId = event.target.closest('.react-flow__node')?.getAttribute('data-id');

        if (nodeId !== null && nodeId !== undefined) {
          flow.onNodeFocus(nodeId);
        }
      }}
    >
      {flowCanvas(props, rememberedCamera)}
      {liveRegions(announced)}
    </section>
  );
}
