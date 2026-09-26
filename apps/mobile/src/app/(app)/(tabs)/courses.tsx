import {
  INGREDIENT_CATEGORIES,
  type IngredientCategory,
  type ShoppingItemDto,
  type ShoppingListDto,
} from '@yumi/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useActiveMembership } from '@/features/auth/session';
import { useFamilyIngredients } from '@/features/recipes/queries';
import { IngredientSheet } from '@/features/recipes/IngredientSheet';
import type { DraftIngredient } from '@/features/recipes/types';
import { shoppingKeys, useShoppingList, useToggleItem } from '@/features/shopping/queries';
import { shoppingApi } from '@/features/shopping/shopping-api';
import { ShoppingItemRow } from '@/features/shopping/ShoppingItemRow';
import { StaplesEntry } from '@/features/shopping/StaplesEntry';
import { errorMessage } from '@/lib/api-error';
import { theme } from '@/theme';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { BasketIcon, PlusIcon } from '@/ui/icons';
import { LoadingState } from '@/ui/LoadingState';
import { TabScreen } from '@/ui/TabScreen';
import { WeekSwitcher } from '@/ui/WeekSwitcher';
import { Text } from '@/ui/Text';

const DAY_MS = 24 * 60 * 60 * 1000;
const weeksBetween = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / (7 * DAY_MS));

type Group = { category: IngredientCategory | null; items: ShoppingItemDto[] };

/** Articles à cocher, groupés par rayon dans l'ordre du magasin ; « Autres » en dernier. */
function groupByCategory(items: ShoppingItemDto[]): Group[] {
  const order: (IngredientCategory | null)[] = [...INGREDIENT_CATEGORIES, null];
  return order
    .map((category) => ({ category, items: items.filter((item) => item.category === category) }))
    .filter((group) => group.items.length > 0);
}

