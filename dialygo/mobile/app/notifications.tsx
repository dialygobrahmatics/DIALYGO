import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ScreenHeader } from '../components/ScreenHeader';
import { Card, EmptyState } from '../components/ui';
import { colors, radius, spacing, type } from '../theme/tokens';

const CHANNELS: { icon: keyof typeof Feather.glyphMap; label: string; description: string }[] = [
  { icon: 'check-circle', label: 'Report processing completed', description: 'When a report finishes processing' },
  { icon: 'trending-up', label: 'New clinical insight', description: 'When Dialygo observes a new trend' },
  { icon: 'calendar', label: 'Dialysis reminders', description: 'Ahead of a scheduled session' },
];

export default function Notifications() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="notifications-screen">
      <ScreenHeader title="Notifications" subtitle="Alerts about your reports and sessions" back />
      <ScrollView contentContainerStyle={styles.content}>
        <EmptyState
          icon="bell"
          title="No notifications yet"
          message="You will see updates here when a report finishes processing or a new insight becomes available."
          testID="notifications-empty-state"
        />
        <Text style={styles.section}>Alerts Dialygo will send</Text>
        <Card testID="notification-channels-card">
          {CHANNELS.map((item) => (
            <View key={item.label} style={styles.row}>
              <View style={styles.icon}>
                <Feather name={item.icon} size={15} color={colors.navy} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.description}>{item.description}</Text>
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  section: { ...type.h3, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  icon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...type.bodyStrong, color: colors.textPrimary },
  description: { ...type.small, color: colors.textMuted, marginTop: 2 },
});
