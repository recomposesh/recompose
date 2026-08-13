import { z } from 'zod';

import { nonBlankString } from './non-blank';

export const localRuntimeIdSchema = z.enum(['ollama', 'lmstudio', 'llamacpp', 'vllm']);

export type LocalRuntimeId = z.infer<typeof localRuntimeIdSchema>;

/**
 * Every server a local row may stand for, which is the documented runtimes and a person's own.
 *
 * @summary A documented runtime carries a port and an identity path its project publishes. A
 * custom server carries neither, because the person supplies the address and recompose has no
 * identity to hold it to, so it stands apart from the runtimes rather than among them.
 */
export const localProviderIdSchema = z.enum([...localRuntimeIdSchema.options, 'custom']);

export type LocalProviderId = z.infer<typeof localProviderIdSchema>;

type RuntimeLook = {
  /** The path a look asks, which is the one the runtime's own project serves. */
  identityPath: string;
  /** Where the version sits in the answer, or absent where the runtime publishes none. */
  versionField?: string;
};

type DocumentedRuntime = RuntimeLook & { name: string; address: string };

/**
 * Every runtime recompose looks for, with the port and the path its own project documents.
 *
 * @summary A look asks the runtime's own path rather than a shared one, because every server here
 * answers `/v1/models` and a shared path would report whichever server holds the port as the
 * runtime a person picked. LM Studio publishes no version anywhere in its surface, so it names no
 * field and a look reports that it answers without claiming a version it never gave.
 */
export const localRuntimes = {
  ollama: {
    name: 'Ollama',
    address: 'http://127.0.0.1:11434',
    identityPath: '/api/version',
    versionField: 'version',
  },
  lmstudio: {
    name: 'LM Studio',
    address: 'http://127.0.0.1:1234',
    identityPath: '/api/v0/models',
  },
  llamacpp: {
    name: 'llama.cpp',
    address: 'http://127.0.0.1:8080',
    identityPath: '/props',
    versionField: 'build_info',
  },
  vllm: {
    name: 'vLLM',
    address: 'http://127.0.0.1:8000',
    identityPath: '/version',
    versionField: 'version',
  },
} as const satisfies Record<LocalRuntimeId, DocumentedRuntime>;

/**
 * How a look asks a server a person addressed themselves.
 *
 * @summary recompose knows nothing about what listens there, so the look asks the one path every
 * model server serves and claims no version, rather than holding the address to an identity the
 * person never promised.
 */
export const customRuntimeLook: RuntimeLook = { identityPath: '/v1/models' };

/** How a look asks whichever server a local row stands for. */
export function runtimeLookFor(provider: LocalProviderId): RuntimeLook {
  return provider === 'custom' ? customRuntimeLook : localRuntimes[provider];
}

/**
 * How long a look at a runtime waits for the loopback answer before it counts as silence.
 *
 * @summary Both processes read it: the engine child bounds its fetch by it, and the host's own wait
 * has to outlast it, so a look folds on the child's verdict rather than on the host giving up. The
 * two sides sit behind a wall that lets neither import the other, so the bound stands here.
 */
export const runtimeLookBoundMs = 3_000;

/**
 * How long the gateway's outbound fetch gives a provider before the request counts as silence.
 *
 * @summary Ten minutes matches the default request timeout the provider SDKs ship, so the gateway
 * never gives up before the client that asked would have. It stands beside the runtime look bound
 * so no process keeps a private copy of a fetch bound.
 */
export const proxyFetchBoundMs = 600_000;

/**
 * How long a look at an account's model list waits for the vendor before it counts as silence.
 *
 * @summary A person is watching the Model field while this runs, so it is a look rather than a
 * proxied turn and nowhere near the ten-minute bound. It still outlasts the loopback look, because
 * that number is sized for a server on this machine and an aggregator's catalog crosses the
 * internet. Ten seconds is what the shipped key probe already gives the same `GET /v1/models`, and
 * it stays under the host's own wait so a look folds on the child's verdict.
 */
export const modelListBoundMs = 10_000;

export const RUNTIME_PORT_RANGE = { min: 1, max: 65535 } as const;

export const runtimePortSchema = z.int().min(RUNTIME_PORT_RANGE.min).max(RUNTIME_PORT_RANGE.max);

export function documentedRuntimePort(runtime: LocalRuntimeId): number {
  return Number(new URL(localRuntimes[runtime].address).port);
}

export function runtimeAddressFor(
  runtime: LocalRuntimeId,
  port: number = documentedRuntimePort(runtime),
): string {
  const documented = new URL(localRuntimes[runtime].address);

  return `${documented.protocol}//${documented.hostname}:${String(runtimePortSchema.parse(port))}`;
}

/**
 * The loopback address a server a person addressed themselves listens at.
 *
 * @summary A documented runtime mints its address from the table. A server nobody documented has
 * no table row to mint from, so the port a person gave is the whole of it, and the host stays the
 * loopback address recompose mints rather than one they could aim off this machine.
 */
export function loopbackAddressAt(port: number): string {
  return `http://127.0.0.1:${String(runtimePortSchema.parse(port))}`;
}

const loopbackHost = '127.0.0.1';

const probeableProtocols = ['http:', 'https:'];

function defaultPortOf(protocol: string): string {
  return protocol === 'https:' ? '443' : '80';
}

function aProbeableLoopbackUrl(parsed: URL | null): parsed is URL {
  return (
    parsed !== null &&
    probeableProtocols.includes(parsed.protocol) &&
    parsed.hostname === loopbackHost
  );
}

function spellsItsOwnOrigin(parsed: URL, address: string): boolean {
  return (
    parsed.origin === address || address === `${parsed.origin}:${defaultPortOf(parsed.protocol)}`
  );
}

function isItsOwnLoopbackOrigin(address: string): boolean {
  const parsed = URL.parse(address);

  return aProbeableLoopbackUrl(parsed) && spellsItsOwnOrigin(parsed, address);
}

export const loopbackAddressSchema = z
  .string()
  .refine(isItsOwnLoopbackOrigin, 'the address must be a loopback origin');

export const runtimeReachabilitySchema = z.discriminatedUnion('verdict', [
  z.strictObject({ verdict: z.literal('answers'), version: nonBlankString.optional() }),
  z.strictObject({ verdict: z.literal('unrecognized'), status: z.number().int() }),
  z.strictObject({ verdict: z.literal('unreachable') }),
]);

export type RuntimeReachability = z.infer<typeof runtimeReachabilitySchema>;
