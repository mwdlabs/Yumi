import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useActiveMembership } from '@/features/auth/session';
import { DayCard } from '@/features/meals/DayCard';
import { useWeekPlan } from '@/features/meals/queries';
import { errorMessage } from '@/lib/api-error';
import { dateToIsoLocal } from '@/lib/format';
import { theme } from '@/theme';
import { ErrorState } from '@/ui/ErrorState';
import { LoadingState } from '@/ui/LoadingState';
import { TabScreen } from '@/ui/TabScreen';
import { Text } from '@/ui/Text';
import { WeekSwitcher } from '@/ui/WeekSwitcher';

const DAY_MS = 24 * 60 * 60 * 1000;
const weeksBetween = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / (7 * DAY_MS));

/** Vue semaine : un jour = une carte (plat, cuisinier, statut) ou « Libre ». */
export default function WeekScreen() {
  const { t } = useTranslation(['app', 'week']);
  const familyId = useActiveMembership()?.familyId ?? '';
  const [date, setDate] = useState<string | undefined>(undefined);
  const [currentWeekStart, setCurrentWeekStart] = useState<string | null>(null);
  const week = useWeekPlan(familyId, date);
  const data = week.data;

  if (data?.isCurrentWeek && currentWeekStart !== data.startDate) {
    setCurrentWeekStart(data.startDate);
  }

  if (week.isPending) {
    return (
      <TabScreen title={t('app:tabs.week')}>
        <LoadingState />
      </TabScreen>
    );
  }
  if (week.isError || !data) {
    return (
      <TabScreen title={t('app:tabs.week')}>
        <ErrorState message={errorMessage(week.error)} onRetry={() => void week.refetch()} />
      </TabScreen>
    );
  }

  const today = dateToIsoLocal(new Date());
  const planned = data.days.filter((day) => day.meal).length;

  return (
    <TabScreen title={t('app:tabs.week')}>
      <WeekSwitcher
        startDate={data.startDate}
        endDate={data.endDate}
        offset={currentWeekStart ? weeksBetween(currentWeekStart, data.startDate) : 0}
        onPrevious={() => setDate(data.previousStartDate)}
        onNext={() => setDate(data.nextStartDate)}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={week.isRefetching}
            onRefresh={() => void week.refetch()}
            tintColor={theme.colors.primaryStrong}
          />
        }
      >
        <Text variant="caption" color={theme.colors.textMuted} accessibilityLiveRegion="polite">
          {t('week:summary', { count: planned })}
        </Text>
        {data.days.map((day) => (
          <DayCard
            key={day.date}
            date={day.date}
            meal={day.meal}
            isToday={day.date === today}
            isPast={day.date < today}
            onPress={() =>
              router.push({
                pathname: '/choisir',
                params: day.meal ? { date: day.date, mealId: day.meal.id } : { date: day.date },
              })
            }
          />
        ))}
      </ScrollView>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, marginTop: theme.space[4] },
  content: { gap: theme.space[3], paddingBottom: theme.space[6] },
});
