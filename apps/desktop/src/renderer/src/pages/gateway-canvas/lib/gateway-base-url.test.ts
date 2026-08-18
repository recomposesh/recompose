import { describe, expect, test } from 'vitest';

import { gatewaySeed } from '../../../shared/testing';
import { gatewayBaseUrl } from './gateway-base-url';

describe('the one printed form of a gateway base address', () => {
  test('the address reads plain http on the bind address and the stored port', () => {
    const gateway = gatewaySeed({ slug: 'relay', displayName: 'Relay', port: 8397 });

    expect(gatewayBaseUrl(gateway, '127.0.0.1')).toBe('http://127.0.0.1:8397');
  });

  test('a moved bind address moves the printed address with it', () => {
    const gateway = gatewaySeed({ slug: 'relay', displayName: 'Relay', port: 4141 });

    expect(gatewayBaseUrl(gateway, 'gateway.local')).toBe('http://gateway.local:4141');
  });

  test('a gateway bound to every interface prints an address a client can reach', () => {
    const gateway = gatewaySeed({ slug: 'relay', displayName: 'Relay', port: 4141 });

    expect(gatewayBaseUrl(gateway, '0.0.0.0')).toBe('http://127.0.0.1:4141');
  });
});
