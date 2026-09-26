import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { formatShortDate } from '@/lib/format';
import { theme } from '@/theme';
import { ArrowLeftIcon, CaretRightIcon } from './icons';
import { Text } from './Text';

export interface WeekSwitcherProps {
  startDate: string;
  endDate: string;
  /** Écart en semaines avec la semaine en cours (0 = cette semaine). */
  offset: number;
  onPrevious: () => void;
  onNext: () => void;
}

/** Navigation entre semaines : ‹ Cette semaine › + dates. */
export function WeekSwitcher({
  startDate,
  endDate,
  offset,
  onPrevious,
  onNext,
}: WeekSwitcherProps) {
  const { t } = useTranslation();
  const range = t('week.weekRange', {
    start: formatShortDate(startDate),
    end: formatShortDate(endDate),
  });
  const title =
    offset === 0
      ? t('week.thisWeek')
      : offset === 1
        ? t('week.nextWeek')
        : offset === -1
          ? t('week.lastWeek')
          : range;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPrevious}
        accessibilityRole="button"
        accessibilityLabel={t('week.previousWeek')}
        style={styles.arrow}
      >
        <ArrowLeftIcon size={22} color={theme.colors.primaryStrong} weight="bold" />
      </Pressable>
      <View style={styles.center} accessibilityLiveRegion="polite">
        <Text variant="bodyStrong" align="center">
          {title}
        </Text>
        {title !== range ? (
          <Text variant="caption" color={theme.colors.textMuted} align="center">
            {range}
          </Text>
        ) : null}
      </View>
      <Pressable
        onPress={onNext}
        accessibilityRole="button"
        accessibilityLabel={t('week.followingWeek')}
        style={styles.arrow}
      >
        <CaretRightIcon size={22} color={theme.colors.primaryStrong} weight="bold" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    padding: theme.space[1],
    ...theme.shadows.card,
  },
  arrow: {
    width: theme.touchTarget,
    height: theme.touchTarget,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1 },
});
