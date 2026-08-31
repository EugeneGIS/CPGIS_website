import { beforeEach, describe, expect, it, vi } from "vitest";

const importEnvironment = vi.hoisted(() => ({
  demoPreviewEnabled: false,
  supabaseConfigured: false,
}));
const getSessionContext = vi.hoisted(() => vi.fn());
const extractRawText = vi.hoisted(() => vi.fn());

vi.mock("@/lib/env", () => ({
  isSupabaseConfigured: () => importEnvironment.supabaseConfigured,
  isDemoImportPreviewEnabled: () => importEnvironment.demoPreviewEnabled,
}));

vi.mock("@/lib/auth", () => ({ getSessionContext }));

vi.mock("mammoth", () => ({
  default: { extractRawText },
}));

import { POST } from "@/app/api/import/docx/route";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const ZIP_BYTES = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00]);

function uploadRequest(file: File) {
  const body = new FormData();
  body.set("file", file);
  return new Request("http://localhost/api/import/docx", {
    method: "POST",
    body,
  });
}

async function expectError(response: Response, status: number, code: string) {
  expect(response.status).toBe(status);
  await expect(response.json()).resolves.toMatchObject({ code });
}

describe("POST /api/import/docx", () => {
  beforeEach(() => {
    importEnvironment.demoPreviewEnabled = true;
    importEnvironment.supabaseConfigured = false;
    getSessionContext.mockReset();
    extractRawText.mockReset();
    extractRawText.mockResolvedValue({ value: "", messages: [] });
  });

  it("fails closed before reading the request in production", async () => {
    importEnvironment.demoPreviewEnabled = false;

    await expectError(
      await POST(new Request("http://localhost/api/import/docx")),
      503,
      "AUTH_UNAVAILABLE",
    );
  });

  it("allows the non-production demo path to reach upload validation", async () => {
    await expectError(
      await POST(new Request("http://localhost/api/import/docx")),
      400,
      "MALFORMED_FORM_DATA",
    );
  });

  it("rejects the legacy .doc extension", async () => {
    await expectError(
      await POST(uploadRequest(new File([ZIP_BYTES], "jobs.doc", { type: DOCX_MIME }))),
      415,
      "INVALID_FILE_EXTENSION",
    );
  });

  it("rejects an unsupported MIME type", async () => {
    await expectError(
      await POST(
        uploadRequest(new File([ZIP_BYTES], "jobs.docx", { type: "text/plain" })),
      ),
      415,
      "INVALID_FILE_TYPE",
    );
  });

  it("rejects files without a ZIP signature", async () => {
    await expectError(
      await POST(
        uploadRequest(
          new File([new Uint8Array([1, 2, 3, 4])], "jobs.docx", {
            type: DOCX_MIME,
          }),
        ),
      ),
      415,
      "INVALID_DOCX_SIGNATURE",
    );
  });

  it("rejects files larger than 10 MB before parsing", async () => {
    const oversized = new Uint8Array(10 * 1024 * 1024 + 1);
    oversized.set(ZIP_BYTES);

    await expectError(
      await POST(uploadRequest(new File([oversized], "jobs.docx", { type: DOCX_MIME }))),
      413,
      "FILE_TOO_LARGE",
    );
    expect(extractRawText).not.toHaveBeenCalled();
  });

  it("passes a Node Buffer to Mammoth and returns parsed rows", async () => {
    extractRawText.mockResolvedValue({
      value:
        "20260824\nResearch Fellow available at Example University https://example.org/jobs/42 Apply by 30 September 2026",
      messages: [{ message: "test warning" }],
    });

    const response = await POST(
      uploadRequest(new File([ZIP_BYTES], "jobs.docx", { type: DOCX_MIME })),
    );

    expect(response.status).toBe(200);
    expect(extractRawText).toHaveBeenCalledOnce();
    const input = extractRawText.mock.calls[0][0];
    expect(Buffer.isBuffer(input.buffer)).toBe(true);
    await expect(response.json()).resolves.toMatchObject({
      imports: [
        {
          title: "Research Fellow",
          sourceDate: "2026-08-24",
          applyBy: "2026-09-30",
        },
      ],
      warnings: ["test warning"],
    });
  });

  it("requires a signed-in user when authentication is configured", async () => {
    importEnvironment.supabaseConfigured = true;
    getSessionContext.mockResolvedValue({ user: null, role: "public" });

    await expectError(
      await POST(new Request("http://localhost/api/import/docx")),
      401,
      "AUTH_REQUIRED",
    );
  });

  it("rejects a signed-in non-admin member", async () => {
    importEnvironment.supabaseConfigured = true;
    getSessionContext.mockResolvedValue({
      user: { id: "member-1" },
      role: "member",
    });

    await expectError(
      await POST(new Request("http://localhost/api/import/docx")),
      403,
      "ADMIN_REQUIRED",
    );
  });

  it("allows an admin to continue to upload validation", async () => {
    importEnvironment.supabaseConfigured = true;
    getSessionContext.mockResolvedValue({
      user: { id: "admin-1" },
      role: "admin",
    });

    await expectError(
      await POST(new Request("http://localhost/api/import/docx")),
      400,
      "MALFORMED_FORM_DATA",
    );
  });

  it("fails closed when the configured auth check throws", async () => {
    importEnvironment.supabaseConfigured = true;
    getSessionContext.mockRejectedValue(new Error("auth unavailable"));

    await expectError(
      await POST(new Request("http://localhost/api/import/docx")),
      503,
      "AUTH_CHECK_FAILED",
    );
  });
});
