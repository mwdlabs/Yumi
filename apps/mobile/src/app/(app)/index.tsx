import { useTranslation } from 'react-i18next';
import { theme } from '@/theme';
import { EmptyState } from '@/ui/EmptyState';
import { CalendarBlankIcon } from '@/ui/icons';
import { TabScreen } from '@/ui/TabScreen';

/** Vue semaine (fonctionnalité 5 du MVP). */
export default function WeekScreen() {
  const { t } = useTranslation('app');
  return (
    <TabScreen title={t('tabs.week')}>
      <EmptyState
        icon={CalendarBlankIcon}
        tone={theme.statusColors.chosen}
        title={t('comingSoon.week.title')}
        message={t('comingSoon.week.message')}
      />
    </TabScreen>
  );
}
