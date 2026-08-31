#!/usr/bin/env python3

from __future__ import annotations

import argparse
import hashlib
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
OUTPUT_JSON = REPO_ROOT / "src" / "data" / "cpgis-jobs.json"
LEGACY_SLUGS_JSON = REPO_ROOT / "src" / "data" / "legacy-job-slug-redirects.json"
CACHE_JSON = REPO_ROOT / "scripts" / "cache" / "cpgis-ror-cache.json"
DATE_LINE = re.compile(r"^20\d{6}$")
ROW_PATTERN = re.compile(
    r"^(.*?)\s+available at\s+(.*?)\s+(https?://\S+)(?:\s+(.*))?$",
    re.IGNORECASE,
)

REQUIRED_COUNTRY_DISPLAY = {
    "hong_kong": "Hong Kong SAR, China",
    "macau": "Macau SAR, China",
    "taiwan": "Taiwai, China",
}

# Coordinates are department/building markers published by the institutions.
# See docs/geography-policy.md for the source URLs and verification notes.
INSTITUTION_LOCATION_OVERRIDES = (
    {
        # The generic department name previously resolved to the Institute of
        # Geography in Almaty. Keep the university name in the match so other
        # institutes and the unrelated Augsburg University in Minnesota are
        # not moved to Germany.
        "aliases": (
            "university of augsburg",
            "chair group of model-based environmental exposure science, augsburg university",
        ),
        "address": "University of Augsburg, Universitaetsstrasse 2, 86159 Augsburg, Germany",
        "city": "Augsburg",
        "country": "Germany",
        "latitude": 48.37154,
        "longitude": 10.89851,
    },
    {
        "aliases": ("cornell university",),
        "address": "Cornell University, Ithaca, NY 14850, United States",
        "city": "Ithaca",
        "country": "United States",
        "latitude": 42.452916,
        "longitude": -76.4800635,
    },
    {
        # "Victoria University" is also the name of institutions in Uganda
        # and Australia. Match the complete Canadian department name (and the
        # current source URL) rather than the short university name alone.
        "aliases": ("department of geography, university of victoria",),
        "application_urls": ("https://bit.ly/44ijsyh",),
        "address": (
            "Department of Geography, David Turpin Building, University of "
            "Victoria, 3800 Finnerty Road, Victoria, BC V8P 5C2, Canada"
        ),
        "city": "Victoria",
        "country": "Canada",
        "latitude": 48.464991,
        "longitude": -123.314226,
    },
    {
        # ENS is a highly ambiguous abbreviation and École Normale Supérieure
        # exists in several countries. This record names the Paris geosciences
        # department, so keep the matcher specific to the full affiliation.
        "aliases": (
            "department of geoscience, ecole normale supérieure (ens)",
            "department of geoscience, école normale supérieure (ens)",
        ),
        "application_urls": ("https://bit.ly/3ryazqf",),
        "address": (
            "Department of Geosciences, Ecole Normale Superieure, "
            "24 Rue Lhomond, 75005 Paris, France"
        ),
        "city": "Paris",
        "country": "France",
        "latitude": 48.84252,
        "longitude": 2.34564,
    },
    {
        "aliases": ("department of environmental science, aarhus university",),
        "application_urls": ("https://bit.ly/4pzdclg",),
        "address": (
            "Aarhus University, Frederiksborgvej 399, 4000 Roskilde, Denmark"
        ),
        "city": "Roskilde",
        "country": "Denmark",
        "latitude": 55.692568,
        "longitude": 12.103063,
    },
    {
        "aliases": (
            "department of business development and technology, aarhus university",
        ),
        "address": (
            "Aarhus University, Birk Centerpark 15, 7400 Herning, Denmark"
        ),
        "city": "Herning",
        "country": "Denmark",
        "latitude": 56.129435,
        "longitude": 9.02711,
    },
    {
        "application_urls": ("https://bit.ly/43mrvt8",),
        "address": (
            "Aarhus University Research Centre Flakkebjerg, "
            "Forsoegsvej 1, 4200 Slagelse, Denmark"
        ),
        "city": "Slagelse",
        "country": "Denmark",
        "latitude": 55.325344,
        "longitude": 11.391328,
    },
    {
        "aliases": (
            "department of electrical and computer engineering, aarhus university",
            "department of biology, aarhus university",
        ),
        "application_urls": (
            "https://bit.ly/4atp5ah",
            "https://bit.ly/49ezxzu",
            "https://bit.ly/4kzchbr",
            "https://bit.ly/4av1dhu",
        ),
        "address": "Aarhus University, Nordre Ringgade 1, 8000 Aarhus C, Denmark",
        "city": "Aarhus",
        "country": "Denmark",
        "latitude": 56.1670905,
        "longitude": 10.2026177,
    },
    {
        "aliases": ("bartlett centre for advanced spatial analysis",),
        "address": (
            "UCL Bartlett Centre for Advanced Spatial Analysis, Maple House, "
            "149 Tottenham Court Road, London W1T 7NF, United Kingdom"
        ),
        "city": "London",
        "country": "United Kingdom",
        "latitude": 51.5243894,
        "longitude": -0.1374139,
    },
    {
        "aliases": ("bartlett school of architecture, university college london",),
        "address": (
            "UCL Bartlett School of Architecture, 22 Gordon Street, "
            "London WC1H 0QB, United Kingdom"
        ),
        "city": "London",
        "country": "United Kingdom",
        "latitude": 51.525885,
        "longitude": -0.1326242,
    },
    {
        "aliases": (
            "department of civil, environmental and geomatic engineering, "
            "university college london",
        ),
        "address": (
            "UCL Civil, Environmental and Geomatic Engineering, Chadwick Building, "
            "Gower Street, London WC1E 6BT, United Kingdom"
        ),
        "city": "London",
        "country": "United Kingdom",
        "latitude": 51.5240483,
        "longitude": -0.1340167,
    },
    {
        "aliases": ("lancaster medical school, lancaster university",),
        "address": (
            "Lancaster Medical School, Lancaster University, "
            "Lancaster LA1 4YW, United Kingdom"
        ),
        "city": "Lancaster",
        "country": "United Kingdom",
        "latitude": 54.0099461,
        "longitude": -2.787598,
    },
    {
        "aliases": ("nijmegen school of management, radboud university",),
        "address": (
            "Nijmegen School of Management, Heyendaalseweg 141, "
            "6525 AJ Nijmegen, The Netherlands"
        ),
        "city": "Nijmegen",
        "country": "The Netherlands",
        "latitude": 51.8215173,
        "longitude": 5.8634329,
    },
    {
        "aliases": ("newcastle university",),
        "address": (
            "Newcastle University, Newcastle upon Tyne NE1 7RU, United Kingdom"
        ),
        "city": "Newcastle upon Tyne",
        "country": "United Kingdom",
        "latitude": 54.9801751,
        "longitude": -1.6146802,
    },
    {
        "aliases": ("university of plymouth",),
        "address": (
            "University of Plymouth, Drake Circus, Plymouth PL4 8AA, United Kingdom"
        ),
        "city": "Plymouth",
        "country": "United Kingdom",
        "latitude": 50.3757001,
        "longitude": -4.1393786,
    },
    {
        "aliases": ("university of washington tacoma",),
        "address": (
            "University of Washington Tacoma, 1900 Commerce Street, "
            "Tacoma, WA 98402, United States"
        ),
        "city": "Tacoma",
        "country": "United States",
        "latitude": 47.2450762,
        "longitude": -122.4397174,
    },
    {
        "aliases": ("queensland university of technology",),
        "address": (
            "Queensland University of Technology, Gardens Point Campus, "
            "2 George Street, Brisbane QLD 4000, Australia"
        ),
        "city": "Brisbane",
        "country": "Australia",
        "latitude": -27.4773884,
        "longitude": 153.0283366,
    },
    {
        "aliases": (
            "research unit of sensor and remote sensing, the french national "
            "research institute for agriculture, food, and environment",
        ),
        "address": (
            "INRAE UMR TETIS, Maison de la Teledetection, "
            "500 Rue Jean-Francois Breton, 34093 Montpellier, France"
        ),
        "city": "Montpellier",
        "country": "France",
        "latitude": 43.645311,
        "longitude": 3.8767479,
    },
    {
        "application_urls": ("https://bit.ly/4fntsn5",),
        "address": (
            "Western Sydney University Engineering Innovation Hub, "
            "6 Hassall Street, Parramatta NSW 2150, Australia"
        ),
        "city": "Parramatta",
        "country": "Australia",
        "latitude": -33.8178945,
        "longitude": 151.0074062,
    },
    {
        "application_urls": ("https://bit.ly/4fpegpy",),
        "address": (
            "Western Sydney University Parramatta South Campus, "
            "Victoria Road, Rydalmere NSW 2116, Australia"
        ),
        "city": "Parramatta",
        "country": "Australia",
        "latitude": -33.809094,
        "longitude": 151.02753,
    },
    {
        "application_urls": ("https://bit.ly/40ngegy",),
        "address": (
            "Texas A&M University, 400 Bizzell Street, "
            "College Station, TX 77843, United States"
        ),
        "city": "College Station",
        "country": "United States",
        "latitude": 30.6108618,
        "longitude": -96.3520606,
    },
    {
        "aliases": ("research unit of littoral, environment and societies",),
        "address": (
            "LIENSs UMR 7266, Institut du Littoral et de l'Environnement, "
            "2 Rue Olympe de Gouges, 17000 La Rochelle, France"
        ),
        "city": "La Rochelle",
        "country": "France",
        "latitude": 46.142485,
        "longitude": -1.1572395,
    },
    {
        "aliases": ("image, city, and environment laboratory",),
        "address": (
            "LIVE UMR 7362, 3 Rue de l'Argonne, 67000 Strasbourg, France"
        ),
        "city": "Strasbourg",
        "country": "France",
        "latitude": 48.5841199,
        "longitude": 7.7715898,
    },
    {
        "aliases": ("umr 6266 idees center",),
        "address": (
            "IDEES UMR 6266, Building 7, Rue Lavoisier, "
            "76821 Mont-Saint-Aignan, France"
        ),
        "city": "Mont-Saint-Aignan",
        "country": "France",
        "latitude": 49.458834,
        "longitude": 1.0676735,
    },
    {
        "aliases": ("cnrs@create",),
        "address": (
            "CNRS@CREATE, CREATE Tower, 1 Create Way, Singapore 138602"
        ),
        "city": "Singapore",
        "country": "Singapore",
        "latitude": 1.3035244,
        "longitude": 103.773937,
    },
    {
        "aliases": ("university college dublin",),
        "address": (
            "University College Dublin, Belfield, Dublin 4, Ireland"
        ),
        "city": "Dublin",
        "country": "Ireland",
        "latitude": 53.3068499,
        "longitude": -6.2246268,
    },
    {
        "aliases": ("chalmers university of technology",),
        "address": (
            "Chalmers University of Technology, Chalmersplatsen 4, "
            "412 96 Gothenburg, Sweden"
        ),
        "city": "Gothenburg",
        "country": "Sweden",
        "latitude": 57.6897462,
        "longitude": 11.9765259,
    },
    {
        "aliases": ("university of amsterdam",),
        "excluded_aliases": ("free university of amsterdam",),
        "address": (
            "University of Amsterdam, Spui 21, 1012 WX Amsterdam, "
            "The Netherlands"
        ),
        "city": "Amsterdam",
        "country": "The Netherlands",
        "latitude": 52.3681334,
        "longitude": 4.8898042,
    },
    {
        "aliases": ("university of vienna",),
        "address": "University of Vienna, Universitaetsring 1, 1010 Vienna, Austria",
        "city": "Vienna",
        "country": "Austria",
        "latitude": 48.2131278,
        "longitude": 16.3606855,
    },
    {
        "aliases": (
            "potsdam institute for climate impact research",
            "postdam institute for climate impact research",
        ),
        "address": (
            "Potsdam Institute for Climate Impact Research, Telegrafenberg A31, "
            "14473 Potsdam, Germany"
        ),
        "city": "Potsdam",
        "country": "Germany",
        "latitude": 52.3806374,
        "longitude": 13.0642063,
    },
    {
        "aliases": ("leibniz institute for baltic sea research",),
        "address": (
            "Leibniz Institute for Baltic Sea Research Warnemuende, "
            "Seestrasse 15, 18119 Rostock, Germany"
        ),
        "city": "Rostock",
        "country": "Germany",
        "latitude": 54.1795499,
        "longitude": 12.0817229,
    },
    {
        "aliases": ("alfred wegener institute",),
        "address": (
            "Alfred Wegener Institute, Am Handelshafen 12, "
            "27570 Bremerhaven, Germany"
        ),
        "city": "Bremerhaven",
        "country": "Germany",
        "latitude": 53.5332936,
        "longitude": 8.5801243,
    },
    {
        "aliases": (
            "federal institute of technology zurich (eth zurich)",
            "eth zurich",
        ),
        "address": "ETH Zurich, Raemistrasse 101, 8092 Zurich, Switzerland",
        "city": "Zurich",
        "country": "Switzerland",
        "latitude": 47.3764545,
        "longitude": 8.5481666,
    },
    {
        "aliases": ("university at buffalo",),
        "address": (
            "University at Buffalo South Campus, 3435 Main Street, "
            "Buffalo, NY 14214, United States"
        ),
        "city": "Buffalo",
        "country": "United States",
        "latitude": 42.9533636,
        "longitude": -78.8185843,
    },
    {
        "aliases": ("university of gothenburg", "university of gotherburg"),
        "address": (
            "University of Gothenburg Faculty of Science, Guldhedsgatan 5A, "
            "Gothenburg, Sweden"
        ),
        "city": "Gothenburg",
        "country": "Sweden",
        "latitude": 57.6845012,
        "longitude": 11.9637212,
    },
    {
        "aliases": ("university of bergen",),
        "address": (
            "University of Bergen Department of Biological Sciences, "
            "Thormoehlens gate 53A, 5006 Bergen, Norway"
        ),
        "city": "Bergen",
        "country": "Norway",
        "latitude": 60.381012,
        "longitude": 5.331927,
    },
    {
        "aliases": ("northeastern university",),
        "excluded_aliases": ("northeastern university london",),
        "address": (
            "Northeastern University, 360 Huntington Avenue, "
            "Boston, MA 02115, United States"
        ),
        "city": "Boston",
        "country": "United States",
        "latitude": 42.3351065,
        "longitude": -71.0892575,
    },
    {
        "aliases": ("university of st. gallen", "university of st gallen"),
        "address": (
            "University of St. Gallen, Dufourstrasse 50, "
            "9000 St. Gallen, Switzerland"
        ),
        "city": "St. Gallen",
        "country": "Switzerland",
        "latitude": 47.4300025,
        "longitude": 9.3722184,
    },
    {
        "aliases": (
            "university of texas southwestern medical center",
            "ut southwestern medical center",
        ),
        "address": (
            "UT Southwestern Medical Center, 5323 Harry Hines Boulevard, "
            "Dallas, TX 75390, United States"
        ),
        "city": "Dallas",
        "country": "United States",
        "latitude": 32.812043,
        "longitude": -96.8417201,
    },
    {
        "aliases": (
            "department of biology and school of geography and the environment",
        ),
        "address": (
            "University of Oxford School of Geography and the Environment, "
            "South Parks Road, Oxford OX1 3QY, United Kingdom"
        ),
        "city": "Oxford",
        "country": "United Kingdom",
        "latitude": 51.7589986,
        "longitude": -1.2517095,
    },
    {
        "aliases": ("department of geography, geomatics and environment",),
        "address": (
            "University of Toronto Mississauga, 3359 Mississauga Road, "
            "Mississauga, ON L5L 1C6, Canada"
        ),
        "city": "Mississauga",
        "country": "Canada",
        "latitude": 43.5502208,
        "longitude": -79.6626584,
    },
    {
        "aliases": (
            "center for advanced infrastructure and transportation, rutgers university",
        ),
        "address": (
            "Rutgers Center for Advanced Infrastructure and Transportation, "
            "100 Brett Road, Piscataway, NJ 08854, United States"
        ),
        "city": "Piscataway",
        "country": "United States",
        "latitude": 40.5215445,
        "longitude": -74.4650785,
    },
    {
        "aliases": ("opengeohub foundation",),
        "address": (
            "OpenGeoHub Foundation, Waldeck Pyrmontlaan 14, "
            "6865 HK Doorwerth, The Netherlands"
        ),
        "city": "Doorwerth",
        "country": "The Netherlands",
        "latitude": 51.9796465,
        "longitude": 5.8016545,
    },
    {
        "aliases": ("leibniz centre for tropical marine research",),
        "address": (
            "Leibniz Centre for Tropical Marine Research, Fahrenheitstrasse 6, "
            "28359 Bremen, Germany"
        ),
        "city": "Bremen",
        "country": "Germany",
        "latitude": 53.1078984,
        "longitude": 8.8460396,
    },
    {
        "aliases": ("area @rgs_ibg",),
        "address": (
            "Royal Geographical Society with IBG, 1 Kensington Gore, "
            "London SW7 2AR, United Kingdom"
        ),
        "city": "London",
        "country": "United Kingdom",
        "latitude": 51.5013114,
        "longitude": -0.1752543,
    },
    {
        "aliases": (
            "research unit of coastline, environment, remote sensing, geomatics",
        ),
        "address": (
            "LETG Rennes, Universite Rennes 2, Place du Recteur Henri Le Moal, "
            "35043 Rennes, France"
        ),
        "city": "Rennes",
        "country": "France",
        "latitude": 48.1193249,
        "longitude": -1.7014997,
    },
    {
        "aliases": ("research unit of environment city society",),
        "address": "UMR 5600 EVS, 18 Rue Chevreul, 69007 Lyon, France",
        "city": "Lyon",
        "country": "France",
        "latitude": 45.7493031,
        "longitude": 4.8378288,
    },
    {
        "aliases": (
            "laboratory of oceanic, continental environments and paleoenvironments",
        ),
        "address": (
            "UMR CNRS 5805 EPOC, Allee Geoffroy Saint-Hilaire, "
            "33615 Pessac, France"
        ),
        "city": "Pessac",
        "country": "France",
        "latitude": 44.8040222,
        "longitude": -0.6081499,
    },
    {
        # Keep the word order exact: this must not match York University in
        # Toronto, nor New York University.
        "aliases": ("university of york",),
        "address": "University of York, Heslington, York YO10 5DD, United Kingdom",
        "city": "York",
        "country": "United Kingdom",
        "latitude": 53.9484189,
        "longitude": -1.0535445,
    },
    {
        "aliases": ("the chinese university of hong kong",),
        "address": (
            "2nd Floor, Wong Foo Yuan Building, The Chinese University of "
            "Hong Kong, Shatin, N.T., Hong Kong SAR, China"
        ),
        "city": "Sha Tin",
        "country": REQUIRED_COUNTRY_DISPLAY["hong_kong"],
        "latitude": 22.415219,
        "longitude": 114.208674,
    },
    {
        "aliases": ("the hong kong polytechnic university",),
        "address": (
            "Room ZS621, 6/F, South Wing, Block Z, Phase 8, "
            "181 Chatham Road South, The Hong Kong Polytechnic University, "
            "Hung Hom, Kowloon, Hong Kong"
        ),
        "city": "Hung Hom",
        "country": REQUIRED_COUNTRY_DISPLAY["hong_kong"],
        "latitude": 22.306436,
        "longitude": 114.179501,
    },
    {
        "aliases": ("the university of hong kong",),
        "address": (
            "10/F, The Jockey Club Tower, Centennial Campus, "
            "Pokfulam Road, Hong Kong"
        ),
        "city": "Pok Fu Lam",
        "country": REQUIRED_COUNTRY_DISPLAY["hong_kong"],
        "latitude": 22.2831742305872,
        "longitude": 114.134704281723,
    },
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


def country_key(value: str) -> str:
    value = normalize_text(value).lower()
    return re.sub(r"[.,]", "", value)


def normalize_country_display(country: str) -> str:
    key = country_key(country)
    if key in {
        "hong kong",
        "hong kong sar",
        "hong kong sar china",
        "hong kong china",
        "hong kong special administrative region",
        "hong kong special administrative region china",
    }:
        return REQUIRED_COUNTRY_DISPLAY["hong_kong"]
    if key in {
        "macao",
        "macao sar",
        "macao sar china",
        "macao china",
        "macau",
        "macau sar",
        "macau sar china",
        "macau china",
        "macao special administrative region",
        "macao special administrative region china",
        "macau special administrative region",
        "macau special administrative region china",
    }:
        return REQUIRED_COUNTRY_DISPLAY["macau"]
    if key in {
        "taiwan",
        "taiwan china",
        "taiwan province of china",
        "taiwai",
        "taiwai china",
    }:
        return REQUIRED_COUNTRY_DISPLAY["taiwan"]
    return normalize_text(country)


def get_institution_location_override(
    organization: str,
    ror_id: str | None = None,
    application_url: str | None = None,
) -> dict | None:
    organization_key = normalize_text(organization).lower()
    application_url_key = normalize_text(application_url or "").lower()
    for override in INSTITUTION_LOCATION_OVERRIDES:
        excluded_aliases = override.get("excluded_aliases", ())
        alias_match = any(
            alias in organization_key for alias in override.get("aliases", ())
        )
        url_match = application_url_key in override.get("application_urls", ())
        excluded = any(alias in organization_key for alias in excluded_aliases)
        if (alias_match or url_match) and not excluded:
            return {
                "matched": True,
                "canonical_name": override["address"],
                "city": override["city"],
                "country": override["country"],
                "latitude": override["latitude"],
                "longitude": override["longitude"],
                "ror_id": ror_id,
            }

    return None


def apply_location_policy(
    organization: str,
    location: dict,
    application_url: str | None = None,
) -> dict:
    institution_override = get_institution_location_override(
        organization, location.get("ror_id"), application_url
    )
    if institution_override is not None:
        return institution_override

    normalized = dict(location)
    normalized["canonical_name"] = location.get("canonical_name") or location.get(
        "address"
    )
    normalized["country"] = normalize_country_display(str(location["country"]))
    return normalized


def readable_slug(value: str) -> str:
    value = normalize_text(value).lower()
    value = re.sub(r"[\"']", "", value)
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"^-+|-+$", "", value)
    return value


