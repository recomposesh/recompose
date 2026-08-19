import type { Account, GatewayConfig, RouteNode, VirtualModel } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { mintRouteNodeId } from '@recompose/contracts';
import { useState } from 'react';

import type { JudgeBinding } from '../../lib/conditional-draft';
import type { BranchWording, ConditionalPolicy } from '../../lib/conditional-policy';
import type { RouterMode, SpreadingMode } from '../../lib/routing-edits';
import type { RouterChild } from '../router-child-list/router-child';

import { accountName } from '../../../../entities/account';
import { useDefineVirtualModel } from '../../../../shared/api';
import { Switch } from '../../../../shared/ui';
import { conditionalIn } from '../../lib/conditional-policy';
import { rejudgeSentences } from '../../lib/router-modes';
import { gatewayDroppingNode, gatewayReordering, gatewaySwitching } from '../../lib/routing-edits';
import {
  gatewayBindingJudge,
  gatewayJudgingEveryRequest,
  gatewayWritingBranch,
} from '../../lib/routing-edits-conditional';
import { targetGroups } from '../../lib/target-groups';
import { useOfferedModels } from '../../lib/use-offered-models';
import { BranchEditor } from '../branch-editor/branch-editor';
import { JudgeSection } from '../judge-section/judge-section';
import { ModeRows } from '../mode-rows/mode-rows';
import { RouterGeneralInfo } from '../router-general-info/router-general-info';
import { sectionHeading } from '../subject-shell/subject-shell';
import { routerChildRows } from './router-child-rows';

/** What a router node the inspector speaks for stands as, which is the stored router arm. */
export type StoredRouter = Extract<RouteNode, { kind: 'router' }>;

const A_SWITCH_WOULD_NEED =
  'Conditional needs a judge and an else branch. Compose one when you add the virtual model.';

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

/**
 * Why this router cannot be switched to conditional, or nothing where it already is one.
 *
 * @summary The mode's stored policy names a judge and an else child that no mode control can
 * supply, so the row says what a switch would need rather than going missing without a word.
 */
function switchReasons(mode: RouterMode): Partial<Record<RouterMode, string>> {
  return mode === 'conditional' ? {} : { conditional: A_SWITCH_WOULD_NEED };
}

/**
 * How a router spreads, offered as rows that each carry the cost of standing in that mode.
 *
 * @summary The sentence rides inside each row rather than under the control, so a person reads
 * what a mode costs before choosing it rather than after landing on the one they already picked.
 * Three modes also outgrow a strip in the narrowest panel, where the longest name wraps.
 */
function modeSection(mode: RouterMode, onSwitch: (mode: SpreadingMode) => void): ReactNode {
  return (
    <>
      {sectionHeading('Mode')}
      <ModeRows
        inertReasons={switchReasons(mode)}
        onChangeValue={(next) => {
          if (next !== 'conditional') {
            onSwitch(next);
          }
        }}
        value={mode}
      />
    </>
  );
}

/**
 * How often this router asks its judge, in the words the sentence beneath the toggle is keyed by.
 */
function rhythmOf(policy: ConditionalPolicy) {
  return policy.rejudgeEveryRequest ? 'every-request' : 'once-per-conversation';
}

const NO_JUDGE: JudgeBinding = { accountId: '', providerModel: '' };

function judgeBoundIn(model: VirtualModel, policy: ConditionalPolicy): JudgeBinding {
  const node = model.routing.nodes[policy.judge];

  return node?.kind === 'target' ? node : NO_JUDGE;
}

/**
 * What the judge answers to, which is the account behind it and the real model it runs.
 *
 * @summary An account the registry no longer holds keeps its id in the name, because a judge a
 * person came back to repair is exactly the one a blank row would say nothing about.
 */
function judgeReading(
  model: VirtualModel,
  policy: ConditionalPolicy,
  accounts: readonly Account[],
): JudgeBinding & { name: string } {
  const bound = judgeBoundIn(model, policy);
  const held = accounts.find((account) => account.id === bound.accountId);

  return { ...bound, name: held === undefined ? bound.accountId : accountName(held) };
}

type JudgingView = {
  props: RouterInspectorProps;
  policy: ConditionalPolicy;
  picking: string | undefined;
  onPicking: (accountId: string | undefined) => void;
  offered: ReturnType<typeof useOfferedModels>;
  onRewrite: (gateway: GatewayConfig) => void;
};

function judgingBody(view: JudgingView): ReactNode {
  const { props, policy, offered, onPicking } = view;
  const { gateway, model, routeNodeId, accounts } = props;
  const judge = judgeReading(model, policy, accounts);

  return (
    <>
      {sectionHeading(
        'Judging',
        <span className="ms-auto shrink-0">
          <Switch
            checked={policy.rejudgeEveryRequest}
            label="Re-judge every request"
            onChangeChecked={(next) => {
              view.onRewrite(gatewayJudgingEveryRequest(gateway, model.id, routeNodeId, next));
            }}
          />
        </span>,
      )}
      <p className="px-1 text-detail text-ink-secondary">{rejudgeSentences[rhythmOf(policy)]}</p>
      <JudgeSection
        accountName={judge.name}
        models={offered.offered}
        modelRefusal={offered.refusal}
        onBindJudge={(bound) => {
          view.onRewrite(
            gatewayBindingJudge(gateway, model.id, routeNodeId, mintRouteNodeId(), {
              kind: 'target',
              ...bound,
            }),
          );
        }}
        onPicking={onPicking}
        picking={view.picking}
        providerModel={judge.providerModel}
        targets={targetGroups([...accounts])}
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
 *
 * A conditional router carries two more decisions between the mode and the children: how often it
 * asks its judge, and which judge it asks. Both stand above the ladder, because both change what
 * every row below them receives.
 */
export function RouterInspector(props: RouterInspectorProps) {
  const { gateway, model, routeNodeId, router, accounts } = props;
  const rewrite = useDefineVirtualModel();
  const [picking, setPicking] = useState<string | undefined>(undefined);
  const offered = useOfferedModels(picking ?? '');
  const mode = router.policy.mode;
  const policy = conditionalIn(router);

  const onRewrite = (next: GatewayConfig): void => {
    rewrite.mutate(next);
  };

  const { onDropBranch, onMove, onOpen, onRuleBranch } = ladderEdits(props, onRewrite);

  return (
    <>
      <RouterGeneralInfo
        displayName={router.displayName}
        gateway={gateway}
        mode={mode}
        modelId={model.id}
        routeNodeId={routeNodeId}
      />
      {modeSection(mode, (spreading) => {
        onRewrite(gatewaySwitching(gateway, model.id, routeNodeId, spreading));
      })}
      {policy === undefined
        ? null
        : judgingBody({ props, policy, picking, onPicking: setPicking, offered, onRewrite })}
      {sectionHeading('Children')}
      <BranchEditor
        branching={policy !== undefined}
        mode={mode}
        rows={routerChildRows(
          model.id,
          model.routing,
          router.children,
          accounts,
          policy === undefined ? undefined : { policy },
        )}
        onDropBranch={onDropBranch}
        onMove={onMove}
        onOpen={onOpen}
        onRuleBranch={onRuleBranch}
      />
    </>
  );
}
