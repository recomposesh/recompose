import { afterEach, expect, test } from 'vitest';
import { renderHook } from 'vitest-browser-react';

import { useArrowWalk } from './arrow-walk';
import {
  clearedStage,
  controlNamed,
  stagedControls,
  standingLabel,
  walked,
} from './arrow-walk.testkit';

afterEach(clearedStage);

const ONE_PANE = `
  <div data-focus-group="">
    <button>first</button>
    <button>second</button>
    <button>third</button>
  </div>
`;

const HORIZONTAL_PANE = `
  <div data-focus-group="horizontal">
    <button>west</button>
    <button>middle</button>
    <button>east</button>
  </div>
`;

const STACKED_HORIZONTAL_PANES = `
  <div data-focus-group="horizontal">
    <button>upper</button>
  </div>
  <div data-focus-group="horizontal">
    <button>lower</button>
  </div>
`;

const NEIGHBORING_PANES = `
  <div data-focus-group="">
    <button>one</button>
    <button>two</button>
  </div>
  <div data-focus-group="">
    <button>three</button>
    <button>four</button>
  </div>
`;

const OPEN_FLOOR = `
  <button>one</button>
  <button>two</button>
  <button>three</button>
`;

function greetedPanes(mark: string): string {
  return `
    <div data-focus-group="">
      <button>door</button>
    </div>
    <div data-focus-group="">
      <button>plain</button>
      <button ${mark}>chosen</button>
    </div>
  `;
}

test('an arrow down its pane steps focus to the next control', () => {
  stagedControls(ONE_PANE);
  controlNamed('first').focus();

  const press = walked('ArrowDown');

  expect(standingLabel()).toBe('second');
  expect(press.defaultPrevented).toBe(true);
});

test('an arrow up its pane steps focus back to the control before', () => {
  stagedControls(ONE_PANE);
  controlNamed('third').focus();

  walked('ArrowUp');

  expect(standingLabel()).toBe('second');
});

test('the walk stops at the edges of its pane', () => {
  stagedControls(ONE_PANE);
  controlNamed('first').focus();

  const atTop = walked('ArrowUp');

  expect(standingLabel()).toBe('first');
  expect(atTop.defaultPrevented).toBe(false);

  controlNamed('third').focus();
  walked('ArrowDown');

  expect(standingLabel()).toBe('third');
});

test('a horizontal pane walks along left and right instead', () => {
  stagedControls(HORIZONTAL_PANE);
  controlNamed('west').focus();

  walked('ArrowRight');

  expect(standingLabel()).toBe('middle');

  walked('ArrowLeft');

  expect(standingLabel()).toBe('west');
});

test('arrows across a horizontal pane step to the panes above and below', () => {
  stagedControls(STACKED_HORIZONTAL_PANES);
  controlNamed('upper').focus();

  walked('ArrowDown');

  expect(standingLabel()).toBe('lower');

  walked('ArrowUp');

  expect(standingLabel()).toBe('upper');
});

test('an arrow across the axis leaves for the neighboring pane', () => {
  stagedControls(NEIGHBORING_PANES);
  controlNamed('one').focus();

  walked('ArrowRight');

  expect(standingLabel()).toBe('three');
});

test('an arrow back across the axis returns to the pane before', () => {
  stagedControls(NEIGHBORING_PANES);
  controlNamed('three').focus();

  walked('ArrowLeft');

  expect(standingLabel()).toBe('one');
});

test('the walk holds its pane when no neighbor lies that way', () => {
  stagedControls(NEIGHBORING_PANES);
  controlNamed('one').focus();

  walked('ArrowLeft');

  expect(standingLabel()).toBe('one');
});

test('the neighboring pane greets the walk with its active control', () => {
  stagedControls(greetedPanes('data-status="active"'));
  controlNamed('door').focus();

  walked('ArrowRight');

  expect(standingLabel()).toBe('chosen');
});

test('the neighboring pane greets the walk with its pressed control', () => {
  stagedControls(greetedPanes('aria-pressed="true"'));
  controlNamed('door').focus();

  walked('ArrowRight');

  expect(standingLabel()).toBe('chosen');
});

test('the neighboring pane greets the walk with its checked control', () => {
  stagedControls(greetedPanes('role="switch" aria-checked="true"'));
  controlNamed('door').focus();

  walked('ArrowRight');

  expect(standingLabel()).toBe('chosen');
});

test('a chosen control no longer painted cannot greet the walk', () => {
  stagedControls(greetedPanes('data-status="active" style="display: none"'));
  controlNamed('door').focus();

  walked('ArrowRight');

  expect(standingLabel()).toBe('plain');
});

test('a control outside any pane walks flat over everything reachable', () => {
  stagedControls(OPEN_FLOOR);
  controlNamed('one').focus();

  walked('ArrowDown');

  expect(standingLabel()).toBe('two');
});

test('the flat walk wraps around at both ends', () => {
  stagedControls(OPEN_FLOOR);
  controlNamed('three').focus();

  walked('ArrowDown');

  expect(standingLabel()).toBe('one');

  walked('ArrowUp');

  expect(standingLabel()).toBe('three');
});

test('a control no longer painted never receives the walk', () => {
  stagedControls(`
    <div data-focus-group="">
      <button>first</button>
      <button style="display: none">ghost</button>
      <button>third</button>
    </div>
  `);
  controlNamed('first').focus();

  walked('ArrowDown');

  expect(standingLabel()).toBe('third');
});

test('the walk stands over the window for as long as the shell lives', async () => {
  const shell = await renderHook(useArrowWalk);

  stagedControls(ONE_PANE);
  controlNamed('first').focus();
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }));

  expect(standingLabel()).toBe('second');

  await shell.unmount();
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }));

  expect(standingLabel()).toBe('second');
});
