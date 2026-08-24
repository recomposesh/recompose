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
  OnNodesChange,
  OnReconnect,
} from '@xyflow/react';
import type { Edge, Node } from '@xyflow/react';
import type { ReactNode } from 'react';

import { ReactFlow, ReactFlowProvider } from '@xyflow/react';

import type { MenuAction } from '../../../../shared/ui';
import type { BindingOutcome } from '../../lib/cable-announcements';

import { announcedOutcome, announcedUrgency } from '../../lib/cable-announcements';
import { CABLE_GRAB_SPAN } from '../../lib/cable-standing';
import { CanvasCommands } from '../../lib/use-canvas-commands';
import { BindingCable } from '../binding-cable/binding-cable';
import { CableConnectionLine } from '../cable-connection-line/cable-connection-line';
import { CanvasContextMenu } from '../canvas-context-menu/canvas-context-menu';
import { CanvasMinimap } from '../canvas-minimap/canvas-minimap';
import { CanvasZoomControls } from '../canvas-zoom-controls/canvas-zoom-controls';
import { DraftModelNode } from '../draft-model-node/draft-model-node';
import { GatewayNode } from '../gateway-node/gateway-node';
import { JudgeSatellite } from '../judge-satellite/judge-satellite';
import { RouterNode } from '../router-node/router-node';
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
  /** The acts one card, cable, or the bare canvas offers, read off what a right-click landed on. */
  actsFor: (subject: string | undefined) => readonly MenuAction[];
};

type GatewayStageProps = {
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
  router: RouterNode,
  judge: JudgeSatellite,
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

function flowCanvas(stage: GatewayStageProps): ReactNode {
  const { flow, children } = stage;
  const { onBeforeDelete, onConnect, onConnectEnd, onConnectStart, onEdgeClick, onInit } = flow;
  const { onEdgesDelete, onNodeClick, onNodesChange, onPaneClick, onReconnect } = flow;
  const { onReconnectEnd, onReconnectStart } = flow;

  return (
    <ReactFlowProvider>
      <ReactFlow
        connectionLineComponent={CableConnectionLine}
        connectionRadius={CABLE_GRAB_SPAN}
        deleteKeyCode={deleteKeys}
        edgeTypes={edgeTypes}
        edges={flow.edges}
        edgesReconnectable
        elevateEdgesOnSelect
        fitView
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
 * that opened it rather than falling under the corner the gesture happened to end over. Opening a
 * gateway fits its composition rather than restoring a remembered camera: a person who panned far
 * and closed the gateway would otherwise come back to the empty canvas they left, with the
 * composition somewhere off the edge and nothing on screen saying which way.
 */
export function GatewayStage(props: GatewayStageProps) {
  const { flow, announced } = props;

  return (
    <CanvasContextMenu
      actsFor={flow.actsFor}
      noticeCardFocus={(nodeId) => {
        flow.onNodeFocus(nodeId);
      }}
    >
      {flowCanvas(props)}
      {liveRegions(announced)}
    </CanvasContextMenu>
  );
}
