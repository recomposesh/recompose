import { afterEach, expect, test } from 'vitest';

import {
  clearedStage,
  controlNamed,
  stagedControls,
  standingLabel,
  walked,
} from './arrow-walk.testkit';

afterEach(clearedStage);

const SEAT = 'position: absolute; width: 20px; height: 20px';

const SPATIAL_PANES = `
  <div data-focus-group="spatial" style="position: relative; width: 300px; height: 300px">
    <button style="${SEAT}; left: 0px; top: 100px">origin</button>
    <button style="${SEAT}; left: 100px; top: 100px">straight</button>
    <button style="${SEAT}; left: 40px; top: 140px">diagonal</button>
    <button style="${SEAT}; left: 0px; top: 200px">below</button>
  </div>
  <div data-focus-group="">
    <button>east</button>
  </div>
`;

test('a spatial pane steps to the control lying in the pressed direction', () => {
  stagedControls(SPATIAL_PANES);
  controlNamed('origin').focus();

  walked('ArrowDown');

  expect(standingLabel()).toBe('below');
});

test('drift off the arrow line counts double against a nearer candidate', () => {
  stagedControls(SPATIAL_PANES);
  controlNamed('origin').focus();

  walked('ArrowRight');

  expect(standingLabel()).toBe('straight');
});

test('an arrow right past the spatial edge crosses to the neighboring pane', () => {
  stagedControls(SPATIAL_PANES);
  controlNamed('straight').focus();

  walked('ArrowRight');

  expect(standingLabel()).toBe('east');
});

test('an arrow up with nothing that way holds its ground', () => {
  stagedControls(SPATIAL_PANES);
  controlNamed('origin').focus();

  walked('ArrowUp');

  expect(standingLabel()).toBe('origin');
});

test('an arrow left with no pane on that side holds its ground', () => {
  stagedControls(SPATIAL_PANES);
  controlNamed('origin').focus();

  walked('ArrowLeft');

  expect(standingLabel()).toBe('origin');
});
