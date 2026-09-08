import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from lexical import LexicalIndex


ROWS = [
    {
        "id": "a-title-match",
        "path": "tech/search/Title.md",
        "title": "Needle retrieval",
        "heading": "Overview",
        "text": "A short explanation.",
    },
    {
        "id": "body-match",
        "path": "tech/search/Body.md",
        "title": "Other note",
        "heading": "Details",
        "text": "Needle appears in body text.",
    },
    {
        "id": "korean-runner",
        "path": "tech/database/Runner.md",
        "title": "TypeORM transaction",
        "heading": "QueryRunner connection cleanup",
        "text": "직접 빌린 커넥션은 finally에서 release한다.",
    },
    {
        "id": "z-econ-needle",
        "path": "econ/Needle.md",
        "title": "Needle portfolio",
        "heading": "Rebalancing",
        "text": "A separate document.",
    },
]


class LexicalIndexTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index = LexicalIndex(ROWS)

    def test_title_weight_ranks_before_body_only_match(self):
        self.assertEqual([item["id"] for item in self.index.search("needle", [], 10)[:2]], ["a-title-match", "z-econ-needle"])

    def test_scope_filters_before_limit_and_accepts_exact_file(self):
        self.assertEqual(
            [item["id"] for item in self.index.search("needle", ["tech/search"], 1)],
            ["a-title-match"],
        )
        self.assertEqual(
            [item["id"] for item in self.index.search("needle", ["econ/Needle.md"], 10)],
            ["z-econ-needle"],
        )

    def test_korean_content_morphemes_find_the_matching_section(self):
        result = self.index.search("직접 빌린 커넥션을 정리하는 순서", ["tech"], 10)
        self.assertEqual(result[0]["id"], "korean-runner")
        self.assertGreater(result[0]["score"], 0)

    def test_particles_only_or_unknown_queries_are_empty(self):
        self.assertEqual(self.index.search("은 는 을 를", [], 10), [])
        self.assertEqual(self.index.search("qzxvnmprtjwfkblsyh", [], 10), [])

    def test_fusion_prefers_shared_evidence_without_raw_score_dominance(self):
        from rank import fuse

        left = [{"id": "lexical", "score": 1000000}, {"id": "shared", "score": 1}]
        right = [{"id": "semantic", "score": 0.9}, {"id": "shared", "score": 0.8}]
        merged = fuse(left, right, limit=3)
        self.assertEqual(merged[0]["id"], "shared")
        self.assertEqual(len({item["id"] for item in merged}), 3)


if __name__ == "__main__":
    unittest.main()
