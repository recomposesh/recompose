import { beforeEach, describe, expect, test, vi } from 'vitest';

import { registerEditingContextMenu } from './editing-menu-wiring';

type EditingContext = { isEditable: boolean; selectionText: string };

type CapturedOptions = {
  showSearchWithGoogle?: boolean;
  shouldShowMenu?: (event: unknown, parameters: EditingContext) => boolean;
};

const captured = vi.hoisted((): { options: CapturedOptions | undefined } => ({
  options: undefined,
}));

vi.mock('electron-context-menu', () => ({
  default: (options: CapturedOptions) => {
    captured.options = options;

    return () => {};
  },
}));

function registeredOptions(): CapturedOptions {
  const { options } = captured;

  if (options === undefined) {
    throw new Error('no editing context menu was registered');
  }

  return options;
}

function menuStandsOn(parameters: EditingContext): boolean {
  const { shouldShowMenu } = registeredOptions();

  if (shouldShowMenu === undefined) {
    throw new Error('the registered menu decides nothing about where it stands');
  }

  return shouldShowMenu({}, parameters);
}

describe('the registered editing context menu', () => {
  beforeEach(() => {
    captured.options = undefined;
    registerEditingContextMenu();
  });

  test('it stands on a text field', () => {
    expect(menuStandsOn({ isEditable: true, selectionText: '' })).toBe(true);
  });

  test('it stands on selected text', () => {
    expect(menuStandsOn({ isEditable: false, selectionText: 'claude-opus-5' })).toBe(true);
  });

  test('it leaves bare chrome to the app', () => {
    expect(menuStandsOn({ isEditable: false, selectionText: '' })).toBe(false);
  });

  test('nothing on it hands a selection to a search engine', () => {
    expect(registeredOptions().showSearchWithGoogle).toBe(false);
  });
});
