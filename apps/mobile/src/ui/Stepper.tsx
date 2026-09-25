import { Pressable, StyleSheet, View } from 'react-native';
import { theme } from '@/theme';
import { MinusIcon, PlusIcon } from './icons';
import { Text } from './Text';

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Texte affiché au centre (ex. « Pour 6 personnes »). */
  label: string;
  decrementLabel: string;
  incrementLabel: string;
}

/** Compteur − / + avec grandes zones tactiles. */
export function Stepper({
  value,
  onChange,
  min = 1,
  max = 50,
  label,
  decrementLabel,
  incrementLabel,
}: StepperProps) {
  return (
    <View style={styles.row} accessibilityRole="adjustable" accessibilityValue={{ text: label }}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        accessibilityRole="button"
        accessibilityLabel={decrementLabel}
        style={[styles.button, value <= min && styles.disabled]}
      >
        <MinusIcon size={20} color={theme.colors.primaryStrong} weight="bold" />
      </Pressable>
      <Text variant="bodyStrong" align="center" style={styles.label}>
        {label}
      </Text>
      <Pressable
        onPress={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        accessibilityRole="button"
        accessibilityLabel={incrementLabel}
        style={[styles.button, value >= max && styles.disabled]}
      >
        <PlusIcon size={20} color={theme.colors.primaryStrong} weight="bold" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    padding: theme.space[1],
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  button: {
    width: theme.touchTarget,
    height: theme.touchTarget,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  label: { flex: 1 },
});
