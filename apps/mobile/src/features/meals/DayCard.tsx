import type { MealDto } from '@yumi/shared';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { theme } from '@/theme';
import { Avatar } from '@/ui/Avatar';
import { Badge } from '@/ui/Badge';
import { Card } from '@/ui/Card';
import { CookingPotIcon, PlusIcon } from '@/ui/icons';
import { Text } from '@/ui/Text';

export interface DayCardProps {
  date: string;
  meal: MealDto | null;
  isToday: boolean;
  isPast: boolean;
  onPress: () => void;
}

const localDate = (isoDate: string) => {
  const [year = 1970, month = 1, day = 1] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/** Carte d'un jour : date à gauche ; plat, cuisinier et statut, ou « Libre ». */
export function DayCard({ date, meal, isToday, isPast, onPress }: DayCardProps) {
  const { t, i18n } = useTranslation('week');
  const day = localDate(date);
  const weekday = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' }).format(day);
  const longDay = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(day);

  const dateBox = (
    <View style={[styles.dateBox, isToday && styles.dateBoxToday]}>
      <Text variant="caption" color={isToday ? theme.colors.textOnPrimary : theme.colors.textMuted}>
        {weekday.replace('.', '')}
      </Text>
      <Text variant="heading" color={isToday ? theme.colors.textOnPrimary : theme.colors.text}>
        {day.getDate()}
      </Text>
    </View>
  );

  if (!meal) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${longDay}, ${t('free')}. ${t('addMeal')}`}
        style={({ pressed }) => [styles.free, isPast && styles.past, pressed && styles.pressed]}
      >
        <View style={styles.row}>
          {dateBox}
          <View style={styles.texts}>
            <Text variant="bodyStrong" color={theme.colors.textMuted}>
              {isToday ? t('today') : t('free')}
            </Text>
          </View>
          <View style={styles.addPill}>
            <PlusIcon size={16} color={theme.colors.primaryStrong} weight="bold" />
            <Text variant="label" color={theme.colors.primaryStrong}>
              {t('addMeal')}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${longDay}, ${meal.recipe.name}, ${t('cookedBy', { name: meal.cook.displayName })}`}
      style={isPast ? styles.past : undefined}
    >
      <View style={styles.row}>
        {dateBox}
        <View style={styles.texts}>
          <Text variant="bodyStrong" numberOfLines={2}>
            {meal.recipe.name}
          </Text>
          <View style={styles.cook}>
            <Avatar
              name={meal.cook.displayName}
              color={meal.cook.avatarColor}
              emoji={meal.cook.avatarEmoji}
              size={24}
            />
            <Text variant="caption" color={theme.colors.textMuted} numberOfLines={1}>
              {meal.cook.displayName}
            </Text>
          </View>
        </View>
        <Badge
          label={t('chosen')}
          tone={theme.statusColors.chosen}
          icon={
            <CookingPotIcon
              size={14}
              color={theme.statusColors.chosen.foreground}
              weight="duotone"
            />
          }
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.space[3] },
  texts: { flex: 1, gap: theme.space[1] },
  dateBox: {
    width: 52,
    paddingVertical: theme.space[1],
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceSunken,
    alignItems: 'center',
  },
  dateBoxToday: { backgroundColor: theme.colors.primaryStrong },
  cook: { flexDirection: 'row', alignItems: 'center', gap: theme.space[2] },
  free: {
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.borderStrong,
    padding: theme.space[4],
  },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[1],
    paddingHorizontal: theme.space[3],
    minHeight: 36,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
  },
  past: { opacity: 0.6 },
  pressed: { opacity: 0.8 },
});
