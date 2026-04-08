#!/usr/bin/env python3

from __future__ import annotations

import json
import re
import subprocess
import time
import unicodedata
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
SOURCE_DOCX = Path("/Users/hliu5/Documents/3 - OTHERS/CPGIS/CPGIS.docx")
OUTPUT_JSON = REPO_ROOT / "src" / "data" / "cpgis-jobs.json"
CACHE_JSON = REPO_ROOT / "scripts" / "cache" / "cpgis-ror-cache.json"
DATE_LINE = re.compile(r"^20\d{6}$")
ROW_PATTERN = re.compile(
    r"^(.*?)\s+available at\s+(.*?)\s+(https?://\S+)(?:\s+(.*))?$",
    re.IGNORECASE,
)


@dataclass
class ParsedRow:
    source_date: str | None
    title: str
    organization: str
    application_url: str
    trailing_text: str
    raw_text: str


def normalize_text(value: str) -> str:
    value = value.replace("\xa0", " ")
    value = unicodedata.normalize("NFKC", value)
    return re.sub(r"\s+", " ", value).strip()


def slugify(value: str) -> str:
    value = normalize_text(value).lower()
    value = re.sub(r"[\"']", "", value)
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"^-+|-+$", "", value)
    return value[:80]


def parse_deadline(trailing_text: str) -> tuple[str, str | None]:
    trailing_text = normalize_text(trailing_text)
    if not trailing_text:
        return ("Deadline not specified", None)

    lowered = trailing_text.lower()
    if "until filled" in lowered or "open until filled" in lowered:
        return ("Position open until filled", None)

    match = re.search(
        r"\b(?:apply by|due)\s+(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})",
        trailing_text,
        re.IGNORECASE,
    )
    if not match:
        return (trailing_text, None)

    try:
        parsed = datetime.strptime(match.group(1), "%d %b %Y")
    except ValueError:
        try:
            parsed = datetime.strptime(match.group(1), "%d %B %Y")
        except ValueError:
            return (trailing_text, None)

    return (trailing_text, parsed.strftime("%Y-%m-%d"))


def derive_query(organization: str) -> str:
    cleaned = normalize_text(organization)
    cleaned = re.sub(r"^the\s+", "", cleaned, flags=re.IGNORECASE)
    match = re.search(r"\bat\s+(.+)$", cleaned, flags=re.IGNORECASE)
    if match and any(
        token in match.group(1).lower()
        for token in ("university", "college", "institute", "school", "eth")
    ):
        cleaned = match.group(1).strip()

    parts = [part.strip() for part in cleaned.split(",") if part.strip()]
    for part in reversed(parts):
        lowered = part.lower()
        if any(
            token in lowered
            for token in (
                "university",
                "college",
                "institute",
                "polytechnique",
                "eth",
                "school",
                "academy",
                "laboratory",
                "hospital",
            )
        ):
            return part

    if parts:
        return parts[-1]

    return cleaned


def extract_rows() -> list[ParsedRow]:
    text = subprocess.check_output(
        ["textutil", "-convert", "txt", "-stdout", str(SOURCE_DOCX)],
        text=True,
    )
    lines = [normalize_text(line) for line in text.splitlines() if normalize_text(line)]

    rows: list[ParsedRow] = []
    current_source_date: str | None = None
    seen: set[tuple[str, str, str]] = set()

    for line in lines:
        if DATE_LINE.match(line):
            current_source_date = f"{line[:4]}-{line[4:6]}-{line[6:8]}"
            continue

        match = ROW_PATTERN.match(line)
        if not match:
            continue

        title = normalize_text(match.group(1))
        organization = normalize_text(match.group(2))
        application_url = normalize_text(match.group(3))
        trailing_text = normalize_text(match.group(4) or "")
        key = (title.lower(), organization.lower(), application_url.lower())

        if key in seen:
            continue

        seen.add(key)
        rows.append(
            ParsedRow(
                source_date=current_source_date,
                title=title,
                organization=organization,
                application_url=application_url,
                trailing_text=trailing_text,
                raw_text=line,
            )
        )

    return rows


def load_cache() -> dict[str, dict]:
    if not CACHE_JSON.exists():
        return {}
    return json.loads(CACHE_JSON.read_text())


def save_cache(cache: dict[str, dict]) -> None:
    CACHE_JSON.parent.mkdir(parents=True, exist_ok=True)
    CACHE_JSON.write_text(json.dumps(cache, indent=2, ensure_ascii=False))


def fetch_json(url: str, headers: dict[str, str] | None = None) -> dict | list:
    request = urllib.request.Request(
        url,
        headers=headers
        or {
            "Accept": "application/json",
            "User-Agent": "cpgis-job-portal-demo/0.1",
        },
    )
    with urllib.request.urlopen(request, timeout=12) as response:
        return json.load(response)


