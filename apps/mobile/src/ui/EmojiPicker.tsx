import { AVATAR_EMOJIS, type AvatarEmoji } from '@yumi/shared';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text as RNText, View } from 'react-native';
import { theme } from '@/theme';
import { Text } from './Text';

/** Choix d'un emoji d'avatar (liste fermée) ou de l'initiale (null). */
export function EmojiPicker({
  value,
  onChange,
}: {
  value: AvatarEmoji | null;
  onChange: (emoji: AvatarEmoji | null) => void;
}) {
  const { t } = useTranslation('family');
  return (
    <View style={styles.grid} accessibilityRole="radiogroup">
      <Pressable
        onPress={() => onChange(null)}
        accessibilityRole="radio"
        accessibilityState={{ selected: value === null }}
        style={[styles.cell, styles.initialCell, value === null && styles.selected]}
      >
        <Text variant="caption" color={theme.colors.textMuted}>
          {t('profile.noEmoji')}
        </Text>
      </Pressable>
      {AVATAR_EMOJIS.map((emoji) => (
        <Pressable
          key={emoji}
          onPress={() => onChange(emoji)}
          accessibilityRole="radio"
          accessibilityState={{ selected: emoji === value }}
          accessibilityLabel={emoji}
          style={[styles.cell, emoji === value && styles.selected]}
        >
          <RNText style={styles.emoji}>{emoji}</RNText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] },
  cell: {
    width: theme.touchTarget,
    height: theme.touchTarget,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialCell: { width: theme.touchTarget * 2 + theme.space[2] },
  selected: { borderColor: theme.colors.focus, backgroundColor: theme.colors.primarySoft },
  emoji: { fontSize: 26 },
});
