import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius, shadow, spacing, type } from '../theme/tokens';

export function Card({ children, style, testID }: { children: React.ReactNode; style?: ViewStyle; testID?: string }) {
  return (
    <View testID={testID} style={[styles.card, style]}>
      {children}
    </View>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {action}
    </View>
  );
}

export function Pill({ tone, label, testID }: { tone: { fg: string; bg: string }; label: string; testID?: string }) {
  return (
    <View testID={testID} style={[styles.pill, { backgroundColor: tone.bg }]}>
      <Text style={[styles.pillText, { color: tone.fg }]}>{label}</Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  icon,
  testID,
  style,
}: {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: keyof typeof Feather.glyphMap;
  testID?: string;
  style?: ViewStyle;
}) {
  const inactive = disabled || loading;
  const palette = {
    primary: { bg: colors.saffron, fg: '#FFFFFF', border: colors.saffron },
    secondary: { bg: colors.surface, fg: colors.navy, border: colors.border },
    ghost: { bg: 'transparent', fg: colors.navy, border: 'transparent' },
    danger: { bg: colors.attentionSoft, fg: colors.attention, border: '#FECACA' },
  }[variant];

  return (
    <Pressable
      testID={testID}
      onPress={inactive ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: inactive ? 0.55 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} size="small" />
      ) : (
        <View style={styles.buttonInner}>
          {icon ? <Feather name={icon} size={16} color={palette.fg} /> : null}
          <Text style={[styles.buttonText, { color: palette.fg }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function EmptyState({
  icon = 'inbox',
  title,
  message,
  action,
  testID,
}: {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  message: string;
  action?: React.ReactNode;
  testID?: string;
}) {
  return (
    <Card testID={testID} style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Feather name={icon} size={22} color={colors.navy} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {action ? <View style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}>{action}</View> : null}
    </Card>
  );
}

export function ErrorState({ message, onRetry, testID }: { message: string; onRetry?: () => void; testID?: string }) {
  return (
    <Card testID={testID} style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.attentionSoft }]}>
        <Feather name="wifi-off" size={22} color={colors.attention} />
      </View>
      <Text style={styles.emptyTitle}>Something needs attention</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {onRetry ? (
        <View style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}>
          <Button label="Try again" icon="refresh-cw" onPress={onRetry} testID="retry-button" />
        </View>
      ) : null}
    </Card>
  );
}

export function Skeleton({ height = 16, width = '100%', style }: { height?: number; width?: any; style?: ViewStyle }) {
  return <View style={[{ height, width, backgroundColor: '#E8EDF3', borderRadius: radius.sm }, style]} />;
}

export function SkeletonCard({ lines = 3, testID }: { lines?: number; testID?: string }) {
  return (
    <Card testID={testID}>
      <Skeleton height={14} width="45%" />
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} height={12} width={index % 2 ? '70%' : '90%'} style={{ marginTop: spacing.md }} />
      ))}
    </Card>
  );
}

export function UnverifiedNote({ text }: { text?: string }) {
  return (
    <View style={styles.note}>
      <Feather name="alert-circle" size={13} color={colors.navy} />
      <Text style={styles.noteText}>
        {text ??
          'Values are read from your uploaded reports and are unverified. Always confirm with your treating clinician.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadow.card,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.xl,
  },
  sectionTitle: { ...type.h3, color: colors.textPrimary },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
  pillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  button: {
    minHeight: 50,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  buttonText: { fontSize: 15, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: { ...type.h3, color: colors.textPrimary, textAlign: 'center' },
  emptyMessage: { ...type.small, color: colors.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  note: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.sky,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  noteText: { ...type.small, color: colors.navy, flex: 1, lineHeight: 17 },
});
