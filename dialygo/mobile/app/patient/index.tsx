import React, { useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ReportRow } from '../../components/ReportRow';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Button, Card, EmptyState, ErrorState, SectionTitle, SkeletonCard, UnverifiedNote } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { fetchDashboard } from '../../services/patient';
import { colors, radius, shadow, spacing, type } from '../../theme/tokens';
import type { Dashboard } from '../../types';

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const formatSessionDate = (value: string) =>
  new Date(value).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });

export default function PatientHome() {
  const fetcher = useCallback(() => fetchDashboard(), []);
  const { data, loading, refreshing, error, reload, refresh } = useApi<Dashboard>(fetcher, { refetchOnFocus: true });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="patient-home-screen">
      <ScreenHeader
        title={`${greeting()}${data ? `, ${data.patient.name.split(' ')[0]}` : ''}`}
        subtitle="Your dialysis overview"
        right={
          <Pressable testID="home-notifications-button" onPress={() => router.push('/notifications')} style={styles.bell}>
            <Feather name="bell" size={18} color="#FFFFFF" />
          </Pressable>
        }
      >
        {data ? (
          <Card style={styles.nextCard} testID="next-session-card">
            <Text style={styles.nextLabel}>Next dialysis</Text>
            {data.nextSession ? (
              <>
                <Text style={styles.nextValue}>{formatSessionDate(data.nextSession.sessionDate)}</Text>
                <Text style={styles.nextMeta}>{data.nextSession.dialysisCenter ?? 'Centre to be confirmed'}</Text>
              </>
            ) : (
              <>
                <Text style={styles.nextValue}>Not scheduled</Text>
                <Text style={styles.nextMeta}>Your next session will appear here once scheduled.</Text>
              </>
            )}
          </Card>
        ) : null}
      </ScreenHeader>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.navy} />}
      >
        {loading ? (
          <>
            <SkeletonCard testID="home-skeleton" />
            <View style={{ height: spacing.md }} />
            <SkeletonCard lines={2} />
          </>
        ) : error ? (
          <ErrorState message={error} onRetry={reload} testID="home-error-state" />
        ) : data ? (
          <>
            <SectionTitle>Clinical overview</SectionTitle>
            {data.clinicalOverview.labs.length === 0 && !data.clinicalOverview.vitals ? (
              <EmptyState
                icon="activity"
                title="No clinical values yet"
                message="Upload a recent lab or dialysis report and Dialygo will pull the readings into your overview."
                action={
                  <Button
                    label="Upload a report"
                    icon="upload"
                    onPress={() => router.push('/reports/upload')}
                    testID="home-empty-upload-button"
                  />
                }
                testID="home-clinical-empty"
              />
            ) : (
              <>
                <View style={styles.metricGrid} testID="clinical-overview-grid">
                  {data.clinicalOverview.labs.slice(0, 4).map((lab) => (
                    <View key={lab.testName} style={styles.metric} testID={`metric-${lab.testName.toLowerCase()}`}>
                      <Text style={styles.metricLabel}>{lab.testName}</Text>
                      <Text style={styles.metricValue}>{lab.value ?? '—'}</Text>
                      <Text style={styles.metricUnit}>{lab.unit ?? ''}</Text>
                    </View>
                  ))}
                  {data.clinicalOverview.vitals?.systolicBp ? (
                    <View style={styles.metric} testID="metric-blood-pressure">
                      <Text style={styles.metricLabel}>Blood pressure</Text>
                      <Text style={styles.metricValue}>
                        {data.clinicalOverview.vitals.systolicBp}/{data.clinicalOverview.vitals.diastolicBp}
                      </Text>
                      <Text style={styles.metricUnit}>mmHg</Text>
                    </View>
                  ) : null}
                </View>
                <UnverifiedNote />
              </>
            )}

            <SectionTitle
              action={
                <Pressable onPress={() => router.push('/patient/reports')} testID="home-view-reports-link">
                  <Text style={styles.link}>View all</Text>
                </Pressable>
              }
            >
              Recent reports
            </SectionTitle>
            {data.recentReports.length === 0 ? (
              <EmptyState
                icon="file-plus"
                title="No reports yet"
                message="Add your previous dialysis or laboratory reports to start building your Dialygo record."
                action={
                  <Button
                    label="Upload report"
                    icon="upload"
                    onPress={() => router.push('/reports/upload')}
                    testID="home-upload-report-button"
                  />
                }
                testID="home-reports-empty"
              />
            ) : (
              data.recentReports.map((report, index) => (
                <ReportRow key={report.id} report={report} testID={`home-report-${index}`} />
              ))
            )}

            <SectionTitle>Dialygo insights</SectionTitle>
            <Pressable onPress={() => router.push('/patient/insights')} testID="home-insights-card">
              <Card style={styles.insightTeaser}>
                <View style={styles.insightIcon}>
                  <Feather name="trending-up" size={18} color={colors.navy} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.insightTitle}>Observed trends from your reports</Text>
                  <Text style={styles.insightMeta}>Review what changed since your last upload</Text>
                </View>
                <Feather name="chevron-right" size={20} color={colors.textMuted} />
              </Card>
            </Pressable>

            <Text style={styles.disclaimer}>
              Dialygo is decision support only and requires qualified clinical review. It does not diagnose.
            </Text>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  bell: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextCard: { marginTop: spacing.lg, borderColor: 'transparent' },
  nextLabel: { ...type.label, color: colors.textSecondary },
  nextValue: { ...type.h2, color: colors.textPrimary, marginTop: 6 },
  nextMeta: { ...type.small, color: colors.textMuted, marginTop: 4 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metric: {
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadow.card,
  },
  metricLabel: { ...type.label, color: colors.textSecondary, fontSize: 10 },
  metricValue: { ...type.metric, color: colors.textPrimary, marginTop: 8 },
  metricUnit: { ...type.small, color: colors.textMuted },
  link: { ...type.bodyStrong, color: colors.saffron },
  insightTeaser: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightTitle: { ...type.bodyStrong, color: colors.textPrimary },
  insightMeta: { ...type.small, color: colors.textMuted, marginTop: 3 },
  disclaimer: { ...type.small, color: colors.textMuted, marginTop: spacing.xl, lineHeight: 18 },
});
