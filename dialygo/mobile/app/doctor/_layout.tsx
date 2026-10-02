import React from 'react';
import { Tabs } from 'expo-router';
import { DialygoTabBar } from '../../components/TabBar';
import { colors } from '../../theme/tokens';

const ITEMS = [
  { name: 'index', label: 'Home', icon: 'home' as const },
  { name: 'patients', label: 'Patients', icon: 'users' as const },
  { name: 'profile', label: 'Profile', icon: 'user' as const },
];

export default function DoctorLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
      tabBar={(props) => <DialygoTabBar {...props} prefix="doctor" items={ITEMS} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="patients" options={{ title: 'Patients' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
