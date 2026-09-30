---
tags: [ai, claude-code, automation, business, connectors, mcp]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["Claude Code Business Automation", "클로드 코드 비즈니스 자동화", "Connectors", "스케줄 태스크"]
verified_at: 2026-09-29
---

# Claude Code 비즈니스 자동화 — 문서, 데이터, 연동, 반복

코딩 없이 AI 에이전트로 사무 업무를 자동화하는 패턴. 개별 기능(이메일, 회의록, Excel, PPT…)은 많지만 관통하는 골격은 하나다 — **도구 선택 → 형식 명시 → 대화 체이닝 → 반복 작업 승격**. 모양이 중요한 산출물은 HTML로 먼저 만들고 렌더링을 캡처해 검수한다.

## 도구 선택 매트릭스

같은 작업도 규모와 목적에 따라 진입점이 다르다.

- **Connectors / Cowork (GUI)**: 간편함이 우선일 때. 서비스 OAuth 연결로 자연어 요청. claude.ai 구독 로그인이라면 커넥터를 클라우드 세션에도 원격 호스트가 전달한다. API 키, Bedrock, Vertex, 프로필이나 `CLAUDE_CODE_OAUTH_TOKEN` 인증에서는 claude.ai 커넥터가 로드되지 않는다
- **Claude Code (터미널)**: 대량 처리, 파일 일괄, 자동화. 예로 영수증 20장 이상을 폴더 단위로 처리하거나 CLAUDE.md에 분석 기준을 고정한 반복 가능한 경쟁사 분석에 적합
- **애드인 (Excel/PowerPoint)**: 기존 오피스 워크플로에 붙일 때, 앱 간 컨텍스트 공유

## 문서 자동화의 공통 골격

이메일 분류, 회의록 액션아이템, 영수증 추출, 보고서/제안서, SOP, 기획서가 전부 같은 형태다.

1. **원본 투입** (파일 드래그 또는 Connectors)
2. **출력 형식을 프롬프트에 명시** — 표 컬럼(`| 담당자 | 할일 | 마감일 | 우선순위 |`), 날짜/금액 포맷, 대상 독자, 분량, 플레이스홀더(`[회사명]`)
3. **같은 대화에서 체이닝** — 초안 → 데이터 표 추가 → 섹션 수정 → 형식 변환(Slack/Word/슬라이드 대본). 맥락 재활용이 품질의 핵심
4. **정형화되면 템플릿 파일로 승격** — `report-template.md`를 저장해 "이 템플릿으로 새 데이터" 재사용

음성-텍스트 변환(회의록)은 도구 선택이 갈린다: 플랫폼 자막(화자 자동), Clova Note(화자 분리), Whisper 로컬(`whisper 파일.m4a --language ko` — 화자 구분 없음). `--language ko` 누락이 대표 실수.

## 시각 산출물 — HTML 먼저, PDF는 마지막

보고서, 제안서, 발표 자료처럼 모양이 중요한 산출물은 처음부터 DOCX나 PPTX를 생성하게 하지 않고 HTML과 CSS로 만든 뒤 PDF로 변환한다. HTML과 CSS는 텍스트로 된 공개 표준이라 에이전트가 레이아웃, 색, 간격을 코드로 세밀하게 지정하고 부분만 고칠 수 있다. 오피스 파일은 내부가 XML 묶음이라 생성 뒤 깨진 레이아웃을 찾아 고치기가 상대적으로 어렵다(경험 기반 판단이며 품질을 측정한 비교는 아니다).

1. **레퍼런스 고정**: 원하는 느낌의 디자인 하나를 먼저 고른다(Figma Community 등). Figma MCP 서버를 연결하면 에이전트가 Figma 파일의 프레임, 컴포넌트, 변수를 읽어 코드에 반영할 수 있다. 공개 디자인은 파일별 이용 조건을 확인하고, 에셋을 그대로 복제하기보다 색, 여백, 구성 원칙을 가져온다
2. **HTML/CSS 작성**: 인쇄용 CSS를 함께 요청한다. `@page`로 용지 크기와 여백, `break-before`/`break-inside`로 페이지 나눔을 지정한다
3. **PDF 변환**: Puppeteer의 `page.pdf()`(또는 Playwright)로 변환한다. 배경색은 `printBackground: true`를 줘야 인쇄되고, CSS에 선언한 `@page` 크기를 쓰려면 `preferCSSPageSize: true`가 필요하다
4. **렌더링 검수 루프**: 결과를 페이지별로 캡처해 이미지를 다시 모델에게 보여 주고 간격, 정렬, 넘침, 페이지 끊김, 색 대비를 점검하게 한다. 텍스트만 보는 검수는 레이아웃 깨짐을 놓친다

