import { AVATAR_COLORS, type AvatarColor } from '@yumi/shared';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { theme } from '@/theme';
import { CheckIcon } from './icons';

/** Choix d'une couleur d'avatar parmi la liste fermée. */
export function ColorPicker({
  value,
  onChange,
}: {
  value: AvatarColor;
  onChange: (color: AvatarColor) => void;
}) {
  const { t } = useTranslation('family');
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {AVATAR_COLORS.map((color) => {
        const selected = color === value;
        const palette = theme.avatarColors[color];
        return (
          <Pressable
            key={color}
            onPress={() => onChange(color)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={t(`profile.colorNames.${color}`)}
            style={[
              styles.swatch,
              { backgroundColor: palette.background, borderColor: palette.foreground },
              selected && styles.selected,
            ]}
          >
            {selected ? <CheckIcon size={20} color={palette.foreground} weight="bold" /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[3] },
  swatch: {
    width: theme.touchTarget,
    height: theme.touchTarget,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { borderWidth: 3 },
});
