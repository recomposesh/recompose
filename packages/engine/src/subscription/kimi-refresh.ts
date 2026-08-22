import type { RefreshRequest } from './refresh-request';

import { formRefreshRequest } from './refresh-request';

export const KIMI_TOKEN_URL = 'https://auth.kimi.com/api/oauth/token';

const KIMI_CLIENT_ID = '17e5f671-d194-4dfb-9706-5516cb48c098';

/**
 * @summary Kimi counts its callers per install and names the device on every ask its own tool
 * makes, so a renewal names the device the tokens were minted for rather than a fresh one. A
 * credential carrying no device still renews, because the device the plan holds is the one that
 * signed in and the header only says which install is asking.
 */
export function kimiRefreshRequest(
  refreshToken: string,
  deviceId: string | undefined,
): RefreshRequest {
  return formRefreshRequest(
    {
      client_id: KIMI_CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    },
    deviceId === undefined ? [] : [['X-Msh-Device-Id', deviceId]],
  );
}
