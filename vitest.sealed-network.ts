const MACHINE_ITSELF = new Set(['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0']);

function askedAddress(input: unknown): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  if (input instanceof Request) return input.url;

  return String(input);
}

function standsOnThisMachine(address: string): boolean {
  try {
    return MACHINE_ITSELF.has(new URL(address).hostname);
  } catch {
    return false;
  }
}

/**
 * Refuses any request a test aims past the machine it runs on.
 *
 * @summary A suite that reaches the real internet answers differently on a plane, behind a
 * corporate proxy, and on a runner whose egress policy changed, and it charges every run for the
 * round trip. The refusal names the address, because a test that wanted one usually wanted a stub
 * in front of it and its author has to know which. Loopback passes, since several suites stand a
 * real server on a free port and talk to it, which is a boundary rather than a network.
 */
const reachedOut: typeof globalThis.fetch = globalThis.fetch;

globalThis.fetch = async (...asked: Parameters<typeof globalThis.fetch>) => {
  const address = askedAddress(asked[0]);

  if (standsOnThisMachine(address)) {
    return reachedOut(...asked);
  }

  throw new Error(
    `A test asked the network for ${address}. Stand a stub in front of it, or hand the unit a fetch of its own.`,
  );
};
