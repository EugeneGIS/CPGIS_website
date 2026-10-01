import { ImageResponse } from "next/og";
import chinaOverview from "@/data/china-overview.json";
import chinaTenDash from "@/data/china-ten-dash-line.json";
import { SOUTH_CHINA_SEA_LINE_PALETTE } from "@/components/map/south-china-sea-style";
import { getDeadlineStatus, MARKER_PALETTE, type DeadlineStatus } from "@/components/map/jobs-map-helpers";
import { isJobExpired } from "@/lib/job-filters";
import { loadOpenFreeMapPreview } from "@/lib/openfreemap-preview";
import { toDateKey } from "@/lib/utils";
import type { MapShareView } from "@/lib/map-share-server";

const WIDTH = 1200;
const HEIGHT = 630;
const TILE_SIZE = 256;

function project(latitude: number, longitude: number, zoom: number) {
  const n = 2 ** zoom;
  const clamped = Math.max(-85, Math.min(85, latitude));
  const sin = Math.sin(clamped * Math.PI / 180);
  return {
    x: ((longitude + 180) / 360) * n * TILE_SIZE,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * n * TILE_SIZE,
  };
}

function mapViewport(bounds: MapShareView["input"]["bounds"]) {
  const east = bounds.east < bounds.west ? bounds.east + 360 : bounds.east;
  const west = bounds.west;
  const yNorth = project(bounds.north, 0, 0).y;
  const ySouth = project(bounds.south, 0, 0).y;
  const widthAtZero = Math.max((east - west) / 360 * TILE_SIZE, 1);
  const heightAtZero = Math.max(ySouth - yNorth, 1);
  const zoom = Math.max(1, Math.min(9, Math.floor(Math.log2(Math.min(
    WIDTH * 0.88 / widthAtZero,
    HEIGHT * 0.78 / heightAtZero,
  )))));
  const centerLatitude = (bounds.north + bounds.south) / 2;
  const center = project(centerLatitude, (west + east) / 2, zoom);
  return { zoom, center };
}

function drawChinaPath(viewport: ReturnType<typeof mapViewport>) {
  const geometry = chinaOverview.features[0].geometry;
  const polygons = geometry.type === "MultiPolygon" ? geometry.coordinates : [];
  const worldWidth = 2 ** viewport.zoom * TILE_SIZE;
  const parts: string[] = [];
  for (const polygon of polygons) {
    for (const ring of polygon) {
      const points = ring.map(([longitude, latitude]) => {
        const point = project(latitude, longitude, viewport.zoom);
        const shiftedX = point.x + Math.round((viewport.center.x - point.x) / worldWidth) * worldWidth;
        return `${Math.round(shiftedX - viewport.center.x + WIDTH / 2)},${Math.round(point.y - viewport.center.y + HEIGHT / 2)}`;
      });
      if (points.length) parts.push(`M${points.join("L")}Z`);
    }
  }
  return parts.join("");
}

function drawTenDashPath(viewport: ReturnType<typeof mapViewport>) {
  const worldWidth = 2 ** viewport.zoom * TILE_SIZE;
  return chinaTenDash.features.map((feature) => {
    const points = feature.geometry.coordinates.map(([longitude, latitude]) => {
      const point = project(latitude, longitude, viewport.zoom);
      const shiftedX = point.x + Math.round((viewport.center.x - point.x) / worldWidth) * worldWidth;
      return `${Math.round(shiftedX - viewport.center.x + WIDTH / 2)},${Math.round(point.y - viewport.center.y + HEIGHT / 2)}`;
    });
    return points.length ? `M${points.join("L")}` : "";
  }).join("");
}

