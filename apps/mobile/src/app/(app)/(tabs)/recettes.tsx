import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/ui/EmptyState';
import { ForkKnifeIcon } from '@/ui/icons';
import { TabScreen } from '@/ui/TabScreen';

/** Livre de recettes de la famille (fonctionnalité 3 du MVP). */
export default function RecipesScreen() {
  const { t } = useTranslation('app');
  return (
    <TabScreen title={t('tabs.recipes')}>
      <EmptyState
        icon={ForkKnifeIcon}
        title={t('comingSoon.recipes.title')}
        message={t('comingSoon.recipes.message')}
      />
    </TabScreen>
  );
}
