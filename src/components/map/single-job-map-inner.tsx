"use client";

import { CircleMarker, MapContainer, Popup } from "react-leaflet";
import type { JobLocation } from "@/lib/types";
import { EnglishVectorLayer } from "./english-vector-layer";
import { WORLD_COPY_JUMP_ENABLED } from "./jobs-map-helpers";
import { SouthChinaSeaLayer } from "./south-china-sea-layer";

export default function SingleJobMapInner({
  location,
  organization,
}: {
  location: JobLocation;
  organization: string;
}) {
  const center: [number, number] = [location.latitude, location.longitude];

  return (
    <MapContainer
      center={center}
      zoom={13}
      minZoom={2}
      worldCopyJump={WORLD_COPY_JUMP_ENABLED}
      scrollWheelZoom={false}
      className="h-[320px] w-full sm:h-[380px]"
    >
      <EnglishVectorLayer theme="light" />
      <SouthChinaSeaLayer theme="light" />
      <CircleMarker
        center={center}
        radius={11}
        pathOptions={{
          color: "#ffffff",
          fillColor: "#3753a1",
          fillOpacity: 1,
          opacity: 1,
          weight: 3,
        }}
      >
        <Popup>
          <div className="space-y-1">
            <div className="font-semibold">{organization}</div>
            <div>{location.label}</div>
            <div className="text-xs text-slate-600">
              {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
            </div>
          </div>
        </Popup>
      </CircleMarker>
    </MapContainer>
  );
}
