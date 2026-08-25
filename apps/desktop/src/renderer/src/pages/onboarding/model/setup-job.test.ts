import { describe, expect, test } from 'vitest';

import { jobsFor, runReads, standingOf } from './setup-job';

const connected = [
  { id: 'a1', title: 'Claude plan connected', note: 'alpcan@alpcanaydin.com' },
  { id: 'a2', title: 'Ollama linked', note: '127.0.0.1:11434' },
];

describe('the jobs a run carries', () => {
  test('the accounts come first, then the gateway, then the virtual model', () => {
    expect(jobsFor(connected, 'claude-my-model', 2).map((job) => job.id)).toEqual([
      'a1',
      'a2',
      'gateway',
      'virtual-model',
    ]);
  });

  test('the virtual model job names what it composes and what stands behind it', () => {
    const [composing] = jobsFor([], 'claude-my-model', 2).slice(-1);

    expect(composing?.title).toBe('Composing claude-my-model');
    expect(composing?.note).toBe('Round-robin across your two sources');
  });

  test('a single source says so rather than counting to one', () => {
    const [composing] = jobsFor([], 'my-model', 1).slice(-1);

    expect(composing?.note).toBe('Round-robin over your one source');
  });
});

describe('where a run stands on each job', () => {
  const jobs = jobsFor(connected, 'claude-my-model', 2);

  test('everything before the running job reads as finished', () => {
    expect(standingOf({ at: 2, refusal: undefined }, 0)).toBe('finished');
    expect(standingOf({ at: 2, refusal: undefined }, 1)).toBe('finished');
  });

  test('the job it stands on reads as running', () => {
    expect(standingOf({ at: 2, refusal: undefined }, 2)).toBe('running');
  });

  test('everything after it reads as waiting', () => {
    expect(standingOf({ at: 2, refusal: undefined }, 3)).toBe('waiting');
  });

  test('a refusal marks the job it stands on and leaves the rest waiting', () => {
    const refused = { at: 2, refusal: 'Port 8389 is already in use.' };

    expect(standingOf(refused, 2)).toBe('refused');
    expect(standingOf(refused, 3)).toBe('waiting');
    expect(standingOf(refused, 1)).toBe('finished');
  });

  test('a run past its last job reads as finished throughout', () => {
    expect(standingOf({ at: jobs.length, refusal: undefined }, 3)).toBe('finished');
  });
});

describe('the line under the heading', () => {
  test('it says what the wait is for while the run is working', () => {
    expect(runReads({ at: 1, refusal: undefined })).toBe(
      'A few seconds. Each of these becomes a card on the canvas.',
    );
  });

  test('it says what survived when a job refused', () => {
    expect(runReads({ at: 1, refusal: 'Port 8389 is already in use.' })).toBe(
      'One step refused. Nothing you already connected is lost.',
    );
  });
});
