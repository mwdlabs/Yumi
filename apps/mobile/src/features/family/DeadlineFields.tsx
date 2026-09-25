import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { theme } from '@/theme';
import { DayPicker } from '@/ui/DayPicker';
import { SectionTitle } from '@/ui/SectionTitle';
import { Text } from '@/ui/Text';
import { TimeField } from '@/ui/TimeField';

/** Échéance hebdomadaire des choix (jour + heure murale de la famille). */
export function DeadlineFields({
  weekday,
  time,
  onChange,
}: {
  weekday: number;
  time: string;
  onChange: (value: { weekday: number; time: string }) => void;
}) {
  const { t } = useTranslation('family');
  return (
    <View style={styles.container}>
      <SectionTitle title={t('create.deadlineTitle')} help={t('create.deadlineHelp')} />
      <View style={styles.field}>
        <Text variant="label">{t('create.deadlineDay')}</Text>
        <DayPicker value={weekday} onChange={(day) => onChange({ weekday: day, time })} />
      </View>
      <TimeField
        label={t('create.deadlineTime')}
        value={time}
        onChange={(value) => onChange({ weekday, time: value })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.space[4] },
  field: { gap: theme.space[2] },
});
