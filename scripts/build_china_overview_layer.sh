#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 /absolute/path/to/GS(2020)4619-shapefile.zip" >&2
  exit 2
fi

archive="$1"
archive_name="中国标准地图-审图号GS(2020)4619号-shp格式"
source_path="/vsizip/${archive}/${archive_name}/省级行政区.shp"
output_path="$(cd "$(dirname "$0")/.." && pwd)/src/data/china-overview.json"
ogr2ogr_bin="${OGR2OGR_BIN:-$(command -v ogr2ogr || true)}"
if [[ -z "$ogr2ogr_bin" && -x /opt/homebrew/bin/ogr2ogr ]]; then
  ogr2ogr_bin=/opt/homebrew/bin/ogr2ogr
fi
if [[ -z "$ogr2ogr_bin" ]]; then
  echo "Install GDAL or set OGR2OGR_BIN to generate the layer." >&2
  exit 1
fi

"$ogr2ogr_bin" -f GeoJSON -dialect SQLITE \
  -sql 'SELECT ST_Union(geometry) AS geometry FROM "省级行政区"' \
  -t_srs EPSG:4326 -simplify 0.08 -lco COORDINATE_PRECISION=4 \
  "$output_path" "$source_path"

echo "Generated $output_path from the supplied standard map."
