import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Field } from '../../components/Field';
import { Button, UnverifiedNote } from '../../components/ui';
import { ApiError } from '../../services/api';
import { registerPatient } from '../../services/patient';
import { useAuth } from '../../store/auth';
import { colors, radius, spacing, type } from '../../theme/tokens';

const GENDERS = ['Male', 'Female', 'Other'];

export default function Register() {
  const { refresh } = useAuth();
  const [name, setName] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Enter your full name.';
    if (!/^\d{12}$/.test(aadhaar)) next.aadhaar = 'Enter your 12-digit Aadhaar number.';
    if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) next.dob = 'Use the format YYYY-MM-DD.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await registerPatient({
        name: name.trim(),
        aadhaar_number: aadhaar,
        date_of_birth: dob || null,
        gender,
      });
      await refresh();
      router.replace('/auth/onboarding-upload');
    } catch (err) {
      setErrors({ form: err instanceof ApiError ? err.message : 'We could not create your profile.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container} testID="register-screen">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>Step 1 of 2</Text>
        <Text style={styles.title}>Welcome to Dialygo</Text>
        <Text style={styles.subtitle}>Let’s create your health profile.</Text>

        <Field
          label="Full name"
          value={name}
          onChangeText={setName}
          placeholder="As printed on your records"
          error={errors.name}
          testID="register-name-input"
        />
        <Field
          label="Aadhaar number"
          value={aadhaar}
          onChangeText={(value) => setAadhaar(value.replace(/\D/g, '').slice(0, 12))}
          placeholder="12-digit Aadhaar number"
          keyboardType="number-pad"
          maxLength={12}
          error={errors.aadhaar}
          hint="Stored only as a secure hash. Dialygo never displays your full Aadhaar number."
          testID="register-aadhaar-input"
        />
        <Field
          label="Date of birth (optional)"
          value={dob}
          onChangeText={setDob}
          placeholder="YYYY-MM-DD"
          error={errors.dob}
          testID="register-dob-input"
        />

        <Text style={styles.label}>Gender (optional)</Text>
        <View style={styles.chips}>
          {GENDERS.map((option) => {
            const active = gender === option;
            return (
              <Pressable
                key={option}
                testID={`register-gender-${option.toLowerCase()}`}
                onPress={() => setGender(active ? null : option)}
                style={[styles.chip, active ? styles.chipActive : null]}
              >
                <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{option}</Text>
              </Pressable>
            );
          })}
        </View>

        {errors.form ? (
          <View style={styles.formError} testID="register-form-error">
            <Feather name="alert-circle" size={14} color={colors.attention} />
            <Text style={styles.formErrorText}>{errors.form}</Text>
          </View>
        ) : null}

        <Button label="Create my profile" onPress={onSubmit} loading={loading} testID="register-submit-button" />
        <UnverifiedNote text="Your Aadhaar is used only to identify your dialysis record. It is stored as an irreversible hash and shown masked." />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingTop: 68, paddingBottom: spacing.xxl },
  eyebrow: { ...type.label, color: colors.saffron },
  title: { ...type.h1, color: colors.textPrimary, marginTop: spacing.sm },
  subtitle: { ...type.body, color: colors.textSecondary, marginTop: 6, marginBottom: spacing.xl },
  label: { ...type.label, color: colors.textSecondary, marginBottom: 8 },
  chips: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { ...type.bodyStrong, color: colors.textSecondary },
  chipTextActive: { color: '#FFFFFF' },
  formError: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.attentionSoft,
    padding: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.lg,
  },
  formErrorText: { ...type.small, color: colors.attention, flex: 1 },
});
