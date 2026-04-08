import mammoth from "mammoth";
import { NextResponse } from "next/server";
import { parseDocxTextToImports } from "@/lib/parser";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No DOCX file was uploaded." },
      { status: 400 },
    );
  }

  const buffer = await file.arrayBuffer();
  const extracted = await mammoth.extractRawText({
    arrayBuffer: buffer,
  });
  const imports = parseDocxTextToImports(extracted.value);

  return NextResponse.json({
    imports,
    message: `Parsed ${imports.length} rows from ${file.name}.`,
  });
}
