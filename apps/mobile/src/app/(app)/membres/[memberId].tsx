import type { MemberDto, UpdateMemberBody } from '@yumi/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';
import { useActiveMembership, useSession } from '@/features/auth/session';
import { familyApi } from '@/features/family/family-api';
import { isProfileValid, ProfileEditor, type ProfileDraft } from '@/features/family/ProfileEditor';
import { familyKeys, useFamily } from '@/features/family/queries';
import { errorMessage } from '@/lib/api-error';
import { theme } from '@/theme';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { UsersThreeIcon } from '@/ui/icons';
import { LoadingState } from '@/ui/LoadingState';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { SectionTitle } from '@/ui/SectionTitle';
import { SwitchRow } from '@/ui/SwitchRow';
import { Text } from '@/ui/Text';

/** Profil d'un membre : modifiable par lui-même ou par un admin. */
export default function MemberScreen() {
  const { t } = useTranslation('family');
  const { memberId } = useLocalSearchParams<{ memberId: string }>();
  const familyId = useActiveMembership()?.familyId;
  const family = useFamily(familyId);

  const member = family.data?.members.find((m) => m.id === memberId);
  const me = family.data?.members.find((m) => m.isMe);

  return (
    <Screen scroll>
      {family.isPending ? (
        <LoadingState />
      ) : !member || !me || !familyId ? (
        <>
          <ScreenHeader title="" />
          <EmptyState
            icon={UsersThreeIcon}
            title={t('member.notFoundTitle')}
            message={t('member.notFoundMessage')}
          />
        </>
      ) : (
        <MemberForm familyId={familyId} member={member} actorIsAdmin={me.role === 'ADMIN'} />
      )}
    </Screen>
  );
}

function MemberForm({
  familyId,
  member,
  actorIsAdmin,
}: {
  familyId: string;
  member: MemberDto;
  actorIsAdmin: boolean;
}) {
  const { t } = useTranslation(['family', 'common']);
  const { refreshMe } = useSession();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<ProfileDraft>({
    displayName: member.displayName,
    avatarColor: member.avatarColor,
    avatarEmoji: member.avatarEmoji,
  });
  const [isAdmin, setIsAdmin] = useState(member.role === 'ADMIN');
  const [isShopper, setIsShopper] = useState(member.isShoppingResponsible);
  const [submitted, setSubmitted] = useState(false);

  const invalidateFamily = () =>
    queryClient.invalidateQueries({ queryKey: familyKeys.detail(familyId) });

  const save = useMutation({
    mutationFn: () => {
      const body: UpdateMemberBody = { ...profile };
      if (actorIsAdmin) {
        body.role = isAdmin ? 'ADMIN' : 'MEMBER';
        body.isShoppingResponsible = isShopper;
      }
      return familyApi.updateMember(familyId, member.id, body);
    },
    onSuccess: async () => {
      await invalidateFamily();
      // Le nom et le rôle apparaissent aussi dans le profil de session.
      if (member.isMe) await refreshMe();
      router.back();
    },
  });

  const remove = useMutation({
    mutationFn: () => familyApi.removeMember(familyId, member.id),
    onSuccess: async () => {
      if (member.isMe) {
        // Plus de famille : la navigation protégée renvoie vers l'accueil.
        queryClient.removeQueries({ queryKey: familyKeys.detail(familyId) });
        await refreshMe();
        return;
      }
      await invalidateFamily();
      router.back();
    },
  });

  const confirmRemove = () => {
    const [title, message, action] = member.isMe
      ? [
          t('family:member.leaveConfirmTitle'),
          t('family:member.leaveConfirmMessage'),
          t('family:member.leave'),
        ]
      : [
          t('family:member.removeConfirmTitle', { name: member.displayName }),
          t('family:member.removeConfirmMessage'),
          t('family:member.remove'),
        ];
    Alert.alert(title, message, [
      { text: t('common:actions.cancel'), style: 'cancel' },
      { text: action, style: 'destructive', onPress: () => remove.mutate() },
    ]);
  };

  function submit() {
    setSubmitted(true);
    if (isProfileValid(profile)) save.mutate();
  }

  const error = save.error ?? remove.error;

  return (
    <>
      <ScreenHeader
        title={
          member.isMe
            ? t('family:member.titleSelf')
            : t('family:member.titleOther', { name: member.displayName })
        }
      />
      <View style={styles.sections}>
        <ProfileEditor value={profile} onChange={setProfile} showErrors={submitted} />

        {actorIsAdmin ? (
          <View style={styles.section}>
            <SectionTitle title={t('family:member.rolesTitle')} />
            <SwitchRow
              label={t('family:member.adminLabel')}
              help={
                member.isManaged
                  ? t('family:member.adminManagedHelp')
                  : t('family:member.adminHelp')
              }
              value={isAdmin}
              onValueChange={setIsAdmin}
              disabled={member.isManaged}
            />
            <SwitchRow
              label={t('family:member.shoppingLabel')}
              help={t('family:member.shoppingHelp')}
              value={isShopper}
              onValueChange={setIsShopper}
            />
          </View>
        ) : null}

        {error ? (
          <Text variant="caption" color={theme.colors.danger} accessibilityLiveRegion="polite">
            {errorMessage(error)}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <Button label={t('common:actions.save')} onPress={submit} loading={save.isPending} />
          <Button
            variant="ghost"
            label={member.isMe ? t('family:member.leave') : t('family:member.remove')}
            onPress={confirmRemove}
            loading={remove.isPending}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sections: { gap: theme.space[8], paddingBottom: theme.space[4] },
  section: { gap: theme.space[4] },
  actions: { gap: theme.space[2] },
});
