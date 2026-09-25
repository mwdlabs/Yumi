import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { theme } from '@/theme';
import { Card } from '@/ui/Card';
import { IconBadge } from '@/ui/IconBadge';
import { ArrowsClockwiseIcon, CaretRightIcon } from '@/ui/icons';
import { Text } from '@/ui/Text';
import { useStaples } from './queries';

/** Accès aux essentiels depuis l'onglet Courses, avec leur nombre. */
export function StaplesEntry({ familyId }: { familyId: string }) {
  const { t } = useTranslation('shopping');
  const staples = useStaples(familyId);
  const count = staples.data?.length ?? 0;

  return (
    <Card onPress={() => router.push('/essentiels')} accessibilityLabel={t('staplesEntry.title')}>
      <View style={styles.row}>
        <IconBadge
          icon={ArrowsClockwiseIcon}
          background={theme.statusColors.chosen.background}
          color={theme.statusColors.chosen.foreground}
          size={44}
        />
        <View style={styles.texts}>
          <Text variant="bodyStrong">{t('staplesEntry.title')}</Text>
          <Text variant="caption" color={theme.colors.textMuted}>
            {t('staplesEntry.subtitle', { count })}
          </Text>
        </View>
        <CaretRightIcon size={20} color={theme.colors.textMuted} weight="bold" />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.space[3] },
  texts: { flex: 1, gap: 2 },
});
