import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { EmptyState, ErrorState, SkeletonCard } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { fetchDoctorPatients } from '../../services/doctor';
import { colors, radius, spacing, type } from '../../theme/tokens';
import type { PatientProfile } from '../../types';

export default function DoctorPatients() {
  const fetcher = useCallback(() => fetchDoctorPatients(), []);
  const { data, loading, refreshing, error, reload, refresh } = useApi<{
    patients: (PatientProfile & { latestReportAt: string | null })[];
  }>(fetcher, { refetchOnFocus: true });
  const [query, setQuery] = useState('');

  const patients = useMemo(() => {
    const all = data?.patients ?? [];
    const term = query.trim().toLowerCase();
    if (!term) return all;
    return all.filter((p) => p.name.toLowerCase().includes(term) || p.patientIdentifier.toLowerCase().includes(term));
  }, [data, query]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="doctor-patients-screen">
      <ScreenHeader title="My patients" subtitle="Authorised patient records">
        <View style={styles.search}>
          <Feather name="search" size={16} color={colors.textMuted} />
          <TextInput
            testID="doctor-patient-search-input"
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name or patient ID"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>
      </ScreenHeader>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.navy} />}
      >
        {loading ? (
          <SkeletonCard lines={3} testID="doctor-patients-skeleton" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} testID="doctor-patients-error" />
        ) : patients.length === 0 ? (
          <EmptyState
            icon="users"
            title={query ? 'No matching patients' : 'No patients assigned yet'}
            message={query ? 'Try a different name or patient ID.' : 'Assigned patients will appear here.'}
            testID="doctor-patients-empty"
          />
        ) : (
          patients.map((patient, index) => (
            <Pressable
              key={patient.id}
              testID={`doctor-patient-row-${index}`}
              onPress={() => router.push(`/doctor-patient/${patient.id}` as any)}
              style={({ pressed }) => [styles.row, { opacity: pressed ? 0.85 : 1 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{patient.name}</Text>
                <Text style={styles.meta}>
                  {[patient.age ? `${patient.age} years` : null, patient.patientIdentifier].filter(Boolean).join(' · ')}
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
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    minHeight: 46,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  name: { ...type.bodyStrong, color: colors.textPrimary },
  meta: { ...type.small, color: colors.textMuted, marginTop: 3 },
});
