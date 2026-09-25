import {
  DISH_PACKS,
  DISH_TEMPLATES,
  dishIngredients,
  findDish,
  suggestDishes,
  type DishTemplate,
  type RecipeBody,
} from '@yumi/shared';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { errorMessage } from '@/lib/api-error';
import { formatQuantity } from '@/lib/format';
import { theme } from '@/theme';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { PlusIcon, XIcon } from '@/ui/icons';
import { SectionTitle } from '@/ui/SectionTitle';
import { Stepper } from '@/ui/Stepper';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { IngredientSheet } from './IngredientSheet';
import { useFamilyIngredients } from './queries';
import { newDraftKey, type DraftIngredient } from './types';

const DEFAULT_SERVINGS = 6;

export interface RecipeEditorValue {
  name: string;
  servings: number | null;
  ingredients: DraftIngredient[];
}

export interface RecipeEditorProps {
  familyId: string;
  initial: RecipeEditorValue;
  isNew: boolean;
  submitting: boolean;
  submitError: unknown;
  onSubmit: (body: RecipeBody) => void;
  /** Signale au parent s'il y a des modifications non enregistrées. */
  onDirtyChange?: (dirty: boolean) => void;
}

const toDrafts = (dish: DishTemplate): DraftIngredient[] =>
  dishIngredients(dish).map((ingredient) => ({ ...ingredient, key: newDraftKey() }));

/**
 * Édition d'une recette : nom (avec plats connus suggérés), portions,
 * ingrédients (ajoutés un à un avec suggestions). Un plat connu préremplit
 * ses ingrédients habituels en un seul tap.
 */
