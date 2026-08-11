import { afterEach, expect, test } from 'vitest';

import { drivenFocus, focusDrivenByArrow } from './arrow-drive';
import { clearedStage, controlNamed, stagedControls, walked } from './arrow-walk.testkit';

afterEach(clearedStage);

const PANE = `
  <div data-focus-group="">
    <button>first</button>
    <button>second</button>
  </div>
`;

test('a focus listener sees the arrow behind a walk step', () => {
  stagedControls(PANE);

  const landing = controlNamed('second');

  let drove: boolean | undefined;

  landing.addEventListener('focus', () => {
    drove = focusDrivenByArrow();
  });
  controlNamed('first').focus();

  walked('ArrowDown');

  expect(drove).toBe(true);
  expect(focusDrivenByArrow()).toBe(false);
});

test('a plain focus call reads as no arrow at all', () => {
  stagedControls(PANE);

  const landing = controlNamed('second');

  let drove: boolean | undefined;

  landing.addEventListener('focus', () => {
    drove = focusDrivenByArrow();
  });
  landing.focus();

  expect(drove).toBe(false);
});

test('the drive flag holds only for the synchronous focus dispatch', () => {
  stagedControls(PANE);

  const landing = controlNamed('second');

  let during: boolean | undefined;

  landing.addEventListener('focus', () => {
    during = focusDrivenByArrow();
  });
  drivenFocus(landing);

  expect(during).toBe(true);
  expect(focusDrivenByArrow()).toBe(false);
  expect(document.activeElement).toBe(landing);
});
