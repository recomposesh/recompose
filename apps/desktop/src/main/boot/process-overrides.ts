import { resolvePasswordStoreOverride } from '../password-store-override';
import { resolveUserDataOverride } from '../user-data-override';
import { activationPolicyFor } from '../windows/stays-back';

export type OverridableApp = {
  setPath: (name: 'userData', value: string) => void;
  commandLine: { appendSwitch: (key: string, value: string) => void };
  setActivationPolicy: (policy: 'accessory') => void;
};

/** @summary Electron reads every one of these before app.ready, so the entry point applies them at import time. */
export function applyProcessOverrides(
  app: OverridableApp,
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv,
): 'accessory' | null {
  const userData = resolveUserDataOverride(env);

  if (userData !== null) {
    app.setPath('userData', userData);
  }

  const passwordStore = resolvePasswordStoreOverride(env);

  if (passwordStore !== null) {
    app.commandLine.appendSwitch('password-store', passwordStore);
  }

  const activationPolicy = activationPolicyFor(platform, env);

  if (activationPolicy !== null) {
    app.setActivationPolicy(activationPolicy);
  }

  return activationPolicy;
}
