import { describe, expect, test } from 'vitest';

import { collectingRows } from './gateway-logs.testkit';
import { noteGatewayRow, noteUnreadableRequest } from './gateway-traffic';
import { gatewayRefusedWith, servingTurn, servingTurnWalks } from './provider/serving-turn';

function rowsNoted(noting: () => void): number {
  const collected = collectingRows();

  noting();
  collected.forget();

  return collected.standing().length;
}

describe('a note taken outside any serving turn', () => {
  test('a rejection belongs to no gateway, so it leaves no row', () => {
    const noted = rowsNoted(() => {
      noteGatewayRow(401, 'The gateway "Codex" requires an API key.');
    });

    expect(noted).toBe(0);
  });

  test('a request too broken to read belongs to no gateway either', () => {
    const noted = rowsNoted(() => {
      noteUnreadableRequest();
    });

    expect(noted).toBe(0);
  });

  test('naming a virtual model changes nothing, because no turn is listening', () => {
    expect(() => {
      servingTurnWalks('fast');
    }).not.toThrow();
    expect(servingTurn()).toBeUndefined();
  });

  test('a refusal the gateway wrote is remembered nowhere', () => {
    expect(() => {
      gatewayRefusedWith('The gateway could not reach the target.');
    }).not.toThrow();
    expect(servingTurn()).toBeUndefined();
  });
});
