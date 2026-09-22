import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Card, ErrorState, Pill, SectionTitle, SkeletonCard, UnverifiedNote } from '../../components/ui';
import { ApiError } from '../../services/api';
import { getReportById, getReportOcr } from '../../services/reports';
import { colors, radius, reportStatusTone, spacing, type } from '../../theme/tokens';
import { reportTypeLabel, type OcrResult, type ReportSummary } from '../../types';

const TERMINAL = ['COMPLETED', 'FAILED', 'REJECTED'];

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export default function ReportDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [ocr, setOcr] = useState<OcrResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [detail, ocrResult] = await Promise.all([getReportById(String(id)), getReportOcr(String(id))]);
      setReport(detail.report);
      setOcr(ocrResult);
      setError(null);
      if (!TERMINAL.includes(detail.report.status)) {
        timer.current = setTimeout(load, 2500);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not load this report.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load]);

  const tone = report ? reportStatusTone[report.status] ?? reportStatusTone.UPLOADED : reportStatusTone.UPLOADED;
  const processing = report ? !TERMINAL.includes(report.status) : false;
  const labs = ocr?.extractedFields?.labs ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="report-detail-screen">
      <ScreenHeader
        title={report ? reportTypeLabel(report.reportType) : 'Report'}
        subtitle={report?.fileName ?? undefined}
        back
      />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <SkeletonCard lines={4} testID="report-detail-skeleton" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} testID="report-detail-error" />
        ) : report ? (
          <>
            <Card testID="report-status-card">
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Status</Text>
                <Pill tone={tone} label={tone.label} testID="report-detail-status" />
              </View>
              {processing ? (
                <View style={styles.processing} testID="report-processing-banner">
                  <ActivityIndicator size="small" color={colors.navy} />
                  <Text style={styles.processingText}>Processing your report…</Text>
                </View>
              ) : report.status === 'COMPLETED' ? (
                <Text style={styles.success} testID="report-processed-message">
                  Report processed successfully.
                </Text>
              ) : report.status === 'FAILED' ? (
                <Text style={styles.failure} testID="report-failed-message">
                  {ocr?.error ?? 'We could not read this report. Please upload a clearer copy.'}
                </Text>
              ) : null}
              {[
                { label: 'Report type', value: reportTypeLabel(report.reportType) },
                { label: 'File', value: report.fileName ?? '—' },
                { label: 'Uploaded', value: formatDateTime(report.uploadedAt) },
                { label: 'Processed', value: formatDateTime(report.processedAt) },
              ].map((row) => (
                <View key={row.label} style={styles.row}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <Text style={styles.rowValue} numberOfLines={1}>
                    {row.value}
                  </Text>
                </View>
              ))}
            </Card>

            {labs.length ? (
              <>
                <SectionTitle>Extracted information</SectionTitle>
                <Card testID="report-extracted-card">
                  {labs.map((lab) => (
                    <View key={lab.test_name} style={styles.row}>
                      <Text style={styles.rowLabel}>{lab.test_name}</Text>
                      <Text style={styles.rowValue}>
                        {lab.test_value} {lab.unit}
                      </Text>
                    </View>
                  ))}
                  <UnverifiedNote />
                </Card>
              </>
            ) : null}

            {ocr?.extractedText ? (
              <>
                <SectionTitle>Document text</SectionTitle>
                <Card testID="report-ocr-card">
                  <View style={styles.warning}>
                    <Feather name="alert-triangle" size={13} color={colors.monitor} />
                    <Text style={styles.warningText}>
                      Text read automatically from your document. It is unverified and may contain errors.
                    </Text>
                  </View>
                  <Text style={styles.ocrText} testID="report-ocr-text">
                    {ocr.extractedText}
                  </Text>
                </Card>
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  statusLabel: { ...type.label, color: colors.textSecondary },
  processing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.sky,
    padding: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
  },
  processingText: { ...type.small, color: colors.navy },
  success: { ...type.small, color: colors.stable, marginBottom: spacing.md },
  failure: { ...type.small, color: colors.attention, marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowLabel: { ...type.small, color: colors.textSecondary },
  rowValue: { ...type.bodyStrong, color: colors.textPrimary, flexShrink: 1, textAlign: 'right' },
  warning: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.monitorSoft,
    padding: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
  },
  warningText: { ...type.small, color: '#92400E', flex: 1, lineHeight: 17 },
  ocrText: { ...type.small, color: colors.textSecondary, lineHeight: 19 },
});
