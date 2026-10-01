import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, insightTone, radius, shadow, spacing, type } from '../theme/tokens';
import type { Insight } from '../types';

const ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  ATTENTION: 'alert-triangle',
  MONITOR: 'activity',
  STABLE: 'check-circle',
};

export function InsightCard({ insight, testID }: { insight: Insight; testID?: string }) {
  const tone = insightTone[insight.insight_type] ?? insightTone.MONITOR;
  return (
    <View testID={testID} style={[styles.card, { borderLeftColor: tone.fg }]}>
      <View style={styles.head}>
        <View style={[styles.badge, { backgroundColor: tone.bg }]}>
          <Feather name={ICONS[insight.insight_type] ?? 'activity'} size={13} color={tone.fg} />
          <Text style={[styles.badgeText, { color: tone.fg }]}>{tone.label}</Text>
        </View>
      </View>
      <Text style={styles.title}>{insight.title}</Text>
      <Text style={styles.body}>{insight.insight_text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  title: { ...type.bodyStrong, color: colors.textPrimary, marginTop: spacing.md },
  body: { ...type.small, color: colors.textSecondary, marginTop: 6, lineHeight: 19 },
});
