import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/contexts/AppContext';
import { Home, Wallet, TrendingUp, BarChart3, Settings } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const { t } = useTranslation();
  // Check if current selected vehicle is income-generating
  // Note: we check selectedVehicle directly instead of scanning all vehicles
  const { selectedVehicle, colorScheme } = useApp();
  const insets = useSafeAreaInsets();
  const showIncomeTab = selectedVehicle?.is_income_generating ?? false;
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#22c55e',
        tabBarInactiveTintColor: isDark ? '#64748b' : '#94a3b8',
        tabBarStyle: {
          backgroundColor: isDark ? '#171717' : '#FFFFFF',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: (Platform.select({ ios: 60, android: 65 }) ?? 65) + insets.bottom,
          paddingTop: 0,
          paddingBottom: Math.max(insets.bottom, 16),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 0.3,
          marginBottom: 4,
        },
        tabBarIconStyle: {
          marginTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('navigation.home'),
          tabBarActiveTintColor: '#f97316',
          tabBarIcon: ({ color, size }) => (
            <Home size={size || 24} color={color} strokeWidth={2.5} />
          ),
        }}
      />

      <Tabs.Screen
        name="expenses"
        options={{
          title: t('navigation.expenses'),
          tabBarActiveTintColor: '#ef4444',
          tabBarIcon: ({ color, size }) => (
            <Wallet size={size || 24} color={color} strokeWidth={2.5} />
          ),
        }}
      />

      <Tabs.Screen
        name="incomes"
        options={{
          title: t('navigation.incomes'),
          href: showIncomeTab ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <TrendingUp size={size || 24} color={color} strokeWidth={2.5} />
          ),
        }}
      />

      <Tabs.Screen
        name="reports"
        options={{
          title: t('navigation.reports'),
          tabBarActiveTintColor: '#3b82f6',
          tabBarIcon: ({ color, size }) => (
            <BarChart3 size={size || 24} color={color} strokeWidth={2.5} />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: t('navigation.settings'),
          tabBarActiveTintColor: '#3b82f6',
          tabBarIcon: ({ color, size }) => (
            <Settings size={size || 24} color={color} strokeWidth={2.5} />
          ),
        }}
      />
    </Tabs>
  );
}
