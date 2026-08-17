import { fc, test as propertyTest } from '@fast-check/vitest';
import { describe, expect, test } from 'vitest';

import {
  SETTINGS_SHORTCUT_ROUTE,
  gatewayDetailSlugFrom,
  gatewaysRouteFor,
  newGatewayRouteFor,
  onGatewayDetailUrl,
  onProvidersUrl,
  providersRouteFor,
  rendererBaseFor,
  rendererUrlFor,
  settingsShortcutRouteFor,
  usageRouteFor,
  usageSearchWordsFrom,
} from './renderer-url';

describe('the navigation routes the View menu opens', () => {
  test('the gateways pick lands where the home landing lands', () => {
    expect(gatewaysRouteFor(3)).toBe('/?at=3');
  });

  test('the providers pick lands the providers surface', () => {
    expect(providersRouteFor(4)).toBe('/providers?at=4');
  });

  test('the usage pick lands the explorer', () => {
    expect(usageRouteFor(5)).toBe('/usage?at=5');
  });

  test('every press stamps the route, so a repeat pick reads as a fresh request', () => {
    expect(gatewaysRouteFor(1)).not.toBe(gatewaysRouteFor(2));
  });
});

describe('which gateway detail an address stands on', () => {
  test('a gateway detail names its slug', () => {
    expect(gatewayDetailSlugFrom('app://renderer/index.html#/gateways/personal')).toBe('personal');
  });

  test('a detail address with a query or a deeper path keeps only the slug', () => {
    expect(gatewayDetailSlugFrom('app://renderer/index.html#/gateways/relay?x=1')).toBe('relay');
    expect(gatewayDetailSlugFrom('app://renderer/index.html#/gateways/relay/logs')).toBe('relay');
  });

  test('any other surface names no gateway', () => {
    expect(gatewayDetailSlugFrom('app://renderer/index.html#/usage')).toBeNull();
    expect(gatewayDetailSlugFrom('app://renderer/index.html#/gateways/')).toBeNull();
    expect(gatewayDetailSlugFrom('not a url')).toBeNull();
  });
});

describe('the usage words an address carries', () => {
  test('a usage address names its range and metric', () => {
    expect(
      usageSearchWordsFrom('app://renderer/index.html#/usage?range=this-week&metric=spend'),
    ).toEqual({ range: 'this-week', metric: 'spend' });
  });

  test('a bare usage address lands the default view, mirroring the renderer', () => {
    expect(usageSearchWordsFrom('app://renderer/index.html#/usage')).toEqual({
      range: '24h',
      metric: 'requests',
    });
  });

  test('words the vocabulary never accepted fall back rather than ride', () => {
    expect(
      usageSearchWordsFrom('app://renderer/index.html#/usage?range=90d&metric=errors'),
    ).toEqual({ range: '24h', metric: 'requests' });
  });

  test('a custom range without both edges falls back the way the renderer folds it', () => {
    expect(usageSearchWordsFrom('app://renderer/index.html#/usage?range=custom')).toEqual({
      range: '24h',
      metric: 'requests',
    });
    expect(
      usageSearchWordsFrom('app://renderer/index.html#/usage?range=custom&from=1&to=2'),
    ).toEqual({ range: 'custom', metric: 'requests' });
  });

  test('an address off the explorer carries the defaults', () => {
    expect(usageSearchWordsFrom('app://renderer/index.html#/')).toEqual({
      range: '24h',
      metric: 'requests',
    });
  });
});

describe('whether an address stands on the providers surface', () => {
  test('the providers route answers wherever its search points', () => {
    expect(onProvidersUrl('app://renderer/index.html#/providers')).toBe(true);
    expect(onProvidersUrl('app://renderer/index.html#/providers?kind=api-key')).toBe(true);
  });

  test('another surface does not answer, and junk answers nothing', () => {
    expect(onProvidersUrl('app://renderer/index.html#/')).toBe(false);
    expect(onProvidersUrl('junk')).toBe(false);
  });
});

