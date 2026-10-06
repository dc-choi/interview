---
tags: [ai, claude-code, automation, business, connectors, mcp]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["Claude Code Business Automation", "클로드 코드 비즈니스 자동화", "Connectors", "스케줄 태스크", "Cowork"]
verified_at: 2026-09-30
---

# Claude Code 비즈니스 자동화 — 문서, 데이터, 연동, 반복

코딩 없이 AI 에이전트로 사무 업무를 자동화하는 패턴. 개별 기능(이메일, 회의록, Excel, PPT…)은 많지만 관통하는 골격은 하나다 — **도구 선택 → 형식 명시 → 대화 체이닝 → 반복 작업 승격**. 시각 산출물은 전달 형식을 먼저 정하고 최종 파일을 렌더링해 검수한다.

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

### 긴 문서 분석과 출력 독자를 함께 지정한다

문서 분석 요청은 입력 구조, 검토 기준과 출력 독자를 나누어 적는다. 아래 입력 구조와 근거 추출 방식은 2026-10-07 Anthropic 공식 프롬프트 가이드를 대조했다. 제품 간 우열이나 일정 배수의 품질 향상을 보장하는 방법은 아니다.

- **입력 구조:** 긴 문서 본문을 앞에, 질문을 뒤에 두는 구성을 시험한다. 여러 문서는 문서명, 출처와 본문을 태그로 구분해 서로 다른 자료의 주장이 섞이지 않게 한다.
- **분석 근거:** 결론을 내기 전에 관련 구절과 위치를 추출하게 한다. 추출한 구절이 실제 결론을 지지하는지는 원문에서 다시 확인한다([[LLM-Hallucination-Verification|환각 검증]]).
- **출력 독자:** 대상 독자가 알아야 할 결정, 배경지식과 분량을 지정하고 원하는 문체의 짧은 예시를 준다. 예를 들어 비개발자 구매 담당자가 비교할 제안서는 용어 설명과 선택 조건을 함께 요청한다.
- **반론 검토:** 실무 적용 예시로 `주장, 근거 위치, 반대 근거, 미확인 조건`을 나누어 요청할 수 있다. 반론도 모델이 생성한 후보이므로 사실 오류가 확인된 것으로 취급하지 않는다.

이 구성을 적용한 결과는 같은 원문과 검토 기준으로 비교한다. 문체가 자연스러워진 것과 분석이 정확해진 것을 별도로 평가한다.

## Cowork로 맡길 때 — 범위, 원본, 절차, 공유

Cowork는 Claude Code와 같은 에이전트 구조를 터미널 없이 쓰는 작업 공간이다(Pro, Max, Team, Enterprise 플랜. Desktop 앱 외에 웹과 모바일은 플랜별로 제공). 작업은 Anthropic 서버의 격리 환경에서 돌고, 로컬 파일, 브라우저, 컴퓨터를 쓰는 동안에는 Desktop 앱이 열려 있어야 한다(2026-09-30 공식 문서 확인). 원본 자료를 읽고 결과물을 만드는 일이라면 일반 채팅보다 Cowork가 맞다.

