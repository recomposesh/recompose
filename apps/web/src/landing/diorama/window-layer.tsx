import type { Ref } from 'react';

import { AppCanvas } from './app-canvas';
import { AppSidebar } from './app-sidebar';
import { AppToolbar } from './app-toolbar';
import { ClaudeWindow } from './claude-window';
import { CodexWindow } from './codex-window';
import { StatusBar } from './status-bar';

const WINDOW_SHADOW = '0 24px 60px rgb(0 0 0 / 0.35), 0 2px 10px rgb(0 0 0 / 0.25)';

export function WindowLayer({ windowLayerRef }: { windowLayerRef: Ref<HTMLDivElement> }) {
  return (
    <div
      ref={windowLayerRef}
      className="absolute"
      style={{
        width: 1312,
        height: 820,
        insetInlineStart: '50%',
        top: '50%',
        translate: '-50% -50%',
      }}
    >
      <div
        className="absolute inset-s-9 top-11.5 h-171 w-310 bg-win-canvas"
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

      <div className="absolute inset-s-30 top-96.5">
        <CodexWindow />
      </div>
    </div>
  );
}
