import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class DatasetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads((ROOT / "data" / "ipos.json").read_text(encoding="utf-8"))
        cls.records = cls.data["records"]

    def test_unique_ids_and_required_regions(self):
        ids = [r["id"] for r in self.records]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual({"US", "Europe", "Middle East"}, {r["region"] for r in self.records})

    def test_sources_are_https(self):
        for record in self.records:
            self.assertTrue(record["sources"], record["id"])
            for source in record["sources"]:
                self.assertTrue(source["url"].startswith("https://"), source["url"])

    def test_score_formula_and_missing_data_gate(self):
        for record in self.records:
            scores = record["scores"]
            if scores["completeness"] < 60:
                self.assertIsNone(scores["research"], record["id"])
            elif scores["quality"] is not None and scores["risk"] is not None:
                expected = round(.55 * scores["quality"] + .45 * (100 - scores["risk"]))
                self.assertLessEqual(abs(expected - scores["research"]), 1, record["id"])

    def test_dates_are_explicit_or_null(self):
        for record in self.records:
            if record["expectedDate"] is None:
                self.assertEqual("unknown", record["dateConfidence"])
            else:
                self.assertRegex(record["expectedDate"], r"^\d{4}-\d{2}-\d{2}$")

if __name__ == "__main__":
    unittest.main()
