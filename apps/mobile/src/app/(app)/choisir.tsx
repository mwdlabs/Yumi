import { normalizeText, type MealDto } from '@yumi/shared';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useActiveMembership } from '@/features/auth/session';
import { useFamily } from '@/features/family/queries';
import { mealsApi } from '@/features/meals/meals-api';
import { useInvalidateWeek, useWeekPlan } from '@/features/meals/queries';
import { useRecipes } from '@/features/recipes/queries';
import { errorMessage } from '@/lib/api-error';
import { theme } from '@/theme';
import { Avatar } from '@/ui/Avatar';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { ErrorState } from '@/ui/ErrorState';
import { CheckIcon, ForkKnifeIcon, MagnifyingGlassIcon, PlusIcon } from '@/ui/icons';
import { IconBadge } from '@/ui/IconBadge';
import { LoadingState } from '@/ui/LoadingState';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { SectionTitle } from '@/ui/SectionTitle';
import { Text } from '@/ui/Text';

const localDate = (isoDate: string) => {
  const [year = 1970, month = 1, day = 1] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Choix du plat d'un jour. Ouvert depuis la vue semaine (et, plus tard, depuis
 * le rappel) avec le jour présélectionné : un tap sur un plat, un tap pour
 * valider. Les ingrédients arrivent aussitôt dans la liste de courses.
 */
