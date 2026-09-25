import type { RecipeBody, RecipeDto } from '@yumi/shared';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, View } from 'react-native';
import { useActiveMembership } from '@/features/auth/session';
import { useInvalidateRecipes, useRecipe } from '@/features/recipes/queries';
import { RecipeEditor } from '@/features/recipes/RecipeEditor';
import { recipesApi } from '@/features/recipes/recipes-api';
import { newDraftKey } from '@/features/recipes/types';
import { errorMessage } from '@/lib/api-error';
import { useConfirmDiscard } from '@/lib/use-confirm-discard';
import { theme } from '@/theme';
import { Button } from '@/ui/Button';
import { ErrorState } from '@/ui/ErrorState';
import { LoadingState } from '@/ui/LoadingState';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';

/** Consultation et modification d'une recette de la famille. */
export default function RecipeScreen() {
  const { t } = useTranslation('recipes');
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
  const familyId = useActiveMembership()?.familyId ?? '';
  const recipe = useRecipe(familyId, recipeId ?? '');

  return (
    <Screen scroll>
      {recipe.isPending ? (
        <>
          <ScreenHeader title={t('editor.editTitle')} />
          <LoadingState />
        </>
      ) : recipe.isError ? (
        <>
          <ScreenHeader title={t('editor.editTitle')} />
          <ErrorState message={errorMessage(recipe.error)} onRetry={() => void recipe.refetch()} />
        </>
      ) : (
        <EditRecipe familyId={familyId} recipe={recipe.data} />
      )}
    </Screen>
  );
}

function EditRecipe({ familyId, recipe }: { familyId: string; recipe: RecipeDto }) {
  const { t } = useTranslation(['recipes', 'common']);
  const invalidate = useInvalidateRecipes(familyId);
  const [dirty, setDirty] = useState(false);
  useConfirmDiscard(dirty);

  const leave = async () => {
    setDirty(false);
    await invalidate();
    setTimeout(() => router.back(), 0);
  };

  const save = useMutation({
    mutationFn: (body: RecipeBody) => recipesApi.update(familyId, recipe.id, body),
    onSuccess: leave,
  });
  const archive = useMutation({
    mutationFn: () => recipesApi.archive(familyId, recipe.id),
    onSuccess: leave,
  });

  const confirmArchive = () =>
    Alert.alert(
      t('editor.archiveConfirmTitle', { name: recipe.name }),
      t('editor.archiveConfirmMessage'),
      [
        { text: t('common:actions.cancel'), style: 'cancel' },
        { text: t('editor.archiveAction'), style: 'destructive', onPress: () => archive.mutate() },
      ],
    );

  return (
    <>
      <ScreenHeader title={recipe.name} />
      <RecipeEditor
        familyId={familyId}
        initial={{
          name: recipe.name,
          servings: recipe.servings,
          ingredients: recipe.ingredients.map((ingredient) => ({
            key: newDraftKey(),
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
          })),
        }}
        isNew={false}
        submitting={save.isPending}
        submitError={save.error ?? archive.error}
        onSubmit={(body) => save.mutate(body)}
        onDirtyChange={setDirty}
      />
      <View style={{ paddingBottom: theme.space[6] }}>
        <Button
          variant="ghost"
          label={t('editor.archive')}
          loading={archive.isPending}
          onPress={confirmArchive}
        />
      </View>
    </>
  );
}
