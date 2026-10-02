import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Field } from '../components/Field';
import { ScreenHeader } from '../components/ScreenHeader';
import { Button, SkeletonCard } from '../components/ui';
import { ApiError } from '../services/api';
import { fetchProfile, updateProfile } from '../services/patient';
import { colors, radius, spacing, type } from '../theme/tokens';

export default function EditProfile() {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchProfile();
        setName(data.patient.name);
        setDob(data.patient.dateOfBirth ?? '');
        setGender(data.patient.gender ?? '');
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'We could not load your profile.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onSave = useCallback(async () => {
    if (name.trim().length < 2) {
      setError('Enter your full name.');
      return;
    }
    if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      setError('Use the date format YYYY-MM-DD.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), date_of_birth: dob || null, gender: gender || null });
      setMessage('Your profile has been updated.');
      setTimeout(() => router.back(), 700);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not save your changes.');
    } finally {
      setSaving(false);
    }
  }, [name, dob, gender]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="edit-profile-screen">
      <ScreenHeader title="Edit profile" subtitle="Keep your details up to date" back />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {loading ? (
          <SkeletonCard lines={3} testID="edit-profile-skeleton" />
        ) : (
          <>
            <Field label="Full name" value={name} onChangeText={setName} testID="edit-name-input" />
            <Field
              label="Date of birth"
              value={dob}
              onChangeText={setDob}
              placeholder="YYYY-MM-DD"
              testID="edit-dob-input"
            />
            <Field label="Gender" value={gender} onChangeText={setGender} placeholder="Male / Female / Other" testID="edit-gender-input" />
            {error ? (
              <Text style={styles.error} testID="edit-profile-error">
                {error}
              </Text>
            ) : null}
            {message ? (
              <Text style={styles.success} testID="edit-profile-success">
                {message}
              </Text>
            ) : null}
            <Button label="Save changes" onPress={onSave} loading={saving} testID="edit-profile-save-button" />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  error: { ...type.small, color: colors.attention, marginBottom: spacing.md },
  success: { ...type.small, color: colors.stable, marginBottom: spacing.md },
});
