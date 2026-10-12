---
tags: [ai, claude-code, cli, ci-cd, cost, troubleshooting, code-review]
status: done
verified_at: 2026-10-12
category: "AI엔지니어링(AIEngineering)"
aliases: ["Claude Code Operations", "클로드 코드 운영", "클로드 코드 트러블슈팅", "클로드 코드 비용"]
---

# Claude Code 운영 — 실행 모드, CI, 비용, 트러블슈팅

에이전트를 일상 도구와 파이프라인으로 굴릴 때의 운영 레퍼런스. 관통하는 감각은 두 가지다 — **컨텍스트가 성능과 비용의 제1 변수**이고, 문제가 생기면 **실제로 무엇이 로드되고 실행됐는지부터 확인**한다.

## 실행 모드와 입력

- 3종: 인터랙티브(`claude`) / 원샷(`claude -p`, 출력 text, json, stream-json) / 파이프(`git diff | claude -p "리뷰"`) — Unix 유틸리티처럼 조합
- 입력 세 접두사: `/`(명령과 스킬), `!`(셸 직접 실행, 출력이 컨텍스트에 추가), `@`(파일 참조 — 파일은 전체 내용, 디렉토리는 목록만 포함)
- `/btw` 사이드 질문: 히스토리를 오염시키지 않고 캐시를 재사용해 저비용 — 무거운 조사를 통째로 위임하는 서브에이전트와 정반대 트레이드오프
- 체크포인트: 프롬프트마다 자동 생성, 30일 보존. Esc Esc 메뉴에서 코드+대화 / 대화만 / 코드만 / 부분 요약 선택. 한계: Bash로 실행한 rm, mv는 미추적 — 장기 안전망은 Git
- 세션: `/rename` 후 이름으로 재개, `--fork-session`, `/branch`(세션 내 분기), `--from-pr`(PR 연결 세션 재개)

## 헤드리스와 CI

