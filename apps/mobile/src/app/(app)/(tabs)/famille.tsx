import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { appConfig } from '@/config';
import { useActiveMembership, useSession } from '@/features/auth/session';
import { MemberRow } from '@/features/family/MemberRow';
import { useFamily } from '@/features/family/queries';
import { usePushPermission } from '@/features/notifications/hooks';
import { errorMessage } from '@/lib/api-error';
import { formatLocalTime, formatWeekday } from '@/lib/format';
import { theme } from '@/theme';
import { Button } from '@/ui/Button';
import { ErrorState } from '@/ui/ErrorState';
import { BellRingingIcon, GearSixIcon, SignOutIcon, UserPlusIcon } from '@/ui/icons';
import { LoadingState } from '@/ui/LoadingState';
import { Screen } from '@/ui/Screen';
import { SectionTitle } from '@/ui/SectionTitle';
import { Text } from '@/ui/Text';

/** Onglet Famille : membres, invitations, réglages et compte. */
export default function FamilyScreen() {
  const { t } = useTranslation(['family', 'app', 'common']);
  const { state, signOut, deleteAccount } = useSession();
  const membership = useActiveMembership();
  const family = useFamily(membership?.familyId);
  const email = state.status === 'signedIn' ? (state.me.user.email ?? '') : '';
  const removeAccount = useMutation({ mutationFn: deleteAccount });

  const confirmDeleteAccount = () => {
    Alert.alert(t('app:account.deleteConfirmTitle'), t('app:account.deleteConfirmMessage'), [
      { text: t('common:actions.cancel'), style: 'cancel' },
      {
        text: t('app:account.deleteConfirmAction'),
        style: 'destructive',
        onPress: () => removeAccount.mutate(),
      },
    ]);
  };

  if (family.isPending) {
    return (
      <Screen edges={['top']}>
        <LoadingState />
      </Screen>
    );
  }
  if (family.isError) {
    return (
      <Screen edges={['top']}>
        <ErrorState message={errorMessage(family.error)} onRetry={() => void family.refetch()} />
      </Screen>
    );
  }

  const data = family.data;
  const me = data.members.find((member) => member.isMe);
  const isAdmin = me?.role === 'ADMIN';

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerTexts}>
            <Text variant="title" accessibilityRole="header">
              {data.name}
            </Text>
            <Text variant="caption" color={theme.colors.textMuted}>
              {t('family:home.deadlineSummary', {
                day: formatWeekday(data.deadlineWeekday),
                time: formatLocalTime(data.deadlineTime),
              })}
            </Text>
          </View>
          {isAdmin ? (
            <Pressable
              onPress={() => router.push('/reglages-famille')}
              accessibilityRole="button"
              accessibilityLabel={t('family:home.settings')}
              hitSlop={8}
              style={styles.iconButton}
            >
              <GearSixIcon size={26} color={theme.colors.primaryStrong} weight="duotone" />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.section}>
          <SectionTitle title={t('family:home.membersTitle')} />
          {data.members.map((member) => {
            const canEdit = isAdmin || member.isMe;
            return (
              <MemberRow
                key={member.id}
                member={member}
                onPress={
                  canEdit
                    ? () =>
                        router.push({
                          pathname: '/membres/[memberId]',
                          params: { memberId: member.id },
                        })
                    : undefined
                }
              />
            );
          })}
        </View>

        {isAdmin ? (
          <View style={styles.actions}>
            <Button
              label={t('family:home.invite')}
              icon={<UserPlusIcon size={20} color={theme.colors.textOnPrimary} weight="bold" />}
              onPress={() => router.push('/inviter')}
            />
            <Button
              variant="secondary"
              label={t('family:home.addChild')}
              onPress={() => router.push('/membres/nouveau')}
            />
          </View>
        ) : null}

        <RemindersSection />

        <View style={styles.account}>
          <Text variant="caption" color={theme.colors.textMuted} align="center">
            {t('app:account.signedInAs', { email })}
          </Text>
          <Button
            variant="ghost"
            label={t('common:actions.signOut')}
            icon={<SignOutIcon size={20} color={theme.colors.primaryStrong} weight="bold" />}
            onPress={() => void signOut()}
          />
          <Button
            variant="ghost"
            label={t('app:account.deleteAccount')}
            onPress={confirmDeleteAccount}
            loading={removeAccount.isPending}
          />
          {removeAccount.error ? (
            <Text
              variant="caption"
              color={theme.colors.danger}
              align="center"
              accessibilityLiveRegion="polite"
            >
              {errorMessage(removeAccount.error)}
            </Text>
          ) : null}
          <Text variant="caption" color={theme.colors.textMuted} align="center">
            {t('app:account.version', { version: appConfig.version })}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

/** Activation des rappels (autorisation iOS et enregistrement de l'appareil). */
function RemindersSection() {
  const { t } = useTranslation('app');
  const { permission, enable, enabling, failed } = usePushPermission();
  if (permission === null) return null;

  return (
    <View style={styles.section}>
      <SectionTitle title={t('notifications.title')} />
      <Text variant="caption" color={theme.colors.textMuted}>
        {t('notifications.help')}
      </Text>
      {permission === 'granted' ? (
        <View style={styles.enabled}>
          <BellRingingIcon size={20} color={theme.colors.primaryStrong} weight="duotone" />
          <Text variant="bodyStrong">{t('notifications.enabled')}</Text>
        </View>
      ) : permission === 'denied' ? (
        <>
          <Text variant="caption" color={theme.colors.textMuted}>
            {t('notifications.denied', { appName: appConfig.appName })}
          </Text>
          <Button
            variant="secondary"
            label={t('notifications.openSettings')}
            onPress={() => void Linking.openSettings()}
          />
        </>
      ) : (
        <Button
          variant="secondary"
          label={t('notifications.enable')}
          icon={<BellRingingIcon size={20} color={theme.colors.primaryStrong} weight="bold" />}
          loading={enabling}
          onPress={() => void enable()}
        />
      )}
      {failed ? (
        <Text variant="caption" color={theme.colors.danger} accessibilityLiveRegion="polite">
          {t('notifications.failed')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.space[6], paddingBottom: theme.space[6] },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.space[3] },
  headerTexts: { flex: 1, gap: theme.space[1] },
  iconButton: {
    width: theme.touchTarget,
    height: theme.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { gap: theme.space[3] },
  actions: { gap: theme.space[3] },
  account: { gap: theme.space[2] },
  enabled: { flexDirection: 'row', alignItems: 'center', gap: theme.space[2] },
});
