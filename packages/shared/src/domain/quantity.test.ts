import { describe, expect, it } from 'vitest';
import { parseQuantity } from './quantity';

describe('parseQuantity', () => {
  it.each([
    ['2', 2],
    ['1,5', 1.5],
    ['0.75', 0.75],
    [',5', 0.5],
    ['1/2', 0.5],
    ['1 1/2', 1.5],
    ['1/3', 0.333],
    ['  250 ', 250],
  ])('%j → %d', (input, expected) => {
    expect(parseQuantity(input)).toBe(expected);
  });

  it.each(['', 'abc', '0', '-2', '1/0', '2kg', '1,2,3'])('refuse %j', (input) => {
    expect(parseQuantity(input)).toBeNull();
  });
});
