import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, radius, spacing, type } from '../theme/tokens';

/** Navy app header with the curved lower edge used across the Dialygo mobile screens. */
export function ScreenHeader({
  title,
  subtitle,
  right,
  back,
  children,
  testID,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  back?: boolean;
  children?: React.ReactNode;
  testID?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View testID={testID} style={[styles.header, { paddingTop: Math.max(insets.top, 14) + spacing.md }]}>
      <View style={styles.topRow}>
        {back ? (
          <Pressable testID="header-back-button" onPress={() => router.back()} style={styles.backButton}>
            <Feather name="chevron-left" size={22} color="#FFFFFF" />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.navy,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 19, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  subtitle: { ...type.small, color: 'rgba(255,255,255,0.72)', marginTop: 2 },
});
