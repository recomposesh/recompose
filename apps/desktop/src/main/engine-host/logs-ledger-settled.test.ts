import type { LogRow } from '@recompose/contracts';

import { afterEach, describe, expect, test, vi } from 'vitest';

import { openLogsDesk } from './logs-ledger';

const at = 1_754_600_000_000;

const clientKey = 'sha256:8706ee88bbbdda48d02a4888691822b90d8b136bc5fb8e3a815e518105f0655c';

type RowStanding = {
  origin?: LogRow['origin'];
  status?: number;
  durationMs?: number | undefined;
};

function aRow(id: string, standing: RowStanding = {}): LogRow {
  const { origin = 'provider', status = 200, ...took } = standing;

  return {
    id,
    at,
    gateway: 'codex',
    virtualModel: 'fast',
    origin,
    method: 'POST',
    provider: 'openai',
    accountId: 'work',
    providerModel: 'gpt-5-mini',
    status,
    durationMs: 912,
    clientKey,
    ...took,
  };
}

function stillRunning(row: LogRow): LogRow {
  const { durationMs: _running, ...rest } = row;

  return rest;
}

function aDeskTelling(): {
  hears: (row: LogRow) => void;
  desk: ReturnType<typeof openLogsDesk>;
  settled: LogRow[];
} {
  const settled: LogRow[] = [];
  const desk = openLogsDesk(
    () => undefined,
    (row) => {
      settled.push(row);
    },
  );

  return {
    desk,
    settled,
    hears: (row) => {
      desk.hears({ kind: 'log', row });
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('the settled observer', () => {
  test('a report already carrying its duration settles on arrival and is told once', () => {
    const { hears, settled } = aDeskTelling();

    hears(aRow('measured'));

    expect(settled.map((row) => row.id)).toEqual(['measured']);
  });

  test('a two-phase request is told only when its measure lands', () => {
    const { hears, settled } = aDeskTelling();
    const opened = stillRunning(aRow('slow'));

    hears(opened);
    expect(settled).toEqual([]);

    hears(aRow('slow'));
    expect(settled.map((row) => row.id)).toEqual(['slow']);
  });

  test('a resent settled report tells nobody a second time', () => {
    const { hears, settled } = aDeskTelling();

    hears(aRow('measured'));
    hears(aRow('measured'));

    expect(settled).toHaveLength(1);
  });

  test('a gateway-raised row settles the moment it lands', () => {
    const { hears, settled } = aDeskTelling();

    hears(stillRunning(aRow('refused', { origin: 'gateway', status: 502 })));

    expect(settled.map((row) => row.id)).toEqual(['refused']);
  });

  test('an interrupt settles the rows it fails, with the failure written on them', () => {
    vi.useFakeTimers();
    vi.setSystemTime(at + 5_000);

    const { hears, desk, settled } = aDeskTelling();

    hears(stillRunning(aRow('unfinished')));
    desk.interrupt('codex');

    expect(settled.map((row) => row.id)).toEqual(['unfinished']);
    expect(settled.at(0)?.status).toBe(503);
    expect(settled.at(0)?.durationMs).toBe(5_000);
  });
});

describe('what the observer never breaks or hears', () => {
  test('a throwing observer is its own defect: the desk keeps the row and keeps serving', () => {
    const complaints = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const desk = openLogsDesk(
      () => undefined,
      () => {
        throw new Error('the ledger is on fire');
      },
    );

    expect(desk.hears({ kind: 'log', row: aRow('measured') })).toBe(true);
    expect(desk.retainedRows().map((row) => row.id)).toEqual(['measured']);
    expect(complaints).toHaveBeenCalledOnce();

    complaints.mockRestore();
  });

  test('a backfill ask tells the observer nothing', () => {
    const { hears, desk, settled } = aDeskTelling();

    hears(aRow('measured'));
    desk.backfill();

    expect(settled).toHaveLength(1);
  });
});

describe('the retained history a reader can borrow', () => {
  test('the desk hands back the rows it holds', () => {
    const { hears, desk } = aDeskTelling();

    hears(aRow('one'));
    hears(aRow('two'));

    expect(desk.retainedRows().map((row) => row.id)).toEqual(['one', 'two']);
  });
});
