import { emailSchema } from '@yumi/shared';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { authApi } from '@/features/auth/auth-api';
import { appConfig } from '@/config';
import { ApiError, errorMessage } from '@/lib/api-error';
import { theme } from '@/theme';
import { Button } from '@/ui/Button';
import { IconBadge } from '@/ui/IconBadge';
import { CarrotIcon, ChefHatIcon, CookingPotIcon } from '@/ui/icons';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';

/** Écran d'accueil : saisie de l'adresse courriel pour recevoir un code. */
export default function SignInScreen() {
  const { t } = useTranslation(['auth', 'common']);
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const requestCode = useMutation({
    mutationFn: authApi.requestOtp,
    onSuccess: (_data, normalizedEmail) => goToCode(normalizedEmail),
    onError: (error, normalizedEmail) => {
      // Un code a déjà été envoyé récemment : on va quand même à l'écran de saisie.
      if (error instanceof ApiError && error.code === 'RATE_LIMITED') {
        goToCode(normalizedEmail, error.retryAfter);
      }
    },
  });

  function goToCode(normalizedEmail: string, cooldown?: number) {
    router.push({
      pathname: '/code',
      params: { email: normalizedEmail, ...(cooldown ? { cooldown: String(cooldown) } : {}) },
    });
  }

  function submit() {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setFieldError(t('auth:welcome.emailInvalid'));
      return;
    }
    setFieldError(null);
    requestCode.mutate(parsed.data);
  }

  const requestError =
    requestCode.error &&
    !(requestCode.error instanceof ApiError && requestCode.error.code === 'RATE_LIMITED')
      ? errorMessage(requestCode.error)
      : null;

  return (
    <Screen scroll>
      <View style={styles.hero}>
        <View style={styles.badges}>
          <View style={styles.tiltLeft}>
            <IconBadge
              icon={CarrotIcon}
              background={theme.statusColors.pending.background}
              color={theme.statusColors.pending.foreground}
              size={64}
            />
          </View>
          <IconBadge
            icon={CookingPotIcon}
            background={theme.colors.primarySoft}
            color={theme.colors.primaryStrong}
            size={96}
          />
          <View style={styles.tiltRight}>
            <IconBadge
              icon={ChefHatIcon}
              background={theme.statusColors.done.background}
              color={theme.statusColors.done.foreground}
              size={64}
            />
          </View>
        </View>
        <Text variant="display" align="center" accessibilityRole="header">
          {appConfig.appName}
        </Text>
        <Text variant="body" color={theme.colors.textMuted} align="center">
          {t('auth:welcome.tagline')}
        </Text>
      </View>

      <View style={styles.form}>
        <TextField
          label={t('auth:welcome.emailLabel')}
          placeholder={t('auth:welcome.emailPlaceholder')}
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (fieldError) setFieldError(null);
          }}
          error={fieldError ?? requestError}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="send"
          onSubmitEditing={submit}
        />
        <Button
          label={t('auth:welcome.submit')}
          onPress={submit}
          loading={requestCode.isPending}
          disabled={email.trim().length === 0}
        />
        <Text variant="caption" color={theme.colors.textMuted} align="center">
          {t('auth:welcome.hint')}
        </Text>
      </View>
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
  badges: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: theme.space[4],
  },
  tiltLeft: { transform: [{ rotate: '-12deg' }, { translateX: 10 }] },
  tiltRight: { transform: [{ rotate: '12deg' }, { translateX: -10 }] },
  form: { gap: theme.space[4], paddingBottom: theme.space[4] },
});
