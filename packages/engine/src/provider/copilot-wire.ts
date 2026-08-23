import type { ProviderDialect } from '../gateway-wire';

export type CopilotWire = { dialect: ProviderDialect; path: string };

/**
 * The wire one Copilot model is reached on, read from the endpoints its own catalog names.
 *
 * @summary Copilot serves three wires and each model names the ones it answers on, so the whole
 * MAI family and every GPT-5 generation refuse `/chat/completions` with `model_not_supported`.
 * Completions leads the order because it is the wire this gateway has always reached Copilot on,
 * and a model naming no endpoint keeps that reach rather than being moved on a guess.
 */
export function copilotWireFor(endpoints: readonly unknown[]): CopilotWire {
  return WIRES.find((wire) => endpoints.includes(wire.path)) ?? WIRES[0];
}

const WIRES: readonly [CopilotWire, ...CopilotWire[]] = [
  { dialect: 'chat-completions', path: '/chat/completions' },
  { dialect: 'anthropic', path: '/v1/messages' },
  { dialect: 'responses', path: '/responses' },
];
