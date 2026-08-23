/**
 * How a Copilot turn names the editor it is coming from.
 *
 * @summary Copilot serves the editor plugins GitHub ships and reads which one is asking off every
 * request, so a turn naming none is a turn it can refuse. The values are the ones CC Switch sends
 * in `src-tauri/src/proxy/providers/copilot_auth.rs`, which is the port this app already carries
 * the rest of Copilot from.
 */
const COPILOT_EDITOR_VERSION = 'vscode/1.110.1';

const COPILOT_PLUGIN_VERSION = 'copilot-chat/0.38.2';

const COPILOT_USER_AGENT = 'GitHubCopilotChat/0.38.2';

const COPILOT_API_VERSION = '2025-10-01';

const COPILOT_INTEGRATION_ID = 'vscode-chat';

export function copilotHeaders(credential: string): Record<string, string> {
  return {
    authorization: `Bearer ${credential}`,
    'copilot-integration-id': COPILOT_INTEGRATION_ID,
    'editor-version': COPILOT_EDITOR_VERSION,
    'editor-plugin-version': COPILOT_PLUGIN_VERSION,
    'user-agent': COPILOT_USER_AGENT,
    'x-github-api-version': COPILOT_API_VERSION,
  };
}
