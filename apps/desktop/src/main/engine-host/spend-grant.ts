import type {
  LookCustody,
  ProviderModelPolicy,
  RouteTarget,
  SpendGrant,
} from '@recompose/contracts';

import { providerModelIsCompat } from '@recompose/contracts';

import type { StoragePaths } from '../ipc/storage-context';
import type { TargetCustodyContext } from './target-custody';

import { storagePathsFor } from '../ipc/storage-context';
import { listGatewayConfigs } from '../storage/gateway-store';
import { resolveTargetCustody } from './target-custody';

export type SpendGrantContext = TargetCustodyContext;

/**
 * The stored target one named seat of one virtual model holds, or nothing where no target stands.
 *
 * @summary The seat is read straight out of the table the child was handed, so a ladder spending a
 * different account per child resolves each one against the account that child names. A seat the
 * table does not hold, and a seat standing a router, both answer nothing rather than falling back
 * to a sibling, because spending the wrong person's account is worse than refusing the turn.
 */
async function storedTarget(
  paths: StoragePaths,
  onCorrupt: (quarantinedPath: string) => void,
  slug: string,
  virtualModel: string,
  routeNode: string,
): Promise<RouteTarget | undefined> {
  const stored = await listGatewayConfigs(paths.gatewaysDir, onCorrupt);
  const serving = stored.find((config) => config.slug === slug);
  const bound = serving?.virtualModels.find((model) => model.id === virtualModel);
  const seat = bound?.routing.nodes[routeNode];

  return seat?.kind === 'target' ? seat : undefined;
}

type GrantedSpend = Extract<SpendGrant, { verdict: 'resolved' }>['spend'];

/**
 * What a turn spends, out of how the credential opening the target is spelled.
 *
 * @summary A turn carries the credential to the child and lets the proxy write the header, so the
 * spend says only whether one is in hand. Which header a vendor reads is the model-list look's
 * business, and folding it away here keeps the serving wire as narrow as it always was.
 */
function spendFrom(
  custody: LookCustody,
  accountId: string,
  modelPolicy: ProviderModelPolicy | undefined,
  providerModel: string,
): GrantedSpend {
  if (custody.custody === 'open') {
    return { custody: 'open' };
  }

  return custody.custody === 'subscription'
    ? custody
    : {
        custody: 'credentialed',
        provider: custody.provider,
        credential: custody.credential,
        accountId,
        ...(providerModelIsCompat(modelPolicy, providerModel) ? { isCompat: true } : {}),
      };
}

/**
 * What one attempt may be spent against, resolved against live storage for every request.
 *
 * @summary The child names the seat it is about to try, and only the parent turns that name into a
 * credential. The account may be gone or may have turned out to be a subscription by the time the
 * gateway serves, so the seat is resolved per attempt rather than trusted from the start directive.
 * The secret lives in this call's scope and in the message that answers the child, and nowhere else.
 *
 * A refusal is the answer for one seat and says nothing about any other, so a ladder whose first
 * child lost its credential still spends its siblings.
 */
export async function resolveSpendGrant(
  ctx: SpendGrantContext,
  slug: string,
  virtualModel: string,
  routeNode: string,
): Promise<SpendGrant> {
  const paths = storagePathsFor(ctx.userDataPath);
  const target = await storedTarget(paths, ctx.onCorrupt, slug, virtualModel, routeNode);

  if (target === undefined) {
    return { verdict: 'missing-target' };
  }

  const resolved = await resolveTargetCustody(ctx, target.accountId);

  return resolved.verdict === 'resolved'
    ? {
        verdict: 'resolved',
        providerOrigin: resolved.providerOrigin,
        spend: spendFrom(
          resolved.custody,
          target.accountId,
          resolved.modelPolicy,
          target.providerModel,
        ),
      }
    : resolved;
}