def lookup_ror(query: str, affiliation: str, cache: dict[str, dict]) -> dict:
    cache_key = normalize_text(affiliation)
    if cache_key in cache:
        return cache[cache_key]

    urls = [
        "https://api.ror.org/organizations?affiliation="
        + urllib.parse.quote(affiliation),
        "https://api.ror.org/organizations?query=" + urllib.parse.quote(query),
    ]

    result: dict | None = None

    for url in urls:
        try:
            payload = fetch_json(url)
        except Exception:
            continue

        items = payload.get("items", []) if isinstance(payload, dict) else []
        if not items:
            continue

        first = items[0]
        organization = first.get("organization", first)
        locations = organization.get("locations", [])
        if not locations:
            continue

        geonames = locations[0].get("geonames_details", {})
        names = organization.get("names", [])
        canonical_name = None
        for name in names:
            if "ror_display" in name.get("types", []):
                canonical_name = name.get("value")
                break

        result = {
            "matched": True,
            "canonical_name": canonical_name or query,
            "city": geonames.get("name"),
            "country": geonames.get("country_name"),
            "latitude": geonames.get("lat"),
            "longitude": geonames.get("lng"),
            "ror_id": organization.get("id"),
        }
        break

    if result is None:
        result = lookup_nominatim(query)

    cache[cache_key] = result
    time.sleep(0.03)
    return result


def lookup_nominatim(query: str) -> dict:
    url = (
        "https://nominatim.openstreetmap.org/search?"
        + urllib.parse.urlencode(
            {
                "q": query,
                "format": "jsonv2",
                "limit": "1",
            }
        )
    )
    try:
        payload = fetch_json(
            url,
            headers={
                "Accept": "application/json",
                "User-Agent": "cpgis-job-portal-demo/0.1",
            },
        )
    except Exception:
        return {
            "matched": False,
            "canonical_name": query,
            "city": "Unknown",
            "country": "Unknown",
            "latitude": 0,
            "longitude": 0,
            "ror_id": None,
        }

    if not payload:
        return {
            "matched": False,
            "canonical_name": query,
            "city": "Unknown",
            "country": "Unknown",
            "latitude": 0,
            "longitude": 0,
            "ror_id": None,
        }

    first = payload[0]
    parts = [part.strip() for part in str(first.get("display_name", "")).split(",") if part.strip()]
    city = parts[-4] if len(parts) >= 4 else parts[0] if parts else "Unknown"
    country = parts[-1] if parts else "Unknown"

    return {
        "matched": True,
        "canonical_name": query,
        "city": city,
        "country": country,
        "latitude": float(first.get("lat", 0)),
        "longitude": float(first.get("lon", 0)),
        "ror_id": None,
    }


def infer_tags(title: str) -> list[str]:
    lowered = title.lower()
    tags: list[str] = []
    mapping = [
        ("postdoctoral", "postdoc"),
        ("postdoctoral", "research"),
        ("assistant professor", "assistant professor"),
        ("associate professor", "associate professor"),
        ("professor", "faculty"),
        ("lecturer", "lecturer"),
        ("research fellow", "research fellow"),
        ("remote sensing", "remote sensing"),
        ("gis", "gis"),
        ("geospatial", "geospatial"),
        ("spatial", "spatial analysis"),
        ("urban", "urban"),
        ("climate", "climate"),
        ("ecology", "ecology"),
        ("hydrology", "hydrology"),
    ]

    for needle, tag in mapping:
        if needle in lowered and tag not in tags:
            tags.append(tag)

    return tags[:4]


def build_summary(title: str, organization: str) -> str:
    return f"{title} available at {organization}."


def build_jobs() -> list[dict]:
    rows = extract_rows()
    cache = load_cache()
    jobs: list[dict] = []
    total_rows = len(rows)

    for index, row in enumerate(rows, start=1):
        query = derive_query(row.organization)
        location = lookup_ror(query, row.organization, cache)
        if index % 25 == 0:
            save_cache(cache)
            print(f"Processed {index}/{total_rows} rows", flush=True)
        deadline_text, apply_by = parse_deadline(row.trailing_text)
        slug = slugify(f"{row.organization}-{row.title}")
        created_at = f"{row.source_date or '2023-01-01'}T09:00:00.000Z"

        jobs.append(
            {
                "id": f"docx-{index}",
                "slug": slug,
                "title": row.title,
                "organization": row.organization,
                "summary": build_summary(row.title, row.organization),
                "description": row.raw_text,
                "applicationUrl": row.application_url,
                "contactEmail": None,
                "applyBy": apply_by,
                "deadlineText": deadline_text,
                "status": "published",
                "sourceDate": row.source_date,
                "importSource": "cpgis-docx",
                "tags": infer_tags(row.title),
                "createdAt": created_at,
                "updatedAt": created_at,
                "createdBy": None,
                "location": {
                    "label": f"{location['city']}, {location['country']}",
                    "address": location["canonical_name"],
                    "city": location["city"],
                    "country": location["country"],
                    "latitude": float(location["latitude"]),
                    "longitude": float(location["longitude"]),
                },
            }
        )

    save_cache(cache)
    jobs.sort(
        key=lambda item: (
            item.get("sourceDate") or "",
            item.get("createdAt") or "",
        ),
        reverse=True,
    )
    return jobs


def main() -> None:
    jobs = build_jobs()
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(jobs, indent=2, ensure_ascii=False))
    matched = sum(
        1
        for job in jobs
        if job["location"]["latitude"] != 0 or job["location"]["longitude"] != 0
    )
    print(f"Wrote {len(jobs)} jobs to {OUTPUT_JSON}")
    print(f"Geocoded or matched {matched} jobs")


if __name__ == "__main__":
    main()
