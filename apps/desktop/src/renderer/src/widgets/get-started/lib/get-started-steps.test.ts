import { fc, test } from '@fast-check/vitest';
import { describe, expect } from 'vitest';

import { getStartedSteps, type GetStartedProgress } from './get-started-steps';

const titles = [
  'Create a gateway',
  'Connect a provider',
  'Compose a virtual model',
  'Send the first request',
];

const nothingDone: GetStartedProgress = {
  gatewayExists: false,
  providerConnected: false,
  virtualModelComposed: false,
  firstRequestServed: false,
};

const everyProgress = fc.record({
  gatewayExists: fc.boolean(),
  providerConnected: fc.boolean(),
  virtualModelComposed: fc.boolean(),
  firstRequestServed: fc.boolean(),
});

describe('the checklist a first session follows', () => {
  test('it names the same four steps in the same order, whatever the session has done', () => {
    expect(getStartedSteps(nothingDone).map((step) => step.title)).toEqual(titles);
    expect(
      getStartedSteps({
        gatewayExists: true,
        providerConnected: true,
        virtualModelComposed: true,
        firstRequestServed: true,
      }).map((step) => step.title),
    ).toEqual(titles);
  });

  test('a session that has done nothing stands on the first step', () => {
    const [gateway, provider] = getStartedSteps(nothingDone);

    expect(gateway).toMatchObject({ title: 'Create a gateway', state: 'current' });
    expect(provider).toMatchObject({ title: 'Connect a provider', state: 'pending' });
  });

  test('a stored gateway completes the first step and moves the session to the second', () => {
    const [gateway, provider] = getStartedSteps({ ...nothingDone, gatewayExists: true });

    expect(gateway).toMatchObject({ state: 'done' });
    expect(provider).toMatchObject({ state: 'current' });
  });

  test('a connected account completes the provider step on its own', () => {
    const [gateway, provider] = getStartedSteps({ ...nothingDone, providerConnected: true });

    expect(gateway).toMatchObject({ state: 'current' });
    expect(provider).toMatchObject({ state: 'done' });
  });
});

describe('the back half of the ladder', () => {
  test('a gateway and a provider move the session onto composing', () => {
    const [, , compose, request] = getStartedSteps({
      ...nothingDone,
      gatewayExists: true,
      providerConnected: true,
    });

    expect(compose).toMatchObject({ title: 'Compose a virtual model', state: 'current' });
    expect(request).toMatchObject({ title: 'Send the first request', state: 'pending' });
  });

  test('a composed virtual model moves the session onto the first request', () => {
    const [, , compose, request] = getStartedSteps({
      ...nothingDone,
      gatewayExists: true,
      providerConnected: true,
      virtualModelComposed: true,
    });

    expect(compose).toMatchObject({ state: 'done' });
    expect(request).toMatchObject({ state: 'current' });
  });

  test('a served request completes the whole checklist', () => {
    const steps = getStartedSteps({
      gatewayExists: true,
      providerConnected: true,
      virtualModelComposed: true,
      firstRequestServed: true,
    });

    expect(steps.every((step) => step.state === 'done')).toBe(true);
  });
});

describe('the invariants the checklist keeps whatever the session has done', () => {
  test.prop([everyProgress])('it never marks two steps current at once', (progress) => {
    const current = getStartedSteps(progress).filter((step) => step.state === 'current');

    expect(current.length).toBeLessThanOrEqual(1);
  });

  test.prop([everyProgress])('the current step is always the first one left undone', (progress) => {
    const steps = getStartedSteps(progress);
    const firstUndone = steps.findIndex((step) => step.state !== 'done');

    for (const [index, step] of steps.entries()) {
      if (step.state === 'current') {
        expect(index).toBe(firstUndone);
      }
    }
  });

  test.prop([everyProgress])(
    'a done step reads done from its record alone, wherever the session stands',
    (progress) => {
      const [gateway, provider, compose, request] = getStartedSteps(progress);

      expect(gateway?.state === 'done').toBe(progress.gatewayExists);
      expect(provider?.state === 'done').toBe(progress.providerConnected);
      expect(compose?.state === 'done').toBe(progress.virtualModelComposed);
      expect(request?.state === 'done').toBe(progress.firstRequestServed);
    },
  );
});