/** Liste de courses de la semaine, partagée par la famille. */
export default function ShoppingScreen() {
  const { t } = useTranslation(['shopping', 'app', 'recipes', 'common']);
  const familyId = useActiveMembership()?.familyId ?? '';
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState<string | undefined>(undefined);
  const [currentWeekStart, setCurrentWeekStart] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ open: boolean; editing: ShoppingItemDto | null }>({
    open: false,
    editing: null,
  });

  const list = useShoppingList(familyId, weekStart);
  const toggle = useToggleItem(familyId, weekStart);
  const familyIngredients = useFamilyIngredients(familyId);
  const data = list.data;

  // Mémorise la semaine en cours pour afficher « Cette semaine / La semaine prochaine ».
  if (data?.isCurrentWeek && currentWeekStart !== data.startDate) {
    setCurrentWeekStart(data.startDate);
  }

  const refresh = () => queryClient.invalidateQueries({ queryKey: shoppingKeys.all(familyId) });
  const showError = (error: unknown) => Alert.alert(errorMessage(error));

  const save = useMutation({
    mutationFn: ({
      value,
      itemId,
    }: {
      value: Omit<DraftIngredient, 'key'>;
      itemId: string | null;
    }) =>
      itemId
        ? shoppingApi.updateItem(familyId, itemId, value)
        : shoppingApi.addItem(familyId, { ...value, date: (data as ShoppingListDto).startDate }),
    onSettled: refresh,
    onError: showError,
  });
  const remove = useMutation({
    mutationFn: (itemId: string) => shoppingApi.deleteItem(familyId, itemId),
    onSettled: refresh,
    onError: showError,
  });

  const openAdd = () => setSheet({ open: true, editing: null });

  if (list.isPending) {
    return (
      <TabScreen title={t('app:tabs.shopping')}>
        <LoadingState />
      </TabScreen>
    );
  }
  if (list.isError || !data) {
    return (
      <TabScreen title={t('app:tabs.shopping')}>
        <ErrorState message={errorMessage(list.error)} onRetry={() => void list.refetch()} />
      </TabScreen>
    );
  }

  const unchecked = data.items.filter((item) => !item.checked);
  const checked = data.items.filter((item) => item.checked);
  const total = data.items.length;
  const offset = currentWeekStart ? weeksBetween(currentWeekStart, data.startDate) : 0;

  const rowFor = (item: ShoppingItemDto) => (
    <ShoppingItemRow
      key={item.id}
      item={item}
      onToggle={() => toggle.mutate({ itemId: item.id, checked: !item.checked })}
      onEdit={item.manual ? () => setSheet({ open: true, editing: item }) : undefined}
      onRemove={item.manual ? () => remove.mutate(item.id) : undefined}
    />
  );

  return (
    <TabScreen title={t('app:tabs.shopping')}>
      <WeekSwitcher
        startDate={data.startDate}
        endDate={data.endDate}
        offset={offset}
        onPrevious={() => setWeekStart(data.previousStartDate)}
        onNext={() => setWeekStart(data.nextStartDate)}
      />
      <View style={styles.staples}>
        <StaplesEntry familyId={familyId} />
      </View>

      {total === 0 ? (
        <EmptyState
          icon={BasketIcon}
          tone={theme.statusColors.done}
          title={t('emptyTitle')}
          message={t('emptyMessage')}
          action={
            <Button
              label={t('add')}
              icon={<PlusIcon size={20} color={theme.colors.textOnPrimary} weight="bold" />}
              onPress={openAdd}
            />
          }
        />
      ) : (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={list.isRefetching}
                onRefresh={() => void list.refetch()}
                tintColor={theme.colors.primaryStrong}
              />
            }
          >
            <View style={styles.progress} accessibilityLiveRegion="polite">
              <Text variant="caption" color={theme.colors.textMuted}>
                {checked.length === total
                  ? t('allDone')
                  : t('progress', { checked: checked.length, total })}
              </Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${(checked.length / total) * 100}%` }]} />
              </View>
            </View>

            {groupByCategory(unchecked).map((group) => (
              <View key={group.category ?? 'other'} style={styles.group}>
                <Text variant="label" color={theme.colors.textMuted}>
                  {group.category ? t(`recipes:categories.${group.category}`) : t('otherCategory')}
                </Text>
                <Card style={styles.card}>{group.items.map(rowFor)}</Card>
              </View>
            ))}

            {checked.length > 0 ? (
              <View style={styles.group}>
                <Text variant="label" color={theme.statusColors.done.foreground}>
                  {t('inCart', { count: checked.length })}
                </Text>
                <Card style={styles.card}>{checked.map(rowFor)}</Card>
              </View>
            ) : null}
          </ScrollView>
          <View style={styles.footer}>
            <Button
              label={t('add')}
              icon={<PlusIcon size={20} color={theme.colors.textOnPrimary} weight="bold" />}
              onPress={openAdd}
            />
          </View>
        </>
      )}

      <IngredientSheet
        mode="shopping"
        visible={sheet.open}
        editing={
          sheet.editing
            ? {
                key: sheet.editing.id,
                name: sheet.editing.name,
                // On modifie la part ajoutée à la main (la part des plats suit les recettes).
                quantity: sheet.editing.manual?.amount ?? null,
                unit:
                  sheet.editing.manual?.amount != null ? (sheet.editing.manual.unit ?? null) : null,
              }
            : null
        }
        existing={data.items
          // Un article venant seulement des plats peut recevoir un ajout à la main.
          .filter((item) => item.manual !== null)
          .map((item) => ({
            key: item.id,
            name: item.name,
            quantity: item.manual?.amount ?? null,
            unit: item.manual?.unit ?? null,
          }))}
        familyUsage={familyIngredients.data ?? []}
        onSubmit={(value, itemId) => {
          save.mutate({ value, itemId });
          if (itemId) setSheet({ open: false, editing: null });
        }}
        onEditExisting={(draft) => {
          const item = data.items.find((i) => i.id === draft.key);
          setSheet(item?.manual ? { open: true, editing: item } : { open: false, editing: null });
        }}
        onClose={() => setSheet({ open: false, editing: null })}
      />
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  staples: { marginTop: theme.space[3] },
  scroll: { flex: 1, marginTop: theme.space[4] },
  content: { gap: theme.space[5], paddingBottom: theme.space[4] },
  progress: { gap: theme.space[2] },
  track: {
    height: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceSunken,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.statusColors.done.foreground,
  },
  group: { gap: theme.space[2] },
  card: { paddingVertical: theme.space[1], paddingHorizontal: theme.space[2] },
  footer: { paddingVertical: theme.space[3] },
});
