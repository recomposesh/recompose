import { describe, expect, test } from 'vitest';

import {
  localRuntimeIdSchema,
  localRuntimes,
  runtimeLookFor,
  runtimeReachabilitySchema,
} from './local-runtimes';

describe('the path a look asks a runtime to identify itself down', () => {
  test('each runtime is asked the path its own project serves rather than a shared one', () => {
    expect(localRuntimes.ollama.identityPath).toBe('/api/version');
    expect(localRuntimes.lmstudio.identityPath).toBe('/api/v0/models');
    expect(localRuntimes.llamacpp.identityPath).toBe('/props');
    expect(localRuntimes.vllm.identityPath).toBe('/version');
  });

  test('a server a person addressed themselves is asked the one path they all serve', () => {
    expect(runtimeLookFor('custom').identityPath).toBe('/v1/models');
  });

  test('a documented runtime is asked its own path rather than the shared one', () => {
    for (const runtime of localRuntimeIdSchema.options) {
      expect(runtimeLookFor(runtime), runtime).toEqual(localRuntimes[runtime]);
      expect(runtimeLookFor(runtime).identityPath, runtime).not.toBe('/v1/models');
    }
  });

  test('no two runtimes share an identity path, or one would answer for another', () => {
    const paths = localRuntimeIdSchema.options.map((id) => localRuntimes[id].identityPath);

    expect(new Set(paths).size).toBe(paths.length);
  });

  test('a runtime naming where its version sits reads it from there', () => {
    expect(localRuntimes.ollama.versionField).toBe('version');
    expect(localRuntimes.vllm.versionField).toBe('version');
    expect(localRuntimes.llamacpp.versionField).toBe('build_info');
  });

  test('the runtime that publishes no version anywhere names no field to read one from', () => {
    expect(runtimeLookFor('lmstudio').versionField).toBeUndefined();
    expect(runtimeLookFor('custom').versionField).toBeUndefined();
  });
});

describe('the reading a reachability look carries back', () => {
  test('a runtime that answered carries the version it reported', () => {
    const reading = { verdict: 'answers', version: '0.5.1' };

    expect(runtimeReachabilitySchema.parse(reading)).toEqual(reading);
  });

  test('a runtime that answered without publishing a version still answers', () => {
    const reading = { verdict: 'answers' };

    expect(runtimeReachabilitySchema.parse(reading)).toEqual(reading);
  });

  test('a version that arrived blank is refused rather than carried as an empty line', () => {
    expect(() => runtimeReachabilitySchema.parse({ verdict: 'answers', version: '  ' })).toThrow();
  });

  test('a stranger on the port carries the status it answered with', () => {
    const reading = { verdict: 'unrecognized', status: 404 };

    expect(runtimeReachabilitySchema.parse(reading)).toEqual(reading);
  });

  test('silence carries nothing at all, because nothing answered to be carried', () => {
    const reading = { verdict: 'unreachable' };

    expect(runtimeReachabilitySchema.parse(reading)).toEqual(reading);
  });
});

describe('what a reachability reading refuses to carry', () => {
  test('a verdict outside the three is refused', () => {
    for (const verdict of ['running', 'stopped', 'reachable']) {
      expect(() => runtimeReachabilitySchema.parse({ verdict })).toThrow();
    }
  });

  test('the three verdicts stay disjoint from what a key check answers', () => {
    for (const verdict of ['authenticates', 'not-accepted', 'could-not-check']) {
      expect(() => runtimeReachabilitySchema.parse({ verdict })).toThrow();
    }
  });

  test('an answer carrying a blank version is refused, because a blank names nothing', () => {
    expect(() => runtimeReachabilitySchema.parse({ verdict: 'answers', version: '   ' })).toThrow();
  });

  test('a stranger carrying no status is refused, because the status is what names it strange', () => {
    expect(() => runtimeReachabilitySchema.parse({ verdict: 'unrecognized' })).toThrow();
    expect(() =>
      runtimeReachabilitySchema.parse({ verdict: 'unrecognized', status: 404.5 }),
    ).toThrow();
  });

  test('no reading can carry another reading fields', () => {
    for (const smuggled of [
      { verdict: 'answers', version: '0.5.1', status: 200 },
      { verdict: 'unrecognized', status: 404, version: '0.5.1' },
      { verdict: 'unreachable', version: '0.5.1' },
      { verdict: 'unreachable', status: 0 },
    ]) {
      expect(() => runtimeReachabilitySchema.parse(smuggled)).toThrow();
    }
  });

  test('no reading has a field the runtime body could ride home in', () => {
    for (const smuggled of [
      { body: '{"version":"0.5.1"}' },
      { address: 'http://127.0.0.1:11434' },
    ]) {
      expect(() =>
        runtimeReachabilitySchema.parse({ verdict: 'answers', version: '0.5.1', ...smuggled }),
      ).toThrow();
    }
  });
});
