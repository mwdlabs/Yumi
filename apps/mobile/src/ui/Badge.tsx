import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '@/theme';
import { Text } from './Text';

export interface BadgeProps {
  label: string;
  tone: { background: string; foreground: string };
  icon?: ReactNode;
}

/** Pastille courte (rôle, statut) : texte + couleur, icône optionnelle. */
export function Badge({ label, tone, icon }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: tone.background }]}>
      {icon}
      <Text variant="caption" color={tone.foreground}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[1],
    paddingHorizontal: theme.space[2],
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
});
