import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { authApi } from '@/features/auth/auth-api';
import { useSession } from '@/features/auth/session';
import { ApiError, errorMessage } from '@/lib/api-error';
import { theme } from '@/theme';
import { Button } from '@/ui/Button';
import { IconBadge } from '@/ui/IconBadge';
import { ArrowLeftIcon, EnvelopeSimpleIcon } from '@/ui/icons';
import { OtpInput } from '@/ui/OtpInput';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

const DEFAULT_COOLDOWN_SECONDS = 60;

/** Compte à rebours en secondes, mis à jour chaque seconde. */
function useCountdown(initialSeconds: number) {
  const [seconds, setSeconds] = useState(initialSeconds);
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);
  return [seconds, setSeconds] as const;
}

/** Saisie du code à 6 chiffres reçu par courriel ; soumission automatique. */
export default function CodeScreen() {
  const { t } = useTranslation(['auth', 'common']);
  const { signIn } = useSession();
  const params = useLocalSearchParams<{ email: string; cooldown?: string }>();
  const email = params.email ?? '';
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useCountdown(Number(params.cooldown) || DEFAULT_COOLDOWN_SECONDS);

  const verify = useMutation({
    mutationFn: (value: string) => signIn(email, value),
    onError: () => setCode(''),
    // En cas de succès, la navigation protégée bascule d'elle-même vers l'app.
  });

  const resend = useMutation({
    mutationFn: () => authApi.requestOtp(email),
    onSuccess: () => {
      verify.reset();
      setCooldown(DEFAULT_COOLDOWN_SECONDS);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.retryAfter) setCooldown(error.retryAfter);
    },
  });

  const error = verify.error ?? resend.error;

  return (
    <Screen scroll>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel={t('auth:code.changeEmail')}
        hitSlop={12}
        style={styles.back}
      >
        <ArrowLeftIcon size={22} color={theme.colors.primaryStrong} weight="bold" />
        <Text variant="label" color={theme.colors.primaryStrong}>
          {t('auth:code.changeEmail')}
        </Text>
      </Pressable>

      <View style={styles.header}>
        <IconBadge
          icon={EnvelopeSimpleIcon}
          background={theme.statusColors.chosen.background}
          color={theme.statusColors.chosen.foreground}
        />
        <Text variant="title" align="center" accessibilityRole="header">
          {t('auth:code.title')}
        </Text>
        <Text color={theme.colors.textMuted} align="center">
          {t('auth:code.subtitle', { email })}
        </Text>
      </View>

      <View style={styles.form}>
        <OtpInput
          value={code}
          onChange={(value) => {
            setCode(value);
            if (verify.isError) verify.reset();
          }}
          onComplete={(value) => verify.mutate(value)}
          accessibilityLabel={t('auth:code.inputLabel')}
          hasError={verify.isError}
          disabled={verify.isPending}
        />

        <View style={styles.feedback} accessibilityLiveRegion="polite">
          {error ? (
            <Text variant="caption" color={theme.colors.danger} align="center">
              {errorMessage(error)}
            </Text>
          ) : resend.isSuccess ? (
            <Text variant="caption" color={theme.statusColors.done.foreground} align="center">
              {t('auth:code.resent')}
            </Text>
          ) : null}
        </View>

        <Button
          variant="primary"
          label={t('common:actions.continue')}
          onPress={() => verify.mutate(code)}
          loading={verify.isPending}
          disabled={code.length !== 6}
        />
        <Button
          variant="ghost"
          label={
            cooldown > 0 ? t('auth:code.resendIn', { seconds: cooldown }) : t('auth:code.resend')
          }
          onPress={() => resend.mutate()}
          loading={resend.isPending}
          disabled={cooldown > 0}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[2],
    minHeight: theme.touchTarget,
    alignSelf: 'flex-start',
  },
  header: {
    alignItems: 'center',
    gap: theme.space[3],
    paddingTop: theme.space[8],
    paddingBottom: theme.space[8],
  },
  form: { gap: theme.space[4] },
  feedback: { minHeight: 20 },
});
