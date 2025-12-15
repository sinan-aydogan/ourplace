import { Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/contexts/AppContext';
import { Text } from '@/components/ui/text';

export default function TabLayout() {
  const { t } = useTranslation();
  const { userVehicles } = useApp();

  // Check if user has any income-generating vehicle
  const hasIncomeGeneratingVehicle = userVehicles.some(v => v.is_income_generating);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#9ca3af',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('navigation.home'),
          tabBarIcon: ({ color }) => (
            <Text style={{ color }}>🏠</Text>
          ),
        }}
      />
      
      <Tabs.Screen
        name="expenses"
        options={{
          title: t('navigation.expenses'),
          tabBarIcon: ({ color }) => (
            <Text style={{ color }}>💸</Text>
          ),
        }}
      />

      <Tabs.Screen
        name="incomes"
        options={{
          title: t('navigation.incomes'),
          href: hasIncomeGeneratingVehicle ? undefined : null,
          tabBarIcon: ({ color }) => (
            <Text style={{ color }}>💰</Text>
          ),
        }}
      />

      <Tabs.Screen
        name="reports"
        options={{
          title: t('navigation.reports'),
          tabBarIcon: ({ color }) => (
            <Text style={{ color }}>📊</Text>
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: t('navigation.settings'),
          tabBarIcon: ({ color }) => (
            <Text style={{ color }}>⚙️</Text>
          ),
        }}
      />
    </Tabs>
  );
}
