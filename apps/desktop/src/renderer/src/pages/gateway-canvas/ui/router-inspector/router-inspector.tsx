import type { Account, GatewayConfig, RouteNode, VirtualModel } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { mintRouteNodeId, nameOfRouter } from '@recompose/contracts';
import { useState } from 'react';

import type { ConditionalSwitch } from '../../lib/conditional-draft';
import type { BranchWording, ConditionalPolicy } from '../../lib/conditional-policy';
import type { ModelListReading } from '../../lib/model-draft';
import type { SpreadingMode } from '../../lib/routing-edits';
import type { RouterChild } from '../router-child-list/router-child';

import { useDefineVirtualModel } from '../../../../shared/api';
import { useBranchPinsAt } from '../../lib/branch-pins';
import { conditionalIn } from '../../lib/conditional-policy';
import { gatewayDroppingNode, gatewayReordering, gatewaySwitching } from '../../lib/routing-edits';
import {
  gatewayBindingJudge,
  gatewayJudgingEveryRequest,
  gatewayWritingBranch,
} from '../../lib/routing-edits-conditional';
import { useOfferedModels } from '../../lib/use-offered-models';
import { BranchEditor } from '../branch-editor/branch-editor';
import { JudgeSection } from '../judge-section/judge-section';
import { useLeavingConditional } from '../leaving-conditional/use-leaving-conditional';
import { modePicking } from '../mode-rows/mode-picking';
import { ModeSection } from '../mode-section/mode-section';
import { RejudgeToggle } from '../rejudge-toggle/rejudge-toggle';
import { RouterGeneralInfo } from '../router-general-info/router-general-info';
import { sectionHeading } from '../subject-shell/subject-shell';
import { SwitchDefinition } from '../switch-definition/switch-definition';
import { judgeAnswers, judgeBoundIn } from './judge-binding';
import { routerChildRows } from './router-child-rows';

/** What a router node the inspector speaks for stands as, which is the stored router arm. */
export type StoredRouter = Extract<RouteNode, { kind: 'router' }>;

type RouterInspectorProps = {
  /** The stored gateway holding the routing, which every router edit rewrites as a whole. */
  gateway: GatewayConfig;
  /** The virtual model whose routing holds this router, read for its id and its table. */
  model: VirtualModel;
  /** The id the stored table holds this router under, which every edit names it by. */
  routeNodeId: string;
  /** The router itself, which is the mode it spreads by and the children it holds. */
  router: StoredRouter;
  /** The registry the children read their names against. */
  accounts: readonly Account[];
  /** Receives the card a person opened from the ladder, which turns the drawer to that child. */
  onSelectNode: (nodeId: string) => void;
};

type StoredView = {
  props: RouterInspectorProps;
  policy: ConditionalPolicy | undefined;
  pins: ReadonlyMap<string, number>;
  offered: ModelListReading;
  picking: string | undefined;
  onPicking: (accountId: string | undefined) => void;
  onRewrite: (gateway: GatewayConfig) => void;
};

function judgingBody(view: StoredView, policy: ConditionalPolicy): ReactNode {
  const { gateway, model, routeNodeId, accounts } = view.props;
  const { onPicking, onRewrite } = view;
  const bound = judgeBoundIn(model, policy);

  return (
    <>
      <RejudgeToggle
        onChangeChecked={(next) => {
          onRewrite(gatewayJudgingEveryRequest(gateway, model.id, routeNodeId, next));
        }}
        rejudgeEveryRequest={policy.rejudgeEveryRequest}
      />
      <JudgeSection
        accounts={accounts}
        bound={bound}
        offered={view.offered}
        onBindJudge={(bound) => {
          onRewrite(
            gatewayBindingJudge(gateway, model.id, routeNodeId, mintRouteNodeId(), {
              kind: 'target',
              ...bound,
            }),
          );
        }}
        onPicking={onPicking}
        picking={view.picking}
        routesEverythingToElse={!judgeAnswers(bound, accounts)}
      />
    </>
  );
}

type SwitchStand = {
  view: StoredView;
  rows: readonly RouterChild[];
  ladder: ReturnType<typeof ladderEdits>;
  held: ConditionalSwitch;
  onHeld: (next: ConditionalSwitch | undefined) => void;
};

/** Everything the definition writes through, gathered off what the inspector already holds. */
function switchingBody(stand: SwitchStand): ReactNode {
  const { view, ladder, onHeld } = stand;
  const { gateway, model, routeNodeId, accounts } = view.props;
  const { onPicking, onRewrite } = view;
  const onDropChild = ladder.onDropBranch;
  const onOpen = ladder.onOpen;

  return (
    <SwitchDefinition
      accounts={accounts}
      gateway={gateway}
      held={stand.held}
      modelId={model.id}
      offered={view.offered}
      onDropChild={onDropChild}
      onHeld={onHeld}
      onOpen={onOpen}
      onPicking={onPicking}
      onRewrite={onRewrite}
      picking={view.picking}
      routeNodeId={routeNodeId}
      rows={stand.rows}
    />
  );
}

