import { StyleSheet, Switch, View } from 'react-native';
import { theme } from '@/theme';
import { Text } from './Text';

export interface SwitchRowProps {
  label: string;
  help?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

/** Interrupteur avec libellé et aide, entièrement cliquable et accessible. */
export function SwitchRow({ label, help, value, onValueChange, disabled }: SwitchRowProps) {
  return (
    <View style={[styles.row, disabled && styles.disabled]}>
      <View style={styles.texts}>
        <Text variant="bodyStrong">{label}</Text>
        {help ? (
          <Text variant="caption" color={theme.colors.textMuted}>
            {help}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityLabel={label}
        trackColor={{ true: theme.colors.primaryStrong, false: theme.colors.borderStrong }}
        thumbColor={theme.colors.surface}
        ios_backgroundColor={theme.colors.borderStrong}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.space[4] },
  texts: { flex: 1, gap: 2 },
  disabled: { opacity: 0.5 },
});
