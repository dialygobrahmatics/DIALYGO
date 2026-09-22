import React from 'react';
import { Tabs } from 'expo-router';
import { DialygoTabBar } from '../../components/TabBar';
import { colors } from '../../theme/tokens';

const ITEMS = [
  { name: 'index', label: 'Home', icon: 'home' as const },
  { name: 'reports', label: 'Reports', icon: 'file-text' as const },
  { name: 'insights', label: 'Insights', icon: 'trending-up' as const },
  { name: 'profile', label: 'Profile', icon: 'user' as const },
];

export default function PatientLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
      tabBar={(props) => (
        <DialygoTabBar
          {...props}
          prefix="patient"
          items={ITEMS}
          fab={{ icon: 'upload', route: '/reports/upload', testID: 'tab-upload-button', label: 'Upload' }}
        />
      )}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports' }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