- **범위는 프로젝트 폴더로**: Cowork 프로젝트는 로컬 폴더, 상시 지시, 참고 링크, 프로젝트 메모리를 묶어 컴퓨터에만 저장하고, 세션은 붙인 폴더를 읽고 쓴다. 2026-09 Desktop 업데이트로 홈 폴더나 드라이브 전체도 붙일 수 있게 됐으므로(Claude 자체 설정, SSH 키, 클라우드 자격 증명, 셸 시작 파일은 제외) 범위를 좁히는 일은 사용자의 몫이다. 업무별 작은 폴더를 만들어 붙인다
- **원본은 복사본으로 보호**: 승인 프롬프트를 줄여 쓰려면 원본 대신 복사본 폴더를 붙이고 지시에 원본 수정 금지를 적는다. 지시는 권고라서 실제 방어선은 복사본이다. 공식 도움말은 파일을 영구 삭제하기 전에는 명시적 허용을 받는다고 안내한다
- **절차 순서로 지시**: 읽기, 분석, 산출물 생성처럼 앞 단계 결과가 다음 단계의 입력이 되는 순서대로 쓰고 산출물 형식과 파일명을 정한다. 이메일, 이미지, 문서, 메신저 대화 같은 비정형 원본을 표나 스프레드시트 같은 정형 데이터로 바꾸는 일이 잘 맞는다 ([[Agent-Spec-Writing|지시 작성]])
- **결과는 폴더에서 확인**: 채팅에 보이는 표 요약은 보여 주기용이고 실제 산출물은 폴더의 파일이다. 회사 양식이 필요하면 PPT 테마나 템플릿 파일을 먼저 넣는다
- **공유 범위 확인**: 아티팩트는 비공개로 시작한다. Pro와 Max는 나만 보기, 링크가 있는 누구나, 이메일 초대 중에서 고르고, Team과 Enterprise는 조직 안이 기본이며 소유자가 외부 공유를 통제한다. 현재 아티팩트는 링크가 있어도 Claude 계정이 있어야 열리지만 채팅에서 게시한 레거시 아티팩트는 계정 없이 열린다. 링크는 한번 전달되면 받는 사람을 통제할 수 없으므로 민감 자료는 특정인 초대나 조직 범위로 공유한다

## 시각 산출물 — 출력 형식과 최종 PDF 검수

보고서, 제안서, 발표 자료를 고정 레이아웃의 PDF로 전달할 때는 HTML과 CSS로 만든 뒤 변환하는 방식을 선택할 수 있다. 레이아웃, 색, 간격을 텍스트로 지정하고 부분 수정하기에 편리하다. 이것이 DOCX나 PPTX보다 항상 좋은 결과를 낸다는 뜻은 아니며, 수신자의 편집 요구와 기존 양식에 따라 원본 형식을 정한다.

1. **레퍼런스 고정**: 원하는 느낌의 디자인 하나를 먼저 고른다(Figma Community 등). Figma MCP 서버를 연결하면 에이전트가 Figma 파일의 프레임, 컴포넌트, 변수를 읽어 코드에 반영할 수 있다. 공개 디자인은 파일별 이용 조건을 확인하고, 에셋을 그대로 복제하기보다 색, 여백, 구성 원칙을 가져온다
2. **HTML/CSS 작성**: 인쇄용 CSS를 함께 요청한다. `@page`로 용지 크기와 여백, `break-before`/`break-inside`로 페이지 나눔을 지정한다
3. **PDF 변환**: Puppeteer의 `page.pdf()`는 기본적으로 `print` CSS 미디어를 사용한다. 배경 그래픽은 `printBackground: true`, CSS의 `@page` 크기를 출력 옵션보다 우선하려면 `preferCSSPageSize: true`를 지정한다. `waitForFonts`의 기본값은 `true`이며 `document.fonts.ready`를 기다린다(이 절의 Puppeteer API는 2026-10-07 공식 문서 대조)
4. **렌더링 검수 루프**: HTML 화면 캡처로 초안을 점검한 뒤, 생성된 PDF 자체를 페이지별 이미지로 렌더링해 간격, 정렬, 넘침, 페이지 끊김과 색 대비를 확인한다. `page.screenshot({fullPage: true})`는 웹페이지 전체 캡처이므로 PDF의 용지 크기와 페이지 나눔을 검증한 증거로 대신 쓰지 않는다

화면용 CSS로 PDF를 만들려면 변환 전에 `page.emulateMediaType('screen')`을 명시한다. 화면용 미디어를 선택해도 최종 PDF 확인은 필요하다. 백그라운드 페이지에서는 폰트 대기를 위해 `page.bringToFront()`로 페이지를 활성화해야 할 수 있다. 폰트 준비 완료는 업무 데이터, 차트와 이미지까지 모두 준비됐다는 보장이 아니므로 해당 산출물의 완료 상태도 확인한다.

