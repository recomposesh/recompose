import type { Account, GatewayConfig, RouteNode, VirtualModel } from '@recompose/contracts';

import type { RouterMode } from '../../lib/routing-edits';

import { useDefineVirtualModel } from '../../../../shared/api';
import { SegmentedControl } from '../../../../shared/ui';
import { modeOptions, modeSentences } from '../../lib/router-modes';
import { gatewayReordering, gatewaySwitching } from '../../lib/routing-edits';
import { RouterChildList } from '../router-child-list/router-child-list';
import { RouterGeneralInfo } from '../router-general-info/router-general-info';
import { sectionHeading } from '../subject-shell/subject-shell';
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
 */
export function RouterInspector({
  gateway,
  model,
  routeNodeId,
  router,
  accounts,
  onSelectNode,
}: RouterInspectorProps) {
  const rewrite = useDefineVirtualModel();
  const mode = router.policy.mode;

  return (
    <>
      <RouterGeneralInfo
        displayName={router.displayName}
        gateway={gateway}
        mode={mode}
        modelId={model.id}
        routeNodeId={routeNodeId}
      />
      {sectionHeading('Mode')}
      <SegmentedControl
        label="Routing mode"
        onChangeValue={(next: RouterMode) => {
          if (next === 'conditional') {
            return;
          }

          rewrite.mutate(gatewaySwitching(gateway, model.id, routeNodeId, next));
        }}
        options={modeOptions}
        spread="row"
        value={mode}
      />
      <p className="mt-2 px-1 text-detail text-ink-secondary">{modeSentences[mode]}</p>
      {sectionHeading('Children')}
      <RouterChildList
        mode={mode}
        onMove={(from, to) => {
          rewrite.mutate(gatewayReordering(gateway, model.id, routeNodeId, from, to));
        }}
        onOpen={(child) => {
          onSelectNode(child.cardId);
        }}
        rows={routerChildRows(model.id, model.routing, router.children, accounts)}
      />
    </>
  );
}
