import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '@/theme';
import { IconBadge } from './IconBadge';
import type { Icon } from './icons';
import { Text } from './Text';

export interface EmptyStateProps {
  icon: Icon;
  title: string;
  message: string;
  tone?: { background: string; foreground: string };
  action?: ReactNode;
}

/** État vide illustré : jamais d'écran blanc. */
export function EmptyState({
  icon,
  title,
  message,
  tone = { background: theme.colors.primarySoft, foreground: theme.colors.primaryStrong },
  action,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <IconBadge icon={icon} background={tone.background} color={tone.foreground} size={96} />
      <View style={styles.texts}>
        <Text variant="heading" align="center">
          {title}
        </Text>
        <Text color={theme.colors.textMuted} align="center">
          {message}
        </Text>
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space[5],
    paddingHorizontal: theme.space[6],
  },
  texts: { gap: theme.space[2], maxWidth: 320 },
  action: { alignSelf: 'stretch' },
});