const packagedBase = 'app://renderer/index.html';
const devBase = 'http://localhost:5173';

describe('the document a window loads its routes from', () => {
  test('a development run takes the renderer the development server holds', () => {
    expect(rendererBaseFor(true, devBase)).toBe(devBase);
  });

  test('a packaged run takes the renderer the app scheme serves', () => {
    expect(rendererBaseFor(false, undefined)).toBe(packagedBase);
  });

  test('a packaged run ignores a development server address left in the environment', () => {
    expect(rendererBaseFor(false, devBase)).toBe(packagedBase);
  });

  test('a development run with no server address falls back to the served renderer', () => {
    expect(rendererBaseFor(true, undefined)).toBe(packagedBase);
    expect(rendererBaseFor(true, '')).toBe(packagedBase);
  });
});

describe('the address a window opens a route at', () => {
  test('the packaged renderer reaches a route through the fragment', () => {
    expect(rendererUrlFor(packagedBase, '/settings')).toBe('app://renderer/index.html#/settings');
  });

  test('the development server reaches the same route the same way', () => {
    expect(rendererUrlFor(devBase, '/settings')).toBe('http://localhost:5173#/settings');
  });

  test('the home route names itself rather than leaving the fragment off', () => {
    expect(rendererUrlFor(packagedBase, '/')).toBe('app://renderer/index.html#/');
  });

  test('the settings shortcut asks the surface it opens to place focus', () => {
    expect(rendererUrlFor(packagedBase, SETTINGS_SHORTCUT_ROUTE)).toBe(
      'app://renderer/index.html#/settings?focus=first-control',
    );
  });

  test('a settings arrival the shortcut never made carries no such request', () => {
    expect(rendererUrlFor(packagedBase, '/settings')).not.toContain('focus');
  });

  propertyTest.prop([fc.constantFrom(packagedBase, devBase), fc.stringMatching(/^\/[a-z/-]*$/)])(
    'every route hangs off the same document, one fragment deep',
    (base, route) => {
      const url = rendererUrlFor(base, route);

      expect(url.startsWith(`${base}#`)).toBe(true);
      expect(url.endsWith(route)).toBe(true);
      expect(url.split('#')).toHaveLength(2);
    },
  );
});

describe('the settings shortcut, pressed more than once', () => {
  test('each press names a location the router has not seen', () => {
    expect(settingsShortcutRouteFor(1)).not.toBe(settingsShortcutRouteFor(2));
  });

  test('every press still asks for the settings route and its focus', () => {
    expect(settingsShortcutRouteFor(7)).toContain(SETTINGS_SHORTCUT_ROUTE);
    expect(settingsShortcutRouteFor(7)).toContain('focus=first-control');
  });
});

describe('the route that opens the gateway creation sheet', () => {
  test('it carries the person to the canvas whatever surface they stand on', () => {
    expect(newGatewayRouteFor(1)).toBe('/?create=true&at=1');
  });

  test('each press names a location the router has not seen', () => {
    expect(newGatewayRouteFor(1)).not.toBe(newGatewayRouteFor(2));
  });

  test('every press still asks for the sheet', () => {
    expect(newGatewayRouteFor(9)).toContain('create=true');
  });
});

describe('reading whether an address stands on a gateway detail', () => {
  test('a gateway detail reads as one, packaged and under the development server alike', () => {
    expect(onGatewayDetailUrl(rendererUrlFor(packagedBase, '/gateways/personal'))).toBe(true);
    expect(onGatewayDetailUrl(rendererUrlFor(devBase, '/gateways/personal'))).toBe(true);
  });

  test('every other surface reads as none', () => {
    for (const route of ['/', '/settings', '/providers', '/usage', '/?create=true']) {
      expect(onGatewayDetailUrl(rendererUrlFor(packagedBase, route))).toBe(false);
    }
  });

  test('an address that is no address at all reads as none rather than throwing', () => {
    expect(onGatewayDetailUrl('not a url')).toBe(false);
  });
});
