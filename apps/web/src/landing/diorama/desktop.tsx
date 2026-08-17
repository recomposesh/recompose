import { AppCanvas } from './app-canvas';
import { AppSidebar } from './app-sidebar';
import { AppToolbar } from './app-toolbar';
import { ClaudeWindow } from './claude-window';
import { Dock } from './dock';
import { MenuBar } from './menu-bar';
import { StatusBar } from './status-bar';

const WINDOW_SHADOW = '0 24px 60px rgb(0 0 0 / 0.35), 0 2px 10px rgb(0 0 0 / 0.25)';

export function Desktop() {
  return (
    <div className="relative h-205 w-328 overflow-hidden rounded-xl font-system shadow-2xl">
      <img
        src="/landing/wp-ridges-light.jpg"
        alt=""
        className="absolute inset-0 block size-full object-cover dark:hidden"
      />
      <img
        src="/landing/wp-flow-dark.jpg"
        alt=""
        className="absolute inset-0 hidden size-full object-cover dark:block"
      />
      <div className="absolute inset-0 bg-black/10 dark:bg-black/20" />

      <MenuBar />

      <div
        className="absolute inset-s-9 top-14 h-171 w-310 bg-win-canvas"
        style={{ borderRadius: 26, boxShadow: WINDOW_SHADOW }}
      >
        <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: 26 }}>
          <AppSidebar />
          <AppToolbar />
          <AppCanvas />
          <StatusBar />
        </div>
      </div>

      <div className="absolute inset-s-16 top-82.5">
        <ClaudeWindow />
      </div>

      <div
        data-diorama-scrim
        className="absolute inset-x-0 bottom-0 h-120 bg-linear-to-b from-transparent via-stage/80 to-stage/95 opacity-0"
      />

      <Dock />
    </div>
  );
}
