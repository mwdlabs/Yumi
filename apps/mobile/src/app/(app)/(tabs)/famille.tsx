import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSession } from '@/features/auth/session';
import { theme } from '@/theme';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { SignOutIcon, UsersThreeIcon } from '@/ui/icons';
import { TabScreen } from '@/ui/TabScreen';
import { Text } from '@/ui/Text';

/** Famille et compte (fonctionnalité 1 du MVP : création et invitation). */
export default function FamilyScreen() {
  const { t } = useTranslation(['app', 'common']);
  const { state, signOut } = useSession();
  const email = state.status === 'signedIn' ? (state.me.user.email ?? '') : '';

  return (
    <TabScreen title={t('app:tabs.family')}>
      <EmptyState
        icon={UsersThreeIcon}
        tone={theme.statusColors.pending}
        title={t('app:comingSoon.family.title')}
        message={t('app:comingSoon.family.message')}
      />
      <View style={styles.account}>
        <Text variant="caption" color={theme.colors.textMuted} align="center">
          {t('app:account.signedInAs', { email })}
        </Text>
        <Button
          variant="secondary"
          label={t('common:actions.signOut')}
          icon={<SignOutIcon size={20} color={theme.colors.primaryStrong} weight="bold" />}
          onPress={() => void signOut()}
        />
      </View>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  account: { gap: theme.space[3], paddingBottom: theme.space[4] },
});
