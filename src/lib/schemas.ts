import { z } from "zod";

const ISO_CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidOptionalIsoCalendarDate(value: string) {
  if (value === "") {
    return true;
  }

  const match = ISO_CALENDAR_DATE.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < 1 || month < 1 || month > 12) {
    return false;
  }

  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  return day >= 1 && day <= daysInMonth[month - 1];
}

const optionalIsoCalendarDateSchema = z.string().refine(
  isValidOptionalIsoCalendarDate,
  "Apply-by date must be empty or a real date in YYYY-MM-DD format.",
);

export const submitJobSchema = z.object({
  title: z.string().min(8).max(180),
  organization: z.string().min(3).max(180),
  department: z.string().max(180).optional().default(""),
  summary: z.string().min(24).max(1200),
  description: z.string().max(6000).optional().default(""),
  applicationUrl: z.httpUrl({
    error: "Application URL must be a valid HTTP or HTTPS URL.",
  }),
  contactEmail: z.email().optional().or(z.literal("")),
  city: z.string().min(2).max(120),
  country: z.string().min(2).max(120),
  address: z.string().max(180).optional().default(""),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  applyBy: optionalIsoCalendarDateSchema.optional().default(""),
  deadlineText: z.string().max(120).optional().default(""),
  tags: z.array(z.string().min(2).max(40)).default([]),
  importSource: z.string().max(120).optional().default("paste-extract"),
  status: z.enum(["draft", "pending"]).optional().default("pending"),
});

export type SubmitJobInput = z.infer<typeof submitJobSchema>;
