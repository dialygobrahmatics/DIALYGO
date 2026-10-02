import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Button, Card, ErrorState, SkeletonCard } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { fetchDoctorProfile } from '../../services/doctor';
import { useAuth } from '../../store/auth';
import { colors, spacing, type } from '../../theme/tokens';

export default function DoctorProfile() {
  const fetcher = useCallback(() => fetchDoctorProfile(), []);
  const { data, loading, error, reload } = useApi(fetcher);
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const onLogout = async () => {
    setSigningOut(true);
    await signOut();
    router.replace('/auth/login');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="doctor-profile-screen">
      <ScreenHeader title="Profile" subtitle="Your Dialygo clinician account" />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <SkeletonCard lines={3} testID="doctor-profile-skeleton" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} testID="doctor-profile-error" />
        ) : data ? (
          <Card testID="doctor-profile-card">
            {[
              { label: 'Name', value: data.doctor.name },
              { label: 'Specialisation', value: data.doctor.specialization ?? '—' },
              { label: 'Registration', value: data.doctor.registrationNumber ?? '—' },
              { label: 'Mobile', value: `+91 ${data.account.mobileNumber}` },
            ].map((row) => (
              <View key={row.label} style={styles.row}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowValue}>{row.value}</Text>
              </View>
            ))}
          </Card>
        ) : null}
        <Button
          label="Log out"
          variant="danger"
          icon="log-out"
          onPress={onLogout}
          loading={signingOut}
          testID="doctor-logout-button"
          style={{ marginTop: spacing.xl }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  rowLabel: { ...type.small, color: colors.textSecondary },
  rowValue: { ...type.bodyStrong, color: colors.textPrimary, flexShrink: 1, textAlign: 'right' },
});
