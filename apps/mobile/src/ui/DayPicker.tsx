import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { theme } from '@/theme';
import { Text } from './Text';

const ISO_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

/** Choix d'un jour de la semaine (ISO 1-7) en pastilles L M M J V S D. */
export function DayPicker({ value, onChange }: { value: number; onChange: (day: number) => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {ISO_WEEKDAYS.map((day) => {
        const selected = day === value;
        const key = String(day) as '1';
        return (
          <Pressable
            key={day}
            onPress={() => onChange(day)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={t(`weekdays.${key}`)}
            style={[styles.chip, selected && styles.selected]}
          >
            <Text variant="label" color={selected ? theme.colors.textOnPrimary : theme.colors.text}>
              {t(`weekdaysShort.${key}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.space[1] },
  chip: {
    flex: 1,
    maxWidth: 52,
    height: theme.touchTarget,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: theme.colors.primaryStrong,
    borderColor: theme.colors.primaryStrong,
  },
});
