import React, { useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { InsightCard } from '../../components/InsightCard';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Button, EmptyState, ErrorState, SkeletonCard } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { fetchInsights } from '../../services/patient';
import { colors, insightTone, radius, spacing, type } from '../../theme/tokens';
import type { InsightsResponse } from '../../types';

export default function Insights() {
  const fetcher = useCallback(() => fetchInsights(), []);
  const { data, loading, refreshing, error, reload, refresh } = useApi<InsightsResponse>(fetcher, {
    refetchOnFocus: true,
  });

  const counts = data?.counts;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="insights-screen">
      <ScreenHeader title="Clinical insights" subtitle="Observed trends across your uploaded reports">
        {counts ? (
          <View style={styles.counts} testID="insight-counts">
            {[
              { key: 'ATTENTION', value: counts.attention },
              { key: 'MONITOR', value: counts.monitor },
              { key: 'STABLE', value: counts.stable },
            ].map((item) => {
              const tone = insightTone[item.key as keyof typeof insightTone];
              return (
                <View key={item.key} style={styles.countCard} testID={`insight-count-${item.key.toLowerCase()}`}>
                  <Text style={[styles.countValue, { color: tone.fg }]}>{item.value}</Text>
                  <Text style={styles.countLabel}>{tone.label}</Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScreenHeader>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.navy} />}
      >
        {loading ? (
          <>
            <SkeletonCard testID="insights-skeleton" />
            <View style={{ height: spacing.md }} />
            <SkeletonCard lines={2} />
          </>
        ) : error ? (
          <ErrorState message={error} onRetry={reload} testID="insights-error-state" />
        ) : !data || data.insights.length === 0 ? (
          <EmptyState
            icon="trending-up"
            title="No insights yet"
            message="Dialygo generates insights once your reports have been processed. Upload a recent report to begin."
            action={
              <Button
                label="Upload report"
                icon="upload"
                onPress={() => router.push('/reports/upload')}
                testID="insights-empty-upload-button"
              />
            }
            testID="insights-empty-state"
          />
        ) : (
          <>
            {data.insights.map((insight, index) => (
              <InsightCard key={`${insight.title}-${index}`} insight={insight} testID={`insight-card-${index}`} />
            ))}
            <Text style={styles.disclaimer} testID="insights-disclaimer">
              {data.disclaimer}
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  counts: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  countCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  countValue: { fontSize: 22, fontWeight: '800' },
  countLabel: { ...type.small, color: colors.textSecondary, marginTop: 2 },
  disclaimer: { ...type.small, color: colors.textMuted, marginTop: spacing.lg, lineHeight: 18 },
});
