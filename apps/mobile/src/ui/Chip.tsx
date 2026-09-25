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
}

/** Pastille sélectionnable (unités, plats suggérés, filtres). */
export function Chip({ label, selected = false, onPress, icon, accessibilityLabel }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed]}
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
});
