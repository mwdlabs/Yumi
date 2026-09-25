import { describe, expect, it } from 'vitest';
import { unitDimension } from '../domain/units';
import { addShoppingItemBodySchema, updateShoppingItemBodySchema } from './shopping';

describe('addShoppingItemBodySchema', () => {
  it('accepte un article sans quantité', () => {
    expect(
      addShoppingItemBodySchema.safeParse({
        date: '2026-09-24',
        name: 'Lait',
        quantity: null,
        unit: null,
      }).success,
    ).toBe(true);
  });

  it('refuse une date invalide ou une quantité sans unité', () => {
    expect(
      addShoppingItemBodySchema.safeParse({
        date: '24/09',
        name: 'Lait',
        quantity: null,
        unit: null,
      }).success,
    ).toBe(false);
    expect(
      addShoppingItemBodySchema.safeParse({
        date: '2026-09-24',
        name: 'Lait',
        quantity: 2,
        unit: null,
      }).success,
    ).toBe(false);
  });
});

describe('updateShoppingItemBodySchema', () => {
  it('accepte un simple cochage', () => {
    expect(updateShoppingItemBodySchema.parse({ checked: true })).toEqual({ checked: true });
  });

  it('exige quantité et unité ensemble', () => {
    expect(updateShoppingItemBodySchema.safeParse({ quantity: 2 }).success).toBe(false);
    expect(updateShoppingItemBodySchema.safeParse({ quantity: 2, unit: 'L' }).success).toBe(true);
    expect(updateShoppingItemBodySchema.safeParse({ quantity: null, unit: null }).success).toBe(
      true,
    );
  });
});

describe('unitDimension', () => {
  it.each([
    ['G', 'mass'],
    ['KG', 'mass'],
    ['TBSP', 'volume'],
    ['CUP', 'volume'],
    ['CLOVE', 'count:CLOVE'],
    ['UNIT', 'count:UNIT'],
    [null, 'none'],
  ] as const)('%s → %s', (unit, dimension) => {
    expect(unitDimension(unit)).toBe(dimension);
  });
});
