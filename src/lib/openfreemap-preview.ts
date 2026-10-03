import { VectorTile, type VectorTileFeature } from "@mapbox/vector-tile";
import { PbfReader } from "pbf";

const TILE_SIZE = 256;
const TILE_REVALIDATE_SECONDS = 24 * 60 * 60;

type PreviewViewport = {
  zoom: number;
  center: { x: number; y: number };
};

type TilePosition = { x: number; y: number; wrappedX: number; key: string };

export type PreviewMapLayers = {
  water: string;
  parks: string;
  roads: string;
  places: { x: number; y: number; name: string }[];
  loadedTiles: number;
  missingTiles: number;
};

export function selectPreviewPlaces(
  candidates: PreviewMapLayers["places"],
  width: number,
  height: number,
  zoom: number,
): PreviewMapLayers["places"] {
  const selected: PreviewMapLayers["places"] = [];
  const seen = new Set<string>();
  const minX = zoom < 6 ? 116 : 92;
  const minY = zoom < 6 ? 42 : 34;
  const limit = zoom < 6 ? 28 : 42;

  for (const place of candidates) {
    const name = place.name.trim();
    const key = name.toLocaleLowerCase();
    if (seen.has(key) || place.x < 56 || place.x > width - 56 || place.y < 18 || place.y > height - 18) continue;
    if (selected.some((other) => Math.abs(other.x - place.x) < minX && Math.abs(other.y - place.y) < minY)) continue;
    selected.push(place);
    seen.add(key);
    if (selected.length >= limit) break;
  }

  return selected;
}

function featurePath(feature: VectorTileFeature, left: number, top: number) {
  const scale = TILE_SIZE / feature.extent;
  return feature.loadGeometry().map((ring) => {
    if (!ring.length) return "";
    const last = ring[ring.length - 1];
    const outline = feature.type === 3 && ring.length > 1 && ring[0].x === last.x && ring[0].y === last.y
      ? ring.slice(0, -1) : ring;
    const points = outline.map(({ x, y }) =>
      `${Math.round(left + x * scale)},${Math.round(top + y * scale)}`);
    return `M${points.join("L")}${feature.type === 3 ? "Z" : ""}`;
  }).join("");
}

function tilePositions(viewport: PreviewViewport, width: number, height: number) {
  const count = 2 ** viewport.zoom;
  const firstX = Math.floor((viewport.center.x - width / 2) / TILE_SIZE);
  const lastX = Math.ceil((viewport.center.x + width / 2) / TILE_SIZE);
  const firstY = Math.max(0, Math.floor((viewport.center.y - height / 2) / TILE_SIZE));
  const lastY = Math.min(count, Math.ceil((viewport.center.y + height / 2) / TILE_SIZE));
  const positions: TilePosition[] = [];

  for (let x = firstX; x < lastX; x += 1) {
    for (let y = firstY; y < lastY; y += 1) {
      const wrappedX = ((x % count) + count) % count;
      positions.push({ x, y, wrappedX, key: `${wrappedX}:${y}` });
    }
  }
  return positions;
}

async function fetchTile(zoom: number, x: number, y: number) {
  const url = `https://tiles.openfreemap.org/planet/latest/${zoom}/${x}/${y}.pbf`;
  try {
    const response = await fetch(url, {
      next: { revalidate: TILE_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return null;
    return new VectorTile(new PbfReader(await response.arrayBuffer()));
  } catch {
    return null;
  }
}

export async function loadOpenFreeMapPreview(
  viewport: PreviewViewport,
  width: number,
  height: number,
): Promise<PreviewMapLayers> {
  const positions = tilePositions(viewport, width, height);
  const requests = new Map<string, Promise<VectorTile | null>>();
  for (const position of positions) {
    if (!requests.has(position.key)) {
      requests.set(position.key, fetchTile(viewport.zoom, position.wrappedX, position.y));
    }
  }
  const tiles = new Map(await Promise.all([...requests].map(async ([key, request]) => [key, await request] as const)));
  const water: string[] = [];
  const parks: string[] = [];
  const roads: string[] = [];
  const places: PreviewMapLayers["places"] = [];
  let loadedTiles = 0;

  for (const position of positions) {
    const tile = tiles.get(position.key);
    if (!tile) continue;
    loadedTiles += 1;
    const left = position.x * TILE_SIZE - viewport.center.x + width / 2;
    const top = position.y * TILE_SIZE - viewport.center.y + height / 2;

    const waterLayer = tile.layers.water;
    if (waterLayer) {
      for (let i = 0; i < waterLayer.length; i += 1) {
        const feature = waterLayer.feature(i);
        if (feature.type === 3) water.push(featurePath(feature, left, top));
      }
    }

    if (viewport.zoom >= 6) {
      const parkLayer = tile.layers.park;
      if (parkLayer) {
        for (let i = 0; i < Math.min(parkLayer.length, 120); i += 1) {
          const feature = parkLayer.feature(i);
          if (feature.type === 3) parks.push(featurePath(feature, left, top));
        }
      }
      const roadLayer = tile.layers.transportation;
      if (roadLayer) {
        for (let i = 0; i < Math.min(roadLayer.length, 500); i += 1) {
          const feature = roadLayer.feature(i);
          if (feature.type === 2 && /^(motorway|trunk|primary|secondary)$/.test(String(feature.properties.class))) {
            roads.push(featurePath(feature, left, top));
          }
        }
      }
    }

    const placeLayer = tile.layers.place;
    if (placeLayer) {
      let shown = 0;
      for (let i = 0; i < placeLayer.length && shown < 10; i += 1) {
        const feature = placeLayer.feature(i);
        if (feature.type !== 1 || !/^(city|town)$/.test(String(feature.properties.class))) continue;
        const name = feature.properties["name:en"] ?? feature.properties["name:latin"] ?? feature.properties.name;
        if (typeof name !== "string" || !name.trim()) continue;
        const point = feature.loadGeometry()[0]?.[0];
        if (!point) continue;
        const x = Math.round(left + point.x * TILE_SIZE / feature.extent);
        const y = Math.round(top + point.y * TILE_SIZE / feature.extent);
        if (x < 0 || x > width || y < 0 || y > height) continue;
        places.push({ x, y, name });
        shown += 1;
      }
    }
  }

  return {
    water: water.join(""),
    parks: parks.join(""),
    roads: roads.join(""),
    places: selectPreviewPlaces(places, width, height, viewport.zoom),
    loadedTiles,
    missingTiles: positions.length - loadedTiles,
  };
}
