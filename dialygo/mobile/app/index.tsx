import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { BrandLogo } from '../components/BrandLogo';
import { routeForSession, useAuth } from '../store/auth';
import { colors, spacing, type } from '../theme/tokens';

/** Splash screen: Dialygo branding while the stored session is validated. */
export default function Splash() {
  const { booting, session } = useAuth();

  useEffect(() => {
    if (booting) return;
    const timer = setTimeout(() => router.replace(routeForSession(session) as any), 600);
    return () => clearTimeout(timer);
  }, [booting, session]);

  return (
    <View style={styles.container} testID="splash-screen">
      <BrandLogo size={84} />
      <Text style={styles.name}>Dialygo</Text>
      <Text style={styles.tagline}>Smarter insights for better dialysis</Text>
      <ActivityIndicator color={colors.saffron} style={{ marginTop: spacing.xxl }} testID="splash-loader" />
      <Text style={styles.footer}>Decision support only · Requires qualified clinical review</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  name: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', marginTop: spacing.xl, letterSpacing: -0.8 },
  tagline: { ...type.body, color: 'rgba(255,255,255,0.78)', marginTop: 6 },
  footer: {
    ...type.small,
    color: 'rgba(255,255,255,0.5)',
    position: 'absolute',
    bottom: spacing.xxl,
    textAlign: 'center',
  },
});