- **한계**: PDF는 받는 사람이 편집하기 어렵다. 상대가 DOCX나 PPTX로 받아서 고쳐야 하면 편집 가능한 형식을 따로 만들거나, 처음부터 그 형식의 템플릿을 채우는 방식을 고른다
- **자동 검수의 한계**: 모델의 시각 검수도 놓치는 것이 있다. 숫자, 고유명사, 최종 페이지 수는 사람이 한 번 더 본다

## 데이터 처리

Excel/CSV는 진단 → 정제 → 통계 → 차트 체인: 구조 진단(타입, 빈 값, 중복) → 정제(날짜 통일, 통화 기호 제거, 빈 값 라벨링) → 요약 통계 표 → Claude Code로 차트 PNG(한글 폰트 명시). 10MB 이상은 필요한 시트만, 수식 Excel은 CSV 변환 후, 회계 수치는 원본 대조.

## 외부 서비스 연동 — 전부 MCP

Connectors든 수동 설정이든 **밑단은 모두 MCP**다. 차이는 설정 편의성뿐.

- **Connectors(권장)**: GUI에서 Slack, Gmail, Notion, GitHub 등 OAuth 연결 → "Slack #general 최근 10개 요약" 자연어. 서비스 간 크로스 작업 가능
- **커넥터는 내 계정 권한으로 움직인다**: 로그인한 계정이 할 수 있는 삭제와 발송도 할 수 있어서, 메일 정리를 맡겼다가 지우면 안 되는 메일까지 지우는 식의 사고가 생길 수 있다. 커넥터 설정의 도구별 권한(항상 허용, 승인 필요, 차단)에서 삭제와 발송 같은 쓰기 도구는 승인 필요나 차단으로 두고, 대화마다 채팅창 `+` 메뉴에서 필요한 커넥터만 켠다
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

- [Anthropic — Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- [Claude Code — MCP](https://code.claude.com/docs/en/mcp)
- [Claude Code — Routines](https://code.claude.com/docs/en/routines)
- [Claude Cowork 시작하기](https://support.claude.com/en/articles/13345190-get-started-with-claude-cowork)
- [클로드 코드 가이드 (비즈니스 파트 15챕터) — WikiDocs](https://wikidocs.net/book/19104)
- [Puppeteer — PDF generation](https://pptr.dev/guides/pdf-generation)
- [Puppeteer — PDFOptions](https://pptr.dev/api/puppeteer.pdfoptions)
- [Puppeteer — Page.pdf()](https://pptr.dev/api/puppeteer.page.pdf)
- [Puppeteer — ScreenshotOptions](https://pptr.dev/api/puppeteer.screenshotoptions)
- [Figma — Guide to the Figma MCP server](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server)
- [Aside Help Center, Use the CLI, MCP, and REPL](https://docs.aside.com/help/developers)
- [OpenAI Codex, Computer Use](https://learn.chatgpt.com/docs/computer-use)
- [Claude — Cowork overview](https://claude.com/docs/cowork/overview)
- [Claude — Organize work with projects](https://claude.com/docs/cowork/guide/projects)
- [Claude — Claude Desktop changelog](https://claude.com/docs/cowork/changelog)
- [Claude — Get started with connectors](https://claude.com/docs/connectors/overview)
- [Claude Help Center — Share artifacts](https://support.claude.com/en/articles/9547008-publish-and-share-artifacts)
- [인프런, 널널한 개발자, Claude for Desktop 주요기능 소개](https://www.inflearn.com/courses/lecture?courseId=344484&unitId=498592)
- [인프런, 널널한 개발자, 대화를 넘어! 행동하는 Cowork](https://www.inflearn.com/courses/lecture?courseId=344484&unitId=498593)

## 관련 문서

- [[Claude-Code-Fundamentals|Claude Code 기초]]
- [[Claude-Code-Workflows|Claude Code 개발 워크플로우 (Skills, 서브에이전트)]]
- [[Claude-Code-Domain-Applications|Claude Code 도메인 응용]]
- [[MCP|MCP (Model Context Protocol)]]
- [[Local-Speech-to-Text|로컬 음성 인식으로 영상 전사하기]]
