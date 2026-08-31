import { afterEach, describe, expect, it, vi } from "vitest";
import { isDemoImportPreviewEnabled } from "@/lib/env";

describe("DOCX demo preview environment policy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is disabled in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(isDemoImportPreviewEnabled()).toBe(false);
  });

  it.each(["development", "test"])("is enabled in %s", (nodeEnvironment) => {
    vi.stubEnv("NODE_ENV", nodeEnvironment);

    expect(isDemoImportPreviewEnabled()).toBe(true);
  });
});
