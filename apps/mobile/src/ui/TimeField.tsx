import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import i18next from 'i18next';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { dateToLocalTime, formatLocalTime, localTimeToDate } from '@/lib/format';
import { theme } from '@/theme';
import { ClockIcon } from './icons';
import { Text } from './Text';

export interface TimeFieldProps {
  label: string;
  /** Heure murale "HH:mm". */
  value: string;
  onChange: (value: string) => void;
}

/**
 * Sélection d'une heure. Android : horloge native en dialogue.
 * iOS : roulette affichée sous le champ au toucher.
 */
export function TimeField({ label, value, onChange }: TimeFieldProps) {
  const [iosOpen, setIosOpen] = useState(false);

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: localTimeToDate(value),
        mode: 'time',
        is24Hour: true,
        onValueChange: (_event, date) => onChange(dateToLocalTime(date)),
      });
    } else {
      setIosOpen((current) => !current);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="label">{label}</Text>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${label} : ${formatLocalTime(value)}`}
        style={styles.field}
      >
        <ClockIcon size={22} color={theme.colors.primaryStrong} weight="duotone" />
        <Text variant="bodyStrong">{formatLocalTime(value)}</Text>
      </Pressable>
      {Platform.OS === 'ios' && iosOpen ? (
        <DateTimePicker
          value={localTimeToDate(value)}
          mode="time"
          display="spinner"
          locale={i18next.language}
          minuteInterval={5}
          onValueChange={(_event, date) => onChange(dateToLocalTime(date))}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.space[2] },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[2],
    minHeight: theme.touchTarget + 8,
    paddingHorizontal: theme.space[4],
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
  },
});
