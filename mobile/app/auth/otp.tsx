import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Field } from '../../components/Field';
import { Button } from '../../components/ui';
import { ApiError } from '../../services/api';
import { routeForSession, useAuth } from '../../store/auth';
import { colors, radius, spacing, type } from '../../theme/tokens';

export default function Otp() {
  const params = useLocalSearchParams<{ mobile: string; devOtp?: string }>();
  const mobile = String(params.mobile ?? '');
  const { signIn, requestOtp } = useAuth();
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState(String(params.devOtp ?? ''));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const onVerify = async () => {
    if (otp.length !== 6) {
      setError('Enter the 6-digit code we sent you.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const session = await signIn(mobile, otp);
      router.replace(routeForSession(session) as any);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not verify that code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    setResending(true);
    setError(null);
    try {
      const result = await requestOtp(mobile);
      setDevOtp(result.devOtp ?? '');
      setOtp('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not resend the code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container} testID="otp-screen">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} style={styles.back} testID="otp-back-button">
          <Feather name="chevron-left" size={20} color={colors.navy} />
          <Text style={styles.backText}>Change number</Text>
        </Pressable>
        <Text style={styles.title}>Verify your number</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to <Text style={styles.strong}>+91 {mobile.replace(/^(\d{5})/, 'XXXXX')}</Text>
        </Text>
        {devOtp ? (
          <View style={styles.devBanner} testID="otp-dev-banner">
            <Feather name="info" size={14} color={colors.navy} />
            <Text style={styles.devText}>Development mode — your verification code is {devOtp}</Text>
          </View>
        ) : null}
        <Field
          label="Verification code"
          value={otp}
          onChangeText={(value) => setOtp(value.replace(/\D/g, '').slice(0, 6))}
          placeholder="6-digit code"
          keyboardType="number-pad"
          maxLength={6}
          error={error}
          autoFocus
          testID="otp-input"
        />
        <Button label="Verify & continue" onPress={onVerify} loading={loading} testID="otp-verify-button" />
        <Button
          label={resending ? 'Sending…' : 'Resend code'}
          variant="ghost"
          onPress={onResend}
          loading={resending}
          testID="otp-resend-button"
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingTop: 72 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.xl },
  backText: { ...type.bodyStrong, color: colors.navy },
  title: { ...type.h1, color: colors.textPrimary },
  subtitle: { ...type.body, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.xl },
  strong: { fontWeight: '700', color: colors.textPrimary },
  devBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.sky,
    padding: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.lg,
  },
  devText: { ...type.small, color: colors.navy, flex: 1 },
});
