import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Button, Card } from '../../components/ui';
import { colors, radius, spacing, type } from '../../theme/tokens';

const ITEMS: { icon: keyof typeof Feather.glyphMap; label: string }[] = [
  { icon: 'file-text', label: 'Previous dialysis reports' },
  { icon: 'activity', label: 'Laboratory reports' },
  { icon: 'radio', label: 'Vascular Doppler studies' },
  { icon: 'clipboard', label: 'Discharge summaries & prescriptions' },
];

export default function OnboardingUpload() {
  return (
    <View style={styles.container} testID="onboarding-upload-screen">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>Step 2 of 2</Text>
        <Text style={styles.title}>Add your previous reports</Text>
        <Text style={styles.subtitle}>
          Upload your earlier dialysis and medical reports so Dialygo can build your history and surface observed
          trends. You can always add more later.
        </Text>

        <Card>
          {ITEMS.map((item) => (
            <View key={item.label} style={styles.row}>
              <View style={styles.icon}>
                <Feather name={item.icon} size={16} color={colors.navy} />
              </View>
              <Text style={styles.rowText}>{item.label}</Text>
            </View>
          ))}
          <Text style={styles.formats}>Supported formats: PDF, JPG, PNG · up to 20 MB each</Text>
        </Card>

        <Button
          label="Upload a report"
          icon="upload"
          onPress={() => router.push({ pathname: '/reports/upload', params: { onboarding: '1' } })}
          testID="onboarding-upload-button"
          style={{ marginTop: spacing.xl }}
        />
        <Button
          label="Skip for now"
          variant="ghost"
          onPress={() => router.replace('/patient')}
          testID="onboarding-skip-button"
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingTop: 68 },
  eyebrow: { ...type.label, color: colors.saffron },
  title: { ...type.h1, color: colors.textPrimary, marginTop: spacing.sm },
  subtitle: { ...type.body, color: colors.textSecondary, marginTop: 6, marginBottom: spacing.xl, lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  icon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { ...type.bodyStrong, color: colors.textPrimary },
  formats: { ...type.small, color: colors.textMuted, marginTop: spacing.xs },
});
