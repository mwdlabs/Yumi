import type { AvatarColor, AvatarEmoji } from '@yumi/shared';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { theme } from '@/theme';
import { Avatar } from '@/ui/Avatar';
import { ColorPicker } from '@/ui/ColorPicker';
import { EmojiPicker } from '@/ui/EmojiPicker';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';

export interface ProfileDraft {
  displayName: string;
  avatarColor: AvatarColor;
  avatarEmoji: AvatarEmoji | null;
}

export interface ProfileEditorProps {
  value: ProfileDraft;
  onChange: (value: ProfileDraft) => void;
  /** Affiche l'erreur « nom requis » (après une tentative d'envoi). */
  showErrors?: boolean;
}

export const isProfileValid = (profile: ProfileDraft) => profile.displayName.trim().length > 0;

/** Édition d'un profil : nom, couleur, emoji, avec aperçu de l'avatar en direct. */
export function ProfileEditor({ value, onChange, showErrors = false }: ProfileEditorProps) {
  const { t } = useTranslation('family');
  const update = (patch: Partial<ProfileDraft>) => onChange({ ...value, ...patch });

  return (
    <View style={styles.container}>
      <View style={styles.preview}>
        <Avatar
          name={value.displayName}
          color={value.avatarColor}
          emoji={value.avatarEmoji}
          size={88}
        />
      </View>
      <TextField
        label={t('profile.nameLabel')}
        placeholder={t('profile.namePlaceholder')}
        value={value.displayName}
        onChangeText={(displayName) => update({ displayName })}
        error={showErrors && !isProfileValid(value) ? t('profile.nameRequired') : null}
        autoCapitalize="words"
        maxLength={40}
        returnKeyType="done"
      />
      <View style={styles.field}>
        <Text variant="label">{t('profile.colorLabel')}</Text>
        <ColorPicker
          value={value.avatarColor}
          onChange={(avatarColor) => update({ avatarColor })}
        />
      </View>
      <View style={styles.field}>
        <Text variant="label">{t('profile.emojiLabel')}</Text>
        <EmojiPicker
          value={value.avatarEmoji}
          onChange={(avatarEmoji) => update({ avatarEmoji })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.space[5] },
  preview: { alignItems: 'center' },
  field: { gap: theme.space[2] },
});