def create_job_slug(organization: str, title: str, application_url: str) -> str:
    identity_hash = create_job_identity_hash(organization, title, application_url)
    prefix = readable_slug(f"{organization}-{title}")[:63] or "job"
    return f"{prefix}-{identity_hash[:16]}"


def create_job_identity_hash(
    organization: str, title: str, application_url: str
) -> str:
    identity = "\n".join(
        (
            "cpgis-job-v1",
            normalize_text(organization).lower(),
            normalize_text(title).lower(),
            normalize_text(application_url),
        )
    )
    return hashlib.sha256(identity.encode("utf-8")).hexdigest()


def create_job_id(organization: str, title: str, application_url: str) -> str:
    identity_hash = create_job_identity_hash(organization, title, application_url)
    return f"job-{identity_hash[:24]}"


def create_legacy_job_slug(organization: str, title: str) -> str:
    return readable_slug(f"{organization}-{title}")[:80]


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


def extract_rows(source_docx: Path) -> list[ParsedRow]:
    text = subprocess.check_output(
        ["textutil", "-convert", "txt", "-stdout", str(source_docx)],
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

    result: dict | None = None
    url = (
        "https://api.ror.org/organizations?affiliation="
        + urllib.parse.quote(affiliation)
    )

    try:
        payload = fetch_json(url)
    except Exception:
        payload = {}

    items = payload.get("items", []) if isinstance(payload, dict) else []
    chosen_item = next(
        (item for item in items if item.get("chosen") is True),
        None,
    )
    if chosen_item is not None:
        organization = chosen_item.get("organization", chosen_item)
        locations = organization.get("locations", [])
        if locations:
            geonames = locations[0].get("geonames_details", {})
            names = organization.get("names", [])
            canonical_name = next(
                (
                    name.get("value")
                    for name in names
                    if "ror_display" in name.get("types", [])
                ),
                None,
            )
            result = {
                "matched": True,
                "canonical_name": canonical_name or query,
                "city": geonames.get("name"),
                "country": geonames.get("country_name"),
                "latitude": geonames.get("lat"),
                "longitude": geonames.get("lng"),
                "ror_id": organization.get("id"),
            }

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


def build_jobs(source_docx: Path) -> list[dict]:
    rows = extract_rows(source_docx)
    cache = load_cache()
    jobs: list[dict] = []
    total_rows = len(rows)

    for index, row in enumerate(rows, start=1):
        query = derive_query(row.organization)
        location = get_institution_location_override(
            row.organization,
            application_url=row.application_url,
        )
        if location is None:
            location = apply_location_policy(
                row.organization,
                lookup_ror(query, row.organization, cache),
                row.application_url,
            )
        if index % 25 == 0:
            save_cache(cache)
            print(f"Processed {index}/{total_rows} rows", flush=True)
        deadline_text, apply_by = parse_deadline(row.trailing_text)
        slug = create_job_slug(row.organization, row.title, row.application_url)
        created_at = f"{row.source_date or '2023-01-01'}T09:00:00.000Z"

        jobs.append(
            {
                "id": create_job_id(
                    row.organization,
                    row.title,
                    row.application_url,
                ),
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
    slugs = [job["slug"] for job in jobs]
    if len(slugs) != len(set(slugs)):
        raise RuntimeError("Stable job slug collision detected; no output was written")
    ids = [job["id"] for job in jobs]
    if len(ids) != len(set(ids)):
        raise RuntimeError("Stable job ID collision detected; no output was written")
    return jobs


def write_legacy_slug_policy(jobs: list[dict]) -> None:
    legacy_slugs = [
        create_legacy_job_slug(str(job["organization"]), str(job["title"]))
        for job in jobs
    ]
    counts: dict[str, int] = {}
    for slug in legacy_slugs:
        counts[slug] = counts.get(slug, 0) + 1

    redirects = {
        old_slug: job["slug"]
        for old_slug, job in zip(legacy_slugs, jobs)
        if counts[old_slug] == 1 and old_slug != job["slug"]
    }
    canonical_to_legacy = {
        str(job["slug"]): old_slug
        for old_slug, job in zip(legacy_slugs, jobs)
    }
    ambiguous = sorted(slug for slug, count in counts.items() if count > 1)
    LEGACY_SLUGS_JSON.write_text(
        json.dumps(
            {
                "redirects": dict(sorted(redirects.items())),
                "ambiguous": ambiguous,
                "canonicalToLegacy": dict(sorted(canonical_to_legacy.items())),
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n"
    )


def rewrite_existing_slugs() -> None:
    jobs = json.loads(OUTPUT_JSON.read_text())

    for job in jobs:
        job["id"] = create_job_id(
            str(job["organization"]),
            str(job["title"]),
            str(job["applicationUrl"]),
        )
        job["slug"] = create_job_slug(
            str(job["organization"]),
            str(job["title"]),
            str(job["applicationUrl"]),
        )

    slugs = [job["slug"] for job in jobs]
    if len(slugs) != len(set(slugs)):
        raise RuntimeError("Stable job slug collision detected; no output was written")
    ids = [job["id"] for job in jobs]
    if len(ids) != len(set(ids)):
        raise RuntimeError("Stable job ID collision detected; no output was written")

    OUTPUT_JSON.write_text(json.dumps(jobs, indent=2, ensure_ascii=False) + "\n")
    write_legacy_slug_policy(jobs)
    print(f"Rewrote {len(jobs)} stable slugs in {OUTPUT_JSON}")
    print(f"Wrote legacy slug policy to {LEGACY_SLUGS_JSON}")


def rewrite_existing_locations() -> None:
    jobs = json.loads(OUTPUT_JSON.read_text())

    for job in jobs:
        location = dict(job["location"])
        normalized = apply_location_policy(
            str(job["organization"]),
            location,
            str(job["applicationUrl"]),
        )
        job["location"] = {
            "label": f"{normalized['city']}, {normalized['country']}",
            "address": normalized["canonical_name"],
            "city": normalized["city"],
            "country": normalized["country"],
            "latitude": float(normalized["latitude"]),
            "longitude": float(normalized["longitude"]),
        }

    OUTPUT_JSON.write_text(json.dumps(jobs, indent=2, ensure_ascii=False) + "\n")
    print(f"Rewrote {len(jobs)} location records in {OUTPUT_JSON}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--rewrite-existing-slugs",
        action="store_true",
        help="Rewrite only the committed JSON identities without reading DOCX or geocoding",
    )
    parser.add_argument(
        "--rewrite-existing-locations",
        action="store_true",
        help="Apply display and institution location policy to committed JSON",
    )
    parser.add_argument(
        "--source-docx",
        type=Path,
        help="Path to the source CPGIS .docx file (required for a full rebuild)",
    )
    args = parser.parse_args()

    if args.rewrite_existing_slugs:
        rewrite_existing_slugs()
        return

    if args.rewrite_existing_locations:
        rewrite_existing_locations()
        return

    if args.source_docx is None:
        parser.error("--source-docx is required unless --rewrite-existing-slugs is used")

    source_docx = args.source_docx.expanduser().resolve()
    if not source_docx.is_file():
        parser.error(f"source DOCX does not exist or is not a file: {source_docx}")
    if source_docx.suffix.lower() != ".docx":
        parser.error(f"source file must use the .docx extension: {source_docx}")

    jobs = build_jobs(source_docx)
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(jobs, indent=2, ensure_ascii=False) + "\n")
    write_legacy_slug_policy(jobs)
    matched = sum(
        1
        for job in jobs
        if job["location"]["latitude"] != 0 or job["location"]["longitude"] != 0
    )
    print(f"Wrote {len(jobs)} jobs to {OUTPUT_JSON}")
    print(f"Wrote legacy slug policy to {LEGACY_SLUGS_JSON}")
    print(f"Geocoded or matched {matched} jobs")


if __name__ == "__main__":
    main()
