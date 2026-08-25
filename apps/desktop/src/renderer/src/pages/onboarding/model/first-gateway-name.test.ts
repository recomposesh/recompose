import { describe, expect, it } from 'vitest';

import { FIRST_GATEWAY_NAME, freeGatewayName } from './first-gateway-name';

describe('the name setup opens its gateway under', () => {
  it('takes the plain name on a machine holding none', () => {
    expect(freeGatewayName(new Set())).toBe(FIRST_GATEWAY_NAME);
  });

  it('counts past a gateway already holding the plain name', () => {
    expect(freeGatewayName(new Set([FIRST_GATEWAY_NAME]))).toBe('My Gateway 2');
  });

  it('keeps counting past every name already taken', () => {
    expect(freeGatewayName(new Set([FIRST_GATEWAY_NAME, 'My Gateway 2', 'My Gateway 3']))).toBe(
      'My Gateway 4',
    );
  });

  it('takes the first gap rather than the count of what is stored', () => {
    expect(freeGatewayName(new Set([FIRST_GATEWAY_NAME, 'My Gateway 3']))).toBe('My Gateway 2');
  });

  it('leaves a name nothing collides with alone', () => {
    expect(freeGatewayName(new Set(['Work', 'Personal']))).toBe(FIRST_GATEWAY_NAME);
  });
});
