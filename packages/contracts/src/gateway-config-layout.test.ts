import { describe, expect, test } from 'vitest';

import { GATEWAY_CONFIG_VERSION, gatewayConfigSchema } from './gateway-config';

const validConfig = {
  schemaVersion: GATEWAY_CONFIG_VERSION,
  slug: 'my-gateway',
  displayName: 'My Gateway',
  port: 8397,
  virtualModels: [],
  layout: { nodes: { gateway: { x: 0, y: 0 }, 'model:fast': { x: 240, y: 0 } } },
};

describe('the seats a stored layout keeps, which are keyed by the card that stands at each', () => {
  test('a card id carrying the address its prefix names is accepted', () => {
    for (const cardId of ['gateway', 'model:fast', 'route:fast', 'route:fast:seat:fast']) {
      const seated = { ...validConfig, layout: { nodes: { [cardId]: { x: 0, y: 0 } } } };

      expect(() => gatewayConfigSchema.parse(seated)).not.toThrow();
    }
  });

  test('a nameless card seats nothing, because no card on the canvas answers to nothing', () => {
    const nameless = {
      ...validConfig,
      layout: { nodes: { ...validConfig.layout.nodes, ['']: { x: 0, y: 0 } } },
    };

    expect(() => gatewayConfigSchema.parse(nameless)).toThrow();
  });

  test('a layout naming a viewport is refused, because nothing on the canvas stores one', () => {
    const withViewport = {
      ...validConfig,
      layout: { ...validConfig.layout, viewport: { x: 0, y: 0, zoom: 1 } },
    };

    expect(() => gatewayConfigSchema.parse(withViewport)).toThrow();
  });

  test('a seat missing either axis is refused, because half a seat places nothing', () => {
    for (const half of [{ x: 0 }, { y: 0 }]) {
      const lopsided = { ...validConfig, layout: { nodes: { gateway: half } } };

      expect(() => gatewayConfigSchema.parse(lopsided)).toThrow();
    }
  });

  test('a __proto__ layout key can never enter a parsed config', () => {
    const hostileLayout = {
      ...validConfig,
      layout: { nodes: { ...validConfig.layout.nodes, ['__proto__']: { x: 0, y: 0 } } },
    };

    const parsed = gatewayConfigSchema.parse(hostileLayout);

    const nodesPrototype: unknown = Object.getPrototypeOf(parsed.layout.nodes);

    expect(Object.keys(parsed.layout.nodes)).toEqual(Object.keys(validConfig.layout.nodes));
    expect(nodesPrototype).not.toHaveProperty('x');
  });
});
