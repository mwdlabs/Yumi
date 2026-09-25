/**
 * Normalisation de textes culinaires, pour comparer et regrouper des noms
 * saisis librement : « Tomates », « tomate » et « TOMATE » donnent la même clé.
 */

/** Mots terminés par s ou x qui ne sont pas des pluriels. */
const INVARIANT_WORDS = new Set([
  'ananas',
  'anchois',
  'bras',
  'brebis',
  'cassis',
  'couscous',
  'frais',
  'gras',
  'gros',
  'jus',
  'mais',
  'noix',
  'pois',
  'radis',
  'riz',
  'gratis',
]);

/**
 * Minuscules, sans accents ni ponctuation, espaces réduits.
 * « Pâte d’arachide » → « pate d arachide ».
 */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Pluriel simple, mot par mot : tomates → tomate, poireaux → poireau, choux → chou. */
function singularize(word: string): string {
  if (word.length <= 3 || INVARIANT_WORDS.has(word)) return word;
  if (/(au|eu|ou)x$/.test(word)) return word.slice(0, -1);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

/**
 * Clé de regroupement d'un ingrédient : normalisation + singulier.
 * « Pommes de terre » et « pomme de terre » ont la même clé.
 * Aucune équivalence sémantique n'est devinée (« gousse d'ail » ≠ « ail »).
 */
export function ingredientKey(name: string): string {
  return normalizeText(name).split(' ').filter(Boolean).map(singularize).join(' ');
}