export function RecipeEditor({
  familyId,
  initial,
  isNew,
  submitting,
  submitError,
  onSubmit,
  onDirtyChange,
}: RecipeEditorProps) {
  const { t } = useTranslation(['recipes', 'common']);
  const familyIngredients = useFamilyIngredients(familyId);
  const [name, setName] = useState(initial.name);
  const [servings, setServings] = useState(initial.servings ?? DEFAULT_SERVINGS);
  const [ingredients, setIngredients] = useState(initial.ingredients);
  const [sheet, setSheet] = useState<{ open: boolean; editing: DraftIngredient | null }>({
    open: false,
    editing: null,
  });
  const [submitted, setSubmitted] = useState(false);

  const markDirty = () => onDirtyChange?.(true);
  const nameValid = name.trim().length > 0;
  const matchingDishes = useMemo(() => suggestDishes(name), [name]);
  const exactDish = findDish(name);

  function applyDish(dish: DishTemplate) {
    const apply = () => {
      setName(dish.name);
      setServings(dish.servings);
      setIngredients(toDrafts(dish));
      markDirty();
    };
    if (ingredients.length === 0) {
      apply();
      return;
    }
    Alert.alert(t('editor.replaceTitle'), t('editor.replaceMessage', { name: dish.name }), [
      { text: t('common:actions.cancel'), style: 'cancel' },
      { text: t('editor.replace'), style: 'destructive', onPress: apply },
    ]);
  }

  function upsertIngredient(value: Omit<DraftIngredient, 'key'>, editingKey: string | null) {
    setIngredients((current) =>
      editingKey
        ? current.map((item) => (item.key === editingKey ? { ...value, key: editingKey } : item))
        : [...current, { ...value, key: newDraftKey() }],
    );
    if (editingKey) setSheet({ open: false, editing: null });
    markDirty();
  }

  function removeIngredient(key: string) {
    setIngredients((current) => current.filter((item) => item.key !== key));
    markDirty();
  }

  function submit() {
    setSubmitted(true);
    if (!nameValid) return;
    onSubmit({
      name: name.trim(),
      servings,
      ingredients: ingredients.map(({ name: n, quantity, unit }) => ({ name: n, quantity, unit })),
    });
  }

  // Plats du catalogue proposés tant que la recette est vide.
  const showKnownDishes = isNew && ingredients.length === 0;

  return (
    <View style={styles.sections}>
      <View style={styles.section}>
        <TextField
          label={t('editor.nameLabel')}
          placeholder={t('editor.namePlaceholder')}
          value={name}
          onChangeText={(value) => {
            setName(value);
            markDirty();
          }}
          error={submitted && !nameValid ? t('editor.nameRequired') : null}
          autoCapitalize="sentences"
          maxLength={60}
        />
        {matchingDishes.length > 0 && !(exactDish && ingredients.length > 0) ? (
          <View style={styles.chips}>
            {matchingDishes.map((dish) => (
              <Chip
                key={dish.id}
                label={t('editor.useDish', { name: dish.name })}
                onPress={() => applyDish(dish)}
              />
            ))}
          </View>
        ) : null}
      </View>

      {showKnownDishes && matchingDishes.length === 0 ? (
        <View style={styles.section}>
          <SectionTitle title={t('editor.knownDishesTitle')} help={t('editor.knownDishesHelp')} />
          {DISH_PACKS.map((pack) => (
            <View key={pack} style={styles.pack}>
              <Text variant="label" color={theme.colors.textMuted}>
                {t(`packs.${pack}`)}
              </Text>
              <View style={styles.chips}>
                {DISH_TEMPLATES.filter((dish) => dish.pack === pack).map((dish) => (
                  <Chip key={dish.id} label={dish.name} onPress={() => applyDish(dish)} />
                ))}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text variant="label">{t('editor.servingsLabel')}</Text>
        <Stepper
          value={servings}
          onChange={(value) => {
            setServings(value);
            markDirty();
          }}
          label={t('editor.servingsValue', { count: servings })}
          decrementLabel={t('editor.servingsLess')}
          incrementLabel={t('editor.servingsMore')}
        />
      </View>

      <View style={styles.section}>
        <SectionTitle title={`${t('editor.ingredientsTitle')} (${ingredients.length})`} />
        {ingredients.length === 0 ? (
          <Text color={theme.colors.textMuted}>{t('editor.ingredientsEmpty')}</Text>
        ) : (
          <Card style={styles.ingredientCard}>
            {ingredients.map((ingredient, index) => (
              <View
                key={ingredient.key}
                style={[styles.ingredientRow, index > 0 && styles.ingredientDivider]}
              >
                <Pressable
                  onPress={() => setSheet({ open: true, editing: ingredient })}
                  accessibilityRole="button"
                  style={styles.ingredientMain}
                >
                  <Text variant="bodyStrong" style={styles.flex} numberOfLines={2}>
                    {ingredient.name}
                  </Text>
                  <Text color={theme.colors.textMuted}>
                    {formatQuantity(ingredient.quantity, ingredient.unit)}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => removeIngredient(ingredient.key)}
                  accessibilityRole="button"
                  accessibilityLabel={t('editor.removeIngredient', { name: ingredient.name })}
                  hitSlop={8}
                  style={styles.remove}
                >
                  <XIcon size={18} color={theme.colors.textMuted} weight="bold" />
                </Pressable>
              </View>
            ))}
          </Card>
        )}
        <Button
          variant="secondary"
          label={t('editor.addIngredient')}
          icon={<PlusIcon size={20} color={theme.colors.primaryStrong} weight="bold" />}
          onPress={() => setSheet({ open: true, editing: null })}
        />
      </View>

      {submitError ? (
        <Text variant="caption" color={theme.colors.danger} accessibilityLiveRegion="polite">
          {errorMessage(submitError)}
        </Text>
      ) : null}
      <Button label={t('editor.save')} onPress={submit} loading={submitting} />

      <IngredientSheet
        visible={sheet.open}
        editing={sheet.editing}
        existing={ingredients}
        familyUsage={familyIngredients.data ?? []}
        onSubmit={upsertIngredient}
        onEditExisting={(ingredient) => setSheet({ open: true, editing: ingredient })}
        onClose={() => setSheet({ open: false, editing: null })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sections: { gap: theme.space[8], paddingBottom: theme.space[4] },
  section: { gap: theme.space[3] },
  pack: { gap: theme.space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] },
  ingredientCard: { paddingVertical: theme.space[1] },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space[2] },
  ingredientDivider: { borderTopWidth: 1, borderTopColor: theme.colors.border },
  ingredientMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    minHeight: theme.touchTarget + 4,
  },
  remove: {
    width: theme.touchTarget - 8,
    height: theme.touchTarget - 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
