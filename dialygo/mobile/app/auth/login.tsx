import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { BrandLogo } from '../../components/BrandLogo';
import { Field } from '../../components/Field';
import { Button } from '../../components/ui';
import { ApiError } from '../../services/api';
import { useAuth } from '../../store/auth';
import { colors, radius, spacing, type } from '../../theme/tokens';

export default function Login() {
  const { requestOtp } = useAuth();
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onContinue = async () => {
    const digits = mobile.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(digits)) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await requestOtp(digits);
      router.push({ pathname: '/auth/otp', params: { mobile: digits, devOtp: result.devOtp ?? '' } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not send the code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container} testID="login-screen">
      <View style={styles.hero}>
        <BrandLogo size={56} showWordmark />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Welcome to Dialygo</Text>
          <Text style={styles.subtitle}>
            Sign in with your registered mobile number. We will send you a one-time verification code.
          </Text>
          <Field
            label="Mobile number"
            value={mobile}
            onChangeText={(value) => setMobile(value.replace(/\D/g, '').slice(0, 10))}
            placeholder="10-digit mobile number"
            keyboardType="phone-pad"
            maxLength={10}
            error={error}
            hint="Used only to verify your Dialygo account."
            testID="login-mobile-input"
          />
          <Button label="Continue" onPress={onContinue} loading={loading} testID="login-continue-button" />
          <Text style={styles.consent}>
            By continuing you agree that Dialygo may process your dialysis and medical report information to provide
            decision support, in line with the DPDP Act.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  hero: { paddingHorizontal: spacing.xl, paddingTop: 72, paddingBottom: spacing.xxl },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    flexGrow: 1,
  },
  title: { ...type.h1, color: colors.textPrimary },
  subtitle: { ...type.body, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.xl, lineHeight: 21 },
  consent: { ...type.small, color: colors.textMuted, marginTop: spacing.xl, lineHeight: 18 },
});
