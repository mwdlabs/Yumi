import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSession } from '@/features/auth/session';
import { DeadlineFields } from '@/features/family/DeadlineFields';
import {
  DEFAULT_DEADLINE,
  DEFAULT_WEEK_STARTS_ON,
  deviceTimezone,
  randomAvatarColor,
} from '@/features/family/defaults';
import { familyApi } from '@/features/family/family-api';
import { isProfileValid, ProfileEditor, type ProfileDraft } from '@/features/family/ProfileEditor';
import { errorMessage } from '@/lib/api-error';
import { theme } from '@/theme';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { SectionTitle } from '@/ui/SectionTitle';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';

/** Création d'une famille : nom, profil du créateur, échéance des choix. */
export default function CreateFamilyScreen() {
  const { t } = useTranslation('family');
  const { refreshMe } = useSession();
  const [familyName, setFamilyName] = useState('');
  const [profile, setProfile] = useState<ProfileDraft>(() => ({
    displayName: '',
    avatarColor: randomAvatarColor(),
    avatarEmoji: null,
  }));
  const [deadline, setDeadline] = useState<{ weekday: number; time: string }>(DEFAULT_DEADLINE);
  const [submitted, setSubmitted] = useState(false);

  const create = useMutation({
    mutationFn: () =>
      familyApi.create({
        family: {
          name: familyName,
          timezone: deviceTimezone(),
          weekStartsOn: DEFAULT_WEEK_STARTS_ON,
          deadlineWeekday: deadline.weekday,
          deadlineTime: deadline.time,
        },
        profile,
      }),
    // La navigation protégée bascule vers l'app dès que le profil contient la famille.
    onSuccess: () => refreshMe(),
  });

  const familyNameValid = familyName.trim().length > 0;

  function submit() {
    setSubmitted(true);
    if (familyNameValid && isProfileValid(profile)) create.mutate();
  }

  return (
    <Screen scroll>
      <ScreenHeader title={t('create.title')} />
      <View style={styles.sections}>
        <TextField
          label={t('create.familyNameLabel')}
          placeholder={t('create.familyNamePlaceholder')}
          value={familyName}
          onChangeText={setFamilyName}
          error={submitted && !familyNameValid ? t('create.familyNameRequired') : null}
          autoCapitalize="words"
          maxLength={40}
        />

        <View style={styles.section}>
          <SectionTitle title={t('profile.sectionTitle')} />
          <ProfileEditor value={profile} onChange={setProfile} showErrors={submitted} />
        </View>

        <DeadlineFields weekday={deadline.weekday} time={deadline.time} onChange={setDeadline} />

        {create.error ? (
          <Text variant="caption" color={theme.colors.danger} accessibilityLiveRegion="polite">
            {errorMessage(create.error)}
          </Text>
        ) : null}
        <Button label={t('create.submit')} onPress={submit} loading={create.isPending} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sections: { gap: theme.space[8], paddingBottom: theme.space[4] },
  section: { gap: theme.space[4] },
});
