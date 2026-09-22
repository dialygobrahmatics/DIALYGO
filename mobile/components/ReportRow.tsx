import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, radius, shadow, spacing, type } from '../theme/tokens';
import { Pill } from './ui';
import { reportStatusTone } from '../theme/tokens';
import { reportTypeLabel, type ReportSummary } from '../types';

const formatDate = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export function ReportRow({ report, testID }: { report: ReportSummary; testID?: string }) {
  const tone = reportStatusTone[report.status] ?? reportStatusTone.UPLOADED;
  const disabled = report.status === 'REJECTED';
  return (
    <Pressable
      testID={testID}
      onPress={disabled ? undefined : () => router.push(`/reports/${report.id}`)}
      style={({ pressed }) => [styles.row, { opacity: pressed && !disabled ? 0.85 : 1 }]}
    >
      <View style={styles.icon}>
        <Feather name={report.fileType === 'application/pdf' ? 'file-text' : 'image'} size={18} color={colors.navy} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>
          {reportTypeLabel(report.reportType)}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {report.fileName ?? 'Document'} · {formatDate(report.uploadedAt)}
        </Text>
      </View>
      <Pill tone={tone} label={tone.label} testID={`${testID}-status`} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
    ...shadow.card,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...type.bodyStrong, color: colors.textPrimary },
  meta: { ...type.small, color: colors.textMuted, marginTop: 3 },
});
