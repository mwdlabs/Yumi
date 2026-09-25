import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';
import { theme } from '@/theme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  icon?: ReactNode;
}

const variantStyles = {
  primary: { background: theme.colors.primaryStrong, text: theme.colors.textOnPrimary },
  secondary: { background: theme.colors.primarySoft, text: theme.colors.primaryStrong },
  ghost: { background: 'transparent', text: theme.colors.primaryStrong },
} as const;

/** Bouton pleine largeur, zone tactile ≥ 48 pt, état de chargement intégré. */
export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  icon,
  ...rest
}: ButtonProps) {
  const colors = variantStyles[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: loading }}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: colors.background },
        pressed && styles.pressed,
        inactive && !loading && styles.disabled,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text variant="button" color={colors.text}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: theme.touchTarget + 8,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space[6],
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: theme.space[2] },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.45 },
});
