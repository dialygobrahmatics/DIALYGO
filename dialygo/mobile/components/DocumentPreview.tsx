import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getReportFileUrl } from '../services/reports';
import { colors, radius, spacing, type } from '../theme/tokens';

/** Shows the original uploaded document: inline image preview, or an open action for PDFs. */
export function DocumentPreview({ reportId, mimeType }: { reportId: string; mimeType?: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const isImage = (mimeType ?? '').startsWith('image/');

  useEffect(() => {
    getReportFileUrl(reportId).then(setUrl);
  }, [reportId]);

  const open = () => {
    if (!url) return;
    if (Platform.OS === 'web') window.open(url, '_blank');
    else Linking.openURL(url);
  };

  if (!url) {
    return (
      <View style={styles.placeholder} testID="document-preview-loading">
        <ActivityIndicator size="small" color={colors.navy} />
      </View>
    );
  }

  return (
    <View testID="document-preview">
      {isImage && !failed ? (
        <Pressable onPress={open} testID="document-preview-image-button">
          <Image
            source={{ uri: url }}
            style={styles.image}
            resizeMode="contain"
            onError={() => setFailed(true)}
            accessibilityLabel="Uploaded report preview"
          />
        </Pressable>
      ) : (
        <Pressable onPress={open} style={styles.fileTile} testID="document-preview-file-button">
          <View style={styles.fileIcon}>
            <Feather name={isImage ? 'image' : 'file-text'} size={20} color={colors.navy} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fileTitle}>Open original document</Text>
            <Text style={styles.fileMeta}>{mimeType ?? 'Document'}</Text>
          </View>
          <Feather name="external-link" size={17} color={colors.textMuted} />
        </Pressable>
      )}
      <Pressable onPress={open} style={styles.download} testID="document-download-button">
        <Feather name="download" size={14} color={colors.navy} />
        <Text style={styles.downloadText}>Download a copy</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    height: 120,
    borderRadius: radius.md,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: 260, borderRadius: radius.md, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border },
  fileTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileTitle: { ...type.bodyStrong, color: colors.textPrimary },
  fileMeta: { ...type.small, color: colors.textMuted, marginTop: 2 },
  download: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md, alignSelf: 'flex-start' },
  downloadText: { ...type.small, fontWeight: '700', color: colors.navy },
});
