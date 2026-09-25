import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { ColorValue } from 'react-native';
import { theme } from '@/theme';
import { BasketIcon, BookOpenIcon, CalendarBlankIcon, UsersThreeIcon, type Icon } from '@/ui/icons';

const tabIcon =
  (IconComponent: Icon) =>
  ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <IconComponent
      size={26}
      // Nos teintes d'onglet sont des chaînes ; Phosphor n'accepte pas les couleurs opaques natives.
      color={typeof color === 'string' ? color : theme.colors.textMuted}
      weight={focused ? 'duotone' : 'regular'}
    />
  );

export default function AppTabsLayout() {
  const { t } = useTranslation('app');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primaryStrong,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: { fontFamily: theme.fonts.bodyBold, fontSize: 12 },
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.week'), tabBarIcon: tabIcon(CalendarBlankIcon) }}
      />
      <Tabs.Screen
        name="courses"
        options={{ title: t('tabs.shopping'), tabBarIcon: tabIcon(BasketIcon) }}
      />
      <Tabs.Screen
        name="recettes"
        options={{ title: t('tabs.recipes'), tabBarIcon: tabIcon(BookOpenIcon) }}
      />
      <Tabs.Screen
        name="famille"
        options={{ title: t('tabs.family'), tabBarIcon: tabIcon(UsersThreeIcon) }}
      />
    </Tabs>
  );
}
