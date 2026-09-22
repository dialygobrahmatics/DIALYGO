import { Platform } from 'react-native';
import { request } from './api';
import { readToken } from './storage';
import type { OcrResult, ReportSummary } from '../types';

export type PickedFile = { uri: string; name: string; mimeType: string; size?: number; file?: any };

export const listReports = () => request<{ reports: ReportSummary[] }>('/reports');

export const getReport = () => request<{ report: ReportSummary; fileMetadata: any }>('/reports');

export const getReportById = (id: string) =>
  request<{ report: ReportSummary; fileMetadata: any }>(`/reports/${id}`);

export const getReportOcr = (id: string) => request<OcrResult>(`/reports/${id}/ocr`);

/** Authenticated file URL. The token is passed as ?auth= because <Image>/viewers cannot send headers. */
export async function getReportFileUrl(id: string) {
  const token = await readToken();
  return `${process.env.EXPO_PUBLIC_API_URL}/api/reports/${id}/file?auth=${encodeURIComponent(token ?? '')}`;
}

export async function uploadReport(file: PickedFile, reportType: string) {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = file.file ?? (await (await fetch(file.uri)).blob());
    form.append('file', blob, file.name);
  } else {
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as any);
  }
  form.append('report_type', reportType);
  return request<{ report: ReportSummary; documentId: string; status: string }>('/reports/upload', {
    method: 'POST',
    form,
  });
}
