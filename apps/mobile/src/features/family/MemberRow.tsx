import type { MemberDto } from '@yumi/shared';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { theme } from '@/theme';
import { Avatar } from '@/ui/Avatar';
import { Badge } from '@/ui/Badge';
import { Card } from '@/ui/Card';
import { BasketIcon, CaretRightIcon } from '@/ui/icons';
import { Text } from '@/ui/Text';

/** Carte d'un membre : avatar, nom, rôles. Pressable si l'appelant peut le modifier. */
export function MemberRow({ member, onPress }: { member: MemberDto; onPress?: () => void }) {
  const { t } = useTranslation('family');
  const name = member.isMe ? `${member.displayName} (${t('home.you')})` : member.displayName;

  return (
    <Card onPress={onPress} accessibilityLabel={name}>
      <View style={styles.row}>
        <Avatar name={member.displayName} color={member.avatarColor} emoji={member.avatarEmoji} />
        <View style={styles.texts}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {name}
          </Text>
          <View style={styles.badges}>
            {member.role === 'ADMIN' ? (
              <Badge label={t('home.badgeAdmin')} tone={theme.statusColors.chosen} />
            ) : null}
            {member.isShoppingResponsible ? (
              <Badge
                label={t('home.badgeShopping')}
                tone={theme.statusColors.done}
                icon={
                  <BasketIcon size={14} color={theme.statusColors.done.foreground} weight="bold" />
                }
              />
            ) : null}
            {member.isManaged ? (
              <Badge label={t('home.badgeManaged')} tone={theme.statusColors.absent} />
            ) : null}
          </View>
        </View>
        {onPress ? <CaretRightIcon size={20} color={theme.colors.textMuted} weight="bold" /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.space[3] },
  texts: { flex: 1, gap: theme.space[1] },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[1] },
});
