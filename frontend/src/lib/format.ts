// Display formatting helpers.

/** "9876543210" -> "+91 98765 43210"; anything that is not 10 digits is returned unchanged. */
export function formatMobile(mobile: string): string {
  return /^\d{10}$/.test(mobile) ? `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}` : mobile;
}

/** ISO timestamp -> local date and time; null/invalid -> null. */
export function formatDateTime(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
}