- `--bare`: 최소 모드. 공식 CLI 문서 기준(확인 2026-07-15) 훅, 스킬, 플러그인, MCP 서버, auto-memory, CLAUDE.md의 자동 탐색을 건너뛰고 `CLAUDE_CODE_SIMPLE=1`을 설정한다. Bash와 파일 읽기, 편집 도구는 유지된다. 필요한 컨텍스트와 확장은 `--append-system-prompt`, `--settings`, `--mcp-config`, `--agents`, `--plugin-dir` 같은 플래그로 명시 주입한다. OAuth와 키체인도 읽지 않으므로 인증은 `ANTHROPIC_API_KEY` 또는 `--settings`의 `apiKeyHelper`로 제공한다. CI와 스크립트처럼 장비별 로컬 설정에 영향받지 않아야 할 때 적합하다
- CI 안전장치 4종: `--max-turns`(리뷰 5, 구현 10~15 권장), `--max-budget-usd`, 잡 타임아웃, dontAsk 권한 모드. `--dangerously-skip-permissions`는 격리 컨테이너에서만
- 구조화 출력: `--output-format json` + `--json-schema`로 파이프라인에서 파싱 가능한 응답 강제
- GitHub Actions: 공식 액션 + `@claude` 트리거. **모델 버전 고정이 필수** — 별칭이 새 모델을 가리키게 되면 미활성 모델 에러로 파이프라인이 깨진다
- 자동 코드 리뷰(Code Review, Team과 Enterprise 대상 research preview, ZDR이나 HIPAA 구성을 적용한 조직은 쓸 수 없고 Anthropic BAA 적용 대상도 아님): GitHub 앱이 저장소 설정에 따라 PR을 열 때, push마다 또는 `@claude review` 코멘트로 리뷰하고 발견을 해당 줄의 인라인 코멘트로 단다. 비용은 플랜 포함 사용량과 별도로 사용 크레딧(usage credits)에서 나가며 리뷰당 평균 $15에서 $25다. 커스터마이즈는 CLAUDE.md(새로 들어온 위반을 nit로 표시)보다 리뷰 전용 파일 REVIEW.md가 확실하다. REVIEW.md는 발견과 검증 에이전트에 리뷰 지침으로 직접 전달되고 순위와 보고 에이전트도 참고하므로 심각도 기준, nit 상한과 skip 규칙을 여기에 명시한다
- 로컬 리뷰 `/code-review`(별칭 `/review`): GitHub 앱 없이 터미널 세션에서 정확성 버그를 찾고, 모델과 effort에 따라 재사용, 단순화, 효율 같은 정리 항목도 함께 보고한다. 기본 대상은 upstream보다 앞선 브랜치 커밋과 커밋하지 않은 변경이고, 파일 경로, PR 번호, 브랜치나 `main...my-feature` 같은 ref 범위를 대상으로 줄 수 있다. 기본으로 자체 컨텍스트를 가진 백그라운드 서브에이전트로 돌아 대화를 채우지 않고(`-p`, Agent SDK, 진행 중 재실행, `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1`에서는 포그라운드), 비용은 일반 사용량에 포함된다. effort를 `low`로 주면 확신이 큰 발견만 보고해 오탐이 적고 `medium`부터 `max`까지는 범위를 넓힌다. 레벨을 생략하면 대화형 세션에서 마지막으로 직접 입력한 레벨을 이전 세션 것까지 재사용하고(`-p` 실행에서 준 레벨은 기억하지 않는다), 입력한 적이 없으면 세션의 현재 effort를 쓴다. `ultra`는 기억한 레벨을 쓰지도 바꾸지도 않는다. `--fix`는 발견을 작업 트리에 적용하는데 백그라운드 리뷰의 수정은 체크포인트 밖이라 `/rewind`가 아니라 git으로 되돌리고(포그라운드로 돌았으면 `/rewind`로 되돌린다), `--comment`는 GitHub PR에는 인라인 코멘트로, GitLab MR에는 노트 하나로 올린다(GitLab은 v2.1.257 이상과 `glab` CLI 필요, 없으면 터미널에 출력). CLAUDE.md는 따르지만 REVIEW.md는 읽지 않는다. 버그를 찾지 않고 정리 항목만 찾아 바로 고치는 리뷰는 `/simplify`다
- 클라우드 리뷰 `/code-review ultra`(ultrareview, research preview, 계정에서 쓸 수 있으면 `/ultrareview`도 별칭으로 동작): Anthropic 인프라의 클라우드 샌드박스에서 리뷰어 에이전트 여럿이 변경을 병렬로 살피고, 보고하는 발견마다 독립적으로 재현하고 검증해 스타일 제안보다 실제 버그에 집중한다. 인자가 없으면 기본 브랜치 대비 현재 브랜치(커밋하지 않은 변경과 staged 변경 포함)를 묶어 업로드하고, github.com PR 번호를 주면 로컬에서 아무것도 올리지 않고 샌드박스가 PR을 clone한다. 보통 5분에서 10분 걸리는 백그라운드 작업이라 `/tasks`로 확인하고, 슬래시 명령은 사용자가 직접 입력할 때만 실행된다(Claude가 스스로 시작하지 않고 예약 작업도 클라우드 리뷰를 띄우지 않는다. Claude가 Bash로 `claude ultrareview`를 대신 실행하면 저장소 전체 리뷰 폴백은 거부된다). claude.ai 계정 인증이 필요하고 Bedrock, Google Cloud Agent Platform, Microsoft Foundry와 ZDR이나 HIPAA 구성 조직에서는 쓸 수 없으며, 쓸 수 없으면 세션 안의 로컬 리뷰로 대신 돈다. 플랜 포함 사용량이 아니라 사용 크레딧으로 과금되고, Pro와 Max에는 계정당 한 번 주는 무료 3회(갱신 없음)가 있으며 그 뒤에는 변경 규모에 따라 보통 $5에서 $25다. PR 모드는 Claude 계정에 연결한 GitHub 계정의 읽기 권한이 필요하다. 스크립트와 CI에서는 끝날 때까지 기다려 결과를 stdout으로 내는 `claude ultrareview`를 쓰며, 같은 claude.ai 인증과 사용 크레딧 설정이 필요하다(`claude -p '/code-review ultra'`는 기다리지 않고 종료하고, 사용 크레딧으로 과금될 리뷰는 아예 띄우지 않는다)

