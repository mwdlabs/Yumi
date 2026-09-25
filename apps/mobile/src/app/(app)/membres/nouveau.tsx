import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useActiveMembership } from '@/features/auth/session';
import { randomAvatarColor } from '@/features/family/defaults';
import { familyApi } from '@/features/family/family-api';
import { isProfileValid, ProfileEditor, type ProfileDraft } from '@/features/family/ProfileEditor';
import { familyKeys } from '@/features/family/queries';
import { errorMessage } from '@/lib/api-error';
import { theme } from '@/theme';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { Text } from '@/ui/Text';

/** Ajout d'un profil géré par un parent (enfant sans adresse courriel). */
export default function AddChildScreen() {
  const { t } = useTranslation('family');
  const familyId = useActiveMembership()?.familyId ?? '';
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<ProfileDraft>(() => ({
    displayName: '',
    avatarColor: randomAvatarColor(),
    avatarEmoji: null,
  }));
  const [submitted, setSubmitted] = useState(false);

  const add = useMutation({
    mutationFn: () => familyApi.createManagedMember(familyId, profile),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: familyKeys.detail(familyId) });
      router.back();
    },
  });

  function submit() {
    setSubmitted(true);
    if (isProfileValid(profile)) add.mutate();
  }

  return (
    <Screen scroll>
      <ScreenHeader title={t('addChild.title')} />
      <View style={styles.sections}>
        <Text color={theme.colors.textMuted}>{t('addChild.help')}</Text>
        <ProfileEditor value={profile} onChange={setProfile} showErrors={submitted} />
        {add.error ? (
          <Text variant="caption" color={theme.colors.danger} accessibilityLiveRegion="polite">
            {errorMessage(add.error)}
          </Text>
        ) : null}
        <Button label={t('addChild.submit')} onPress={submit} loading={add.isPending} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sections: { gap: theme.space[6], paddingBottom: theme.space[4] },
});
