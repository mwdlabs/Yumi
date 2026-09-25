import type { FamilyDto } from '@yumi/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useActiveMembership, useSession } from '@/features/auth/session';
import { DeadlineFields } from '@/features/family/DeadlineFields';
import { deviceTimezone } from '@/features/family/defaults';
import { familyApi } from '@/features/family/family-api';
import { familyKeys, useFamily } from '@/features/family/queries';
import { errorMessage } from '@/lib/api-error';
import { theme } from '@/theme';
import { Button } from '@/ui/Button';
import { DayPicker } from '@/ui/DayPicker';
import { ErrorState } from '@/ui/ErrorState';
import { LoadingState } from '@/ui/LoadingState';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { SectionTitle } from '@/ui/SectionTitle';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';

/** Réglages de la famille (admin) : nom, semaine, échéance, fuseau horaire. */
export default function FamilySettingsScreen() {
  const familyId = useActiveMembership()?.familyId;
  const family = useFamily(familyId);

  return (
    <Screen scroll>
      {family.isPending ? (
        <LoadingState />
      ) : family.isError ? (
        <ErrorState message={errorMessage(family.error)} onRetry={() => void family.refetch()} />
      ) : (
        <SettingsForm family={family.data} />
      )}
    </Screen>
  );
}

function SettingsForm({ family }: { family: FamilyDto }) {
  const { t } = useTranslation(['family', 'common']);
  const { refreshMe } = useSession();
  const queryClient = useQueryClient();
  const [name, setName] = useState(family.name);
  const [weekStartsOn, setWeekStartsOn] = useState(family.weekStartsOn);
  const [deadline, setDeadline] = useState({
    weekday: family.deadlineWeekday,
    time: family.deadlineTime,
  });
  const [timezone, setTimezone] = useState(family.timezone);
  const [submitted, setSubmitted] = useState(false);
  const device = deviceTimezone();
  const nameValid = name.trim().length > 0;

  const save = useMutation({
    mutationFn: () =>
      familyApi.update(family.id, {
        name,
        weekStartsOn,
        deadlineWeekday: deadline.weekday,
        deadlineTime: deadline.time,
        timezone,
      }),
    onSuccess: async (updated) => {
      queryClient.setQueryData(familyKeys.detail(family.id), updated);
      if (updated.name !== family.name) await refreshMe();
      router.back();
    },
  });

  return (
    <>
      <ScreenHeader title={t('family:settings.title')} />
      <View style={styles.sections}>
        <TextField
          label={t('family:create.familyNameLabel')}
          value={name}
          onChangeText={setName}
          error={submitted && !nameValid ? t('family:create.familyNameRequired') : null}
          autoCapitalize="words"
          maxLength={40}
        />

        <View style={styles.section}>
          <SectionTitle title={t('family:settings.weekStartsOn')} />
          <DayPicker value={weekStartsOn} onChange={setWeekStartsOn} />
        </View>

        <DeadlineFields weekday={deadline.weekday} time={deadline.time} onChange={setDeadline} />

        <View style={styles.section}>
          <SectionTitle title={t('family:settings.timezone')} />
          <Text>{timezone}</Text>
          {device !== timezone ? (
            <Button
              variant="secondary"
              label={t('family:settings.useDeviceTimezone', { timezone: device })}
              onPress={() => setTimezone(device)}
            />
          ) : null}
        </View>

        {save.error ? (
          <Text variant="caption" color={theme.colors.danger} accessibilityLiveRegion="polite">
            {errorMessage(save.error)}
          </Text>
        ) : null}
        <Button
          label={t('common:actions.save')}
          loading={save.isPending}
          onPress={() => {
            setSubmitted(true);
            if (nameValid) save.mutate();
          }}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sections: { gap: theme.space[8], paddingBottom: theme.space[4] },
  section: { gap: theme.space[3] },
});
