import { homedir } from 'node:os';
import { dirname } from 'node:path';
import { describe, expect, it } from 'vitest';

import { scenarioUserDataDir } from './scenario-user-data';

const aClone = '/Users/ada/recompose/apps/desktop';
const aWorktree = '/Users/ada/recompose/.claude/worktrees/routers/apps/desktop';

describe('the folder a scenario hands its app for user data', () => {
  it('answers two checkouts running the same worker with folders apart', () => {
    const inTheClone = scenarioUserDataDir(aClone, 3);
    const inTheWorktree = scenarioUserDataDir(aWorktree, 3);

    expect(inTheWorktree).not.toBe(inTheClone);
  });

  it('answers two workers in one checkout with folders apart', () => {
    expect(scenarioUserDataDir(aClone, 1)).not.toBe(scenarioUserDataDir(aClone, 2));
  });

  it('answers one checkout the same folder however often it asks', () => {
    expect(scenarioUserDataDir(aClone, 3)).toBe(scenarioUserDataDir(aClone, 3));
  });

  it('keeps the folder in the home directory, where the harness sweeps it', () => {
    expect(dirname(scenarioUserDataDir(aClone, 3))).toBe(homedir());
  });
});
