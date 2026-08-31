import { formatDateLabel } from "@/lib/utils";

export interface SocialDraftInput {
  title: string;
  organization: string;
  applicationUrl: string;
  applyBy?: string;
  city?: string;
  country?: string;
}

export interface SocialDrafts {
  facebook: string;
  x: string;
}

const X_LIMIT = 280;

function deadlineLabel(applyBy?: string) {
  return applyBy
    ? `Apply by ${formatDateLabel(applyBy)}`
    : "Open until filled";
}

function placeLabel(input: SocialDraftInput) {
  return [input.city, input.country].filter(Boolean).join(", ");
}

/**
 * Tier-1 social publishing (phase 4.3): staff copy these drafts to Facebook
 * and X manually, then mark the job as posted. The X draft always keeps the
 * application link intact and fits the 280-character limit.
 */
export function buildSocialDrafts(input: SocialDraftInput): SocialDrafts {
  const place = placeLabel(input);
  const url = input.applicationUrl;

  const xBody = [
    `${input.title} — ${input.organization}`,
    place ? `📍 ${place}` : "",
    `${deadlineLabel(input.applyBy)}:`,
  ]
    .filter(Boolean)
    .join(" ");

  const xSuffix = ` ${url}`;
  const budget = X_LIMIT - xSuffix.length;

  const x =
    xBody.length <= budget
      ? xBody + xSuffix
      : `${xBody.slice(0, Math.max(budget - 1, 0)).trimEnd()}…${xSuffix}`;

  const facebook = [
    input.title,
    `${input.organization}${place ? ` (${place})` : ""}`,
    deadlineLabel(input.applyBy),
    `Apply here: ${url}`,
  ].join("\n");

  return { facebook, x };
}
