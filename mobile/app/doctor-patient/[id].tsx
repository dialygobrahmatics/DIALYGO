import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { InsightCard } from '../../components/InsightCard';
import { ReportRow } from '../../components/ReportRow';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Card, EmptyState, ErrorState, SectionTitle, SkeletonCard, UnverifiedNote } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { fetchDoctorPatient } from '../../services/doctor';
import { colors, radius, spacing, type } from '../../theme/tokens';

export default function DoctorPatientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const fetcher = useCallback(() => fetchDoctorPatient(String(id)), [id]);
  const { data, loading, error, reload } = useApi(fetcher);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="doctor-patient-detail-screen">
      <ScreenHeader
        title={data?.patient.name ?? 'Patient'}
        subtitle={data ? [data.patient.age ? `${data.patient.age} years` : null, data.patient.patientIdentifier].filter(Boolean).join(' · ') : undefined}
        back
      />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <SkeletonCard lines={4} testID="doctor-patient-skeleton" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} testID="doctor-patient-error" />
        ) : data ? (
          <>
            <SectionTitle>Clinical overview</SectionTitle>
            <Card testID="doctor-patient-overview">
              {data.clinicalOverview.labs.length === 0 ? (
                <Text style={styles.muted}>No laboratory values recorded yet.</Text>
              ) : (
                data.clinicalOverview.labs.map((lab) => (
                  <View key={lab.testName} style={styles.row}>
                    <Text style={styles.rowLabel}>{lab.testName}</Text>
                    <Text style={styles.rowValue}>
                      {lab.value} {lab.unit}
                    </Text>
                  </View>
                ))
              )}
              <UnverifiedNote />
            </Card>

            <SectionTitle>Medical reports</SectionTitle>
            {data.reports.length === 0 ? (
              <EmptyState icon="file-text" title="No reports" message="This patient has not uploaded any reports yet." testID="doctor-patient-reports-empty" />
            ) : (
              data.reports.map((report, index) => (
                <ReportRow key={report.id} report={report} testID={`doctor-patient-report-${index}`} />
              ))
            )}

            <SectionTitle>Clinical insights</SectionTitle>
            {data.insights.length === 0 ? (
              <EmptyState icon="trending-up" title="No insights" message="Insights appear once reports have been processed." testID="doctor-patient-insights-empty" />
            ) : (
              data.insights.map((insight, index) => (
                <InsightCard key={index} insight={insight} testID={`doctor-patient-insight-${index}`} />
              ))
            )}
          </>
        ) : null}
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
  rowValue: { ...type.bodyStrong, color: colors.textPrimary },
  muted: { ...type.small, color: colors.textMuted },
});
