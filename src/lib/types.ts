export type JobStatus = "draft" | "pending" | "published" | "archived";

export type UserRole = "public" | "member" | "admin";

export interface JobLocation {
  label: string;
  address?: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface JobRecord {
  id: string;
  slug: string;
  title: string;
  organization: string;
  department?: string;
  summary: string;
  description?: string;
  applicationUrl: string;
  contactEmail?: string;
  applyBy?: string;
  deadlineText: string;
  status: JobStatus;
  sourceDate?: string;
  importSource?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  location: JobLocation;
}

export interface JobFilters {
  query: string;
  limitToViewport: boolean;
  bounds: MapBounds | null;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface DashboardMetrics {
  total: number;
  visible: number;
  cities: number;
  countries: number;
  upcomingDeadlines: number;
}

export interface MonthlyBucket {
  label: string;
  value: number;
}

export interface AddressCandidate {
  label: string;
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

export interface ImportedJobDraft {
  id: string;
  slug: string;
  title: string;
  organization: string;
  applicationUrl: string;
  deadlineText: string;
  applyBy?: string;
  sourceDate?: string;
  rawText: string;
}

export interface SessionContext {
  mode: "demo" | "supabase";
  role: UserRole;
  user: {
    id: string;
    email?: string;
  } | null;
  profileName?: string;
}
