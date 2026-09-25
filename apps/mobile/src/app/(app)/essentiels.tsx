import {
  getCatalogIngredient,
  ingredientKey,
  SUGGESTED_STAPLES,
  type CatalogIngredientId,
  type StapleDto,
} from '@yumi/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useActiveMembership } from '@/features/auth/session';
import { IngredientSheet } from '@/features/recipes/IngredientSheet';
import { useFamilyIngredients } from '@/features/recipes/queries';
import type { DraftIngredient } from '@/features/recipes/types';
import { shoppingKeys, stapleKeys, useStaples } from '@/features/shopping/queries';
import { staplesApi } from '@/features/shopping/staples-api';
import { errorMessage } from '@/lib/api-error';
import { formatQuantity } from '@/lib/format';
import { theme } from '@/theme';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ErrorState } from '@/ui/ErrorState';
import { CheckIcon, PlusIcon, XIcon } from '@/ui/icons';
import { LoadingState } from '@/ui/LoadingState';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { SectionTitle } from '@/ui/SectionTitle';
import { Text } from '@/ui/Text';

/** Essentiels de la famille : ajoutés automatiquement à la liste de chaque semaine. */
export default function StaplesScreen() {
  const { t } = useTranslation(['shopping', 'recipes']);
  const familyId = useActiveMembership()?.familyId ?? '';
  const staples = useStaples(familyId);

  return (
    <Screen scroll>
      <ScreenHeader title={t('staples.title')} />
      {staples.isPending ? (
        <LoadingState />
      ) : staples.isError ? (
        <ErrorState message={errorMessage(staples.error)} onRetry={() => void staples.refetch()} />
      ) : (
        <StaplesEditor familyId={familyId} staples={staples.data} />
      )}
    </Screen>
  );
}

