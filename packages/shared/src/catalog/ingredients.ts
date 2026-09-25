import type { Unit } from '../domain/units';

/**
 * Rayons du magasin : servent à ordonner les suggestions et, plus tard,
 * à grouper la liste de courses. Libellés traduits côté mobile (i18n).
 */
export const INGREDIENT_CATEGORIES = [
  'produce',
  'meat',
  'seafood',
  'grains',
  'pantry',
  'spices',
  'oils',
  'dairy',
] as const;
export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

export interface CatalogIngredient {
  /** Identifiant stable (slug), référencé par les plats du catalogue. */
  id: string;
  /** Nom affiché et enregistré dans la recette. */
  name: string;
  /** Autres noms reconnus par la recherche (wolof, variantes, marques courantes). */
  aliases?: readonly string[];
  category: IngredientCategory;
  /** Unité proposée par défaut à la saisie. */
  defaultUnit: Unit;
}

/**
 * Catalogue d'ingrédients suggérés à la saisie d'une recette.
 * Orienté cuisine sénégalaise, pâtes, vermicelles et couscous, avec les
 * essentiels du quotidien. La saisie libre reste toujours possible.
 */
export const CATALOG_INGREDIENTS = [
  // ─── Fruits et légumes ─────────────────────────────────────────────────────
  { id: 'oignon', name: 'Oignon', category: 'produce', defaultUnit: 'UNIT' },
  { id: 'ail', name: 'Ail', category: 'produce', defaultUnit: 'CLOVE' },
  { id: 'tomate', name: 'Tomate', category: 'produce', defaultUnit: 'UNIT' },
  {
    id: 'piment',
    name: 'Piment fort',
    aliases: ['piment antillais', 'scotch bonnet', 'kani'],
    category: 'produce',
    defaultUnit: 'UNIT',
  },
  { id: 'poivron', name: 'Poivron', category: 'produce', defaultUnit: 'UNIT' },
  { id: 'carotte', name: 'Carotte', category: 'produce', defaultUnit: 'UNIT' },
  { id: 'chou', name: 'Chou', category: 'produce', defaultUnit: 'UNIT' },
  { id: 'manioc', name: 'Manioc', aliases: ['cassave'], category: 'produce', defaultUnit: 'UNIT' },
  { id: 'patate-douce', name: 'Patate douce', category: 'produce', defaultUnit: 'UNIT' },
  { id: 'pomme-de-terre', name: 'Pomme de terre', category: 'produce', defaultUnit: 'UNIT' },
  { id: 'aubergine', name: 'Aubergine', category: 'produce', defaultUnit: 'UNIT' },
  {
    id: 'jaxatu',
    name: 'Aubergine amère (jaxatu)',
    aliases: ['jaxatu', 'diakhatou', 'djakhatou'],
    category: 'produce',
    defaultUnit: 'UNIT',
  },
  { id: 'navet', name: 'Navet', category: 'produce', defaultUnit: 'UNIT' },
  {
    id: 'gombo',
    name: 'Gombo',
    aliases: ['okra', 'kandia'],
    category: 'produce',
    defaultUnit: 'G',
  },
  {
    id: 'courge',
    name: 'Courge',
    aliases: ['potiron', 'citrouille', 'bouye'],
    category: 'produce',
    defaultUnit: 'G',
  },
  { id: 'courgette', name: 'Courgette', category: 'produce', defaultUnit: 'UNIT' },
  { id: 'champignons', name: 'Champignons', category: 'produce', defaultUnit: 'G' },
  { id: 'citron', name: 'Citron', category: 'produce', defaultUnit: 'UNIT' },
  { id: 'lime', name: 'Lime', aliases: ['citron vert'], category: 'produce', defaultUnit: 'UNIT' },
  { id: 'persil', name: 'Persil', category: 'produce', defaultUnit: 'BUNCH' },
  { id: 'coriandre', name: 'Coriandre', category: 'produce', defaultUnit: 'BUNCH' },
  {
    id: 'oignon-vert',
    name: 'Oignon vert',
    aliases: ['echalote verte', 'ciboule'],
    category: 'produce',
    defaultUnit: 'BUNCH',
  },
  { id: 'gingembre', name: 'Gingembre', category: 'produce', defaultUnit: 'G' },
  {
    id: 'banane-plantain',
    name: 'Banane plantain',
    aliases: ['plantain'],
    category: 'produce',
    defaultUnit: 'UNIT',
  },
  { id: 'laitue', name: 'Laitue', aliases: ['salade'], category: 'produce', defaultUnit: 'UNIT' },
  { id: 'concombre', name: 'Concombre', category: 'produce', defaultUnit: 'UNIT' },

  // ─── Viandes ───────────────────────────────────────────────────────────────
  { id: 'poulet-entier', name: 'Poulet entier', category: 'meat', defaultUnit: 'UNIT' },
  {
    id: 'cuisses-poulet',
    name: 'Cuisses de poulet',
    aliases: ['poulet', 'pilons'],
    category: 'meat',
    defaultUnit: 'KG',
  },
  { id: 'poitrine-poulet', name: 'Poitrine de poulet', category: 'meat', defaultUnit: 'G' },
  {
    id: 'boeuf',
    name: 'Bœuf à ragoût',
    aliases: ['boeuf', 'viande'],
    category: 'meat',
    defaultUnit: 'KG',
  },
  {
    id: 'boeuf-hache',
    name: 'Bœuf haché',
    aliases: ['viande hachee'],
    category: 'meat',
    defaultUnit: 'G',
  },
  { id: 'agneau', name: 'Agneau', aliases: ['mouton'], category: 'meat', defaultUnit: 'KG' },
  { id: 'merguez', name: 'Merguez', category: 'meat', defaultUnit: 'G' },

  // ─── Poissons et fruits de mer ─────────────────────────────────────────────
  {
    id: 'poisson-blanc',
    name: 'Poisson blanc (thiof, mérou)',
    aliases: ['thiof', 'merou', 'capitaine', 'tilapia', 'dorade', 'poisson', 'jen'],
    category: 'seafood',
    defaultUnit: 'KG',
  },
  {
    id: 'poisson-seche',
    name: 'Poisson séché (guedj)',
    aliases: ['guedj', 'gej', 'poisson fume'],
    category: 'seafood',
    defaultUnit: 'G',
  },
  {
    id: 'yete',
    name: 'Yète (mollusque fermenté)',
    aliases: ['yete', 'yeet', 'cymbium'],
    category: 'seafood',
    defaultUnit: 'G',
  },
  { id: 'crevettes', name: 'Crevettes', category: 'seafood', defaultUnit: 'G' },

  // ─── Féculents : riz, pâtes, semoules ──────────────────────────────────────
  {
    id: 'riz-brise',
    name: 'Riz brisé',
    aliases: ['brisures de riz', 'riz casse', 'riz parfume brise'],
    category: 'grains',
    defaultUnit: 'KG',
  },
  {
    id: 'riz',
    name: 'Riz blanc',
    aliases: ['riz basmati', 'riz long'],
    category: 'grains',
    defaultUnit: 'KG',
  },
  {
    id: 'spaghettis',
    name: 'Spaghettis',
    aliases: ['spaghetti'],
    category: 'grains',
    defaultUnit: 'G',
  },
  { id: 'macaronis', name: 'Macaronis', aliases: ['coudes'], category: 'grains', defaultUnit: 'G' },
  {
    id: 'pates-courtes',
    name: 'Pâtes courtes (penne, fusilli)',
    aliases: ['penne', 'fusilli', 'pates', 'rotini'],
    category: 'grains',
    defaultUnit: 'G',
  },
  { id: 'vermicelles', name: 'Vermicelles', category: 'grains', defaultUnit: 'G' },
  {
    id: 'semoule-couscous',
    name: 'Semoule de couscous',
    aliases: ['couscous', 'semoule'],
    category: 'grains',
    defaultUnit: 'G',
  },
  {
    id: 'couscous-mil',
    name: 'Couscous de mil (thiéré)',
    aliases: ['thiere', 'cere', 'arraw', 'sankal', 'mil'],
    category: 'grains',
    defaultUnit: 'G',
  },
  {
    id: 'haricots-niebe',
    name: 'Haricots niébé',
    aliases: ['niebe', 'cornille', 'haricots a oeil noir'],
    category: 'grains',
    defaultUnit: 'G',
  },
  {
    id: 'pain',
    name: 'Pain (baguette)',
    aliases: ['baguette'],
    category: 'grains',
    defaultUnit: 'UNIT',
  },
  { id: 'farine', name: 'Farine', category: 'grains', defaultUnit: 'CUP' },

  // ─── Épicerie et conserves ─────────────────────────────────────────────────
  {
    id: 'concentre-tomate',
    name: 'Concentré de tomate',
    aliases: ['pate de tomate', 'tomate concentree'],
    category: 'pantry',
    defaultUnit: 'CAN',
  },
  {
    id: 'tomates-conserve',
    name: 'Tomates en conserve',
    aliases: ['tomates en des', 'tomates broyees'],
    category: 'pantry',
    defaultUnit: 'CAN',
  },
  {
    id: 'sauce-tomate',
    name: 'Sauce tomate (passata)',
    aliases: ['coulis', 'passata'],
    category: 'pantry',
    defaultUnit: 'ML',
  },
  { id: 'pois-chiches', name: 'Pois chiches', category: 'pantry', defaultUnit: 'CAN' },
  {
    id: 'pate-arachide',
    name: "Pâte d'arachide",
    aliases: ["beurre d'arachide", 'tigadege'],
    category: 'pantry',
    defaultUnit: 'G',
  },
  {
    id: 'arachides',
    name: 'Arachides',
    aliases: ['cacahuetes', 'arachides grillees'],
    category: 'pantry',
    defaultUnit: 'G',
  },
  {
    id: 'tamarin',
    name: 'Tamarin (dakhar)',
    aliases: ['dakhar'],
    category: 'pantry',
    defaultUnit: 'G',
  },
  {
    id: 'bissap',
    name: 'Fleurs de bissap',
    aliases: ['hibiscus', 'oseille de guinee'],
    category: 'pantry',
    defaultUnit: 'G',
  },
  {
    id: 'bouillon-cube',
    name: 'Bouillon en cube',
    aliases: ['maggi', 'jumbo', 'cube', 'adja'],
    category: 'pantry',
    defaultUnit: 'UNIT',
  },
  { id: 'moutarde', name: 'Moutarde', category: 'pantry', defaultUnit: 'TBSP' },
  { id: 'vinaigre', name: 'Vinaigre', category: 'pantry', defaultUnit: 'TBSP' },
  { id: 'sucre', name: 'Sucre', category: 'pantry', defaultUnit: 'G' },
  { id: 'raisins-secs', name: 'Raisins secs', category: 'pantry', defaultUnit: 'G' },
  { id: 'lait-concentre', name: 'Lait concentré sucré', category: 'pantry', defaultUnit: 'CAN' },
  {
    id: 'vanille',
    name: 'Extrait de vanille',
    aliases: ['vanille', 'sucre vanille'],
    category: 'pantry',
    defaultUnit: 'TSP',
  },

  // ─── Épices et condiments ──────────────────────────────────────────────────
  { id: 'sel', name: 'Sel', category: 'spices', defaultUnit: 'PINCH' },
  {
    id: 'poivre',
    name: 'Poivre noir',
    aliases: ['poivre'],
    category: 'spices',
    defaultUnit: 'TSP',
  },
  {
    id: 'laurier',
    name: 'Feuilles de laurier',
    aliases: ['laurier'],
    category: 'spices',
    defaultUnit: 'UNIT',
  },
  {
    id: 'netetou',
    name: 'Nététou (soumbala)',
    aliases: ['netetou', 'soumbala', 'dawadawa'],
    category: 'spices',
    defaultUnit: 'G',
  },
  { id: 'cumin', name: 'Cumin', category: 'spices', defaultUnit: 'TSP' },
  {
    id: 'cari',
    name: 'Poudre de cari',
    aliases: ['curry'],
    category: 'spices',
    defaultUnit: 'TBSP',
  },
  { id: 'ras-el-hanout', name: 'Ras el-hanout', category: 'spices', defaultUnit: 'TSP' },
  { id: 'cannelle', name: 'Cannelle', category: 'spices', defaultUnit: 'TSP' },
  { id: 'muscade', name: 'Muscade', category: 'spices', defaultUnit: 'PINCH' },
  { id: 'thym', name: 'Thym', category: 'spices', defaultUnit: 'TSP' },
  {
    id: 'piment-poudre',
    name: 'Piment en poudre',
    aliases: ['cayenne'],
    category: 'spices',
    defaultUnit: 'TSP',
  },

  // ─── Huiles ────────────────────────────────────────────────────────────────
  {
    id: 'huile',
    name: 'Huile végétale',
    aliases: ['huile de canola', 'huile'],
    category: 'oils',
    defaultUnit: 'ML',
  },
  { id: 'huile-arachide', name: "Huile d'arachide", category: 'oils', defaultUnit: 'ML' },
  {
    id: 'huile-palme',
    name: 'Huile de palme',
    aliases: ['diwu tir'],
    category: 'oils',
    defaultUnit: 'ML',
  },
  { id: 'huile-olive', name: "Huile d'olive", category: 'oils', defaultUnit: 'TBSP' },

  // ─── Produits laitiers et œufs ─────────────────────────────────────────────
  { id: 'lait', name: 'Lait', category: 'dairy', defaultUnit: 'ML' },
  {
    id: 'lait-caille',
    name: 'Lait caillé (sow)',
    aliases: ['sow', 'lait fermente', 'lait ribot'],
    category: 'dairy',
    defaultUnit: 'ML',
  },
  {
    id: 'yogourt',
    name: 'Yogourt nature',
    aliases: ['yaourt', 'yogourt'],
    category: 'dairy',
    defaultUnit: 'G',
  },
  {
    id: 'creme',
    name: 'Crème à cuisson',
    aliases: ['creme 15', 'creme 35'],
    category: 'dairy',
    defaultUnit: 'ML',
  },
  { id: 'beurre', name: 'Beurre', category: 'dairy', defaultUnit: 'G' },
  {
    id: 'fromage-rape',
    name: 'Fromage râpé',
    aliases: ['cheddar', 'mozzarella'],
    category: 'dairy',
    defaultUnit: 'G',
  },
  { id: 'parmesan', name: 'Parmesan', category: 'dairy', defaultUnit: 'G' },
  { id: 'oeufs', name: 'Œufs', aliases: ['oeuf'], category: 'dairy', defaultUnit: 'UNIT' },
] as const satisfies readonly CatalogIngredient[];

export type CatalogIngredientId = (typeof CATALOG_INGREDIENTS)[number]['id'];

const byId = new Map<string, CatalogIngredient>(
  CATALOG_INGREDIENTS.map((ingredient) => [ingredient.id, ingredient]),
);

export function getCatalogIngredient(id: CatalogIngredientId): CatalogIngredient {
  const ingredient = byId.get(id);
  if (!ingredient) throw new Error(`Ingrédient inconnu du catalogue : ${id}`);
  return ingredient;
}
