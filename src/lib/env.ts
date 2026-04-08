export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  geocoderProvider: process.env.GEOCODER_PROVIDER ?? "nominatim",
  geocoderApiKey: process.env.GEOCODER_API_KEY ?? "",
  nominatimEmail: process.env.NOMINATIM_EMAIL ?? "",
};

export function isSupabaseConfigured() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export function hasPremiumGeocoder() {
  return Boolean(env.geocoderApiKey);
}
