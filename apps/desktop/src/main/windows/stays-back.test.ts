import { describe, expect, test } from 'vitest';

import { activationPolicyFor, staysBack } from './stays-back';

describe('the run that must not come to the front', () => {
  test('given the marker is set, the app stays back', () => {
    expect(staysBack({ RECOMPOSE_WINDOW_STAYS_BACK: '1' })).toBe(true);
  });

  test('given the marker is absent, the app behaves as a person launched it', () => {
    expect(staysBack({})).toBe(false);
  });

  test('given the marker carries anything else, the app still comes to the front', () => {
    expect(staysBack({ RECOMPOSE_WINDOW_STAYS_BACK: 'true' })).toBe(false);
  });

  test('given the marker is empty, the app comes to the front', () => {
    expect(staysBack({ RECOMPOSE_WINDOW_STAYS_BACK: '' })).toBe(false);
  });
});

describe('how macOS is asked to leave a run alone', () => {
  test('given a run that stays back, the app leaves the Dock and the app switcher', () => {
    expect(activationPolicyFor('darwin', { RECOMPOSE_WINDOW_STAYS_BACK: '1' })).toBe('accessory');
  });

  test('given an ordinary run, nothing is asked of macOS', () => {
    expect(activationPolicyFor('darwin', {})).toBeNull();
  });

  test('given a run that stays back off macOS, nothing is asked, because nothing answers', () => {
    expect(activationPolicyFor('win32', { RECOMPOSE_WINDOW_STAYS_BACK: '1' })).toBeNull();
    expect(activationPolicyFor('linux', { RECOMPOSE_WINDOW_STAYS_BACK: '1' })).toBeNull();
  });
});