- **한계**: PDF는 받는 사람이 편집하기 어렵다. 상대가 DOCX나 PPTX로 받아서 고쳐야 하면 편집 가능한 형식을 따로 만들거나, 처음부터 그 형식의 템플릿을 채우는 방식을 고른다
- **자동 검수의 한계**: 모델의 시각 검수도 놓치는 것이 있다. 숫자, 고유명사, 최종 페이지 수는 사람이 한 번 더 본다

## 데이터 처리

Excel/CSV는 진단 → 정제 → 통계 → 차트 체인: 구조 진단(타입, 빈 값, 중복) → 정제(날짜 통일, 통화 기호 제거, 빈 값 라벨링) → 요약 통계 표 → Claude Code로 차트 PNG(한글 폰트 명시). 10MB 이상은 필요한 시트만, 수식 Excel은 CSV 변환 후, 회계 수치는 원본 대조.

## 외부 서비스 연동 — 전부 MCP

Connectors든 수동 설정이든 **밑단은 모두 MCP**다. 차이는 설정 편의성뿐.

- **Connectors(권장)**: GUI에서 Slack, Gmail, Notion, GitHub 등 OAuth 연결 → "Slack #general 최근 10개 요약" 자연어. 서비스 간 크로스 작업 가능
- **수동 MCP**: Slack의 원격 HTTP 서버를 `claude mcp add --transport http slack https://mcp.slack.com/mcp`로 등록하고 `claude mcp list`로 확인한다. 또는 claude.ai 커넥터를 사용한다 ([[MCP]])
- 회사 워크스페이스 연결은 IT 승인 선행

## 반복 자동화 3계층

| 계층 | 도구 | 특징 |
|---|---|---|
| 로컬 스케줄 | Code 탭 > Routines > New routine > Local | 최소 1분 간격, 앱 실행과 컴퓨터가 깨어 있어야 함 |
| 클라우드 스케줄 | claude.ai/code/routines, `/schedule` 또는 `/routines` | 머신이 꺼져도 실행. Cowork Scheduled 태스크도 클라우드에서 실행 |
| `/loop` | `/loop 10m 이메일 확인` | 세션 열린 동안만, 7일 후 만료 |

패턴: **형식을 수동으로 확정한 뒤 스케줄에 태운다** (일일 브리핑을 예시 데이터로 먼저 완성 → Connectors 실데이터 연결 → 스케줄 등록). 태스크는 5개 이내로 시작.

## 확장 — 병렬, 스킬, 브라우저, Vibe Coding

- **경쟁사 병렬 분석**: CLAUDE.md에 분석 기준(비교 항목, 출력 표 형식) 고정 → "각 경쟁사를 **병렬로** 분석". Cowork도 작업을 하위 태스크로 나눠 서브에이전트를 병렬 조율할 수 있다. 공개 정보만 사용하며, CLAUDE.md로 기준을 고정하는 흐름은 CLI의 강점이다
- **Skills/플러그인**: `/plugin`으로 마켓플레이스 설치, 커스텀은 `.claude/skills/<이름>/SKILL.md` + `$ARGUMENTS` ([[Claude-Code-Workflows|Skills 상세]])
- **Chrome 자동화**: "Claude in Chrome" 확장 → "열린 탭 분석", "상품명/가격 표로 추출" → 스케줄과 결합해 정기 수집. **로그인 상태를 공유하므로 비밀번호 전달 금지**, 사이트 약관 확인
- **AI용 브라우저를 CLI로 붙이기**: 헤드리스 Playwright 같은 자동화 브라우저는 Cloudflare 등의 봇 차단에 막히는 경우가 많다. 사용자의 로그인 세션을 재사용하는 AI용 브라우저(예: Aside)는 CLI(`aside`, 결정적 단계용 `aside repl`, 다른 도구에 MCP 서버로 붙이는 `aside mcp`)를 제공해 Claude Code나 Codex가 셸에서 조작할 수 있다. 공식 도움말 기준 CLI는 macOS와 Windows를 지원한다(2026-09-29 확인)
  - REPL의 `openTab`으로 연 탭은 명령이 끝나면 사라져 1회성 조회에 맞고, `attachBrowserTab`은 이미 열린 실제 탭에 붙어 작업 결과가 남으므로 이어지는 작업에 맞다. 이 구분은 공식 도움말 페이지에는 설명이 없고 사용 사례와 서드파티 문서 기준이다
  - 사례: 호스팅 관리 화면에서 서브도메인 DNS 레코드 추가, 로그인된 홈택스에서 업종 추가와 현금영수증 발급 위임. 반론으로 Vercel CLI처럼 공식 CLI나 API가 있으면 그쪽이 더 빠르고 재현 가능하다. 브라우저 위임은 공식 CLI와 API가 없을 때의 차선이다
