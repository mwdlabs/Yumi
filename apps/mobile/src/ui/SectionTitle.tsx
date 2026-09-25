import { StyleSheet, View } from 'react-native';
import { theme } from '@/theme';
import { Text } from './Text';

/** Titre de section avec aide optionnelle. */
export function SectionTitle({ title, help }: { title: string; help?: string }) {
  return (
    <View style={styles.container}>
      <Text variant="heading" accessibilityRole="header">
        {title}
      </Text>
      {help ? (
        <Text variant="caption" color={theme.colors.textMuted}>
          {help}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.space[1] },
});
