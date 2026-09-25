import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

/**
 * Demande confirmation avant de quitter un écran qui contient des
 * modifications non enregistrées (bouton retour, geste, retour Android).
 */
export function useConfirmDiscard(dirty: boolean): void {
  const navigation = useNavigation();
  const { t } = useTranslation(['recipes', 'common']);

  usePreventRemove(dirty, ({ data }) => {
    Alert.alert(t('editor.discardTitle'), t('editor.discardMessage'), [
      { text: t('common:actions.cancel'), style: 'cancel' },
      {
        text: t('editor.discard'),
        style: 'destructive',
        onPress: () => navigation.dispatch(data.action),
      },
    ]);
  });
}