- **데스크톱 앱 제어**: 메신저나 설치형 프로그램처럼 브라우저 밖의 앱은 화면을 보고 클릭하고 입력하는 도구가 맡는다. OpenAI의 Computer Use는 지원 지역에서 ChatGPT 데스크톱 앱의 ChatGPT Work와 Codex로 macOS와 Windows 앱을 조작하며, macOS에서는 화면 기록과 손쉬운 사용 권한이 필요하다(2026-09-29 확인). 공식 문서도 명령줄 도구나 구조화된 연동으로 부족할 때 쓰라고 안내한다
- **위임의 보안 경계**: 로그인 세션을 넘기는 순간 에이전트는 그 계정의 권한 전체를 쓴다. 전용 브라우저 프로필이나 권한이 좁은 계정으로 분리하고, 결제, 세금 신고, 제출과 삭제처럼 되돌리기 어려운 단계는 직전에 멈춰 사람이 확인한 뒤 실행하게 지시한다
- **Vibe Coding**: 빈 폴더에서 `claude` → 기능/동작/디자인을 구체 서술 → "브라우저에서 열어줘" → 자연어 수정. 결과는 프로토타입 수준, 실서비스는 보안/성능 검토 필요

## 관통하는 원칙

1. **도구 선택 먼저** — 간편(GUI) vs 대량/자동화(CLI)를 상황에 맞게
2. **출력 형식 명시** — 표 컬럼, 포맷, 파일명을 프롬프트에
3. **대화 체이닝** — 초안 → 수정 → 형식 변환으로 맥락 재활용
4. **반복은 승격** — 템플릿 파일, CLAUDE.md, 스킬, 스케줄로
5. **AI 출력은 초안** — 수치 검증, 검토 후 발송/공유, 기밀은 보안 정책 확인

## 출처

- [Claude Code — MCP](https://code.claude.com/docs/en/mcp)
- [Claude Code — Routines](https://code.claude.com/docs/en/routines)
- [Claude Cowork 시작하기](https://support.claude.com/en/articles/13345190-get-started-with-claude-cowork)
- [클로드 코드 가이드 (비즈니스 파트 15챕터) — WikiDocs](https://wikidocs.net/book/19104)
- [Puppeteer — PDF generation](https://pptr.dev/guides/pdf-generation)
- [Puppeteer — PDFOptions](https://pptr.dev/api/puppeteer.pdfoptions)
- [Figma — Guide to the Figma MCP server](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server)
- [AI 문서는 HTML로 먼저 만들기 — Threads, workfree.wave](https://www.threads.com/@workfree.wave/post/Da7rkiBFB6C)
- [Aside Help Center, Use the CLI, MCP, and REPL](https://docs.aside.com/help/developers)
- [OpenAI Codex, Computer Use](https://learn.chatgpt.com/docs/computer-use)
- [Playwright 대신 AI용 브라우저 Aside — Threads, kez_works](https://www.threads.com/@kez_works/post/DcCxUniD1at)
- [Aside CLI의 openTab과 attach 활용 — Threads, yun_ja_dong](https://www.threads.com/@yun_ja_dong/post/DcfsU2QE2Om)
- [업무 실행용 AI 도구 사용 빈도 평가 — Threads, thisnthatdev](https://www.threads.com/@thisnthatdev/post/DdTTIJdmK44)

## 관련 문서

- [[Claude-Code-Fundamentals|Claude Code 기초]]
- [[Claude-Code-Workflows|Claude Code 개발 워크플로우 (Skills, 서브에이전트)]]
- [[Claude-Code-Domain-Applications|Claude Code 도메인 응용]]
- [[MCP|MCP (Model Context Protocol)]]
- [[Local-Speech-to-Text|로컬 음성 인식으로 영상 전사하기]]
