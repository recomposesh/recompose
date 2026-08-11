import { beforeEach, describe, expect, test, vi } from 'vitest';

import { registerPermissionHandlers } from './permission-wiring';

type RequestHandler = (
  webContents: unknown,
  permission: string,
  callback: (allowed: boolean) => void,
) => void;

type CheckHandler = (webContents: unknown, permission: string) => boolean;

const defaultSession = vi.hoisted(
  (): {
    onRequest: RequestHandler | null;
    onCheck: CheckHandler | null;
  } => ({ onRequest: null, onCheck: null }),
);

vi.mock('electron', () => ({
  session: {
    defaultSession: {
      setPermissionRequestHandler: (handler: RequestHandler) => {
        defaultSession.onRequest = handler;
      },
      setPermissionCheckHandler: (handler: CheckHandler) => {
        defaultSession.onCheck = handler;
      },
    },
  },
}));

function askedFor(permission: string): boolean {
  if (defaultSession.onRequest === null) {
    throw new Error('no permission request handler stands on the default session');
  }

  const answers: boolean[] = [];

  defaultSession.onRequest({}, permission, (allowed) => {
    answers.push(allowed);
  });

  const answered = answers[0];

  if (answered === undefined) {
    throw new Error(`the request for ${permission} was never answered`);
  }

  return answered;
}

function checkedFor(permission: string): boolean {
  if (defaultSession.onCheck === null) {
    throw new Error('no permission check handler stands on the default session');
  }

  return defaultSession.onCheck({}, permission);
}

beforeEach(() => {
  defaultSession.onRequest = null;
  defaultSession.onCheck = null;
  registerPermissionHandlers();
});

describe('answering a permission the renderer requests', () => {
  test('the sanitized clipboard write the address pill needs is granted', () => {
    expect(askedFor('clipboard-sanitized-write')).toBe(true);
  });

  test('any other permission is refused rather than left to Chromium', () => {
    expect(askedFor('geolocation')).toBe(false);
    expect(askedFor('media')).toBe(false);
  });
});

describe('answering a permission the renderer merely checks', () => {
  test('the check answers exactly what a request would', () => {
    expect(checkedFor('clipboard-sanitized-write')).toBe(true);
    expect(checkedFor('notifications')).toBe(false);
  });
});
