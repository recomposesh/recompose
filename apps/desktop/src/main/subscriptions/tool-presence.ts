import {
  toolBacked,
  toolBackedProviderIdSchema,
  subscriptionProviders,
  type SubscriptionProviderId,
  type ToolBackedProviderId,
  type SubscriptionTool,
} from '@recompose/contracts';
import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import { join } from 'node:path';

import type { SubscriptionHomes } from './subscription-homes';

import { shellSetupLineFor, signInCommandFor } from './subscription-commands';

const windowsShimSuffixes = ['.cmd', '.exe', '.bat'];

export type ToolReportRequest = {
  homes: SubscriptionHomes;
  searchPath: string;
  platform: NodeJS.Platform;
};

function candidateNames(binary: string, platform: NodeJS.Platform): string[] {
  return platform === 'win32'
    ? windowsShimSuffixes.map((suffix) => `${binary}${suffix}`)
    : [binary];
}

async function runnable(candidate: string, platform: NodeJS.Platform): Promise<boolean> {
  const demand = platform === 'win32' ? constants.F_OK : constants.X_OK;

  return access(candidate, demand).then(
    () => true,
    () => false,
  );
}

async function fileOnSearchPath(
  binary: string,
  searchPath: string,
  platform: NodeJS.Platform,
): Promise<string | null> {
  const folders = searchPath.split(platform === 'win32' ? ';' : ':').filter((one) => one !== '');
  const names = candidateNames(binary, platform);

  for (const folder of folders) {
    for (const name of names) {
      const candidate = join(folder, name);

      if (await runnable(candidate, platform)) {
        return candidate;
      }
    }
  }

  return null;
}

async function resolvesOnSearchPath(
  binary: string,
  searchPath: string,
  platform: NodeJS.Platform,
): Promise<boolean> {
  return (await fileOnSearchPath(binary, searchPath, platform)) !== null;
}

/**
 * The file a provider's own tool runs from, or nothing where this machine carries none.
 *
 * @summary Spawning the bare name works on a machine whose shell resolves it, and Windows installs
 * the tool as `claude.cmd`, which no bare spawn finds. A caller about to run the tool needs the
 * whole path back rather than a yes, so the answer is the file itself.
 */
export async function toolFileFor(
  provider: SubscriptionProviderId,
  searchPath: string,
  platform: NodeJS.Platform,
): Promise<string | null> {
  if (!toolBacked(provider)) {
    return null;
  }

  return fileOnSearchPath(subscriptionProviders[provider].toolBinary, searchPath, platform);
}

async function reportTool(
  provider: ToolBackedProviderId,
  request: ToolReportRequest,
): Promise<SubscriptionTool> {
  const { toolBinary, toolName } = subscriptionProviders[provider];

  return {
    provider,
    toolName,
    present: await resolvesOnSearchPath(toolBinary, request.searchPath, request.platform),
    signInCommand: signInCommandFor({
      provider,
      home: request.homes.pendingHomeFor(provider),
      platform: request.platform,
    }),
    shellSetupLine: shellSetupLineFor({
      provider,
      pointer: request.homes.activePointerFor(provider),
      platform: request.platform,
    }),
  };
}

export async function reportTools(request: ToolReportRequest): Promise<SubscriptionTool[]> {
  return Promise.all(
    toolBackedProviderIdSchema.options.map(async (provider) => reportTool(provider, request)),
  );
}
