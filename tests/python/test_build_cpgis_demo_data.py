from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


SCRIPT_PATH = (
    Path(__file__).resolve().parents[2] / "scripts" / "build_cpgis_demo_data.py"
)
SPEC = importlib.util.spec_from_file_location("build_cpgis_demo_data", SCRIPT_PATH)
assert SPEC is not None and SPEC.loader is not None
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class InstitutionOverrideTests(unittest.TestCase):
    def test_cornell_resolves_to_ithaca(self) -> None:
        result = MODULE.get_institution_location_override(
            "Department of Natural Resources and Environment, Cornell University"
        )
        self.assertIsNotNone(result)
        self.assertEqual(result["city"], "Ithaca")
        self.assertEqual(result["country"], "United States")

    def test_ambiguous_victoria_and_ens_records_use_full_affiliations(self) -> None:
        fixtures = (
            (
                "the Department of Geography, University of Victoria",
                "https://bit.ly/44IJSYh",
                "Victoria",
                "Canada",
            ),
            (
                "the Department of Geoscience, Ecole normale supérieure (ENS)",
                "https://bit.ly/3RyAzqf",
                "Paris",
                "France",
            ),
        )

        for organization, application_url, city, country in fixtures:
            with self.subTest(organization=organization):
                result = MODULE.get_institution_location_override(
                    organization,
                    application_url=application_url,
                )
                self.assertIsNotNone(result)
                self.assertEqual(result["city"], city)
                self.assertEqual(result["country"], country)

    def test_substring_collisions_do_not_match(self) -> None:
        self.assertIsNone(
            MODULE.get_institution_location_override(
                "Free University of Amsterdam"
            )
        )
        self.assertIsNone(
            MODULE.get_institution_location_override("New York University")
        )
        self.assertIsNone(
            MODULE.get_institution_location_override("York University")
        )
        self.assertIsNone(
            MODULE.get_institution_location_override("Augsburg University")
        )
        self.assertIsNone(
            MODULE.get_institution_location_override(
                "Northeastern University London"
            )
        )
        self.assertIsNone(
            MODULE.get_institution_location_override("Victoria University")
        )
        self.assertIsNone(
            MODULE.get_institution_location_override("ENS de Lyon")
        )

    def test_specific_german_augsburg_alias_still_matches(self) -> None:
        result = MODULE.get_institution_location_override(
            "Chair Group of Model-Based Environmental Exposure Science, "
            "Augsburg University"
        )
        self.assertIsNotNone(result)
        self.assertEqual(result["city"], "Augsburg")
        self.assertEqual(result["country"], "Germany")

    def test_aarhus_jobs_use_department_or_job_specific_campus(self) -> None:
        fixtures = (
            (
                "the Department of Environmental Science, Aarhus University",
                "https://bit.ly/44LF481",
                "Roskilde",
            ),
            (
                "the Department of Business Development and Technology, "
                "Aarhus University",
                "https://bit.ly/47cLPhu",
                "Herning",
            ),
            (
                "the Department of Agroecology, Aarhus University",
                "https://bit.ly/43MrvT8",
                "Slagelse",
            ),
            (
                "the Department of Ecoscience, Aarhus University",
                "https://bit.ly/4pZdCLg",
                "Roskilde",
            ),
            (
                "the Department of Ecoscience, Aarhus University",
                "https://bit.ly/4aV1DHU",
                "Aarhus",
            ),
        )

        for organization, application_url, expected_city in fixtures:
            with self.subTest(application_url=application_url):
                result = MODULE.get_institution_location_override(
                    organization,
                    application_url=application_url,
                )
                self.assertIsNotNone(result)
                self.assertEqual(result["city"], expected_city)


class RorLookupTests(unittest.TestCase):
    def test_accepts_only_ror_affiliation_result_marked_chosen(self) -> None:
        payload = {
            "items": [
                {
                    "chosen": False,
                    "organization": {
                        "id": "https://ror.org/wrong",
                        "names": [{"value": "Wrong", "types": ["ror_display"]}],
                        "locations": [
                            {
                                "geonames_details": {
                                    "name": "Wrong City",
                                    "country_name": "Wrong Country",
                                    "lat": 1,
                                    "lng": 2,
                                }
                            }
                        ],
                    },
                },
                {
                    "chosen": True,
                    "organization": {
                        "id": "https://ror.org/correct",
                        "names": [
                            {"value": "Correct University", "types": ["ror_display"]}
                        ],
                        "locations": [
                            {
                                "geonames_details": {
                                    "name": "Correct City",
                                    "country_name": "Correct Country",
                                    "lat": 3,
                                    "lng": 4,
                                }
                            }
                        ],
                    },
                },
            ]
        }

        with patch.object(MODULE, "fetch_json", return_value=payload) as fetch:
            result = MODULE.lookup_ror("University", "Department, University", {})

        self.assertEqual(result["canonical_name"], "Correct University")
        self.assertEqual(result["city"], "Correct City")
        self.assertIn("affiliation=", fetch.call_args.args[0])
        self.assertNotIn("?query=", fetch.call_args.args[0])

    def test_falls_back_when_ror_does_not_choose_a_match(self) -> None:
        fallback = {
            "matched": True,
            "canonical_name": "Nominatim University",
            "city": "Fallback City",
            "country": "Fallback Country",
            "latitude": 5,
            "longitude": 6,
            "ror_id": None,
        }

        with (
            patch.object(
                MODULE,
                "fetch_json",
                return_value={"items": [{"chosen": False}]},
            ),
            patch.object(MODULE, "lookup_nominatim", return_value=fallback) as lookup,
        ):
            result = MODULE.lookup_ror("University", "Department, University", {})

        self.assertEqual(result, fallback)
        lookup.assert_called_once_with("University")


if __name__ == "__main__":
    unittest.main()
