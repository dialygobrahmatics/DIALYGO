import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Button, Card, ErrorState, SectionTitle, SkeletonCard } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { fetchProfile } from '../../services/patient';
import { useAuth } from '../../store/auth';
import { colors, radius, spacing, type } from '../../theme/tokens';
import type { PatientProfile } from '../../types';

type ProfileResponse = {
  patient: PatientProfile;
  account: { mobileNumber: string; userType: string; lastLoginAt: string | null };
};

const MENU: { icon: keyof typeof Feather.glyphMap; label: string; description: string; route?: string }[] = [
  { icon: 'edit-3', label: 'Edit profile', description: 'Update your name, date of birth and gender', route: '/edit-profile' },
  { icon: 'bell', label: 'Notification settings', description: 'Report processing and session reminders', route: '/notifications' },
  { icon: 'shield', label: 'Privacy & security', description: 'How Dialygo protects your health data', route: '/privacy' },
];

export default function Profile() {
  const fetcher = useCallback(() => fetchProfile(), []);
  const { data, loading, refreshing, error, reload, refresh } = useApi<ProfileResponse>(fetcher, {
    refetchOnFocus: true,
  });
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const onLogout = async () => {
    setSigningOut(true);
    await signOut();
    router.replace('/auth/login');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="profile-screen">
      <ScreenHeader title="Profile" subtitle="Your Dialygo account">
        {data ? (
          <Card style={{ marginTop: spacing.lg }} testID="profile-identity-card">
            <View style={styles.identity}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {data.patient.name
                    .split(' ')
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join('')}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} testID="profile-name">
                  {data.patient.name}
                </Text>
                <Text style={styles.meta}>
                  {[data.patient.age ? `${data.patient.age} years` : null, data.patient.gender]
                    .filter(Boolean)
                    .join(' · ') || 'Patient'}
                </Text>
              </View>
            </View>
          </Card>
        ) : null}
      </ScreenHeader>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.navy} />}
      >
        {loading ? (
          <SkeletonCard lines={4} testID="profile-skeleton" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} testID="profile-error-state" />
        ) : data ? (
          <>
            <SectionTitle>Account information</SectionTitle>
            <Card testID="profile-account-card">
              {[
                { label: 'Patient ID', value: data.patient.patientIdentifier },
                { label: 'Aadhaar', value: data.patient.aadhaarMasked },
                { label: 'Mobile', value: `+91 ${data.account.mobileNumber}` },
                { label: 'Date of birth', value: data.patient.dateOfBirth ?? 'Not added' },
              ].map((row) => (
                <View key={row.label} style={styles.row}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <Text style={styles.rowValue}>{row.value}</Text>
                </View>
              ))}
              <Text style={styles.note}>
                Your Aadhaar number is stored only as a secure hash and is always displayed masked.
              </Text>
            </Card>

            <SectionTitle>Settings</SectionTitle>
            {MENU.map((item) => (
              <Pressable
                key={item.label}
                testID={`profile-menu-${item.label.toLowerCase().replace(/[^a-z]+/g, '-')}`}
                onPress={() => item.route && router.push(item.route as any)}
                style={({ pressed }) => [styles.menuRow, { opacity: pressed ? 0.85 : 1 }]}
              >
                <View style={styles.menuIcon}>
                  <Feather name={item.icon} size={16} color={colors.navy} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuDescription}>{item.description}</Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.textMuted} />
              </Pressable>
            ))}

            <Button
              label="Log out"
              variant="danger"
              icon="log-out"
              onPress={onLogout}
              loading={signingOut}
              testID="profile-logout-button"
              style={{ marginTop: spacing.xl }}
            />
            <Text style={styles.version}>Dialygo Mobile · Phase 1 · Decision support only</Text>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...type.h3, color: colors.navy },
  name: { ...type.h2, color: colors.textPrimary },
  meta: { ...type.small, color: colors.textSecondary, marginTop: 3 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  rowLabel: { ...type.small, color: colors.textSecondary },
  rowValue: { ...type.bodyStrong, color: colors.textPrimary, flexShrink: 1, textAlign: 'right' },
  note: { ...type.small, color: colors.textMuted, marginTop: spacing.md, lineHeight: 17 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { ...type.bodyStrong, color: colors.textPrimary },
  menuDescription: { ...type.small, color: colors.textMuted, marginTop: 2 },
  version: { ...type.small, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
});
