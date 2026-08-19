import { expect, test } from 'vitest';

import type { RoutingPickerProps } from './picker-asks';

import { pickerArgs } from '../../testing/routing-picker-args';
import { stepOf } from './picker-asks';

function asked(held: Partial<RoutingPickerProps>): RoutingPickerProps {
  return { ...pickerArgs, ...held };
}

const judgeBound = {
  ...pickerArgs.judge,
  binding: { accountId: 'k1', providerModel: 'claude-haiku-4-5' },
};

test('a draft standing at the binding ask asks what it binds to and nothing more', () => {
  expect(stepOf(asked({ bindsThrough: undefined }))).toBe('kind');
});

test('answering the ask with a router asks which kind of router before anything else', () => {
  expect(stepOf(asked({ bindsThrough: 'router', routerMode: undefined }))).toBe('router-mode');
});

test('a router that settled on a spreading mode has nothing left to pick', () => {
  expect(stepOf(asked({ bindsThrough: 'router', routerMode: 'failover' }))).toBe('router');
  expect(stepOf(asked({ bindsThrough: 'router', routerMode: 'round-robin' }))).toBe('router');
});

test('a router that settled on conditional walks on to what that mode is born naming', () => {
  const conditional = { bindsThrough: 'router' as const, routerMode: 'conditional' as const };

  expect(stepOf(asked({ ...conditional, target: undefined }))).toBe('provider');
  expect(stepOf(asked({ ...conditional, target: 'k1', providerModel: '' }))).toBe('model');
  expect(stepOf(asked({ ...conditional, target: 'k1', providerModel: 'gpt-5' }))).toBe(
    'judge-provider',
  );
  expect(
    stepOf(asked({ ...conditional, target: 'k1', providerModel: 'gpt-5', judge: judgeBound })),
  ).toBe('router');
});

test('a draft that answered the ask with a provider never meets the mode step', () => {
  expect(stepOf(asked({ bindsThrough: 'target', routerMode: undefined }))).toBe('provider');
});

test('a draft written before the ask existed opens on the models its target serves', () => {
  expect(stepOf(asked({ bindsThrough: undefined, target: 'k1' }))).toBe('model');
});