/** What a router already spreading by shows: its judging where it has any, then its children. */
function storedBody(view: StoredView, rows: readonly RouterChild[]): ReactNode {
  const { props, policy, pins } = view;
  const { model, router, accounts } = props;
  const { onDropBranch, onMove, onOpen, onRuleBranch } = ladderEdits(props, view.onRewrite);

  return (
    <>
      {policy === undefined ? null : judgingBody(view, policy)}
      {sectionHeading('Children')}
      <BranchEditor
        branching={policy !== undefined}
        mode={router.policy.mode}
        onDropBranch={onDropBranch}
        onMove={onMove}
        onOpen={onOpen}
        onRuleBranch={onRuleBranch}
        rows={
          policy === undefined
            ? rows
            : routerChildRows(model.id, model.routing, router.children, accounts, { policy, pins })
        }
      />
    </>
  );
}

/**
 * Every write the ladder can ask for, each one a whole gateway the rewrite carries to storage.
 */
function ladderEdits(props: RouterInspectorProps, onRewrite: (next: GatewayConfig) => void) {
  const { gateway, model, routeNodeId, onSelectNode } = props;

  return {
    onDropBranch: (child: RouterChild) => {
      onRewrite(gatewayDroppingNode(gateway, model.id, child.routeNodeId));
    },
    onMove: (from: number, to: number) => {
      onRewrite(gatewayReordering(gateway, model.id, routeNodeId, from, to));
    },
    onOpen: (child: RouterChild) => {
      onSelectNode(child.cardId);
    },
    onRuleBranch: (child: RouterChild, wording: BranchWording) => {
      onRewrite(gatewayWritingBranch(gateway, model.id, routeNodeId, child.routeNodeId, wording));
    },
  };
}

/**
 * The whole of what a person decides about a router: what it is called, how it spreads, over what.
 *
 * @summary The name leads, because it is the one fact a person writes rather than picks, and every
 * other surface calls the router by it from then on. The mode sits under the name and the children
 * stack below it, so the sentence between them describes the very control a person just moved
 * rather than standing as fixed helper text. Under failover the sentence says which end wins;
 * under round-robin it names the prompt-cache cost of rotation at the point of choice, because
 * that cost is the reason to weigh one mode against the other. Switching the mode leaves the
 * children and their order exactly as they stood, so trying the other mode is never a rebuild.
 * Leaving conditional is the one switch that costs something, and it asks before it takes it.
 *
 * A conditional router carries two more decisions between the mode and the children: how often it
 * asks its judge, and which judge it asks. Both stand above the ladder, because both change what
 * every row below them receives.
 */
export function RouterInspector(props: RouterInspectorProps) {
  const { gateway, model, routeNodeId, router, accounts } = props;
  const rewrite = useDefineVirtualModel();
  const [picking, setPicking] = useState<string | undefined>(undefined);
  const [held, setHeld] = useState<ConditionalSwitch | undefined>(undefined);
  const offered = useOfferedModels(picking ?? '');
  const mode = router.policy.mode;
  const policy = conditionalIn(router);
  const pinsAt = { slug: gateway.slug, virtualModel: model.id, routeNode: routeNodeId };
  const pins = useBranchPinsAt(pinsAt);

  const onRewrite = (next: GatewayConfig): void => {
    rewrite.mutate(next);
  };

  const spread = (next: SpreadingMode): void => {
    onRewrite(gatewaySwitching(gateway, model.id, routeNodeId, next));
  };
  const leaving = useLeavingConditional(spread);
  const rows = routerChildRows(model.id, model.routing, router.children, accounts);
  const view = { props, policy, pins, offered, picking, onPicking: setPicking, onRewrite };
  const ladder = ladderEdits(props, onRewrite);

  const onChangeValue = modePicking({
    children: router.children,
    branching: policy !== undefined,
    onHeld: setHeld,
    onSpread: spread,
    onAsk: leaving.askToLeave,
  });

  return (
    <>
      <RouterGeneralInfo
        displayName={router.displayName}
        gateway={gateway}
        mode={mode}
        modelId={model.id}
        routeNodeId={routeNodeId}
      />
      <ModeSection
        childCount={router.children.length}
        leaving={leaving}
        mode={held === undefined ? mode : 'conditional'}
        onChangeValue={onChangeValue}
        routerName={nameOfRouter(mode, router.displayName)}
      />
      {held === undefined
        ? storedBody(view, rows)
        : switchingBody({ view, rows, ladder, held, onHeld: setHeld })}
    </>
  );
}
