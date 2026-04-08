import { clsx } from "clsx";
import { format, formatDistanceToNowStrict, isBefore, parseISO } from "date-fns";

export function cn(...values: Array<string | false | null | undefined>) {
  return clsx(values);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
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

  const date = parseISO(value);

  if (isBefore(date, new Date())) {
    return "Deadline passed";
  }

  return formatDistanceToNowStrict(date, { addSuffix: true });
}
