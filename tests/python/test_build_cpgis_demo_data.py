from __future__ import annotations

import importlib.util
import sys
import tempfile
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

    def test_purdue_affiliations_stay_in_west_lafayette(self) -> None:
        result = MODULE.get_institution_location_override(
            "the Department of Forestry and Natural Resources, Purdue University"
        )
        self.assertIsNotNone(result)
        self.assertEqual(result["city"], "West Lafayette")
        self.assertEqual(result["country"], "United States")

    def test_pacte_cnrs_lab_resolves_to_grenoble(self) -> None:
        result = MODULE.get_institution_location_override(
            "the Pacte laboratory, National Centre for Scientific Research (CNRS)"
        )
        self.assertIsNotNone(result)
        self.assertEqual(result["city"], "Grenoble")
        self.assertEqual(result["country"], "France")

    def test_nie_singapore_beats_phnom_penh_namesake(self) -> None:
        result = MODULE.get_institution_location_override(
            "the Humanities and Social Studies Education Academic Group, "
            "National Institute of Education, Singapore"
        )
        self.assertIsNotNone(result)
        self.assertEqual(result["city"], "Singapore")
        self.assertEqual(result["country"], "Singapore")

    def test_jinan_university_guangzhou_not_jinan_city(self) -> None:
        result = MODULE.get_institution_location_override(
            "Jinan University (暨南大学), Guangzhou, China."
        )
        self.assertIsNotNone(result)
        self.assertEqual(result["city"], "Guangzhou")
        # The English name alone must not match: University of Jinan (济南大学)
        # really is in Jinan, Shandong.
        self.assertIsNone(
            MODULE.get_institution_location_override("University of Jinan")
        )

    def test_bare_costain_uses_uk_headquarters(self) -> None:
        result = MODULE.get_institution_location_override("Costain")
        self.assertIsNotNone(result)
        self.assertEqual(result["city"], "Maidenhead")
        self.assertEqual(result["country"], "United Kingdom")

    def test_misspelled_nina_stays_in_trondheim(self) -> None:
        result = MODULE.get_institution_location_override(
            "the Norwegian Institute for Natural Research"
        )
        self.assertIsNotNone(result)
        self.assertEqual(result["city"], "Trondheim")
        self.assertEqual(result["country"], "Norway")

    def test_arctic_university_of_norway_in_tromso(self) -> None:
        result = MODULE.get_institution_location_override(
            "the Department of Physics and Technology, "
            "The Arctic University of Norway (UiT)"
        )
        self.assertIsNotNone(result)
        self.assertEqual(result["city"], "Tromsø")
        self.assertEqual(result["country"], "Norway")

    def test_nature_editor_posts_land_in_london_not_lisbon(self) -> None:
        for org in (
            "Nature Communications, Springer Nature",
            "the Nature Geoscience",
            "the Communications Earth & Environment, Springer Nature",
        ):
            with self.subTest(org=org):
                result = MODULE.get_institution_location_override(org)
                self.assertIsNotNone(result)
                self.assertEqual(result["city"], "London")
                self.assertEqual(result["country"], "United Kingdom")

    def test_mott_macdonald_australia_beats_generic_entry(self) -> None:
        result = MODULE.get_institution_location_override(
            "Mott MacDonald (Victoria, Australia)"
        )
        self.assertIsNotNone(result)
        self.assertEqual(result["city"], "Melbourne")
        self.assertEqual(result["country"], "Australia")

        hq = MODULE.get_institution_location_override("Mott MacDonald")
        self.assertIsNotNone(hq)
        self.assertEqual(hq["city"], "Croydon")
        self.assertEqual(hq["country"], "United Kingdom")

    def test_inrae_generic_record_pins_to_paris_by_url(self) -> None:
        result = MODULE.get_institution_location_override(
            "the French National Research Institute for Agriculture, "
            "Food, and the Environment",
            application_url="https://bit.ly/33C3PnD",
        )
        self.assertIsNotNone(result)
        self.assertEqual(result["city"], "Paris")
        self.assertEqual(result["country"], "France")

        # Centre-level records must not be dragged to the Paris headquarters.
        self.assertIsNone(
            MODULE.get_institution_location_override(
                "the Nouvelle-Aquitaine Bordeaux Centre, French National "
                "Research Institute for Agriculture, Food, and the "
                "Environment"
            )
        )

    def test_hong_kong_shorthands_route_to_reviewed_campuses(self) -> None:
        hku = MODULE.get_institution_location_override(
            "Department of Geography, University of Hongkong"
        )
        self.assertIsNotNone(hku)
        self.assertEqual(hku["city"], "Pok Fu Lam")

        polyu = MODULE.get_institution_location_override("Hong Kong PolyU")
        self.assertIsNotNone(polyu)
        self.assertEqual(polyu["city"], "Hung Hom")

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


class ParseDeadlineTests(unittest.TestCase):
    def test_parses_apply_by_due_and_bare_apply_variants(self) -> None:
        fixtures = (
            ("Apply by 30 September 2026", "2026-09-30"),
            ("due 1 Jan 2027", "2027-01-01"),
            ("apply 6 May 2024", "2024-05-06"),
            ("Apply 13 Dec 2023", "2023-12-13"),
        )

        for phrase, expected in fixtures:
            with self.subTest(phrase=phrase):
                _, apply_by = MODULE.parse_deadline(phrase)
                self.assertEqual(apply_by, expected)

    def test_open_until_filled_and_vague_ranges_stay_unparsed(self) -> None:
        self.assertEqual(
            MODULE.parse_deadline("Position open until filled")[1], None
        )
        self.assertEqual(
            MODULE.parse_deadline("apply by mid to late Jan 2024")[1], None
        )


class ExtractRowsTests(unittest.TestCase):
    def test_reads_plain_text_feed(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            feed = Path(tmp) / "feed.txt"
            feed.write_text(
                "20260824\n"
                "Research Fellow available at Example University "
                "https://example.org/job/42 Apply by 30 September 2026\n"
                "Not a job line.\n",
                encoding="utf-8",
            )

            rows = MODULE.extract_rows(feed)

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].source_date, "2026-08-24")
        self.assertEqual(rows[0].title, "Research Fellow")
        self.assertEqual(rows[0].application_url, "https://example.org/job/42")


if __name__ == "__main__":
    unittest.main()
