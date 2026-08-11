import { afterEach, expect, test } from 'vitest';

import {
  clearedStage,
  controlNamed,
  stagedControls,
  standingLabel,
  walked,
} from './arrow-walk.testkit';

afterEach(clearedStage);

const PLAIN_PANE = `
  <div data-focus-group="">
    <button>first</button>
    <button>second</button>
  </div>
`;

const OPEN_DIALOG_FLOOR = `
  <button>outside</button>
  <dialog open aria-label="confirm">
    <button>keep</button>
    <button>discard</button>
  </dialog>
`;

test('a text input keeps its own arrows', () => {
  stagedControls(`
    <div data-focus-group="">
      <input aria-label="name" />
      <button>after</button>
    </div>
  `);
  controlNamed('name').focus();

  const press = walked('ArrowDown');

  expect(standingLabel()).toBe('name');
  expect(press.defaultPrevented).toBe(false);
});

test('a control inside a menu keeps the arrows the menu owns', () => {
  stagedControls(`
    <div role="menu" aria-label="actions">
      <button role="menuitem">cut</button>
      <button role="menuitem">paste</button>
    </div>
  `);
  controlNamed('cut').focus();

  walked('ArrowDown');

  expect(standingLabel()).toBe('cut');
});

test('a modified arrow passes through untouched', () => {
  stagedControls(PLAIN_PANE);
  controlNamed('first').focus();

  for (const holding of [{ metaKey: true }, { ctrlKey: true }, { altKey: true }]) {
    const press = walked('ArrowDown', holding);

    expect(standingLabel()).toBe('first');
    expect(press.defaultPrevented).toBe(false);
  }
});

test('a key that is no arrow passes through untouched', () => {
  stagedControls(PLAIN_PANE);
  controlNamed('first').focus();

  const press = walked('Enter');

  expect(standingLabel()).toBe('first');
  expect(press.defaultPrevented).toBe(false);
});

test('an open dialog bounds the walk to what it holds', () => {
  stagedControls(OPEN_DIALOG_FLOOR);
  controlNamed('discard').focus();

  walked('ArrowDown');

  expect(standingLabel()).toBe('keep');
});

test('a control outside the open dialog stands outside the walk', () => {
  stagedControls(OPEN_DIALOG_FLOOR);
  controlNamed('outside').focus();

  const press = walked('ArrowDown');

  expect(standingLabel()).toBe('outside');
  expect(press.defaultPrevented).toBe(false);
});

test('focus resting on a drawing is no place to walk from', () => {
  stagedControls(`
    <svg tabindex="0" role="img" aria-label="chart"></svg>
    <button>beside</button>
  `);
  document.querySelector('svg')?.focus();

  walked('ArrowDown');

  expect(standingLabel()).toBe('chart');
});

test('a control reachable only by script never joins a pane walk', () => {
  stagedControls(`
    <div data-focus-group="">
      <div tabindex="-1">scratch</div>
      <button>first</button>
    </div>
  `);
  controlNamed('scratch').focus();

  walked('ArrowDown');

  expect(standingLabel()).toBe('scratch');
});

test('a control reachable only by script never joins the flat walk', () => {
  stagedControls(`
    <div tabindex="-1">scratch</div>
    <button>first</button>
  `);
  controlNamed('scratch').focus();

  walked('ArrowDown');

  expect(standingLabel()).toBe('scratch');
});