## 비용 관리 — 정량 감각

- 활성 사용일 기준 개발자당 평균 약 $13/일, 90%가 $30 이하. 유휴 백그라운드 세션은 세션당 약 $0.04
- 사고(thinking) 토큰은 화면에 안 보여도 출력 토큰으로 과금된다. adaptive reasoning 모델은 effort level로 조절하고, 고정 예산 모델은 `MAX_THINKING_TOKENS`로 상한을 낮출 수 있다. 공식 비용 가이드는 팀원이 plan 모드로 도는 에이전트 팀을 일반 세션 대비 약 7배 토큰으로 안내하며, 실제 사용량은 활성 팀원 수와 실행 시간에 따라 달라진다. Fast Mode는 최대 2.5배 빠른 대신 토큰당 요금이 더 높고, 대화 중 처음 켜면 기존 컨텍스트 전체에 비캐시 입력 요금이 한 번 적용되므로 비용이 중요하면 세션 시작 시 켠다
- 절감 순서: /clear와 /compact 습관 → 기본 모델 한 단계 낮추고 서브에이전트는 저비용 모델 → 무거운 MCP 대신 gh, aws 같은 CLI → 훅으로 대용량 로그 전처리 → CLAUDE.md 슬림화 + 스킬 분리 ([[LLM-Model-Tiers|티어 라우팅]]과 같은 논리)
- 팀 관측: OpenTelemetry 메트릭(비용, 토큰, 코드 라인 수)을 팀 속성으로 분해해 대시보드화

## 트러블슈팅 — 진단 순서

- 원인을 모르면 `/doctor`부터 (설치 상태, 설정, 확장(사용하지 않는 스킬, MCP 서버, 플러그인, 느린 훅), CLAUDE.md와 권한을 점검하고 확인을 받아 수정). 세션 없이 읽기 전용 설치 진단은 `claude doctor`, 키바인딩 경고는 `--debug` 로그에 남는다. 세션 로그 분석은 `/debug`
- 성능 저하의 최다 원인은 커진 컨텍스트. 압축 직후 다시 차오르는 스래싱이면 파일을 라인 범위로 읽거나 조사를 서브에이전트로 위임
- 인증 대표 함정: 셸 프로필에 남은 낡은 ANTHROPIC_API_KEY가 구독 OAuth를 조용히 오버라이드 — `/status`로 활성 자격 증명 확인
- 설정 디버깅은 "실제로 뭐가 로드됐나"부터: /status, /context, /permissions, /hooks. 흔한 실수 — 훅 matcher를 배열로 작성(단일 문자열이어야 함), permissions를 엉뚱한 파일에 배치, 서브에이전트가 CLAUDE.md를 상속한다고 가정
- 에러: 일시 오류는 지수 백오프로 자동 재시도되므로 기다리는 게 먼저. 용량 초과(529)는 모델 전환(용량은 모델별), 컨텍스트 초과는 /compact
- **품질이 나빠졌다면 컨텍스트와 하네스부터 확인한다** — 전체 모델 ID로 고정했다면 가중치는 바뀌지 않지만 별칭이 가리키는 모델, Claude Code 버전과 기본값(effort, 시스템 프롬프트)은 바뀔 수 있다([[Eval-Model-Drift-Monitoring|서빙 모델 드리프트 감시]]). 컨텍스트 압박, 낡은 CLAUDE.md를 확인하고, 잘못된 답변에 수정을 이어가기보다 되감고(rewind) 더 구체적으로 재프롬프트하는 편이 낫다
- **adaptive thinking 끄기 팁은 모델을 확인한다**: 품질 저하를 느낄 때 settings.json의 `env`에 `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1`과 `MAX_THINKING_TOKENS`를 넣었더니 같은 작업의 재프롬프트 횟수가 줄었다는 커뮤니티 보고가 있다(2026-04, 개인 비교). 공식 환경 변수 문서(2026-09-29 확인) 기준 이 변수는 Opus 4.6과 Sonnet 4.6에서만 adaptive reasoning을 끄고 `MAX_THINKING_TOKENS` 고정 예산으로 돌리며, Opus 4.7 이후, Sonnet 5 이후와 Fable 모델에는 효과가 없다. adaptive 모델에서는 `MAX_THINKING_TOKENS`의 0이 아닌 값도 무시된다. 현재 모델에서는 effort 수준(`/effort`, `CLAUDE_CODE_EFFORT_LEVEL`)으로 조절하고, 효과는 같은 과업의 재프롬프트 횟수처럼 비교 가능한 지표로 판정한다

