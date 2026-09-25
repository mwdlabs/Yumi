import { useTranslation } from 'react-i18next';
import { theme } from '@/theme';
import { EmptyState } from '@/ui/EmptyState';
import { BasketIcon } from '@/ui/icons';
import { TabScreen } from '@/ui/TabScreen';

/** Liste de courses (fonctionnalité 4 du MVP). */
export default function ShoppingScreen() {
  const { t } = useTranslation('app');
  return (
    <TabScreen title={t('tabs.shopping')}>
      <EmptyState
        icon={BasketIcon}
        tone={theme.statusColors.done}
        title={t('comingSoon.shopping.title')}
        message={t('comingSoon.shopping.message')}
      />
    </TabScreen>
  );
}
