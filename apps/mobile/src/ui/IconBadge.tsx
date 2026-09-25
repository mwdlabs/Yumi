import { StyleSheet, View } from 'react-native';
import { theme } from '@/theme';
import type { Icon } from './icons';

export interface IconBadgeProps {
  icon: Icon;
  background: string;
  color: string;
  size?: number;
}

/** Icône duotone dans un disque teinté : motif visuel récurrent de l'identité. */
export function IconBadge({ icon: IconComponent, background, color, size = 72 }: IconBadgeProps) {
  return (
    <View
      style={[styles.badge, { width: size, height: size, backgroundColor: background }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <IconComponent size={size * 0.5} color={color} weight="duotone" />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
