import React from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, type } from '../theme/tokens';

const LOGO_URI = `${process.env.EXPO_PUBLIC_API_URL}/dialygo-logo.png`;

export function BrandLogo({ size = 44, showWordmark = false }: { size?: number; showWordmark?: boolean }) {
  return (
    <View style={styles.row}>
      <View style={[styles.logoBox, { width: size, height: size, borderRadius: size / 4 }]}>
        <Image
          source={{ uri: LOGO_URI }}
          resizeMode="contain"
          style={{ width: size * 0.78, height: size * 0.78 }}
          accessibilityLabel="Dialygo"
        />
      </View>
      {showWordmark ? (
        <View>
          <Text style={styles.wordmark}>Dialygo</Text>
          <Text style={styles.tagline}>Smarter insights for better dialysis</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logoBox: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    ...(Platform.OS === 'web' ? {} : {}),
  },
  wordmark: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.4 },
  tagline: { ...type.small, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
});
