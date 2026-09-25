import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { theme } from '@/theme';
import { Text } from './Text';

export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Appelé dès que tous les chiffres sont saisis (soumission automatique). */
  onComplete?: (value: string) => void;
  length?: number;
  accessibilityLabel: string;
  hasError?: boolean;
  disabled?: boolean;
}

/**
 * Saisie d'un code à N chiffres, affichée en cases.
 * Un seul TextInput invisible porte la saisie : le collage d'un code et le
 * remplissage automatique iOS/Android (« code reçu par courriel ») fonctionnent.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  accessibilityLabel,
  hasError = false,
  disabled = false,
}: OtpInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(true);

  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, length);
    onChange(digits);
    if (digits.length === length) onComplete?.(digits);
  };

  return (
    <Pressable onPress={() => inputRef.current?.focus()} accessible={false}>
      <View style={styles.row}>
        {Array.from({ length }, (_, index) => {
          const isActive = focused && index === Math.min(value.length, length - 1);
          const borderColor = hasError
            ? theme.colors.danger
            : isActive
              ? theme.colors.focus
              : theme.colors.borderStrong;
          return (
            <View key={index} style={[styles.cell, { borderColor }]}>
              <Text variant="code">{value[index] ?? ''}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        editable={!disabled}
        autoFocus
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        accessibilityLabel={accessibilityLabel}
        caretHidden
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.space[2] },
  cell: {
    flex: 1,
    aspectRatio: 0.82,
    maxWidth: 56,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Invisible mais focalisable et accessible (pas display:none).
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
