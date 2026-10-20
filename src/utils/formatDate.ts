import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";

export function formatDate(date: Date | string | number | undefined | null, pattern = "MMM dd, yyyy"): string {
  if (!date) return "-";
  const d = typeof date === "string" ? parseISO(date) : new Date(date);
  if (isNaN(d.getTime())) return "-";
  return format(d, pattern);
}

export function formatDateTime(date: Date | string | number | undefined | null): string {
  return formatDate(date, "MMM dd, yyyy · hh:mm a");
}

export function getMonthDateRange(targetDate: Date = new Date()) {
  const startDate = startOfMonth(targetDate);
  const endDate = endOfMonth(targetDate);
  return { startDate, endDate };
}
