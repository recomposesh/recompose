import { afterAll } from 'vitest';
import { commands } from 'vitest/browser';

declare module 'vitest/browser' {
  interface BrowserCommands {
    requestGC: () => Promise<void>;
  }
}

afterAll(async () => {
  await commands.requestGC();
});
