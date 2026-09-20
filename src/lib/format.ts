import { format, formatDistanceToNow, parseISO } from "date-fns";

/**
 * Format date for display in standard Kenyan institutional format:
 * e.g. "Friday 18 September 2026"
 */
export function formatDate(date: Date | string | number): string {
  const d = typeof date === "string" ? parseISO(date) : new Date(date);
  if (isNaN(d.getTime())) return "—";
  return format(d, "EEEE d MMMM yyyy");
}

/**
 * Format short date for tables and dense displays:
 * e.g. "18 Sep 2026"
 */
export function formatShortDate(date: Date | string | number): string {
  const d = typeof date === "string" ? parseISO(date) : new Date(date);
  if (isNaN(d.getTime())) return "—";
  return format(d, "d MMM yyyy");
}

/**
 * Format datetime for bus booking and audit logs:
 * e.g. "18 Sep 2026, 08:30 AM"
 */
export function formatDateTime(date: Date | string | number): string {
  const d = typeof date === "string" ? parseISO(date) : new Date(date);
  if (isNaN(d.getTime())) return "—";
  return format(d, "d MMM yyyy, hh:mm a");
}

/**
 * Format relative time for feeds and notification lists:
 * e.g. "2 hours ago"
 */
export function formatRelativeTime(date: Date | string | number): string {
  const d = typeof date === "string" ? parseISO(date) : new Date(date);
  if (isNaN(d.getTime())) return "—";
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Format Kenyan Shillings with KES prefix and thousands comma:
 * e.g. "KES 24,500"
 */
export function formatKES(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return "KES 0";
  return `KES ${Math.round(amount).toLocaleString("en-KE")}`;
}

/**
 * Normalize Kenyan phone number to international format:
 * e.g. "0712345678" -> "+254712345678"
 */
export function normalizeKenyanPhone(phone: string): string {
  const cleaned = phone.replace(/[^0-9+]/g, "");
  if (cleaned.startsWith("+254")) {
    return cleaned;
  }
  if (cleaned.startsWith("254")) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith("0")) {
    return `+254${cleaned.slice(1)}`;
  }
  if (cleaned.length === 9) {
    return `+254${cleaned}`;
  }
  return cleaned;
}

/**
 * Display format for Kenyan phone:
 * e.g. "+254 712 345 678"
 */
export function formatPhoneDisplay(phone: string): string {
  const norm = normalizeKenyanPhone(phone);
  if (norm.startsWith("+254") && norm.length === 13) {
    return `+254 ${norm.slice(4, 7)} ${norm.slice(7, 10)} ${norm.slice(10)}`;
  }
  return phone;
}