export default function ChooseMealScreen() {
  const { t } = useTranslation('week');
  const params = useLocalSearchParams<{ date: string; mealId?: string }>();
  const familyId = useActiveMembership()?.familyId ?? '';
  const week = useWeekPlan(familyId, params.date);
  const recipes = useRecipes(familyId);
  const family = useFamily(familyId);

  const editing = week.data?.days.find((day) => day.meal?.id === params.mealId)?.meal ?? null;
  const title = params.mealId ? t('choose.editTitle') : t('choose.title');

  if (week.isPending || recipes.isPending || family.isPending) {
    return (
      <Screen>
        <ScreenHeader title={title} />
        <LoadingState />
      </Screen>
    );
  }
  const error = week.error ?? recipes.error ?? family.error;
  if (error || !week.data || !recipes.data || !family.data) {
    return (
      <Screen>
        <ScreenHeader title={title} />
        <ErrorState
          message={errorMessage(error)}
          onRetry={() => void Promise.all([week.refetch(), recipes.refetch(), family.refetch()])}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title={title} />
      <ChooseForm
        familyId={familyId}
        initialDate={params.date ?? week.data.startDate}
        editing={editing}
        days={week.data.days}
        recipes={recipes.data}
        members={family.data.members}
      />
    </Screen>
  );
}

function ChooseForm({
  familyId,
  initialDate,
  editing,
  days,
  recipes,
  members,
}: {
  familyId: string;
  initialDate: string;
  editing: MealDto | null;
  days: { date: string; meal: MealDto | null }[];
  recipes: { id: string; name: string; ingredientCount: number }[];
  members: NonNullable<ReturnType<typeof useFamily>['data']>['members'];
}) {
  const { t, i18n } = useTranslation(['week', 'recipes', 'common']);
  const invalidate = useInvalidateWeek(familyId);
  const me = members.find((member) => member.isMe);
  const [date, setDate] = useState(initialDate);
  const [recipeId, setRecipeId] = useState<string | null>(editing?.recipe.id ?? null);
  const [cookId, setCookId] = useState<string | undefined>(editing?.cook.id ?? me?.id);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const normalized = normalizeText(query);
    return normalized ? recipes.filter((r) => normalizeText(r.name).includes(normalized)) : recipes;
  }, [recipes, query]);

  const onDone = async () => {
    await invalidate();
    router.back();
  };
  const save = useMutation({
    mutationFn: () => {
      const body = { date, recipeId: recipeId ?? '', ...(cookId ? { cookId } : {}) };
      return editing
        ? mealsApi.update(familyId, editing.id, body)
        : mealsApi.create(familyId, body);
    },
    onSuccess: onDone,
    onError: (error) => Alert.alert(errorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: () => mealsApi.remove(familyId, editing?.id ?? ''),
    onSuccess: onDone,
    onError: (error) => Alert.alert(errorMessage(error)),
  });

  const dayName = (isoDate: string, format: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(i18n.language, format).format(localDate(isoDate));

  const confirmRemove = () =>
    Alert.alert(
      t('choose.removeConfirmTitle', { name: editing?.recipe.name ?? '' }),
      t('choose.removeConfirmMessage'),
      [
        { text: t('common:actions.cancel'), style: 'cancel' },
        { text: t('choose.remove'), style: 'destructive', onPress: () => remove.mutate() },
      ],
    );

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.sections}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text variant="label">{t('choose.dayLabel')}</Text>
          <View style={styles.chips}>
            {days.map((day) => {
              const takenByOther = !!day.meal && day.meal.id !== editing?.id;
              const label = dayName(day.date, { weekday: 'short', day: 'numeric' });
              return (
                <Chip
                  key={day.date}
                  label={label}
                  selected={day.date === date}
                  disabled={takenByOther}
                  accessibilityLabel={
                    takenByOther
                      ? t('choose.dayTaken', {
                          day: dayName(day.date, { weekday: 'long' }),
                          recipe: day.meal?.recipe.name ?? '',
                        })
                      : label
                  }
                  onPress={() => setDate(day.date)}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle title={t('choose.recipeLabel')} />
          {recipes.length > 6 ? (
            <View style={styles.searchBox}>
              <MagnifyingGlassIcon size={20} color={theme.colors.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('choose.searchPlaceholder')}
                placeholderTextColor={theme.colors.textMuted}
                style={styles.searchInput}
                autoCorrect={false}
                accessibilityLabel={t('choose.searchPlaceholder')}
              />
            </View>
          ) : null}
          {recipes.length === 0 ? (
            <Text color={theme.colors.textMuted}>{t('choose.noRecipes')}</Text>
          ) : (
            filtered.map((recipe) => {
              const selected = recipe.id === recipeId;
              return (
                <Pressable
                  key={recipe.id}
                  onPress={() => setRecipeId(recipe.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [
                    styles.recipe,
                    selected && styles.recipeSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <IconBadge
                    icon={ForkKnifeIcon}
                    background={theme.colors.primarySoft}
                    color={theme.colors.primaryStrong}
                    size={40}
                  />
                  <View style={styles.flex}>
                    <Text variant="bodyStrong">{recipe.name}</Text>
                    <Text variant="caption" color={theme.colors.textMuted}>
                      {t('recipes:list.ingredientCount', { count: recipe.ingredientCount })}
                    </Text>
                  </View>
                  {selected ? (
                    <CheckIcon size={22} color={theme.colors.primaryStrong} weight="bold" />
                  ) : null}
                </Pressable>
              );
            })
          )}
          <Button
            variant="ghost"
            label={t('choose.newRecipe')}
            icon={<PlusIcon size={18} color={theme.colors.primaryStrong} weight="bold" />}
            onPress={() => router.push('/recettes/nouvelle')}
          />
        </View>

        <View style={styles.section}>
          <Text variant="label">{t('choose.cookLabel')}</Text>
          <View style={styles.chips}>
            {members.map((member) => (
              <Chip
                key={member.id}
                label={member.displayName}
                selected={member.id === cookId}
                onPress={() => setCookId(member.id)}
                icon={
                  <Avatar
                    name={member.displayName}
                    color={member.avatarColor}
                    emoji={member.avatarEmoji}
                    size={24}
                  />
                }
              />
            ))}
          </View>
        </View>

        {editing ? (
          <Button
            variant="ghost"
            label={t('choose.remove')}
            loading={remove.isPending}
            onPress={confirmRemove}
          />
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={
            editing
              ? t('choose.save')
              : t('choose.submit', { day: dayName(date, { weekday: 'long', day: 'numeric' }) })
          }
          disabled={!recipeId}
          loading={save.isPending}
          onPress={() => save.mutate()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sections: { gap: theme.space[6], paddingBottom: theme.space[4] },
  section: { gap: theme.space[3] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] },
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
  },
  searchInput: { ...theme.typography.body, flex: 1, color: theme.colors.text },
  recipe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    padding: theme.space[3],
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  recipeSelected: { borderColor: theme.colors.primaryStrong },
  pressed: { opacity: 0.85 },
  footer: { paddingTop: theme.space[3] },
});
