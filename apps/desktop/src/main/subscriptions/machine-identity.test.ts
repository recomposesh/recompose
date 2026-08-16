import { describe, expect, test, vi } from 'vitest';

import { machineModel, thisMachine } from './machine-identity';

vi.mock('node:os', async (whole) => {
  const real = await whole<typeof import('node:os')>();

  return {
    ...real,
    hostname: () => {
      if (hostnameRefuses) {
        throw new Error('the system would not say');
      }

      return 'ada-machine';
    },
  };
});

let hostnameRefuses = false;

describe('the model this machine reports itself as', () => {
  test('each platform a person runs this on reads as the name they call it', () => {
    expect(machineModel('darwin', 'arm64')).toBe('macOS arm64');
    expect(machineModel('win32', 'x64')).toBe('Windows x64');
    expect(machineModel('linux', 'arm64')).toBe('Linux arm64');
  });

  test('a platform nobody named reads as itself rather than as a blank', () => {
    expect(machineModel('freebsd', 'x64')).toBe('freebsd x64');
  });

  test('the architecture always rides along, because two builds of one system differ', () => {
    expect(machineModel('darwin', 'x64')).not.toBe(machineModel('darwin', 'arm64'));
  });
});

/**
 * @summary The system naming this machine is a process boundary, and the only way to read what a
 * sign-in sends when it refuses is to make it refuse. A vendor that counts callers by device would
 * otherwise be sent an empty name by an app that never learned it had one.
 */
describe('a machine the system will not name', () => {
  test('the sign-in stands under a name rather than an empty one', () => {
    hostnameRefuses = true;

    try {
      expect(thisMachine('1.2.3').name).toBe('unknown');
    } finally {
      hostnameRefuses = false;
    }
  });

  test('a machine the system does name is named by it', () => {
    expect(thisMachine('1.2.3').name).toBe('ada-machine');
  });
});

describe('the identity one sign-in names this machine by', () => {
  test('it carries a name, an identity, a model and the version that asked', () => {
    const named = thisMachine('1.2.3');

    expect(named.version).toBe('1.2.3');
    expect(named.name).toBe('ada-machine');
    expect(named.model).toBe(machineModel(process.platform, process.arch));
  });

  test('the identity is minted per flow, so no two sign-ins claim the same device', () => {
    expect(thisMachine('1.2.3').id).not.toBe(thisMachine('1.2.3').id);
  });

  test('the identity reads as one a vendor would accept rather than as a blank', () => {
    expect(thisMachine('1.2.3').id).toMatch(/^[0-9a-f-]{36}$/u);
  });
});
