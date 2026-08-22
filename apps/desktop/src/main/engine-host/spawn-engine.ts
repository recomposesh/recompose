import engineChildPath from '@recompose/engine/child?modulePath';
import { utilityProcess } from 'electron';
import { join } from 'node:path';

import type { EngineChild } from './engine-host';

type ChildDirectories = { logs?: string; plugins?: string; routing?: string };

function childEnvironment(directories: ChildDirectories): Record<string, string> {
  const inherited = Object.entries(process.env).filter(
    (entry): entry is [string, string] => entry[1] !== undefined,
  );

  return {
    ...Object.fromEntries(inherited),
    ...(directories.logs === undefined ? {} : { RECOMPOSE_LOG_DIR: directories.logs }),
    ...(directories.plugins === undefined ? {} : { RECOMPOSE_PLUGIN_DIR: directories.plugins }),
    ...(directories.routing === undefined ? {} : { RECOMPOSE_ROUTING_DIR: directories.routing }),
  };
}

function directoriesUnder(userDataPath: string | undefined): ChildDirectories {
  if (userDataPath === undefined) return {};

  return {
    logs: join(userDataPath, 'logs'),
    plugins: join(userDataPath, 'plugins'),
    routing: join(userDataPath, 'routing'),
  };
}

export function spawnEngineChild(userDataPath?: string): EngineChild {
  const engine = utilityProcess.fork(engineChildPath, [], {
    stdio: 'pipe',
    env: childEnvironment(directoriesUnder(userDataPath)),
  });

  engine.on('error', (type, location, report) => {
    console.error(`The engine hit a ${type} at ${location}.`, report);
  });

  engine.stderr?.on('data', (line: Buffer) => {
    console.error(`The engine child said: ${line.toString().trimEnd()}`);
  });

  engine.stdout?.on('data', (line: Buffer) => {
    console.log(`The engine child said: ${line.toString().trimEnd()}`);
  });

  return {
    postMessage: (directive) => {
      engine.postMessage(directive);
    },
    onMessage: (listener) => {
      engine.on('message', listener);
    },
    onExit: (listener) => {
      engine.on('exit', listener);
    },
    kill: () => {
      engine.kill();
    },
  };
}
