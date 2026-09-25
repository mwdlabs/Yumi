import { StyleSheet, View } from 'react-native';
import { theme } from '@/theme';
import { Card } from '@/ui/Card';
import { IconBadge } from '@/ui/IconBadge';
import { CaretRightIcon, type Icon } from '@/ui/icons';
import { Text } from '@/ui/Text';

/** Grande carte de choix (icône, titre, description) pour les parcours d'accueil. */
export function ChoiceCard({
  icon,
  tone,
  title,
  description,
  onPress,
}: {
  icon: Icon;
  tone: { background: string; foreground: string };
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} accessibilityLabel={`${title}. ${description}`}>
      <View style={styles.row}>
        <IconBadge icon={icon} background={tone.background} color={tone.foreground} size={56} />
        <View style={styles.texts}>
          <Text variant="bodyStrong">{title}</Text>
          <Text variant="caption" color={theme.colors.textMuted}>
            {description}
          </Text>
        </View>
        <CaretRightIcon size={20} color={theme.colors.textMuted} weight="bold" />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.space[4] },
  texts: { flex: 1, gap: 2 },
});
