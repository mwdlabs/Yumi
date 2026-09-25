import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { theme, type TypographyVariant } from '@/theme';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

/** Texte de l'app : applique toujours une variante typographique du thème. */
export function Text({ variant = 'body', color, align, style, ...rest }: TextProps) {
  return (
    <RNText
      style={[
        theme.typography[variant],
        { color: color ?? theme.colors.text },
        align ? { textAlign: align } : null,
        style,
      ]}
      {...rest}
    />
  );
}
