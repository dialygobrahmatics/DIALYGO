import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '../components/ScreenHeader';
import { Card } from '../components/ui';
import { colors, spacing, type } from '../theme/tokens';

const POINTS = [
  'Your Aadhaar number is never stored in readable form — only an irreversible hash is kept, and it is always displayed masked.',
  'Your reports and clinical values are visible only to you and to clinicians explicitly authorised to your record.',
  'Every login, upload, report view and profile change is recorded in an audit trail.',
  'Information extracted from reports is unverified and is presented as decision support only.',
  'The Dialygo app communicates only with the Dialygo secure API over HTTPS and never connects directly to a database.',
];

export default function Privacy() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="privacy-screen">
      <ScreenHeader title="Privacy & security" subtitle="How your health data is protected" back />
      <ScrollView contentContainerStyle={styles.content}>
        <Card testID="privacy-card">
          {POINTS.map((point, index) => (
            <View key={index} style={styles.row}>
              <View style={styles.dot} />
              <Text style={styles.text}>{point}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.saffron, marginTop: 7 },
  text: { ...type.small, color: colors.textSecondary, flex: 1, lineHeight: 20 },
});