## 안티패턴 5종

뒤죽박죽 세션(→ 작업 전환 시 /clear), 반복 수정 실패(→ 2회 실패면 /clear 후 배운 것을 반영한 재프롬프트), 비대한 CLAUDE.md(→ 스킬로 분리), 검증 없는 신뢰(→ 테스트와 기대 출력 제공), 무한 탐색(→ 범위 축소, 서브에이전트 위임).

대형 코드베이스는 경계 설계로 대응: 시작 디렉토리로 범위 결정, 디렉토리별 CLAUDE.md(온디맨드 로드), Read deny로 dist와 vendor 차단, `--add-dir`로 필요한 곳만 추가.

## 체크포인트

- 성능 저하와 비용 폭증의 공통 제1 원인 (컨텍스트)과 대응 순서
- CI에서 에이전트를 태울 때의 안전장치 4종과 모델 버전 고정이 필수인 이유
- 로컬 `/code-review`, 클라우드 `/code-review ultra`, 관리형 Code Review의 실행 위치, 과금과 REVIEW.md 반영 차이(관리형은 반영, 로컬은 읽지 않음, ultra는 ultrareview 문서에 언급 없음, 2026-10-12 기준)
- 품질 저하 시 확인 순서 (컨텍스트, CLAUDE.md, CLI 버전과 기본값 변경, 재프롬프트), 커뮤니티 설정 팁이 현재 모델에 적용되는지
- /btw와 서브에이전트의 트레이드오프
- 안티패턴 5종과 각각의 처방

## 출처

- [Claude Code 공식 문서, CLI reference](https://code.claude.com/docs/en/cli-usage)
- [Claude Code 공식 문서, Environment variables](https://code.claude.com/docs/en/env-vars)
- [Run Claude Code programmatically — bare mode](https://code.claude.com/docs/en/headless#start-faster-with-bare-mode)
- [Claude Code 공식 문서, Fast mode](https://code.claude.com/docs/en/fast-mode)
- [Claude Code 공식 문서, Manage costs](https://code.claude.com/docs/en/costs)
- [Claude Code 공식 문서, Model configuration](https://code.claude.com/docs/en/model-config)
- [Claude Code 공식 문서, Code Review](https://code.claude.com/docs/en/code-review)
- [Claude Code 공식 문서, Find bugs with ultrareview](https://code.claude.com/docs/en/ultrareview)
- [Claude Code 공식 문서, Commands](https://code.claude.com/docs/en/commands)
- [클로드 코드 가이드 (레퍼런스 03 기본 사용법, 13 CI/CD, 14 CLI, 16 베스트 프랙티스, 17 트러블슈팅) — WikiDocs](https://wikidocs.net/book/19104)
- [Claude Code 품질 저하 때 adaptive thinking 끄기 — Threads, withfox](https://www.threads.com/@withfox/post/DXDx0mhCX4z)
- [Claude Code 2026 — YouTube, 토비의 스프링](https://www.youtube.com/watch?v=Y2mEVnN-FKY) — 2026-10-11, 2026년 변경을 소개하는 TTS 내레이션 영상. 로컬 리뷰와 ultra 리뷰 항목의 단서로만 쓰고 내용은 공식 문서로 대조

## 관련 문서

- [[Claude-Code-Fundamentals|Claude Code 기초 (세션, 컨텍스트 관리)]]
- [[Claude-Code-Extension-Reference|Claude Code 확장 메커니즘]]
- [[Claude-Code-Business-Automation|Claude Code 비즈니스 자동화 (스케줄 3계층)]]
- [[LLM-Model-Tiers|LLM 모델 티어 선택, 라우팅]]
- [[Agent-Context-Budget|에이전트 컨텍스트 예산]]
