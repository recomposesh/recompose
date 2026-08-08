import { expect, test } from 'vitest';

import { heldOver, storedPositionsRead } from './canvas-positions';

const tidySeats = { gateway: { x: 0, y: 0 }, 'model:fast': { x: 320, y: 0 } };

test('positions a person dragged come back as they were written', () => {
  const written = '{"gateway":{"x":12,"y":-40}}';

  expect(storedPositionsRead(written)).toStrictEqual({ gateway: { x: 12, y: -40 } });
});

test('nothing written yet holds no position, which is what leaves every node at its tidy seat', () => {
  expect(storedPositionsRead(null)).toStrictEqual({});
});

test('a value that is no longer readable holds no position rather than reporting', () => {
  expect(storedPositionsRead('{"gateway":')).toStrictEqual({});
});

test('a seat missing a coordinate discards the whole reading, because half a seat places nothing', () => {
  expect(storedPositionsRead('{"gateway":{"x":12}}')).toStrictEqual({});
  expect(storedPositionsRead('{"gateway":{"y":12}}')).toStrictEqual({});
});

test('a coordinate that is no number discards the reading rather than placing a node nowhere', () => {
  expect(storedPositionsRead('{"gateway":{"x":"left","y":0}}')).toStrictEqual({});
  expect(storedPositionsRead('{"gateway":{"x":0,"y":"down"}}')).toStrictEqual({});
  expect(storedPositionsRead('{"gateway":{"x":null,"y":0}}')).toStrictEqual({});
});

test('one unreadable seat discards every other seat, so no canvas half remembers itself', () => {
  const written = '{"gateway":{"x":12,"y":40},"model:fast":{"x":"left","y":0}}';

  expect(storedPositionsRead(written)).toStrictEqual({});
});

test('a coordinate off the number line discards the reading, because no canvas reaches it', () => {
  expect(storedPositionsRead('{"gateway":{"x":1e999,"y":0}}')).toStrictEqual({});
});

test('a seat that is no pair of coordinates at all discards the reading', () => {
  expect(storedPositionsRead('{"gateway":null}')).toStrictEqual({});
  expect(storedPositionsRead('{"gateway":"far left"}')).toStrictEqual({});
});

test('a written value that is no map of seats at all holds no position', () => {
  expect(storedPositionsRead('[]')).toStrictEqual({});
  expect(storedPositionsRead('""')).toStrictEqual({});
  expect(storedPositionsRead('"gateway"')).toStrictEqual({});
  expect(storedPositionsRead('null')).toStrictEqual({});
});

test('a list of seats holds no position, because no node id says which node each one is for', () => {
  expect(storedPositionsRead('[{"x":12,"y":40}]')).toStrictEqual({});
});

test('a held position stands where the tidy seat would have put the node', () => {
  const laid = heldOver(tidySeats, { 'model:fast': { x: 500, y: 220 } });

  expect(laid).toStrictEqual({ gateway: { x: 0, y: 0 }, 'model:fast': { x: 500, y: 220 } });
});

test('holding nothing leaves the tidy arrangement exactly as it stands', () => {
  expect(heldOver(tidySeats, {})).toStrictEqual(tidySeats);
});

test('a position held for a node that left the canvas seats nothing', () => {
  const laid = heldOver(tidySeats, { 'model:gone': { x: 900, y: 900 } });

  expect(laid).toStrictEqual(tidySeats);
});
