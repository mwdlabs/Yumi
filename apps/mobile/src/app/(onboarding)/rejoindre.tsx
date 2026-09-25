import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSession } from '@/features/auth/session';
import { randomAvatarColor } from '@/features/family/defaults';
import { familyApi } from '@/features/family/family-api';
import { isProfileValid, ProfileEditor, type ProfileDraft } from '@/features/family/ProfileEditor';
import { errorMessage } from '@/lib/api-error';
import { theme } from '@/theme';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { IconBadge } from '@/ui/IconBadge';
import { UsersThreeIcon } from '@/ui/icons';
import { OtpInput } from '@/ui/OtpInput';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { SectionTitle } from '@/ui/SectionTitle';
import { Text } from '@/ui/Text';

/**
 * Rejoindre une famille en deux temps : le code (avec aperçu du nom de la
 * famille, pour confirmer qu'il s'agit de la bonne), puis le profil.
 */
export default function JoinFamilyScreen() {
  const { t } = useTranslation('family');
  const { refreshMe } = useSession();
  const [code, setCode] = useState('');
  const [profile, setProfile] = useState<ProfileDraft>(() => ({
    displayName: '',
    avatarColor: randomAvatarColor(),
    avatarEmoji: null,
  }));
  const [submitted, setSubmitted] = useState(false);

  const preview = useMutation({ mutationFn: familyApi.previewInvitation });
  const join = useMutation({
    mutationFn: () => familyApi.join({ code, profile }),
    onSuccess: () => refreshMe(),
  });

  const found = preview.data;
  const error = preview.error ?? join.error;

  function resetCode() {
    setCode('');
    preview.reset();
    join.reset();
  }

  function submit() {
    setSubmitted(true);
    if (isProfileValid(profile)) join.mutate();
  }

  return (
    <Screen scroll>
      <ScreenHeader title={t('join.title')} />

      {!found ? (
        <View style={styles.section}>
          <SectionTitle title={t('join.codeLabel')} help={t('join.codeHelp')} />
          <OtpInput
            value={code}
            onChange={(value) => {
              setCode(value);
              if (preview.isError) preview.reset();
            }}
            onComplete={(value) => preview.mutate(value)}
            accessibilityLabel={t('join.codeLabel')}
            hasError={preview.isError}
            disabled={preview.isPending}
          />
          {preview.isPending ? <ActivityIndicator color={theme.colors.primaryStrong} /> : null}
        </View>
      ) : (
        <View style={styles.sections}>
          <Card>
            <View style={styles.found}>
              <IconBadge
                icon={UsersThreeIcon}
                background={theme.statusColors.done.background}
                color={theme.statusColors.done.foreground}
                size={56}
              />
              <View style={styles.foundTexts}>
                <Text variant="caption" color={theme.colors.textMuted}>
                  {t('join.found')}
                </Text>
                <Text variant="heading">{found.familyName}</Text>
                <Text variant="caption" color={theme.colors.textMuted}>
                  {t('join.memberCount', { count: found.memberCount })}
                </Text>
              </View>
            </View>
          </Card>

          <View style={styles.section}>
            <SectionTitle title={t('profile.sectionTitle')} />
            <ProfileEditor value={profile} onChange={setProfile} showErrors={submitted} />
          </View>

          <View style={styles.actions}>
            <Button label={t('join.submit')} onPress={submit} loading={join.isPending} />
            <Button variant="ghost" label={t('join.otherCode')} onPress={resetCode} />
          </View>
        </View>
      )}

      {error ? (
        <Text
          variant="caption"
          color={theme.colors.danger}
          align="center"
          accessibilityLiveRegion="polite"
          style={styles.error}
        >
          {errorMessage(error)}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sections: { gap: theme.space[8], paddingBottom: theme.space[4] },
  section: { gap: theme.space[4] },
  found: { flexDirection: 'row', alignItems: 'center', gap: theme.space[4] },
  foundTexts: { flex: 1 },
  actions: { gap: theme.space[2] },
  error: { marginTop: theme.space[4] },
});
