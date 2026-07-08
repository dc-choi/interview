---
name: memo
description: Organize pasted notes, lecture notes, seminar notes, learning notes, blog posts, article URLs, or rough study material into this interview vault. Use when the user asks for memo 정리, 강의 내용 정리, 세미나 내용 정리, 학습 내용 정리, 이거 정리해줘, 블로그 or 아티클 정리, or asks to turn a URL/text into structured project notes.
---

# Memo

## Overview

Use this as the Codex-compatible version of `.claude/skills/memo/SKILL.md`. Do not replace, rename, or remove the Claude skill.

Before writing, read `CLAUDE.md`, especially `Memo Notes`, `표기 규칙`, `개인정보`, `Document Length`, and `Folder Structure`.

## Workflow

1. Classify the input.
   - If the input is an `http` or `https` URL, fetch the source with browsing when available. If extraction is poor, search for supporting context. If the page is YouTube, login-gated, or otherwise unavailable, ask the user for the original text. After fetching, state the inferred topic in one sentence and confirm it with the user before proceeding to categorize and write.
   - If the input is pasted text, infer the main topic and target category directly.
   - If the text contains the object replacement character `￼`, inspect likely related image files on `~/Desktop/` when filesystem access allows it.
2. Identify the topic and category.
   - Split mixed notes by topic.
   - Read the relevant category index file before deciding where to write.
   - Prefer updating an existing note when the concept already exists.
3. Create or update topic-centered vault notes.
   - The source is only a trigger. Write the note as a reusable reference for the concept, pattern, term, or technology itself.
   - If the source is a blog or article, do not make the document a blog summary.
   - If the content spans multiple categories, distribute it into the most relevant existing categories instead of forcing one large note.
4. Connect the note.
   - Update the category index checklist from `[ ]` to `[x]` when an existing planned topic is completed.
   - Add a new checklist item when the topic is new.
   - Add or update a `## 관련 문서` section with useful local Obsidian links.
   - Use `[[파일명|표시명]]` after confirming the target exists.
5. Update rollups.
   - Update `README.md` progress numbers when category index counts change.
   - Keep existing README and index style.

## Category Map

- `tech/computer-science/`: CS and programming
- `tech/web/`: web and network
- `tech/os-runtime/`: OS and runtime, including Node.js, NestJS, Spring
- `tech/database/`: data and storage
- `tech/messaging-data-pipeline/`: messaging and data pipelines
- `tech/architecture-design/`: architecture and design
- `tech/performance-scalability/`: performance and scalability
- `tech/infrastructure-cloud/`: infrastructure and cloud
- `tech/ci-cd/`: CI/CD and deployment
- `tech/observability/`: observability
- `tech/reliability/`: reliability engineering
- `tech/testing-quality/`: testing and quality
- `tech/security/`: security
- `tech/fin-ops/`: cost and operations
- `tech/senior/`: senior engineering skills
- `fit/`: career and interview fit

Read category index files matching `*({EnglishName}).md` to understand current checklists and existing note names.

## Note Format

Use this frontmatter shape for new knowledge notes:

```yaml
---
tags: [관련태그]
status: done
category: "카테고리명"
aliases: ["English Name", "한글명"]
---
```

Write normal Markdown, not a fenced code block, unless the note specifically needs code examples.

## Source-Centered Writing Ban

For blog posts and articles, the source is the trigger, not the target. The note must be source-neutral enough that another source about the same topic can later be added by appending one line to `## 출처`.

Avoid source-dependent wording:

- `원문에 따르면`
- `저자는 이렇게 주장한다`
- `이 글은 ...를 다룬다`
- `원문의 핵심 주장`
- `필자가 강조한 것`

Avoid the structure `원문 요약 -> 내 입장 -> 면접 답변 탄약`, except for explicit `fit/` interview-ammunition documents.

Prefer a topic-centered structure:

- definition
- mental model or mechanism
- examples
- tradeoffs
- operational or interview checkpoints
- related documents
- sources

Put sources at the bottom:

```markdown
## 출처

- [제목 - 저자/매체](URL)
```

Do not pull one-off author anecdotes, company names, or years into the core explanation unless they belong in a short example section.

## Seminar Handling

When the user calls the input a seminar:

1. Create or update topic-centered knowledge notes in the relevant categories.
2. Also preserve the original context under `fit/` with `status: seminar`.
3. Structure the seminar file by session so the original context stays readable.
4. Add the seminar file to the README seminar section.
5. Link from relevant category index case-study sections to the seminar section when useful.

For lectures, study notes, and general learning notes, create or update knowledge notes only. Do not preserve a separate original file unless the user asks.

## Writing Constraints

- Do not use middle dots.
- Avoid quote-mark emphasis in Korean writing.
- Do not store third-party real names, contact details, or personal compensation numbers.
- Keep the user's own name as `[이름]` in self-introduction style text unless the user explicitly asks otherwise.
- Do not put generated content inside code fences unless the user specifically needs code.
- Split Markdown documents that exceed 200 lines unless they match a `CLAUDE.md` exception.
- If a leaf folder would exceed the folder-structure rules in `CLAUDE.md`, reorganize according to those rules instead of adding one more loose file.
