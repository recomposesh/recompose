import { useSyncExternalStore } from 'react';

import type { Platform } from './detect-platform';

import { detectPlatform } from './detect-platform';

const subscribeToNothing = () => () => {};
const visitorPlatform = (): Platform => detectPlatform(navigator.userAgent);
const prerenderPlatform = (): Platform => 'mac';

export function useVisitorPlatform(): Platform {
  return useSyncExternalStore(subscribeToNothing, visitorPlatform, prerenderPlatform);
}