function StaplesEditor({ familyId, staples }: { familyId: string; staples: StapleDto[] }) {
  const { t } = useTranslation(['shopping', 'recipes']);
  const queryClient = useQueryClient();
  const familyIngredients = useFamilyIngredients(familyId);
  const [sheet, setSheet] = useState<{ open: boolean; editing: StapleDto | null }>({
    open: false,
    editing: null,
  });

  // Suggestions pas encore retenues ; toutes pré-cochées tant que la liste est vide.
  const suggestions = useMemo(() => {
    const present = new Set(staples.map((staple) => ingredientKey(staple.name)));
    return SUGGESTED_STAPLES.map(getCatalogIngredient).filter(
      (ingredient) => !present.has(ingredientKey(ingredient.name)),
    );
  }, [staples]);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(staples.length === 0 ? SUGGESTED_STAPLES : []),
  );
  const selectedSuggestions = suggestions.filter((ingredient) => selected.has(ingredient.id));

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: stapleKeys.all(familyId) });
    // Les listes de la semaine en cours et à venir changent aussi.
    await queryClient.invalidateQueries({ queryKey: shoppingKeys.all(familyId) });
  };
  const onError = (error: unknown) => Alert.alert(errorMessage(error));

  const save = useMutation({
    mutationFn: ({ value, id }: { value: Omit<DraftIngredient, 'key'>; id: string | null }) =>
      id ? staplesApi.update(familyId, id, value) : staplesApi.create(familyId, value),
    onSettled: refresh,
    onError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => staplesApi.remove(familyId, id),
    onSettled: refresh,
    onError,
  });
  const addSelection = useMutation({
    mutationFn: () =>
      staplesApi.createMany(
        familyId,
        selectedSuggestions.map((ingredient) => ({
          name: ingredient.name,
          quantity: null,
          unit: null,
        })),
      ),
    onSuccess: () => setSelected(new Set()),
    onSettled: refresh,
    onError,
  });

  const toggleSuggestion = (id: CatalogIngredientId) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <View style={styles.sections}>
      <Text color={theme.colors.textMuted}>{t('staples.help')}</Text>

      <View style={styles.section}>
        <SectionTitle title={`${t('staples.listTitle')} (${staples.length})`} />
        {staples.length === 0 ? (
          <Text color={theme.colors.textMuted}>{t('staples.empty')}</Text>
        ) : (
          <Card style={styles.card}>
            {staples.map((staple, index) => (
              <View key={staple.id} style={[styles.row, index > 0 && styles.divider]}>
                <Pressable
                  onPress={() => setSheet({ open: true, editing: staple })}
                  accessibilityRole="button"
                  style={styles.rowMain}
                >
                  <Text variant="bodyStrong" style={styles.flex}>
                    {staple.name}
                  </Text>
                  {staple.quantity !== null ? (
                    <Text color={theme.colors.textMuted}>
                      {formatQuantity(staple.quantity, staple.unit)}
                    </Text>
                  ) : null}
                </Pressable>
                <Pressable
                  onPress={() => remove.mutate(staple.id)}
                  accessibilityRole="button"
                  accessibilityLabel={t('staples.remove', { name: staple.name })}
                  hitSlop={8}
                  style={styles.iconButton}
                >
                  <XIcon size={18} color={theme.colors.textMuted} weight="bold" />
                </Pressable>
              </View>
            ))}
          </Card>
        )}
        <Button
          variant="secondary"
          label={t('staples.add')}
          icon={<PlusIcon size={20} color={theme.colors.primaryStrong} weight="bold" />}
          onPress={() => setSheet({ open: true, editing: null })}
        />
      </View>

      {suggestions.length > 0 ? (
        <View style={styles.section}>
          <SectionTitle title={t('staples.suggestionsTitle')} help={t('staples.suggestionsHelp')} />
          <Card style={styles.card}>
            {suggestions.map((ingredient, index) => {
              const isSelected = selected.has(ingredient.id);
              return (
                <Pressable
                  key={ingredient.id}
                  onPress={() => toggleSuggestion(ingredient.id as CatalogIngredientId)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  style={[styles.row, index > 0 && styles.divider]}
                >
                  <View style={[styles.box, isSelected && styles.boxChecked]}>
                    {isSelected ? (
                      <CheckIcon size={16} color={theme.colors.surface} weight="bold" />
                    ) : null}
                  </View>
                  <View style={styles.flex}>
                    <Text variant="bodyStrong">{ingredient.name}</Text>
                    <Text variant="caption" color={theme.colors.textMuted}>
                      {t(`recipes:categories.${ingredient.category}`)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </Card>
          <Button
            label={t('staples.addSelection', { count: selectedSuggestions.length })}
            disabled={selectedSuggestions.length === 0}
            loading={addSelection.isPending}
            onPress={() => addSelection.mutate()}
          />
        </View>
      ) : null}

      <IngredientSheet
        mode="shopping"
        titles={{
          add: t('staples.sheetAddTitle'),
          edit: t('staples.sheetEditTitle'),
          alreadyAdded: t('staples.alreadyAdded'),
        }}
        visible={sheet.open}
        editing={
          sheet.editing
            ? {
                key: sheet.editing.id,
                name: sheet.editing.name,
                quantity: sheet.editing.quantity,
                unit: sheet.editing.unit,
              }
            : null
        }
        existing={staples.map((staple) => ({
          key: staple.id,
          name: staple.name,
          quantity: staple.quantity,
          unit: staple.unit,
        }))}
        familyUsage={familyIngredients.data ?? []}
        onSubmit={(value, id) => {
          save.mutate({ value, id });
          if (id) setSheet({ open: false, editing: null });
        }}
        onEditExisting={(draft) => {
          const staple = staples.find((s) => s.id === draft.key) ?? null;
          setSheet({ open: true, editing: staple });
        }}
        onClose={() => setSheet({ open: false, editing: null })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sections: { gap: theme.space[8], paddingBottom: theme.space[6] },
  section: { gap: theme.space[3] },
  card: { paddingVertical: theme.space[1] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    minHeight: theme.touchTarget + 4,
    paddingVertical: theme.space[1],
  },
  divider: { borderTopWidth: 1, borderTopColor: theme.colors.border },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.space[3] },
  iconButton: {
    width: theme.touchTarget - 8,
    height: theme.touchTarget - 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 26,
    height: 26,
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    borderColor: theme.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: theme.statusColors.done.foreground,
    borderColor: theme.statusColors.done.foreground,
  },
});
