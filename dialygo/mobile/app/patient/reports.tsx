import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ReportRow } from '../../components/ReportRow';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Button, EmptyState, ErrorState, SkeletonCard } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { listReports } from '../../services/reports';
import { colors, radius, spacing, type } from '../../theme/tokens';
import type { ReportSummary } from '../../types';

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'REJECTED', label: 'Rejected' },
];

export default function Reports() {
  const fetcher = useCallback(() => listReports(), []);
  const { data, loading, refreshing, error, reload, refresh } = useApi<{ reports: ReportSummary[] }>(fetcher, {
    refetchOnFocus: true,
  });
  const [filter, setFilter] = useState('ALL');

  const reports = useMemo(() => {
    const all = data?.reports ?? [];
    if (filter === 'ALL') return all;
    if (filter === 'PROCESSING') return all.filter((r) => r.status === 'PROCESSING' || r.status === 'UPLOADED');
    return all.filter((r) => r.status === filter);
  }, [data, filter]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="reports-screen">
      <ScreenHeader title="My reports" subtitle="Medical reports you have shared with Dialygo">
        <Button
          label="Upload report"
          icon="upload"
          onPress={() => router.push('/reports/upload')}
          testID="reports-upload-button"
          style={{ marginTop: spacing.lg }}
        />
      </ScreenHeader>

      <View style={styles.filters}>
        {FILTERS.map((item) => {
          const active = filter === item.key;
          return (
            <Pressable
              key={item.key}
              testID={`reports-filter-${item.key.toLowerCase()}`}
              onPress={() => setFilter(item.key)}
              style={[styles.filter, active ? styles.filterActive : null]}
            >
              <Text style={[styles.filterText, active ? styles.filterTextActive : null]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.navy} />}
      >
        {loading ? (
          <>
            <SkeletonCard lines={1} testID="reports-skeleton" />
            <View style={{ height: spacing.md }} />
            <SkeletonCard lines={1} />
          </>
        ) : error ? (
          <ErrorState message={error} onRetry={reload} testID="reports-error-state" />
        ) : reports.length === 0 ? (
          <EmptyState
            icon="file-plus"
            title={filter === 'ALL' ? 'No reports yet' : 'Nothing in this view'}
            message={
              filter === 'ALL'
                ? 'Upload a lab report, dialysis report or Doppler study to build your Dialygo record.'
                : 'Try a different filter to see your other reports.'
            }
            action={
              filter === 'ALL' ? (
                <Button
                  label="Upload report"
                  icon="upload"
                  onPress={() => router.push('/reports/upload')}
                  testID="reports-empty-upload-button"
                />
              ) : undefined
            }
            testID="reports-empty-state"
          />
        ) : (
          reports.map((report, index) => (
            <ReportRow key={report.id} report={report} testID={`report-row-${index}`} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  filters: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  filter: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  filterText: { ...type.small, fontWeight: '600', color: colors.textSecondary },
  filterTextActive: { color: '#FFFFFF' },
});
