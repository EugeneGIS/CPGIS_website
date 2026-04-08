import { z } from "zod";

export const submitJobSchema = z.object({
  title: z.string().min(8).max(180),
  organization: z.string().min(3).max(180),
  department: z.string().max(180).optional().default(""),
  summary: z.string().min(24).max(1200),
  description: z.string().max(6000).optional().default(""),
  applicationUrl: z.url(),
  contactEmail: z.email().optional().or(z.literal("")),
  city: z.string().min(2).max(120),
  country: z.string().min(2).max(120),
  address: z.string().max(180).optional().default(""),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  applyBy: z.string().optional().default(""),
  deadlineText: z.string().max(120).optional().default(""),
  tags: z.array(z.string().min(2).max(40)).default([]),
  importSource: z.string().max(120).optional().default("manual-form"),
});

export type SubmitJobInput = z.infer<typeof submitJobSchema>;
