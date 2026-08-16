import type {
  BrowserSignInProviderId,
  DeviceFlowProviderId,
  IpcRequest,
  SubscriptionProviderId,
} from '@recompose/contracts';

import { subscriptionPlanNames } from '@recompose/contracts';
import { randomUUID } from 'node:crypto';

import type { SignInYield } from '../subscriptions/device-sign-in-port';
import type { Answered, Workshop } from './subscriptions-workshop';

import { signInToAntigravity } from '../subscriptions/antigravity-sign-in';
import { awaitDeviceSignIn, startDeviceSignIn } from '../subscriptions/device-sign-in';
import { ipcFailure, storageFailure } from './storage-envelope';
import { keepTheAccount, viewsOf } from './subscriptions-workshop';

/**
 * Keeps what a sign-in this app ran itself yielded, under an account of its own.
 *
 * @summary The vault holds the credential rather than a config home, because no tool owns one of
 * these plans and so nothing on the machine would read a home the app wrote. The row reads as
 * whoever signed in where the provider names them, so two accounts on one plan tell apart.
 */
async function keepWhatItYielded(
  shop: Workshop,
  provider: SubscriptionProviderId,
  yielded: SignInYield,
): Promise<Answered> {
  const id = `acc-${randomUUID()}`;

  await shop.ctx.writeSubscriptionCredential(provider, id, yielded.credential);

  const kept = await keepTheAccount(shop, {
    id,
    provider,
    kind: 'subscription',
    label: yielded.signedInAs ?? subscriptionPlanNames[provider],
    provenance: 'sign-in',
  });

  return { ok: true, value: await viewsOf(shop, kept) };
}

async function landDeviceSignIn(shop: Workshop, provider: DeviceFlowProviderId): Promise<Answered> {
  const settled = await awaitDeviceSignIn(shop.ctx.deviceSignIn, provider);

  return settled.verdict === 'refused'
    ? ipcFailure('sign-in-timed-out', settled.reason)
    : keepWhatItYielded(shop, provider, settled);
}

async function askForACode(shop: Workshop, provider: DeviceFlowProviderId) {
  const shown = await startDeviceSignIn(shop.ctx.deviceSignIn, provider);

  return shown.verdict === 'refused'
    ? ipcFailure('sign-in-timed-out', shown.reason)
    : {
        ok: true as const,
        value: { userCode: shown.userCode, verificationUri: shown.verificationUri },
      };
}

async function landBrowserSignIn(
  shop: Workshop,
  provider: BrowserSignInProviderId,
): Promise<Answered> {
  const settled = await signInToAntigravity(shop.ctx.browserSignIn);

  return settled.verdict === 'refused'
    ? ipcFailure('sign-in-timed-out', settled.reason)
    : keepWhatItYielded(shop, provider, {
        credential: settled.credential,
        signedInAs: settled.signedInAs,
      });
}

type InTurn = <Answer>(work: () => Promise<Answer>) => Promise<Answer>;

type Guarded = (work: () => Promise<Answered>) => () => Promise<Answered>;

/**
 * Every channel for a plan recompose signs into itself, rather than through a tool.
 *
 * @summary They stand together because they share the one step a tool-run sign-in never needs:
 * keeping a credential nothing else on the machine will ever read.
 */
export function appSignInHandlers(shop: Workshop, inTurn: InTurn, guarded: Guarded) {
  return {
    'subscriptions:device-code': async (request: IpcRequest<'subscriptions:device-code'>) => {
      try {
        return await askForACode(shop, request.provider);
      } catch (error) {
        return storageFailure(error, shop.ctx.homeFolder);
      }
    },
    'subscriptions:device-await': async (request: IpcRequest<'subscriptions:device-await'>) =>
      inTurn(guarded(async () => landDeviceSignIn(shop, request.provider))),
    'subscriptions:browser-sign-in': async (request: IpcRequest<'subscriptions:browser-sign-in'>) =>
      inTurn(guarded(async () => landBrowserSignIn(shop, request.provider))),
  };
}
