"""Deterministic offline BM25 retrieval over exported Markdown sections."""

from __future__ import annotations

import sqlite3
import unicodedata
from collections.abc import Iterable, Mapping

from kiwipiepy import Kiwi


# Keep lexical content while dropping particles, endings and punctuation. Kiwi
# marks English identifiers and numbers as SL and SN respectively.
_CONTENT_TAGS = frozenset({
    "MAG", "MAJ", "MM", "NP", "NR", "SH", "SL", "SN", "VV", "VA", "XR",
})


def _is_content_tag(tag: str) -> bool:
    return tag.startswith("NN") or tag in _CONTENT_TAGS


def _scope_match(path: str, scopes: tuple[str, ...]) -> bool:
    return not scopes or any(path == scope or path.startswith(f"{scope}/") for scope in scopes)


class LexicalIndex:
    """An in-memory FTS5 index with BM25 title, heading and body weights."""

    def __init__(self, rows: Iterable[Mapping[str, str]]):
        self._kiwi = Kiwi(num_workers=4)
        self._db = sqlite3.connect(":memory:")
        self._db.execute("CREATE TABLE metadata (id TEXT PRIMARY KEY, path TEXT NOT NULL)")
        self._db.execute(
            "CREATE VIRTUAL TABLE sections USING fts5(title, heading, text, tokenize='unicode61 remove_diacritics 2')",
        )
        for row in rows:
            identifier = self._required(row, "id")
            path = self._required(row, "path")
            title = self._optional(row, "title")
            heading = self._optional(row, "heading")
            text = self._optional(row, "text")
            cursor = self._db.execute("INSERT INTO metadata (id, path) VALUES (?, ?)", (identifier, path))
            self._db.execute(
                "INSERT INTO sections (rowid, title, heading, text) VALUES (?, ?, ?, ?)",
                (cursor.lastrowid, self._terms(title), self._terms(heading), self._terms(text)),
            )

    @staticmethod
    def _required(row: Mapping[str, str], field: str) -> str:
        value = row.get(field)
        if not isinstance(value, str) or not value:
            raise ValueError(f"row.{field} must be a non-empty string")
        return value

    @staticmethod
    def _optional(row: Mapping[str, str], field: str) -> str:
        value = row.get(field, "")
        if not isinstance(value, str):
            raise ValueError(f"row.{field} must be a string")
        return value

    def _tokens(self, value: str) -> list[str]:
        return [
            unicodedata.normalize("NFC", token.form).lower()
            for token in self._kiwi.tokenize(value)
            if _is_content_tag(token.tag) and token.form
        ]

    def _terms(self, value: str) -> str:
        return " ".join(self._tokens(value))

    @staticmethod
    def _quoted(token: str) -> str:
        return '"' + token.replace('"', '""') + '"'

    @staticmethod
    def _normalize_scopes(scopes: Iterable[str] | None) -> tuple[str, ...]:
        if scopes is None:
            return ()
        normalized = set()
        for scope in scopes:
            if not isinstance(scope, str):
                raise ValueError("scope must be a string")
            value = scope.strip("/")
            if value in {"", "."}:
                return ()
            normalized.add(value)
        return tuple(sorted(normalized))

    def search(self, query: str, scopes: Iterable[str] | None, limit: int = 50) -> list[dict[str, float | str]]:
        """Return in-scope section IDs by descending BM25 score, then ID."""
        if not isinstance(query, str):
            raise ValueError("query must be a string")
        if isinstance(limit, bool) or not isinstance(limit, int) or limit < 1:
            raise ValueError("limit must be a positive integer")
        tokens = list(dict.fromkeys(self._tokens(query)))
        if not tokens:
            return []
        match = " OR ".join(self._quoted(token) for token in tokens)
        rows = self._db.execute(
            """
            SELECT metadata.id, metadata.path, -bm25(sections, 3.0, 2.0, 1.0) AS score
            FROM sections JOIN metadata ON metadata.rowid = sections.rowid
            WHERE sections MATCH ?
            ORDER BY score DESC, metadata.id ASC
            """,
            (match,),
        )
        effective_scopes = self._normalize_scopes(scopes)
        return [
            {"id": identifier, "score": float(score)}
            for identifier, path, score in rows
            if _scope_match(path, effective_scopes)
        ][:limit]
