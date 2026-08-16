import type { ToolBackedProviderId } from '@recompose/contracts';

import { subscriptionProviders } from '@recompose/contracts';

export type SignInCommandRequest = {
  provider: ToolBackedProviderId;
  home: string;
  platform: NodeJS.Platform;
};

export type ShellSetupLineRequest = {
  provider: ToolBackedProviderId;
  pointer: string;
  platform: NodeJS.Platform;
};

function invocation(provider: ToolBackedProviderId): string {
  const { toolBinary, signInArguments } = subscriptionProviders[provider];

  return [toolBinary, ...signInArguments].join(' ');
}

function environmentPrefix(variable: string, home: string, platform: NodeJS.Platform): string {
  return platform === 'win32' ? `$env:${variable}="${home}"; ` : `${variable}="${home}" `;
}

/** The one line a person runs to sign in, pointed at the home this account owns. */
export function signInCommandFor(request: SignInCommandRequest): string {
  const { configHome } = subscriptionProviders[request.provider];

  return `${environmentPrefix(configHome.variable, request.home, request.platform)}${invocation(request.provider)}`;
}

/** The line a person adds to their own shell so their tool reads the account this app points at. */
export function shellSetupLineFor(request: ShellSetupLineRequest): string {
  const { configHome } = subscriptionProviders[request.provider];

  return request.platform === 'win32'
    ? `$env:${configHome.variable}="${request.pointer}"`
    : `export ${configHome.variable}="$(readlink -f "${request.pointer}")"`;
}
