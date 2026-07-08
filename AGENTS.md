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

- `.mcp.json` is Claude-style config for the Obsidian MCP server. It is gitignored and machine-local (the vault absolute path differs per machine); copy `.mcp.json.example` and fill in this machine's absolute repo path.
- This Codex session currently has no MCP servers configured.
- If the user asks to enable the same Obsidian MCP for Codex, the equivalent command should use the current repository path:

```bash
codex mcp add obsidian -- npx -y obsidian-mcp /Users/mark/myown/interview
```

## High-Signal Reminders From CLAUDE.md

- For repos under `~/myown/`, verify git identity before committing or pushing.
- Do not store third-party PII, contact details, or personal compensation numbers in the vault.
- Do not use middle dots anywhere in new or edited text.
- Avoid quote-mark emphasis in external-facing Korean writing.
- Keep answer bodies in `fit/interview/common/`; use `prep/` for guides and meta material.
- For job-posting discovery, prefer platform filter URLs over ad hoc web search.
