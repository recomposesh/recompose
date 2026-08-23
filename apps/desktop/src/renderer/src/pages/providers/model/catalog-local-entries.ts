import type { LocalRuntimeId } from '@recompose/contracts';

import { localRuntimes } from '@recompose/contracts';

import type { CatalogEntry } from './catalog-shape';

import { glyphOf, runtime } from './catalog-offers';

function runtimeHost(id: LocalRuntimeId): string {
  return new URL(localRuntimes[id].address).host;
}

export const onThisMachine = (id: LocalRuntimeId) => `${runtimeHost(id)}, models on this machine`;

export const localEntries: readonly CatalogEntry[] = [
  {
    id: 'lmstudio',
    name: localRuntimes.lmstudio.name,
    lead: { mark: 'lmstudio' },
    offers: [runtime(localRuntimes.lmstudio.name, `${runtimeHost('lmstudio')}, local server`)],
  },
  {
    id: 'llamacpp',
    name: localRuntimes.llamacpp.name,
    lead: glyphOf.monitor,
    offers: [runtime(localRuntimes.llamacpp.name, `llama-server on ${runtimeHost('llamacpp')}`)],
  },
  {
    id: 'vllm',
    name: localRuntimes.vllm.name,
    lead: { mark: 'vllm' },
    offers: [runtime(localRuntimes.vllm.name, 'High-throughput GPU serving')],
  },
  {
    id: 'custom-local',
    name: 'Custom local server',
    lead: glyphOf.network,
    offers: [
      {
        way: 'local',
        takes: 'address',
        title: 'Custom local server',
        benefit: 'Anything serving models on a local port',
      },
    ],
  },
];

/**
 * Every provider the catalog offers, with the ways each one connects.
 *
 * @summary Reach for it from the catalog. A provider that both sells a plan and sells a key
 * stands under both ways, because the two yield different things and a person chooses between
 * them rather than being handed one. Each way carries its own title, because a plan reads as the
 * product a person pays for and a key reads as the endpoint it is spent against.
 */
