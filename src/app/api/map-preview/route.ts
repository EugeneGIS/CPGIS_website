import { getMapShareView } from "@/lib/map-share-server";
import { renderMapPreview } from "@/lib/map-preview";

export async function GET(request: Request) {
  const view = await getMapShareView(new URL(request.url).searchParams);
  if (!view) return new Response("Map share not found", { status: 404 });
  return renderMapPreview(view);
}
