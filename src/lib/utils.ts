import { clsx } from "clsx";
import { format, formatDistanceToNowStrict, parseISO } from "date-fns";

export function cn(...values: Array<string | false | null | undefined>) {
  return clsx(values);
}

/**
 * Calendar date in the runtime's local timezone. Deadline policy is date-only:
 * a job stays valid through its deadline day, so no time or UTC conversion is
 * involved anywhere in expiry checks.
 */
export function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function formatDateLabel(value?: string) {
  if (!value) {
    return "Open until filled";
  }

  return format(parseISO(value), "d MMM yyyy");
}

export function formatSourceDate(value?: string) {
  if (!value) {
    return "Unknown source date";
  }

  return format(parseISO(value), "d MMM yyyy");
}

export function formatRelativeDeadline(value?: string) {
  if (!value) {
    return "Rolling deadline";
  }

  const today = toDateKey(new Date());

  if (today > value) {
    return "Deadline passed";
  }

  if (today === value) {
    return "Deadline today";
  }

  return formatDistanceToNowStrict(parseISO(value), { addSuffix: true });
}
