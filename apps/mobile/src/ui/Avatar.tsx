import type { AvatarColor, AvatarEmoji } from '@yumi/shared';
import { StyleSheet, Text as RNText, View } from 'react-native';
import { theme } from '@/theme';

export interface AvatarProps {
  name: string;
  color: AvatarColor;
  emoji?: AvatarEmoji | null;
  size?: number;
}

/** Avatar d'un membre : emoji choisi, sinon initiale, sur sa couleur. */
export function Avatar({ name, color, emoji, size = 48 }: AvatarProps) {
  const palette = theme.avatarColors[color];
  const initial = name.trim().charAt(0).toLocaleUpperCase('fr-CA') || '?';

  return (
    <View
      style={[styles.circle, { width: size, height: size, backgroundColor: palette.background }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <RNText
        style={
          emoji
            ? { fontSize: size * 0.5 }
            : {
                fontFamily: theme.fonts.bodyExtraBold,
                fontSize: size * 0.42,
                color: palette.foreground,
              }
        }
      >
        {emoji ?? initial}
      </RNText>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
