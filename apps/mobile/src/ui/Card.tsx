import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '@/theme';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Surface blanche arrondie à ombre chaude ; pressable si `onPress` est fourni. */
export function Card({ children, onPress, accessibilityLabel, style }: CardProps) {
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.space[4],
    ...theme.shadows.card,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
});
