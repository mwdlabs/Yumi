import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '@/theme';
import { Screen } from './Screen';
import { Text } from './Text';

/** Gabarit d'un écran d'onglet : grand titre + contenu. */
export function TabScreen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Screen edges={['top']}>
      <Text variant="title" accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <View style={styles.body}>{children}</View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: theme.space[4] },
  body: { flex: 1 },
});
