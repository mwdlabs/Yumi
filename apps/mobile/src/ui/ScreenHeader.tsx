import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { theme } from '@/theme';
import { ArrowLeftIcon } from './icons';
import { Text } from './Text';

/** En-tête d'un écran empilé : retour + titre (+ action à droite). */
export function ScreenHeader({ title, right }: { title: string; right?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel={t('actions.back')}
        hitSlop={12}
        style={styles.back}
      >
        <ArrowLeftIcon size={24} color={theme.colors.primaryStrong} weight="bold" />
      </Pressable>
      <Text variant="heading" accessibilityRole="header" style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[2],
    marginBottom: theme.space[4],
  },
  back: {
    width: theme.touchTarget,
    height: theme.touchTarget,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: { flex: 1 },
  right: { minWidth: theme.touchTarget, alignItems: 'flex-end' },
});
