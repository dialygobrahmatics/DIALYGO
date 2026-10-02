import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Button, Card, SectionTitle } from '../../components/ui';
import { ApiError } from '../../services/api';
import { uploadReport, type PickedFile } from '../../services/reports';
import { colors, radius, spacing, type } from '../../theme/tokens';
import { REPORT_TYPES } from '../../types';

type Stage = 'select' | 'preview' | 'uploading' | 'done' | 'rejected' | 'error';

const prettySize = (bytes?: number) => (bytes ? `${(bytes / 1024).toFixed(0)} KB` : '');

export default function UploadReport() {
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const [reportType, setReportType] = useState('LAB_REPORT');
  const [file, setFile] = useState<PickedFile | null>(null);
  const [stage, setStage] = useState<Stage>('select');
  const [message, setMessage] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setStage('select');
    setMessage(null);
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    setFile({
      uri: asset.uri,
      name: asset.name ?? 'report.pdf',
      mimeType: asset.mimeType ?? 'application/pdf',
      size: asset.size ?? undefined,
      file: (asset as any).file,
    });
    setStage('preview');
    setMessage(null);
  };

  const pickImage = async (fromCamera: boolean) => {
    if (fromCamera && Platform.OS !== 'web') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setMessage('Camera access is needed to photograph your report.');
        setStage('error');
        return;
      }
    }
    const result = fromCamera && Platform.OS !== 'web'
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ['images'] });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    setFile({
      uri: asset.uri,
      name: asset.fileName ?? `report-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg',
      size: asset.fileSize ?? undefined,
      file: (asset as any).file,
    });
    setStage('preview');
    setMessage(null);
  };

  const submit = async () => {
    if (!file) return;
    setStage('uploading');
    setMessage(null);
    try {
      const result = await uploadReport(file, reportType);
      setReportId(result.report.id);
      setStage('done');
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setMessage(err.message);
        setStage('rejected');
        return;
      }
      setMessage(err instanceof ApiError ? err.message : 'We could not upload your report. Please try again.');
      setStage('error');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="upload-screen">
      <ScreenHeader title="Upload report" subtitle="PDF, JPG or PNG · up to 20 MB" back />
      <ScrollView contentContainerStyle={styles.content}>
        {stage === 'done' ? (
          <Card style={styles.center} testID="upload-success-card">
            <View style={[styles.statusIcon, { backgroundColor: colors.stableSoft }]}>
              <Feather name="check" size={24} color={colors.stable} />
            </View>
            <Text style={styles.statusTitle}>Report uploaded</Text>
            <Text style={styles.statusText}>
              Processing your report… Dialygo is reading the document and will extract the available information.
            </Text>
            <Button
              label="View report status"
              onPress={() => router.replace(`/reports/${reportId}` as any)}
              testID="upload-view-report-button"
              style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}
            />
            <Button
              label={onboarding ? 'Go to my dashboard' : 'Upload another report'}
              variant="secondary"
              onPress={() => (onboarding ? router.replace('/patient') : reset())}
              testID="upload-secondary-action-button"
              style={{ marginTop: spacing.md, alignSelf: 'stretch' }}
            />
          </Card>
        ) : stage === 'rejected' ? (
          <Card style={styles.center} testID="upload-rejected-card">
            <View style={[styles.statusIcon, { backgroundColor: colors.attentionSoft }]}>
              <Feather name="x" size={24} color={colors.attention} />
            </View>
            <Text style={styles.statusTitle}>Document not accepted</Text>
            <Text style={styles.statusText} testID="upload-rejection-message">
              {message}
            </Text>
            <Button
              label="Choose another file"
              onPress={reset}
              testID="upload-retry-button"
              style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}
            />
          </Card>
        ) : (
          <>
            <SectionTitle>Report type</SectionTitle>
            <View style={styles.chips}>
              {REPORT_TYPES.map((item) => {
                const active = reportType === item.value;
                return (
                  <Pressable
                    key={item.value}
                    testID={`upload-type-${item.value.toLowerCase()}`}
                    onPress={() => setReportType(item.value)}
                    style={[styles.chip, active ? styles.chipActive : null]}
                  >
                    <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <SectionTitle>Add your document</SectionTitle>
            <Card>
              {[
                { icon: 'camera' as const, label: 'Take photo', action: () => pickImage(true), testID: 'upload-camera-button' },
                { icon: 'image' as const, label: 'Choose from gallery', action: () => pickImage(false), testID: 'upload-gallery-button' },
                { icon: 'file-text' as const, label: 'Choose PDF or file', action: pickDocument, testID: 'upload-file-button' },
              ].map((option) => (
                <Pressable
                  key={option.label}
                  testID={option.testID}
                  onPress={option.action}
                  style={({ pressed }) => [styles.option, { opacity: pressed ? 0.85 : 1 }]}
                >
                  <View style={styles.optionIcon}>
                    <Feather name={option.icon} size={16} color={colors.navy} />
                  </View>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  <Feather name="chevron-right" size={18} color={colors.textMuted} />
                </Pressable>
              ))}
            </Card>

            {file ? (
              <Card style={{ marginTop: spacing.lg }} testID="upload-preview-card">
                <Text style={styles.previewLabel}>Selected document</Text>
                <View style={styles.previewRow}>
                  <View style={styles.optionIcon}>
                    <Feather name={file.mimeType === 'application/pdf' ? 'file-text' : 'image'} size={16} color={colors.navy} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.previewName} numberOfLines={1} testID="upload-selected-filename">
                      {file.name}
                    </Text>
                    <Text style={styles.previewMeta}>
                      {file.mimeType} {prettySize(file.size)}
                    </Text>
                  </View>
                  <Pressable onPress={reset} testID="upload-clear-button">
                    <Feather name="trash-2" size={17} color={colors.attention} />
                  </Pressable>
                </View>
                <Button
                  label={stage === 'uploading' ? 'Uploading…' : 'Upload report'}
                  icon="upload"
                  onPress={submit}
                  loading={stage === 'uploading'}
                  testID="upload-submit-button"
                  style={{ marginTop: spacing.lg }}
                />
              </Card>
            ) : null}

            {stage === 'error' && message ? (
              <View style={styles.errorBox} testID="upload-error-message">
                <Feather name="alert-circle" size={14} color={colors.attention} />
                <Text style={styles.errorText}>{message}</Text>
              </View>
            ) : null}

            <Text style={styles.footnote}>
              Only medical reports are accepted. Dialygo checks each document before processing it.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { ...type.small, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: '#FFFFFF' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: { ...type.bodyStrong, color: colors.textPrimary, flex: 1 },
  previewLabel: { ...type.label, color: colors.textSecondary, marginBottom: spacing.md },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  previewName: { ...type.bodyStrong, color: colors.textPrimary },
  previewMeta: { ...type.small, color: colors.textMuted, marginTop: 2 },
  center: { alignItems: 'center', paddingVertical: spacing.xxl },
  statusIcon: {
    width: 54,
    height: 54,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  statusTitle: { ...type.h2, color: colors.textPrimary, textAlign: 'center' },
  statusText: { ...type.small, color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  errorBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.attentionSoft,
    padding: spacing.md,
    borderRadius: radius.sm,
    marginTop: spacing.lg,
  },
  errorText: { ...type.small, color: colors.attention, flex: 1 },
  footnote: { ...type.small, color: colors.textMuted, marginTop: spacing.xl, lineHeight: 18 },
});
