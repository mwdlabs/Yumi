import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RecipeBody } from '@yumi/shared';
import { useActiveMembership } from '@/features/auth/session';
import { useInvalidateRecipes } from '@/features/recipes/queries';
import { RecipeEditor } from '@/features/recipes/RecipeEditor';
import { recipesApi } from '@/features/recipes/recipes-api';
import { useConfirmDiscard } from '@/lib/use-confirm-discard';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';

/** Création d'une recette. */
export default function NewRecipeScreen() {
  const { t } = useTranslation('recipes');
  const familyId = useActiveMembership()?.familyId ?? '';
  const invalidate = useInvalidateRecipes(familyId);
  const [dirty, setDirty] = useState(false);
  useConfirmDiscard(dirty);

  const create = useMutation({
    mutationFn: (body: RecipeBody) => recipesApi.create(familyId, body),
    onSuccess: async () => {
      setDirty(false);
      await invalidate();
      // Laisse React appliquer `dirty = false` avant de quitter l'écran.
      setTimeout(() => router.back(), 0);
    },
  });

  return (
    <Screen scroll>
      <ScreenHeader title={t('editor.newTitle')} />
      <RecipeEditor
        familyId={familyId}
        initial={{ name: '', servings: null, ingredients: [] }}
        isNew
        submitting={create.isPending}
        submitError={create.error}
        onSubmit={(body) => create.mutate(body)}
        onDirtyChange={setDirty}
      />
    </Screen>
  );
}
