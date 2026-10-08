import { PUBLIC_APP_URL } from "@/lib/job-share";

export const env = {
  appUrl:
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.NODE_ENV === "production" ? PUBLIC_APP_URL : "http://localhost:3000"),
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey:
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  geocoderProvider: process.env.GEOCODER_PROVIDER ?? "nominatim",
  geocoderApiKey: process.env.GEOCODER_API_KEY ?? "",
  nominatimEmail: process.env.NOMINATIM_EMAIL ?? "",
};

export function isSupabaseConfigured() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export function isDemoImportPreviewEnabled() {
  return process.env.NODE_ENV !== "production";
}

export function hasPremiumGeocoder() {
  return Boolean(env.geocoderApiKey);
}
