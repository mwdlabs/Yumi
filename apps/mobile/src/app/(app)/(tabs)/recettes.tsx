import { normalizeText } from '@yumi/shared';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { useActiveMembership } from '@/features/auth/session';
import { useRecipes } from '@/features/recipes/queries';
import { errorMessage } from '@/lib/api-error';
import { theme } from '@/theme';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { IconBadge } from '@/ui/IconBadge';
import { CaretRightIcon, ForkKnifeIcon, MagnifyingGlassIcon, PlusIcon } from '@/ui/icons';
import { LoadingState } from '@/ui/LoadingState';
import { TabScreen } from '@/ui/TabScreen';
import { Text } from '@/ui/Text';

/** Livre de recettes de la famille. */
export default function RecipesScreen() {
  const { t } = useTranslation(['app', 'recipes']);
  const familyId = useActiveMembership()?.familyId ?? '';
  const recipes = useRecipes(familyId);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const normalized = normalizeText(query);
    const all = recipes.data ?? [];
    return normalized ? all.filter((r) => normalizeText(r.name).includes(normalized)) : all;
  }, [recipes.data, query]);

  const addButton = (
    <Button
      label={t('recipes:list.add')}
      icon={<PlusIcon size={20} color={theme.colors.textOnPrimary} weight="bold" />}
      onPress={() => router.push('/recettes/nouvelle')}
    />
  );

  if (recipes.isPending) {
    return (
      <TabScreen title={t('app:tabs.recipes')}>
        <LoadingState />
      </TabScreen>
    );
  }
  if (recipes.isError) {
    return (
      <TabScreen title={t('app:tabs.recipes')}>
        <ErrorState message={errorMessage(recipes.error)} onRetry={() => void recipes.refetch()} />
      </TabScreen>
    );
  }

  if (recipes.data.length === 0) {
    return (
      <TabScreen title={t('app:tabs.recipes')}>
        <EmptyState
          icon={ForkKnifeIcon}
          title={t('recipes:list.emptyTitle')}
          message={t('recipes:list.emptyMessage')}
          action={addButton}
        />
      </TabScreen>
    );
  }

  return (
    <TabScreen title={t('app:tabs.recipes')}>
      <View style={styles.searchBox}>
        <MagnifyingGlassIcon size={20} color={theme.colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('recipes:list.searchPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          style={styles.searchInput}
          autoCorrect={false}
          accessibilityLabel={t('recipes:list.searchPlaceholder')}
          clearButtonMode="while-editing"
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={recipes.isRefetching}
            onRefresh={() => void recipes.refetch()}
            tintColor={theme.colors.primaryStrong}
          />
        }
        ListEmptyComponent={
          <Text color={theme.colors.textMuted} align="center">
            {t('recipes:list.noResult', { query })}
          </Text>
        }
        renderItem={({ item }) => (
          <Card
            onPress={() =>
              router.push({ pathname: '/recettes/[recipeId]', params: { recipeId: item.id } })
            }
            accessibilityLabel={item.name}
          >
            <View style={styles.row}>
              <IconBadge
                icon={ForkKnifeIcon}
                background={theme.colors.primarySoft}
                color={theme.colors.primaryStrong}
                size={48}
              />
              <View style={styles.texts}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text variant="caption" color={theme.colors.textMuted}>
                  {t('recipes:list.ingredientCount', { count: item.ingredientCount })}
                </Text>
              </View>
              <CaretRightIcon size={20} color={theme.colors.textMuted} weight="bold" />
            </View>
          </Card>
        )}
      />
      <View style={styles.footer}>{addButton}</View>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[2],
    paddingHorizontal: theme.space[4],
    minHeight: theme.touchTarget,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.space[3],
  },
  searchInput: { ...theme.typography.body, flex: 1, color: theme.colors.text },
  list: { gap: theme.space[3], paddingBottom: theme.space[4] },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.space[3] },
  texts: { flex: 1, gap: 2 },
  footer: { paddingVertical: theme.space[3] },
});