export async function renderMapPreview(view: MapShareView) {
  const viewport = mapViewport(view.input.bounds);
  const basemap = await loadOpenFreeMapPreview(viewport, WIDTH, HEIGHT);
  const worldWidth = 2 ** viewport.zoom * TILE_SIZE;
  const cells = new Map<string, { x: number; y: number; count: number; status: DeadlineStatus }>();
  const today = toDateKey(new Date());
  for (const job of view.jobs) {
    if (job.location.latitude === 0 && job.location.longitude === 0) continue;
    const point = project(job.location.latitude, job.location.longitude, viewport.zoom);
    const shiftedX = point.x + Math.round((viewport.center.x - point.x) / worldWidth) * worldWidth;
    const x = Math.round(shiftedX - viewport.center.x + WIDTH / 2);
    const y = Math.round(point.y - viewport.center.y + HEIGHT / 2);
    if (x < 0 || x > WIDTH || y < 0 || y > HEIGHT) continue;
    const key = `${Math.round(x / 12)}:${Math.round(y / 12)}`;
    const status = isJobExpired(job, today) ? "expired" : getDeadlineStatus(job.applyBy);
    const cell = cells.get(key);
    if (cell) {
      cell.count += 1;
      if (status === "closingSoon" || (status === "active" && cell.status === "expired")) cell.status = status;
    } else cells.set(key, { x, y, count: 1, status });
  }

  const dark = view.input.theme === "dark";
  return new ImageResponse(
    <div style={{
      display: "flex", position: "relative", width: WIDTH, height: HEIGHT,
      background: dark ? "#293341" : "#f5f6f4", overflow: "hidden",
      fontFamily: "sans-serif", color: "#121a31",
    }}>
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ position: "absolute", left: 0, top: 0 }}>
        <path d={basemap.water} fill={dark ? "#24435a" : "#d8e9ed"} fillRule="nonzero" />
        <path d={basemap.parks} fill={dark ? "#40504a" : "#e5ebdd"} fillRule="nonzero" />
        <path d={basemap.roads} fill="none" stroke={dark ? "#74818d" : "#c7cbd0"}
          strokeWidth="1.3" strokeLinecap="round" />
        {viewport.zoom < 5 && <path d={drawChinaPath(viewport)} fill={dark ? "#344458" : "#e7eef4"}
          stroke={dark ? "#8495a9" : "#97aaca"} strokeWidth="1.5" fillRule="evenodd" opacity="0.94" />}
        <path d={drawTenDashPath(viewport)} fill="none" stroke={SOUTH_CHINA_SEA_LINE_PALETTE[view.input.theme]}
          strokeWidth="2" strokeLinecap="round" opacity={dark ? "0.7" : "0.6"} />
        {[...cells.values()].map((cell, index) => (
          <circle key={index} cx={cell.x} cy={cell.y} r={Math.min(13, 5 + Math.log2(cell.count + 1) * 2)}
            fill={MARKER_PALETTE[view.input.theme][cell.status].fill} stroke="#ffffff" strokeWidth="2" />
        ))}
      </svg>
      {basemap.places.map((place, index) => (
        <div key={index} style={{
          display: "flex", position: "absolute", left: place.x - 58, top: place.y - 8,
          width: 116, justifyContent: "center", textAlign: "center",
          color: dark ? "#d9e2ec" : "#4b5968", fontSize: 12, fontWeight: 600,
          textShadow: dark ? "0 1px 3px #293341" : "0 1px 3px #f5f6f4",
        }}>{place.name}</div>
      ))}
      <div style={{
        display: "flex", position: "absolute", left: 38, top: 38, right: 38,
        alignItems: "center", justifyContent: "space-between", background: "#ffffffee",
        borderRadius: 24, padding: "20px 28px", gap: 20,
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 30, fontWeight: 700 }}>CPGIS Jobs map</span>
          <span style={{ fontSize: 18 }}>Selected map area · {view.jobs.length} opportunities</span>
        </div>
        <span style={{ fontSize: 16, color: "#3753a1" }}>{view.createdAt.slice(0, 10)}</span>
      </div>
      {basemap.loadedTiles === 0 && <div style={{
        display: "flex", position: "absolute", left: 38, bottom: 38,
        background: "#ffffffee", borderRadius: 8, padding: "8px 12px", fontSize: 14,
      }}>Basemap temporarily unavailable</div>}
      <div style={{
        display: "flex", position: "absolute", right: 22, bottom: 18,
        background: "#ffffffee", borderRadius: 8, padding: "6px 10px", fontSize: 12,
      }}>
        OpenFreeMap / OpenMapTiles · Data from OpenStreetMap · China overview: GS(2020)4619
      </div>
    </div>,
    { width: WIDTH, height: HEIGHT, headers: { "Cache-Control": `public, max-age=${view.persisted ? 3600 : 600}` } },
  );
}
