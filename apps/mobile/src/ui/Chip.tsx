import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: ReactNode;
  accessibilityLabel?: string;
  disabled?: boolean;
}

/** Pastille sélectionnable (unités, plats suggérés, filtres). */
export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  accessibilityLabel,
  disabled = false,
}: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selected,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {icon}
      <Text variant="label" color={selected ? theme.colors.textOnPrimary : theme.colors.text}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[1],
    minHeight: 40,
    paddingHorizontal: theme.space[4],
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  selected: {
    backgroundColor: theme.colors.primaryStrong,
    borderColor: theme.colors.primaryStrong,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.35 },
});
