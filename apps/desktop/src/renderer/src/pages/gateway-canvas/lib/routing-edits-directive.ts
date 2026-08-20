import type { GatewayConfig, Routing } from '@recompose/contracts';

import type { ConditionalPolicy } from './conditional-policy';

import { conditionalIn } from './conditional-policy';
import { routedBy, routerEdited } from './routing-edits';

/**
 * The table once one conditional router's policy is rewritten, or nothing where none stands there.
 *
 * @summary Nothing rather than the table back, so a caller can tell "the edit ran" from "there was
 * no judged router to edit" without reading the policy a second time to find out.
 */
function conditionalRouterEdited(
  routing: Routing,
  routerId: string,
  rewrite: (policy: ConditionalPolicy) => ConditionalPolicy,
): Routing | undefined {
  const policy = conditionalIn(routing.nodes[routerId]);

  return policy === undefined
    ? undefined
    : routerEdited(routing, routerId, (router) => ({ ...router, policy: rewrite(policy) }));
}

/**
 * The policy once its judge is handed a standing instruction, or handed none at all.
 *
 * @summary Blank means erased rather than stored empty, because the stored shape refuses a blank
 * directive and a router carrying one would bounce off the schema on the next save. The words reach
 * storage trimmed, since they are read to a judge rather than laid out on a page.
 */
function directed(policy: ConditionalPolicy, directive: string): ConditionalPolicy {
  const written = directive.trim();
  const { directive: _erased, ...carried } = policy;

  return written === '' ? carried : { ...carried, directive: written };
}

/**
 * The gateway once one conditional router hands its judge a standing instruction.
 *
 * @summary The directive is policy rather than polish: it goes to the judge ahead of every rule, so
 * writing one reroutes traffic exactly the way rewording a rule does, and it belongs in the stored
 * document beside them. A router spreading some other way asks its requests nothing, so there is no
 * judge to direct and the table stands as it was.
 */
export function gatewayDirectingJudge(
  gateway: GatewayConfig,
  modelId: string,
  routerId: string,
  directive: string,
): GatewayConfig {
  const directing = (policy: ConditionalPolicy) => directed(policy, directive);

  return routedBy(
    gateway,
    modelId,
    (was) => conditionalRouterEdited(was, routerId, directing) ?? was,
  );
}
