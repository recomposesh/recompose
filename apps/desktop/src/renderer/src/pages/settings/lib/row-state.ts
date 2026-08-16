import type { SystemState } from '@recompose/contracts';

type LaunchAtLoginRow = {
  rendered: boolean;
  inert: boolean;
  reason?: string;
};

export function launchAtLoginRow(availability: SystemState['loginItem']): LaunchAtLoginRow {
  if (availability === 'unsupported') {
    return { rendered: false, inert: true };
  }

  if (availability === 'unpackaged') {
    return {
      rendered: true,
      inert: true,
      reason: "A development build can't add itself as a login item.",
    };
  }

  return { rendered: true, inert: false };
}
