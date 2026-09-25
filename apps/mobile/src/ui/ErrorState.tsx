import { useTranslation } from 'react-i18next';
import { theme } from '@/theme';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { WarningCircleIcon } from './icons';

export interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

/** État d'erreur standard, avec action « Réessayer ». */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={WarningCircleIcon}
      tone={{ background: theme.colors.dangerSoft, foreground: theme.colors.danger }}
      title={t('states.errorTitle')}
      message={message ?? t('states.errorMessage')}
      action={onRetry ? <Button label={t('actions.retry')} onPress={onRetry} /> : undefined}
    />
  );
}
