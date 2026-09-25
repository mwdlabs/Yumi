import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSession } from '@/features/auth/session';
import { ChoiceCard } from '@/features/family/ChoiceCard';
import { theme } from '@/theme';
import { Button } from '@/ui/Button';
import { IconBadge } from '@/ui/IconBadge';
import { HouseLineIcon, KeyIcon, UsersThreeIcon } from '@/ui/icons';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

/** Première étape après connexion : créer une famille ou en rejoindre une. */
export default function WelcomeScreen() {
  const { t } = useTranslation(['family', 'common']);
  const { signOut } = useSession();

  return (
    <Screen scroll>
      <View style={styles.hero}>
        <IconBadge
          icon={UsersThreeIcon}
          background={theme.colors.primarySoft}
          color={theme.colors.primaryStrong}
          size={96}
        />
        <Text variant="title" align="center" accessibilityRole="header">
          {t('family:onboarding.title')}
        </Text>
        <Text color={theme.colors.textMuted} align="center">
          {t('family:onboarding.subtitle')}
        </Text>
      </View>

      <View style={styles.choices}>
        <ChoiceCard
          icon={HouseLineIcon}
          tone={theme.statusColors.pending}
          title={t('family:onboarding.create.title')}
          description={t('family:onboarding.create.description')}
          onPress={() => router.push('/creer')}
        />
        <ChoiceCard
          icon={KeyIcon}
          tone={theme.statusColors.chosen}
          title={t('family:onboarding.join.title')}
          description={t('family:onboarding.join.description')}
          onPress={() => router.push('/rejoindre')}
        />
      </View>

      <Button variant="ghost" label={t('common:actions.signOut')} onPress={() => void signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space[3],
    paddingVertical: theme.space[10],
  },
  choices: { gap: theme.space[4], marginBottom: theme.space[4] },
});
