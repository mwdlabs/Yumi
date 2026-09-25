import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '@/theme';

/** Bloc squelette qui « respire » (animation désactivée si « Réduire les animations »). */
export function Skeleton({
  height,
  width = '100%',
}: {
  height: number;
  width?: number | `${number}%`;
}) {
  const [opacity] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
        ]),
      );
      loop.start();
    });
    return () => loop?.stop();
  }, [opacity]);

  return <Animated.View style={[styles.skeleton, { height, width, opacity }]} />;
}

/** État de chargement générique : cartes squelettes plutôt qu'un simple spinner. */
export function LoadingState() {
  const { t } = useTranslation();
  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('states.loading')}
    >
      <Skeleton height={28} width="60%" />
      <Skeleton height={96} />
      <Skeleton height={96} />
      <Skeleton height={96} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: theme.space[4], padding: theme.space[6] },
  skeleton: { borderRadius: theme.radius.lg, backgroundColor: theme.colors.surfaceSunken },
});
