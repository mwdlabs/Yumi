import type { ShoppingItemDto } from '@yumi/shared';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { formatQuantity } from '@/lib/format';
import { theme } from '@/theme';
import { ArrowsClockwiseIcon, CheckIcon, XIcon } from '@/ui/icons';
import { Text } from '@/ui/Text';

export interface ShoppingItemRowProps {
  item: ShoppingItemDto;
  onToggle: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
}

/** Ligne d'article : grande case à cocher (utilisable d'une main en magasin). */
export function ShoppingItemRow({ item, onToggle, onEdit, onRemove }: ShoppingItemRowProps) {
  const { t } = useTranslation('shopping');
  const done = theme.statusColors.done;
  const quantity = item.quantity !== null ? formatQuantity(item.quantity, item.unit) : null;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.checked }}
        accessibilityLabel={
          item.checked ? t('uncheck', { name: item.name }) : t('check', { name: item.name })
        }
        hitSlop={6}
        style={styles.checkArea}
      >
        <View
          style={[
            styles.box,
            item.checked && { backgroundColor: done.foreground, borderColor: done.foreground },
          ]}
        >
          {item.checked ? <CheckIcon size={18} color={theme.colors.surface} weight="bold" /> : null}
        </View>
      </Pressable>

      <Pressable onPress={onEdit ?? onToggle} accessibilityRole="button" style={styles.texts}>
        <Text
          variant="bodyStrong"
          color={item.checked ? theme.colors.textMuted : theme.colors.text}
          style={item.checked ? styles.struck : undefined}
          numberOfLines={2}
        >
          {item.name}
        </Text>
        {quantity || item.isStaple ? (
          <View style={styles.meta}>
            {quantity ? (
              <Text variant="caption" color={theme.colors.textMuted}>
                {quantity}
              </Text>
            ) : null}
            {item.isStaple ? (
              <View style={styles.staple}>
                <ArrowsClockwiseIcon
                  size={12}
                  color={theme.statusColors.chosen.foreground}
                  weight="bold"
                />
                <Text variant="caption" color={theme.statusColors.chosen.foreground}>
                  {t('stapleBadge')}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </Pressable>

      {onRemove ? (
        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={t('remove', { name: item.name })}
          hitSlop={8}
          style={styles.remove}
        >
          <XIcon size={18} color={theme.colors.textMuted} weight="bold" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.touchTarget + 8,
    gap: theme.space[2],
  },
  checkArea: {
    width: theme.touchTarget,
    height: theme.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, paddingVertical: theme.space[2] },
  struck: { textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.space[2] },
  staple: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  remove: {
    width: theme.touchTarget - 8,
    height: theme.touchTarget - 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
