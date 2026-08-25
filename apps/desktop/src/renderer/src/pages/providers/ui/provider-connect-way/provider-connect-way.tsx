import { signsInByDeviceCode, signsInThroughTheBrowser } from '@recompose/contracts';

import type { CatalogEntry, ConnectionWay } from '../../../../entities/provider';

import {
  keyKindOf,
  localRuntimeOf,
  offerFor,
  signInProviderOf,
} from '../../../../entities/provider';
import { BrowserSignIn } from '../browser-sign-in/browser-sign-in';
import { ConnectKeyForm } from '../connect-key-form/connect-key-form';
import { ConnectOwnEndpoint } from '../connect-own-endpoint/connect-own-endpoint';
import { ConnectOwnServer } from '../connect-own-server/connect-own-server';
import { DetectRuntimeStep } from '../detect-runtime-step/detect-runtime-step';
import { DeviceCodeSignIn } from '../device-code-sign-in/device-code-sign-in';
import { SignInWay } from '../sign-in-way/sign-in-way';

type ProviderConnectWayProps = {
  /** The provider a person picked out of the catalog. */
  entry: CatalogEntry;
  /** The way the kind-locked catalog was opened for, which is the only way offered here. */
  way: ConnectionWay;
  /** Runs once the connect finishes, so the catalog can close behind it. */
  onConnected: () => void;
};

/**
 * @summary Which surface a plan's sign-in gets follows how the plan authorizes, never which plan
 * it is. A plan whose own tool owns the flow names the command to run; the rest are run here, by
 * code or by browser, because nothing on the machine would run them otherwise.
 */
function signInArm(entry: CatalogEntry, onConnected: () => void) {
  const provider = signInProviderOf(entry);

  if (provider === undefined) {
    return null;
  }

  if (signsInByDeviceCode(provider)) {
    return <DeviceCodeSignIn entry={entry} onConnected={onConnected} provider={provider} />;
  }

  if (signsInThroughTheBrowser(provider)) {
    return <BrowserSignIn entry={entry} onConnected={onConnected} provider={provider} />;
  }

  return <SignInWay name={entry.name} onConnected={onConnected} provider={provider} />;
}

function detectArm(entry: CatalogEntry, onConnected: () => void) {
  const runtime = localRuntimeOf(entry);

  return runtime === undefined ? null : (
    <DetectRuntimeStep onConnected={onConnected} runtime={runtime} />
  );
}

function ownAddressArm(entry: CatalogEntry, way: ConnectionWay, onConnected: () => void) {
  if (way === 'local') {
    return <ConnectOwnServer entry={entry} onConnected={onConnected} />;
  }

  const kind = keyKindOf(entry);

  return kind === undefined ? null : (
    <ConnectOwnEndpoint entry={entry} kind={kind} onConnected={onConnected} />
  );
}

function keyArm(entry: CatalogEntry, onConnected: () => void) {
  const kind = keyKindOf(entry);

  return kind === undefined ? null : (
    <ConnectKeyForm entry={entry} kind={kind} onConnected={onConnected} />
  );
}

/**
 * The one way a picked provider connects under the kind the catalog was opened for.
 *
 * @summary Reach for it once a person picks a provider out of the kind-locked catalog. The way is
 * already settled by the screen that opened the catalog, so the surface asks only for what that
 * way still needs. What it asks for follows the offer rather than the column: a coding plan stands
 * among the subscriptions and asks for the token its plan issued, because no sign-in exists to
 * offer it.
 */
export function ProviderConnectWay({ entry, way, onConnected }: ProviderConnectWayProps) {
  const offer = offerFor(entry, way);

  if (offer === undefined) {
    return null;
  }

  if (offer.takes === 'sign-in') {
    return signInArm(entry, onConnected);
  }

  if (offer.takes === 'runtime') {
    return detectArm(entry, onConnected);
  }

  if (offer.takes === 'address') {
    return ownAddressArm(entry, way, onConnected);
  }

  return keyArm(entry, onConnected);
}
