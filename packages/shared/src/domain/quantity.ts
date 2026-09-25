/**
 * Lit une quantité saisie au clavier : « 2 », « 1,5 », « 0.75 », « 1/2 », « 1 1/2 ».
 * Retourne null si la saisie est vide ou invalide (ou non positive).
 */
export function parseQuantity(input: string): number | null {
  const text = input.trim().replace(',', '.');
  if (!text) return null;

  const mixed = /^(\d+)\s+(\d+)\/(\d+)$/.exec(text);
  const fraction = /^(\d+)\/(\d+)$/.exec(text);
  let value: number;
  if (mixed) {
    value = Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  } else if (fraction) {
    value = Number(fraction[1]) / Number(fraction[2]);
  } else if (/^\d*\.?\d+$/.test(text)) {
    value = Number(text);
  } else {
    return null;
  }
  return Number.isFinite(value) && value > 0 ? Math.round(value * 1000) / 1000 : null;
}
