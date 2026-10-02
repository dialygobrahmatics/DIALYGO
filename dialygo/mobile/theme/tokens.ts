/** Dialygo mobile design tokens — derived from the existing Dialygo web brand. */
export const colors = {
  navy: '#0A3D62',
  navyDeep: '#072D49',
  navySoft: '#14507C',
  saffron: '#E48404',
  saffronSoft: '#FDF1E0',
  sky: '#DBEAFE',
  bg: '#F5F7FA',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  attention: '#DC2626',
  attentionSoft: '#FEF2F2',
  monitor: '#F59E0B',
  monitorSoft: '#FFFBEB',
  stable: '#10B981',
  stableSoft: '#ECFDF5',
  info: '#2563EB',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 8, md: 14, lg: 20, pill: 999 };

export const type = {
  h1: { fontSize: 26, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2: { fontSize: 19, fontWeight: '700' as const, letterSpacing: -0.2 },
  h3: { fontSize: 16, fontWeight: '700' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  bodyStrong: { fontSize: 14, fontWeight: '600' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
  label: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.2, textTransform: 'uppercase' as const },
  metric: { fontSize: 22, fontWeight: '800' as const },
};

export const shadow = {
  card: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
};

export const insightTone = {
  ATTENTION: { fg: colors.attention, bg: colors.attentionSoft, label: 'Attention' },
  MONITOR: { fg: colors.monitor, bg: colors.monitorSoft, label: 'Monitor' },
  STABLE: { fg: colors.stable, bg: colors.stableSoft, label: 'Stable' },
};

export const reportStatusTone: Record<string, { fg: string; bg: string; label: string }> = {
  UPLOADED: { fg: colors.info, bg: colors.sky, label: 'Uploaded' },
  PROCESSING: { fg: colors.monitor, bg: colors.monitorSoft, label: 'Processing' },
  COMPLETED: { fg: colors.stable, bg: colors.stableSoft, label: 'Completed' },
  FAILED: { fg: colors.attention, bg: colors.attentionSoft, label: 'Failed' },
  REJECTED: { fg: colors.attention, bg: colors.attentionSoft, label: 'Rejected' },
  QUEUED: { fg: colors.info, bg: colors.sky, label: 'Queued' },
};
