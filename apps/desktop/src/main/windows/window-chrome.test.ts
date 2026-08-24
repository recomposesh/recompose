import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  answerTitleBarDoubleClick,
  paintTitleBarOverlay,
  placeWindowButtons,
} from './window-chrome';

type ZoomState = { maximized: boolean; minimized: boolean };

type FocusedWindow = {
  isMaximized: () => boolean;
  maximize: () => void;
  unmaximize: () => void;
  minimize: () => void;
};

type Placement = { x: number; y: number };

type Overlay = { color: string; symbolColor: string; height: number };

type ControlWindow = {
  setWindowButtonPosition: (position: Placement) => void;
  setTitleBarOverlay: (overlay: Overlay) => void;
};

const desktop = vi.hoisted(
  (): {
    focused: FocusedWindow | null;
    open: ControlWindow[];
    doubleClickPreference: string | null;
  } => ({ focused: null, open: [], doubleClickPreference: null }),
);

vi.mock('electron', () => ({
  BrowserWindow: {
    getFocusedWindow: (): FocusedWindow | null => desktop.focused,
    getAllWindows: (): ControlWindow[] => desktop.open,
  },
  systemPreferences: {
    getUserDefault: (): string | null => desktop.doubleClickPreference,
  },
}));

function focusWindow(): ZoomState {
  const zoom: ZoomState = { maximized: false, minimized: false };

  desktop.focused = {
    isMaximized: () => zoom.maximized,
    maximize: () => {
      zoom.maximized = true;
    },
    unmaximize: () => {
      zoom.maximized = false;
    },
    minimize: () => {
      zoom.minimized = true;
    },
  };

  return zoom;
}

function openWindow(): { placements: Placement[]; overlays: Overlay[] } {
  const placements: Placement[] = [];
  const overlays: Overlay[] = [];

  desktop.open.push({
    setWindowButtonPosition: (position) => {
      placements.push(position);
    },
    setTitleBarOverlay: (overlay) => {
      overlays.push(overlay);
    },
  });

  return { placements, overlays };
}

beforeEach(() => {
  desktop.focused = null;
  desktop.open = [];
  desktop.doubleClickPreference = null;
});

describe('answering a title-bar double-click the renderer reported', () => {
  test('on macOS the focused window performs the action the person chose', () => {
    desktop.doubleClickPreference = 'Maximize';
    const window = focusWindow();

    answerTitleBarDoubleClick('darwin');

    expect(window.maximized).toBe(true);
  });

  test('off macOS the platform answers its own title bar, so the window is left alone', () => {
    desktop.doubleClickPreference = 'Maximize';
    const window = focusWindow();

    answerTitleBarDoubleClick('linux');

    expect(window.maximized).toBe(false);
  });

  test('a double-click reported after its window closed is answered by doing nothing', () => {
    desktop.doubleClickPreference = 'Maximize';

    expect(() => {
      answerTitleBarDoubleClick('darwin');
    }).not.toThrow();
  });
});

describe('placing the window controls over the band they now sit on', () => {
  test('on macOS the controls move to the reported position', () => {
    const { placements } = openWindow();

    placeWindowButtons('darwin', { x: 14, y: 12 });

    expect(placements).toEqual([{ x: 14, y: 12 }]);
  });

  test('off macOS, where the platform draws its own controls, nothing is moved', () => {
    const { placements } = openWindow();

    placeWindowButtons('linux', { x: 14, y: 12 });

    expect(placements).toEqual([]);
  });

  test('a band reported after its window closed is answered by doing nothing', () => {
    expect(() => {
      placeWindowButtons('darwin', { x: 14, y: 12 });
    }).not.toThrow();
  });
});

describe('repainting the caption strip when the scheme turns', () => {
  test('on Windows the strip takes the colors the new scheme names', () => {
    const { overlays } = openWindow();

    paintTitleBarOverlay('win32', 'dark');

    expect(overlays).toEqual([{ color: '#28282c', symbolColor: '#f9f9fb', height: 54 }]);
  });

  test('off Windows, where no strip is drawn, nothing is repainted', () => {
    const { overlays } = openWindow();

    paintTitleBarOverlay('darwin', 'dark');

    expect(overlays).toEqual([]);
  });

  test('a scheme that turns after its window closed is answered by doing nothing', () => {
    expect(() => {
      paintTitleBarOverlay('win32', 'light');
    }).not.toThrow();
  });
});
