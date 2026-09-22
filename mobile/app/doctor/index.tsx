import React, { useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Card, EmptyState, ErrorState, SectionTitle, SkeletonCard } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { fetchDoctorPatients } from '../../services/doctor';
import { colors, radius, spacing, type } from '../../theme/tokens';
import type { PatientProfile } from '../../types';

export default function DoctorHome() {
  const fetcher = useCallback(() => fetchDoctorPatients(), []);
  const { data, loading, refreshing, error, reload, refresh } = useApi<{
    patients: (PatientProfile & { latestReportAt: string | null })[];
  }>(fetcher, { refetchOnFocus: true });

  const patients = data?.patients ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="doctor-home-screen">
      <ScreenHeader title="My practice" subtitle="Patients authorised to your care">
        <Card style={{ marginTop: spacing.lg }} testID="doctor-summary-card">
          <Text style={styles.summaryLabel}>Assigned patients</Text>
          <Text style={styles.summaryValue}>{patients.length}</Text>
          <Text style={styles.summaryMeta}>
            You only see patients explicitly assigned to you. Access is enforced by the Dialygo backend.
          </Text>
        </Card>
      </ScreenHeader>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.navy} />}
      >
        <SectionTitle>Recent activity</SectionTitle>
        {loading ? (
          <SkeletonCard lines={3} testID="doctor-home-skeleton" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} testID="doctor-home-error" />
        ) : patients.length === 0 ? (
          <EmptyState
            icon="users"
            title="No patients assigned yet"
            message="Patients assigned to you by your dialysis centre will appear here."
            testID="doctor-home-empty"
          />
        ) : (
          patients.slice(0, 5).map((patient, index) => (
            <Pressable
              key={patient.id}
              testID={`doctor-activity-${index}`}
              onPress={() => router.push(`/doctor-patient/${patient.id}` as any)}
              style={({ pressed }) => [styles.row, { opacity: pressed ? 0.85 : 1 }]}
            >
              <View style={styles.icon}>
                <Feather name="user" size={16} color={colors.navy} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{patient.name}</Text>
                <Text style={styles.meta}>
                  {patient.latestReportAt
                    ? `Latest report ${new Date(patient.latestReportAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`
                    : 'No reports uploaded yet'}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textMuted} />
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  summaryLabel: { ...type.label, color: colors.textSecondary },
  summaryValue: { fontSize: 30, fontWeight: '800', color: colors.textPrimary, marginTop: 4 },
  summaryMeta: { ...type.small, color: colors.textMuted, marginTop: 4, lineHeight: 17 },
  row: {
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
  icon: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...type.bodyStrong, color: colors.textPrimary },
  meta: { ...type.small, color: colors.textMuted, marginTop: 2 },
});
