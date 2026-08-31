import { cache } from "react";
import { getJobBySlug } from "@/lib/jobs";

/**
 * `generateMetadata` and the page render share one lookup in a request.
 * The Open Graph image is a separate HTTP request and therefore has its own cache.
 */
export const getJobPageData = cache(getJobBySlug);
