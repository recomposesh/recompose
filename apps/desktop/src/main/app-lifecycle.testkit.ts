/**
 * The desktop a lifecycle spec drives, and the Electron stand-in that answers it.
 *
 * @summary Two specs drive the same lifecycle from opposite ends, one for what it starts and one
 * for what a quit interrupts, and both need the same desktop underneath. Keeping the stand-in here
 * means neither spec carries the other's setup, and the object the mock closes over is the object
 * the spec asserts on, because a module resolves once.
 */
export type Desktop = {
  ready: Promise<void>;
  announceReady: () => void;
  listeners: Map<string, () => void>;
  windowCount: number;
  quits: number;
};

export const desktop: Desktop = {
  ready: Promise.resolve(),
  announceReady: () => {},
  listeners: new Map(),
  windowCount: 0,
  quits: 0,
};

class TrayFake {
  private destroyed = false;

  setToolTip(): void {}

  setContextMenu(): void {}

  destroy(): void {
    this.destroyed = true;
  }

  isDestroyed(): boolean {
    return this.destroyed;
  }
}

const icon = {
  addRepresentation: () => {},
  setTemplateImage: () => {},
  toDataURL: () => 'data:image/png;base64,',
};

/** What `vi.mock('electron', ...)` answers with in a lifecycle spec. */
export function electronFake() {
  return {
    app: {
      whenReady: async () => desktop.ready,
      on: (event: string, listener: () => void) => {
        desktop.listeners.set(event, listener);
      },
      quit: () => {
        desktop.quits += 1;
      },
    },
    BrowserWindow: { getAllWindows: () => Array.from({ length: desktop.windowCount }) },
    Menu: { buildFromTemplate: () => null },
    nativeImage: { createFromPath: () => icon },
    Tray: TrayFake,
  };
}

/** Stands the desktop back up between specs, so no listener or count carries over. */
export function aFreshDesktop(): void {
  desktop.ready = new Promise<void>((resolve) => {
    desktop.announceReady = resolve;
  });
  desktop.listeners.clear();
  desktop.windowCount = 0;
  desktop.quits = 0;
}

/** Fires one of the events the app registered for, naming the miss rather than passing silently. */
export function fire(event: string): void {
  const listener = desktop.listeners.get(event);

  if (listener === undefined) {
    throw new Error(`the app registered no ${event} listener`);
  }

  listener();
}
