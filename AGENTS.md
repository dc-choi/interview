# Codex Project Instructions

This repository is used with both Claude and Codex.

## Shared Source Of Truth

- Keep `CLAUDE.md` and `.claude/` intact. They are still used by Claude.
- Treat `CLAUDE.md` as the shared project rulebook and user context for Codex work in this repository.
- Before making document, vault, interview-prep, job-search, or git-related changes, read the relevant sections of `CLAUDE.md` and apply them when compatible with the active system, developer, and user instructions.
- If instructions conflict, follow this order: active system/developer instructions, latest user request, then `CLAUDE.md`.
- Store durable user preferences and project rules in `CLAUDE.md`, not in Codex memory.

## Coexistence Rules

- Do not delete, rename, or convert Claude files unless the user explicitly asks.
- Codex-specific skill files under `.agents/skills/` are compatibility helpers only. They must not replace Claude settings.
- If a workflow changes, update the canonical wording in `CLAUDE.md` first, then keep matching Claude and Codex helper files in sync when practical.

## MCP Notes

- `.mcp.json` is Claude's gitignored, machine-local project configuration. Run the setup commands from anywhere inside this repository so each CLI resolves this machine's repository root. Use `.mcp.json.example` only as a manual fallback.
- Claude stores the resolved path in the local project configuration, while Codex stores it in the user configuration. Register each clone separately on its machine.

```bash
claude mcp add --scope project obsidian -- npx -y obsidian-mcp "$(git rev-parse --show-toplevel)"
codex mcp add obsidian -- npx -y obsidian-mcp "$(git rev-parse --show-toplevel)"
```

## High-Signal Reminders From CLAUDE.md

- For repos under `~/myown/`, verify git identity before committing or pushing.
- Do not store third-party PII, contact details, or personal compensation numbers in the vault.
- Do not use middle dots anywhere in new or edited text.
- For volatile technical documents, verify primary sources and record `verified_at: YYYY-MM-DD` only after checking the content.
- Scope absolute claims such as always, unlimited, free, identical, and end-of-support by version, Region, edition, date, and exceptions unless an official source guarantees the full claim.
- When simplifying a technical interview answer, leave the necessary assumptions, version boundary, or exception on the card's final line.
- Do not use unresolved wiki links as TODO markers. Use a checklist with an inline-code filename, or create a real document with `status: todo`.
- Avoid quote-mark emphasis in external-facing Korean writing.
- Keep answer bodies in `fit/interview/common/`; use `prep/` for guides and meta material.
- For job-posting discovery, prefer platform filter URLs over ad hoc web search.
