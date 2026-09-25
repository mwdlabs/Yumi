import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useActiveMembership, useSession } from '@/features/auth/session';
import { MemberRow } from '@/features/family/MemberRow';
import { useFamily } from '@/features/family/queries';
import { errorMessage } from '@/lib/api-error';
import { formatLocalTime, formatWeekday } from '@/lib/format';
import { theme } from '@/theme';
import { Button } from '@/ui/Button';
import { ErrorState } from '@/ui/ErrorState';
import { GearSixIcon, SignOutIcon, UserPlusIcon } from '@/ui/icons';
import { LoadingState } from '@/ui/LoadingState';
import { Screen } from '@/ui/Screen';
import { SectionTitle } from '@/ui/SectionTitle';
import { Text } from '@/ui/Text';

/** Onglet Famille : membres, invitations, réglages et compte. */
export default function FamilyScreen() {
  const { t } = useTranslation(['family', 'app', 'common']);
  const { state, signOut } = useSession();
  const membership = useActiveMembership();
  const family = useFamily(membership?.familyId);
  const email = state.status === 'signedIn' ? (state.me.user.email ?? '') : '';

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
        </View>
      </ScrollView>
    </Screen>
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
});
