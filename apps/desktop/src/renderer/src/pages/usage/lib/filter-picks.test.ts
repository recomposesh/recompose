import { describe, expect, it } from 'vitest';

import { keptAfterPick, memberKept } from './filter-picks';

const everyGateway: readonly string[] = ['relay', 'backup', 'proxy'];

describe('given a filter standing on everything', () => {
  it('keeps every member the window served', () => {
    expect(memberKept([], 'relay')).toBe(true);
    expect(memberKept([], 'proxy')).toBe(true);
  });

  it('lets one member go by keeping every other one', () => {
    expect(keptAfterPick([], 'relay', everyGateway)).toEqual(['backup', 'proxy']);
  });

  it('keeps the members in the order the window served them', () => {
    expect(keptAfterPick([], 'backup', everyGateway)).toEqual(['relay', 'proxy']);
  });

  it('stands on everything still where the only member the window served is let go', () => {
    expect(keptAfterPick([], 'relay', ['relay'])).toEqual([]);
  });
});

describe('given a narrowed filter', () => {
  it('keeps the members it names and no others', () => {
    expect(memberKept(['relay'], 'relay')).toBe(true);
    expect(memberKept(['relay'], 'backup')).toBe(false);
  });

  it('takes on the member a person picks', () => {
    expect(keptAfterPick(['relay'], 'backup', everyGateway)).toEqual(['relay', 'backup']);
  });

  it('drops the member a person lets go', () => {
    expect(keptAfterPick(['relay', 'backup'], 'relay', everyGateway)).toEqual(['backup']);
  });

  it('stands back on everything when the last member it kept is let go', () => {
    expect(keptAfterPick(['relay'], 'relay', everyGateway)).toEqual([]);
  });

  it('stands back on everything rather than naming every member once the last one is picked', () => {
    expect(keptAfterPick(['relay', 'backup'], 'proxy', everyGateway)).toEqual([]);
  });
});

describe('given a selection the standing window never served', () => {
  it('counts the member no request reached among everything', () => {
    expect(keptAfterPick(['ghost'], 'relay', ['relay', 'ghost'])).toEqual([]);
  });

  it('keeps the unserved member while another one is let go', () => {
    expect(keptAfterPick(['ghost'], 'relay', ['relay', 'backup', 'ghost'])).toEqual([
      'ghost',
      'relay',
    ]);
  });
});
