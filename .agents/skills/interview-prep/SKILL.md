---
name: interview-prep
description: Create company-specific interview preparation documents from a job description URL, resume, portfolio, company stage, and interview round. Use when the user asks for 면접 준비, 면접 분석, 인터뷰 준비, JD 분석, 예상 질문, 역질문, or company-specific fit and technical interview prep.
---

# Interview Prep

## Overview

Use this as a Codex compatibility copy of `.claude/skills/interview-prep/SKILL.md`. Do not replace or remove the Claude skill.

Before writing, read `CLAUDE.md`, especially `Interview Prep`, `표기 규칙`, `개인정보`, and `이력서, 포트폴리오 관리`.

## Answer Placement

- Store reusable personal experience, FIT, and personal technical-experience answer bodies only in `fit/interview/common/`.
- Never save an expected question without preparation guidance.
- For factual technical questions under `fit/interview/prep/`, always include the question intent, concise core answer, common wrong answers, follow-up questions, and a canonical note or source.
- For open-ended design questions, always include an answer outline, decision criteria, alternatives, tradeoffs, and follow-up questions instead of inventing one correct answer.
- For personal experience and FIT questions, include preparation points and a link to the `common/` master without duplicating its answer body.
- Link to the canonical `tech/` note instead of duplicating a full technical reference in `prep/`.
- Keep company-specific interview documents self-contained by absorbing the selected master answer and relevant technical content.

## Required Inputs

- Job description URL or pasted JD.
- Resume path or resume text.
- Portfolio path or portfolio text when available.
- Interview round when known, such as `1st`, `2nd`, or `coffeechat`.

Ask a short question only when a required input is missing and cannot be inferred safely.

## Workflow

1. Gather source material in one pass.
   - Fetch the JD when a URL is provided.
   - Read the resume and portfolio without copying their full body into the vault.
   - Read `fit/interview/common/` master files and the full `fit/interview/prep/` guide set required by `CLAUDE.md`.
2. Verify fast-changing project metrics from source docs before embedding numbers.
3. Search the `tech/` vault for each relevant master tech card and company-specific technical domain.
4. Create or update files under `fit/interview/{company}/{round}/`.
   - Keep round-specific materials inside the round folder.
   - Keep company-root files only for materials shared across all rounds.
5. Produce a self-contained company document.
   - Do not require the user to jump to `prep/` while practicing.
   - Use master-fork style answers with company-specific mapping lines.
   - Do not duplicate personal answer bodies outside `common/` except for the selected company-specific fork.
6. Update `fit/job-search/Job-Search-Tracker.md` when a company or JD link must be tracked.

## Output Shape

Include these sections when applicable:

- JD matching table and company/domain analysis. Rate each JD requirement against the resume as 강 (direct experience with results), 중 (related but not direct, or shallow depth), or 약 (no or very weak experience).
- Company-specific FIT answers aligned with WHY, question intent, signal, replacement wording, and meta guidance.
- Technical questions and answer notes with absorbed vault content, quantitative comparisons, and likely follow-ups. Produce at least 20 expected questions: 7+ resume-based, 7+ JD-based, 5+ service-context, 5+ culture-fit.
- Reverse questions from `My-Reverse-Questions` plus company-specific questions.
- Checklist for external-blame risk, negative wording, and company connection in answer endings.
- Optional D-1 or D-day cheatsheet when the user needs a short review artifact.

## Note Format

Company documents created under `fit/interview/{company}/{round}/` use this frontmatter:

```yaml
---
tags: [fit, interview, {회사영문명소문자}]
status: active
category: "Interview - Fit"
aliases: ["{회사영문명} Interview Prep", "{회사한글명} 면접 준비"]
---
```

## Constraints

- Do not search the web for job postings when the user asks to find postings. Give platform filter URLs instead.
- Do not store third-party real names, contact details, or personal compensation numbers.
- Do not use middle dots.
- Do not create resume or portfolio body copies under `fit/job-search/resume/`.
