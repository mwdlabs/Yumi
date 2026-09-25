import type { CreatedInvitationDto } from '@yumi/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Share, StyleSheet, View } from 'react-native';
import { appConfig } from '@/config';
import { useActiveMembership } from '@/features/auth/session';
import { familyApi } from '@/features/family/family-api';
import { familyKeys, useInvitations } from '@/features/family/queries';
import { errorMessage } from '@/lib/api-error';
import { formatDateTime } from '@/lib/format';
import { theme } from '@/theme';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ErrorState } from '@/ui/ErrorState';
import { ShareNetworkIcon } from '@/ui/icons';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { SectionTitle } from '@/ui/SectionTitle';
import { Text } from '@/ui/Text';

/**
 * Invitation : un code est généré dès l'ouverture (1 tap depuis l'onglet
 * Famille), prêt à partager. Le code n'est stocké que haché côté serveur :
 * il n'est visible qu'ici, au moment de sa création.
 */
export default function InviteScreen() {
  const { t } = useTranslation(['family', 'common']);
  const familyId = useActiveMembership()?.familyId ?? '';
  const queryClient = useQueryClient();
  const invitations = useInvitations(familyId);

  const create = useMutation({
    mutationFn: () => familyApi.createInvitation(familyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: familyKeys.invitations(familyId) }),
  });
  const revoke = useMutation({
    mutationFn: (invitationId: string) => familyApi.revokeInvitation(familyId, invitationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: familyKeys.invitations(familyId) }),
  });

  // Un seul code généré à l'ouverture, même si l'effet est rejoué (mode strict).
  const requested = useRef(false);
  useEffect(() => {
    if (requested.current || !familyId) return;
    requested.current = true;
    create.mutate();
  }, [create, familyId]);

  const share = (invitation: CreatedInvitationDto) =>
    Share.share({
      message: t('family:invite.shareMessage', {
        code: invitation.code,
        appName: appConfig.appName,
      }),
    });

  const confirmRevoke = (invitationId: string) =>
    Alert.alert(t('family:invite.revokeConfirmTitle'), t('family:invite.revokeConfirmMessage'), [
      { text: t('common:actions.cancel'), style: 'cancel' },
      {
        text: t('family:invite.revoke'),
        style: 'destructive',
        onPress: () => revoke.mutate(invitationId),
      },
    ]);

  const current = create.data;
  const others = (invitations.data ?? []).filter((invitation) => invitation.id !== current?.id);

  return (
    <Screen scroll>
      <ScreenHeader title={t('family:invite.title')} />

      {create.isError ? (
        <ErrorState message={errorMessage(create.error)} onRetry={() => create.mutate()} />
      ) : (
        <View style={styles.sections}>
          <Text color={theme.colors.textMuted}>{t('family:invite.help')}</Text>

          <Card style={styles.codeCard}>
            {current ? (
              <>
                <Text
                  variant="display"
                  align="center"
                  style={styles.code}
                  accessibilityLabel={current.code.split('').join(' ')}
                  selectable
                >
                  {current.code}
                </Text>
                <Text variant="caption" color={theme.colors.textMuted} align="center">
                  {t('family:invite.validUntil', { date: formatDateTime(current.expiresAt) })}
                </Text>
              </>
            ) : (
              <ActivityIndicator color={theme.colors.primaryStrong} />
            )}
          </Card>

          <Button
            label={t('common:actions.share')}
            icon={<ShareNetworkIcon size={20} color={theme.colors.textOnPrimary} weight="bold" />}
            disabled={!current}
            onPress={() => current && void share(current)}
          />
          <Button
            variant="ghost"
            label={t('family:invite.newCode')}
            loading={create.isPending}
            onPress={() => create.mutate()}
          />

          {others.length > 0 ? (
            <View style={styles.list}>
              <SectionTitle title={t('family:invite.activeTitle')} />
              {others.map((invitation) => (
                <Card key={invitation.id}>
                  <View style={styles.row}>
                    <View style={styles.rowTexts}>
                      <Text variant="bodyStrong">
                        {t('family:invite.activeItem', {
                          date: formatDateTime(invitation.createdAt),
                        })}
                      </Text>
                      <Text variant="caption" color={theme.colors.textMuted}>
                        {t('family:invite.uses', { count: invitation.useCount })}
                      </Text>
                    </View>
                    <Button
                      variant="ghost"
                      label={t('family:invite.revoke')}
                      onPress={() => confirmRevoke(invitation.id)}
                    />
                  </View>
                </Card>
              ))}
            </View>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sections: { gap: theme.space[4], paddingBottom: theme.space[4] },
  codeCard: { gap: theme.space[2], paddingVertical: theme.space[8], minHeight: 140 },
  code: { letterSpacing: 8 },
  list: { gap: theme.space[3], marginTop: theme.space[4] },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.space[2] },
  rowTexts: { flex: 1 },
});
