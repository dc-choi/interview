---
tags: [senior, ai, claude-code, cli, ci-cd, cost, troubleshooting]
status: done
verified_at: 2026-07-15
category: "Senior - AI 엔지니어링"
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
- 자동 코드 리뷰: 커스터마이즈는 CLAUDE.md(위반이 nit 수준으로 격하)보다 리뷰 전용 파일(REVIEW.md, 최우선 주입)이 확실. 심각도 기준과 skip 규칙을 명시

## 비용 관리 — 정량 감각

- 활성 사용일 기준 개발자당 평균 약 $13/일, 90%가 $30 이하. 유휴 백그라운드 세션은 세션당 약 $0.04
- 사고(thinking) 토큰은 화면에 안 보여도 과금된다 (기본 예산 31,999). 에이전트 팀은 일반 세션의 약 7배, Fast Mode는 2.5배 속도에 2배 요금 — 세션 도중 켜면 기존 컨텍스트 전체가 비캐시 입력 요금이 되므로 세션 시작 시 켠다
- 절감 순서: /clear와 /compact 습관 → 기본 모델 한 단계 낮추고 서브에이전트는 저비용 모델 → 무거운 MCP 대신 gh, aws 같은 CLI → 훅으로 대용량 로그 전처리 → CLAUDE.md 슬림화 + 스킬 분리 ([[LLM-Model-Tiers|티어 라우팅]]과 같은 논리)
- 팀 관측: OpenTelemetry 메트릭(비용, 토큰, 코드 라인 수)을 팀 속성으로 분해해 대시보드화

## 트러블슈팅 — 진단 순서

- 원인을 모르면 `/doctor`부터 (설치, 설정 스키마, MCP, 키바인딩 일괄 점검). 세션 로그 분석은 `/debug`
- 성능 저하의 최다 원인은 커진 컨텍스트. 압축 직후 다시 차오르는 스래싱이면 파일을 라인 범위로 읽거나 조사를 서브에이전트로 위임
- 인증 대표 함정: 셸 프로필에 남은 낡은 ANTHROPIC_API_KEY가 구독 OAuth를 조용히 오버라이드 — `/status`로 활성 자격 증명 확인
- 설정 디버깅은 "실제로 뭐가 로드됐나"부터: /status, /context, /permissions, /hooks. 흔한 실수 — 훅 matcher를 배열로 작성(단일 문자열이어야 함), permissions를 엉뚱한 파일에 배치, 서브에이전트가 CLAUDE.md를 상속한다고 가정
- 에러: 일시 오류는 지수 백오프로 자동 재시도되므로 기다리는 게 먼저. 용량 초과(529)는 모델 전환(용량은 모델별), 컨텍스트 초과는 /compact
- **품질이 나빠졌다면 모델이 몰래 바뀐 게 아니다** — 컨텍스트 압박, 낡은 CLAUDE.md를 확인하고, 잘못된 답변에 수정을 이어가기보다 되감고(rewind) 더 구체적으로 재프롬프트하는 편이 낫다

## 안티패턴 5종

뒤죽박죽 세션(→ 작업 전환 시 /clear), 반복 수정 실패(→ 2회 실패면 /clear 후 배운 것을 반영한 재프롬프트), 비대한 CLAUDE.md(→ 스킬로 분리), 검증 없는 신뢰(→ 테스트와 기대 출력 제공), 무한 탐색(→ 범위 축소, 서브에이전트 위임).

대형 코드베이스는 경계 설계로 대응: 시작 디렉토리로 범위 결정, 디렉토리별 CLAUDE.md(온디맨드 로드), Read deny로 dist와 vendor 차단, `--add-dir`로 필요한 곳만 추가.

## 체크포인트

- 성능 저하와 비용 폭증의 공통 제1 원인 (컨텍스트)과 대응 순서
- CI에서 에이전트를 태울 때의 안전장치 4종과 모델 버전 고정이 필수인 이유
- 품질 저하 시 확인 순서 (모델 의심이 아니라 컨텍스트, CLAUDE.md, 재프롬프트)
- /btw와 서브에이전트의 트레이드오프
- 안티패턴 5종과 각각의 처방

## 출처

- [CLI reference — Claude Code 공식 문서](https://code.claude.com/docs/en/cli-usage)
- [Run Claude Code programmatically — bare mode](https://code.claude.com/docs/en/headless#start-faster-with-bare-mode)
- [클로드 코드 가이드 (레퍼런스 03 기본 사용법, 13 CI/CD, 14 CLI, 16 베스트 프랙티스, 17 트러블슈팅) — WikiDocs](https://wikidocs.net/book/19104)

## 관련 문서

- [[Claude-Code-Fundamentals|Claude Code 기초 (세션, 컨텍스트 관리)]]
- [[Claude-Code-Extension-Reference|Claude Code 확장 메커니즘]]
- [[Claude-Code-Business-Automation|Claude Code 비즈니스 자동화 (스케줄 3계층)]]
- [[LLM-Model-Tiers|LLM 모델 티어 선택, 라우팅]]
- [[Agent-Context-Budget|에이전트 컨텍스트 예산]]
