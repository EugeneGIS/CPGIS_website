#!/usr/bin/env python3
"""Build the web-ready South China Sea ten-dash GeoJSON layer.

This is an optional geodata maintenance script and requires GeoPandas. It does
not hard-code workstation paths: pass extracted Shapefile paths explicitly.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import geopandas as gpd


EXPECTED_SEGMENT_IDS = (691, 937, 975, 1073, 1079, 1086, 1106, 1362, 1367, 1382)
MAX_REVIEW_REFERENCE_DISTANCE_METRES = 5_000


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--line-shapefile", type=Path, required=True)
    parser.add_argument("--reviewed-boundary-shapefile", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    return parser.parse_args()


def rounded_coordinates(geometry) -> list[list[float]]:
    return [[round(x, 6), round(y, 6)] for x, y in geometry.coords]


def main() -> None:
    args = parse_args()
    line = gpd.read_file(args.line_shapefile, encoding="gb18030")

    if line.crs is None or line.crs.to_epsg() != 4326:
        raise ValueError("The supplied ten-dash line must use EPSG:4326.")
    if len(line) != 10 or set(line.geometry.geom_type) != {"LineString"}:
        raise ValueError("Expected exactly ten LineString features.")
    if not line["备注"].notna().all() or not line["备注"].eq("十段线").all():
        raise ValueError("The supplied layer is not labelled 十段线.")
    if set(line["GBCODE"].astype(int)) != {61010}:
        raise ValueError("Unexpected national-boundary classification.")

    line["segment_id"] = line["BOU1_4M_"].astype(int)
    if tuple(sorted(line["segment_id"])) != EXPECTED_SEGMENT_IDS:
        raise ValueError("The ten-dash source segment identifiers changed.")

    reviewed = gpd.read_file(
        args.reviewed_boundary_shapefile,
        encoding="gb18030",
    ).to_crs(4326)
    reviewed["segment_id"] = reviewed["BOU1_4M_"].astype(int)
    reviewed = reviewed[reviewed["segment_id"].isin(EXPECTED_SEGMENT_IDS)]

    if set(reviewed["segment_id"]) != set(EXPECTED_SEGMENT_IDS):
        raise ValueError("GS(2020)4619 does not contain every source segment.")

    line_metric = line.to_crs(3857).set_index("segment_id")
    reviewed_metric = reviewed.to_crs(3857).set_index("segment_id")
    review_distances = {
        segment_id: float(
            line_metric.loc[segment_id].geometry.hausdorff_distance(
                reviewed_metric.loc[segment_id].geometry
            )
        )
        for segment_id in EXPECTED_SEGMENT_IDS
    }
    if max(review_distances.values()) > MAX_REVIEW_REFERENCE_DISTANCE_METRES:
        raise ValueError("The supplied layer diverges from the reviewed reference.")

    ordered = line.assign(
        northern_extent=line.geometry.bounds.maxy,
    ).sort_values("northern_extent", ascending=False)
    features = []
    for sequence, (_, row) in enumerate(ordered.iterrows(), start=1):
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "sequence": sequence,
                    "source_segment_id": int(row["segment_id"]),
                    "gbcode": int(row["GBCODE"]),
                    "label": "South China Sea ten-dash line",
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": rounded_coordinates(row.geometry),
                },
            }
        )

    collection = {
        "type": "FeatureCollection",
        "name": "South China Sea ten-dash line",
        "source": "User-supplied 2023 WGS84 ten-dash Shapefile",
        "review_reference": "China standard map GS(2020)4619 boundary layer",
        "features": features,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(collection, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(
        f"Wrote {len(features)} features to {args.output}; "
        f"maximum review-reference distance "
        f"{max(review_distances.values()):.2f} metres."
    )


if __name__ == "__main__":
    main()
