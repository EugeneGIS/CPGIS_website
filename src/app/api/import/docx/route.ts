import mammoth from "mammoth";
import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import {
  isDemoImportPreviewEnabled,
  isSupabaseConfigured,
} from "@/lib/env";
import { parseDocxTextToImports } from "@/lib/parser";

export const runtime = "nodejs";

const MAX_DOCX_BYTES = 10 * 1024 * 1024;
const DOCX_MIME_TYPES = new Set([
  "",
  "application/octet-stream",
  "application/zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function errorResponse(code: string, error: string, status: number) {
  return NextResponse.json({ code, error }, { status });
}

function hasZipSignature(buffer: Buffer) {
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    return false;
  }

  const signature = buffer.subarray(2, 4).toString("hex");
  return signature === "0304" || signature === "0506" || signature === "0708";
}

export async function POST(request: Request) {
  const supabaseConfigured = isSupabaseConfigured();

  if (!supabaseConfigured && !isDemoImportPreviewEnabled()) {
    return errorResponse(
      "AUTH_UNAVAILABLE",
      "Document import is unavailable until authentication is configured.",
      503,
    );
  }

  if (supabaseConfigured) {
    try {
      const session = await getSessionContext();

      if (!session.user) {
        return errorResponse(
          "AUTH_REQUIRED",
          "Sign in before importing job documents.",
          401,
        );
      }

      if (session.role !== "admin") {
        return errorResponse(
          "ADMIN_REQUIRED",
          "Admin access is required to import job documents.",
          403,
        );
      }
    } catch (error) {
      console.error("Could not verify DOCX import access.", error);
      return errorResponse(
        "AUTH_CHECK_FAILED",
        "Could not verify import access. Try again later.",
        503,
      );
    }
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return errorResponse(
      "MALFORMED_FORM_DATA",
      "The upload must be sent as valid multipart form data.",
      400,
    );
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return errorResponse(
      "FILE_REQUIRED",
      "No DOCX file was uploaded.",
      400,
    );
  }

  if (!file.name.toLowerCase().endsWith(".docx")) {
    return errorResponse(
      "INVALID_FILE_EXTENSION",
      "Only .docx files are supported.",
      415,
    );
  }

  if (!DOCX_MIME_TYPES.has(file.type.toLowerCase())) {
    return errorResponse(
      "INVALID_FILE_TYPE",
      "The uploaded file does not have a supported DOCX content type.",
      415,
    );
  }

  if (file.size === 0) {
    return errorResponse("EMPTY_FILE", "The uploaded DOCX file is empty.", 400);
  }

  if (file.size > MAX_DOCX_BYTES) {
    return errorResponse(
      "FILE_TOO_LARGE",
      "The DOCX file must be 10 MB or smaller.",
      413,
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    if (!hasZipSignature(buffer)) {
      return errorResponse(
        "INVALID_DOCX_SIGNATURE",
        "The uploaded file is not a valid DOCX archive.",
        415,
      );
    }

    const extracted = await mammoth.extractRawText({ buffer });
    const imports = parseDocxTextToImports(extracted.value);

    return NextResponse.json({
      imports,
      message: `Parsed ${imports.length} rows from ${file.name}.`,
      warnings: extracted.messages.map((message) => message.message),
    });
  } catch (error) {
    console.error("Could not parse uploaded DOCX file.", error);
    return errorResponse(
      "DOCX_PARSE_FAILED",
      "The DOCX file could not be parsed. Check that it is not damaged or password-protected.",
      422,
    );
  }
}
