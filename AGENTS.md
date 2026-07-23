# Codex Project Instructions

This repository is used with both Claude and Codex. `CLAUDE.md` files are the canonical repository rules and user context. `AGENTS.md` is a thin Codex router and must not duplicate domain rules.

## Instruction Loading

- Before working, read the root `CLAUDE.md` and every `CLAUDE.md` from the repository root to the target path.
- When no target path is given, infer the domain from the request using the routing table below and read the same instruction chain before answering or changing files.
- When a task spans multiple target paths, read only the domain files for those paths. Do not preload unrelated sibling-domain instructions.
- Use `rg --files -g 'CLAUDE.md' -g 'AGENTS.md'` when the applicable instruction chain is unclear.
- Apply active system and developer instructions first, then the latest user request. Within repository instructions, load the root first and the closest domain last so the closest domain governs domain-only conflicts.

| Target path or request topic | Additional canonical instructions |
|---|---|
| `fit/**` or career, reflection, feedback and goal-setting tasks | `fit/CLAUDE.md` |
| `fit/interview/**` or interview preparation, answers, company analysis and retrospectives | `fit/CLAUDE.md`, then `fit/interview/CLAUDE.md` |
| `fit/job-search/**` or job search, tracker, resume and portfolio tasks | `fit/CLAUDE.md`, then `fit/job-search/CLAUDE.md` |
| `fit/growth/learning/**` or learning plans, roadmaps, priorities and progress | `fit/CLAUDE.md`, then `fit/growth/learning/CLAUDE.md` |
| `tech/**` or technical knowledge, technical documents and category indexes | `tech/CLAUDE.md` |

## Workflow Skills

- For company-specific interview preparation, read and use `.agents/skills/interview-prep/SKILL.md` after the applicable domain instructions.
- For memo, lecture, seminar, blog or article organization, read and use `.agents/skills/memo/SKILL.md` after the applicable domain instructions.
- Keep the matching `.claude/skills/` and `.agents/skills/` workflow bodies synchronized when either changes.

## Coexistence

- Do not delete, rename or convert `CLAUDE.md`, `.claude/` or other Claude files unless the user explicitly asks.
- Codex helpers under `.agents/` must not replace Claude settings.
- Keep durable project rules and user context in the root or closest domain `CLAUDE.md`, not only in this router.
- MCP setup and machine-local configuration rules live in the root `CLAUDE.md`; do not duplicate them here.
