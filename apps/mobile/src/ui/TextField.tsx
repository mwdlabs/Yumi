import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { theme } from '@/theme';
import { Text } from './Text';

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string | null;
}

/** Champ texte avec libellé visible et message d'erreur annoncé aux lecteurs d'écran. */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, style, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const borderColor = error
    ? theme.colors.danger
    : focused
      ? theme.colors.focus
      : theme.colors.borderStrong;

  return (
    <View style={styles.container}>
      <Text variant="label">{label}</Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={theme.colors.textMuted}
        style={[styles.input, { borderColor }, style]}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        {...rest}
      />
      {error ? (
        <Text variant="caption" color={theme.colors.danger} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: theme.space[2] },
  input: {
    ...theme.typography.body,
    color: theme.colors.text,
    minHeight: theme.touchTarget + 8,
    paddingHorizontal: theme.space[4],
    borderRadius: theme.radius.md,
    borderWidth: 2,
    backgroundColor: theme.colors.surface,
  },
});
