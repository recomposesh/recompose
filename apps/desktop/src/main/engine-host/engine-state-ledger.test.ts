import { fc, test } from '@fast-check/vitest';
import {
  type EngineReport,
  type EngineStates,
  type GatewayEngineState,
} from '@recompose/contracts';
import { describe, expect } from 'vitest';

import { allStopped, foldEngineReport, withGatewayStopped } from './engine-state-ledger';

const anySlug = fc.constantFrom('codex', 'gemini', 'personal', 'work');
const anyState: fc.Arbitrary<GatewayEngineState> = fc.oneof(
  fc.constant<GatewayEngineState>({ status: 'running' }),
  fc.constant<GatewayEngineState>({ status: 'stopped' }),
  fc
    .integer({ min: 1024, max: 65535 })
    .map((port) => ({ status: 'stopped' as const, failure: { port } })),
);

type StateReport = Extract<EngineReport, { kind: 'state' }>;

const anyReport: fc.Arbitrary<StateReport> = fc.record({
  kind: fc.constant('state' as const),
  answers: fc.stringMatching(/^d[0-9]{1,4}$/),
  slug: anySlug,
  state: anyState,
});

function report(slug: string, state: GatewayEngineState): StateReport {
  return { kind: 'state', answers: 'd1', slug, state };
}

describe('the ledger a boot starts from', () => {
  test('every stored gateway begins stopped, because nothing serves before a start', () => {
    expect(allStopped(['codex', 'gemini'])).toEqual({
      codex: { status: 'stopped' },
      gemini: { status: 'stopped' },
    });
  });

  test('no stored gateway leaves an empty ledger', () => {
    expect(allStopped([])).toEqual({});
  });
});

describe('folding a report into the ledger', () => {
  test('a report moves its own gateway and leaves the others where they stood', () => {
    const folded = foldEngineReport(
      allStopped(['codex', 'gemini']),
      report('codex', {
        status: 'running',
      }),
    );

    expect(folded).toEqual({ codex: { status: 'running' }, gemini: { status: 'stopped' } });
  });

  test('a gateway created after boot joins the ledger on its first report', () => {
    const folded = foldEngineReport(allStopped(['codex']), report('gemini', { status: 'running' }));

    expect(folded).toEqual({ codex: { status: 'stopped' }, gemini: { status: 'running' } });
  });

  test('a failed start carries the port it wanted into the ledger', () => {
    const folded = foldEngineReport(
      allStopped(['codex']),
      report('codex', { status: 'stopped', failure: { port: 8397 } }),
    );

    expect(folded).toEqual({ codex: { status: 'stopped', failure: { port: 8397 } } });
  });

  test('the ledger it folded from keeps the state it had, so no subscriber reads a mutation', () => {
    const before = allStopped(['codex']);

    foldEngineReport(before, report('codex', { status: 'running' }));

    expect(before).toEqual({ codex: { status: 'stopped' } });
  });
});

describe('folding a run of reports', () => {
  test('interleaved reports leave each gateway on its own last word', () => {
    const folded = [
      report('codex', { status: 'running' }),
      report('gemini', { status: 'running' }),
      report('codex', { status: 'stopped', failure: { port: 8397 } }),
      report('gemini', { status: 'stopped' }),
      report('codex', { status: 'running' }),
    ].reduce(foldEngineReport, {});

    expect(folded).toEqual({ codex: { status: 'running' }, gemini: { status: 'stopped' } });
  });

  test.prop([fc.array(anyReport, { minLength: 1 })])(
    'any run of reports leaves exactly the last state each gateway reported',
    (reports) => {
      const folded = reports.reduce(foldEngineReport, {});

      for (const slug of new Set(reports.map((one) => one.slug))) {
        const last = reports.filter((one) => one.slug === slug).at(-1);

        expect(folded[slug]).toEqual(last?.state);
      }
    },
  );

  test.prop([fc.array(anyReport)])('the ledger names no gateway that never reported', (reports) => {
    const folded = reports.reduce(foldEngineReport, {});

    expect(Object.keys(folded).sort()).toEqual([...new Set(reports.map((one) => one.slug))].sort());
  });
});

describe('writing down a gateway no report ever came back for', () => {
  test('a restart that never came back up leaves its gateway reading stopped', () => {
    const written = withGatewayStopped({ codex: { status: 'running' } }, 'codex');

    expect(written).toEqual({ codex: { status: 'stopped' } });
  });

  test('the other gateways stand where they stood, because one restart failed and not the fleet', () => {
    const written = withGatewayStopped(
      { codex: { status: 'running' }, gemini: { status: 'running' } },
      'codex',
    );

    expect(written).toEqual({ codex: { status: 'stopped' }, gemini: { status: 'running' } });
  });

  test('the port a failed start named leaves with it, because no port explains a silent restart', () => {
    const written = withGatewayStopped(
      { codex: { status: 'stopped', failure: { port: 8397 } } },
      'codex',
    );

    expect(written).toEqual({ codex: { status: 'stopped' } });
  });

  test('a gateway the ledger never named joins it stopped rather than staying unnamed', () => {
    expect(withGatewayStopped({}, 'codex')).toEqual({ codex: { status: 'stopped' } });
  });

  test('the ledger it was written from keeps its own word, so no subscriber reads a mutation', () => {
    const before: EngineStates = { codex: { status: 'running' } };

    withGatewayStopped(before, 'codex');

    expect(before).toEqual({ codex: { status: 'running' } });
  });

  test.prop([anySlug, fc.array(anyReport)])(
    'writing one gateway down moves that gateway and no other, whatever the ledger held',
    (slug, reports) => {
      const held = reports.reduce(foldEngineReport, {});
      const written = withGatewayStopped(held, slug);

      expect(written[slug]).toEqual({ status: 'stopped' });

      for (const other of Object.keys(held).filter((one) => one !== slug)) {
        expect(written[other]).toEqual(held[other]);
      }
    },
  );
});
