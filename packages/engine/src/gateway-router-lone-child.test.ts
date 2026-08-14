import type { EngineVirtualModel } from '@recompose/contracts';

import { describe, expect, it } from 'vitest';

import {
  answeringInTurn,
  aRoutedModel,
  refusedWith,
  served,
  serving,
} from './gateway-router.testkit';

function aRouterOverOneChild(): EngineVirtualModel {
  return aRoutedModel('failover', [{ standing: 'bound', providerModel: 'gpt-5-mini' }]);
}

function aRouterOverOneChildAndOneAccountThatLeft(): EngineVirtualModel {
  return aRoutedModel('failover', [
    { standing: 'bound', providerModel: 'gpt-5-mini' },
    { standing: 'removed' },
  ]);
}

function aRouterOverTwoChildren(): EngineVirtualModel {
  return aRoutedModel('failover', [
    { standing: 'bound', providerModel: 'gpt-5-mini' },
    { standing: 'bound', providerModel: 'claude-sonnet-4-5' },
  ]);
}

function anUpstreamThatIsDown(): Response {
  return refusedWith(503, { error: { message: 'upstream unavailable' } });
}

describe('a router steering nowhere keeps no memory of what it refused', () => {
  it('reaches the provider again after its only child answered a 503', async () => {
    const scene = serving(aRouterOverOneChild(), answeringInTurn(anUpstreamThatIsDown));

    await (await scene.ask()).text();
    await (await scene.ask()).text();

    expect(scene.sentTo).toHaveLength(2);
  });

  it('counts an account that left as no sibling to steer toward', async () => {
    const scene = serving(
      aRouterOverOneChildAndOneAccountThatLeft(),
      answeringInTurn(anUpstreamThatIsDown),
    );

    await (await scene.ask()).text();
    await (await scene.ask()).text();

    expect(scene.sentTo).toHaveLength(2);
  });
});

describe('a router holding a sibling still stands its refused child down', () => {
  it('sends the next caller straight to the sibling rather than asking again', async () => {
    const scene = serving(aRouterOverTwoChildren(), answeringInTurn(anUpstreamThatIsDown, served));

    await (await scene.ask()).text();
    await (await scene.ask()).text();

    expect(scene.sentTo).toEqual([
      'http://first.test/v1/chat/completions',
      'http://second.test/v1/chat/completions',
      'http://second.test/v1/chat/completions',
    ]);
  });
});
