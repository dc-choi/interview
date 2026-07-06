---
tags: [senior, ai, claude-code, automation, business, connectors, mcp]
status: done
category: "Senior - AI 엔지니어링"
aliases: ["Claude Code Business Automation", "클로드 코드 비즈니스 자동화", "Connectors", "스케줄 태스크"]
---

# Claude Code 비즈니스 자동화 — 문서, 데이터, 연동, 반복

코딩 없이 AI 에이전트로 사무 업무를 자동화하는 패턴. 개별 기능(이메일, 회의록, Excel, PPT…)은 많지만 관통하는 골격은 하나다 — **도구 선택 → 형식 명시 → 대화 체이닝 → 반복 작업 승격**.

## 도구 선택 매트릭스

같은 작업도 규모와 목적에 따라 진입점이 다르다.

- **Connectors / Cowork (GUI)**: 간편함이 우선일 때. 서비스 OAuth 연결로 자연어 요청. 단 클라우드 원격 세션에서는 사용 불가(로컬/SSH만)
- **Claude Code (터미널)**: 대량 처리, 파일 일괄, 자동화. 예로 영수증 20장 이상은 폴더 일괄 처리, 경쟁사 병렬 분석은 CLI 전용
- **애드인 (Excel/PowerPoint)**: 기존 오피스 워크플로에 붙일 때, 앱 간 컨텍스트 공유

## 문서 자동화의 공통 골격

이메일 분류, 회의록 액션아이템, 영수증 추출, 보고서/제안서, SOP, 기획서가 전부 같은 형태다.

1. **원본 투입** (파일 드래그 또는 Connectors)
2. **출력 형식을 프롬프트에 명시** — 표 컬럼(`| 담당자 | 할일 | 마감일 | 우선순위 |`), 날짜/금액 포맷, 대상 독자, 분량, 플레이스홀더(`[회사명]`)
3. **같은 대화에서 체이닝** — 초안 → 데이터 표 추가 → 섹션 수정 → 형식 변환(Slack/Word/슬라이드 대본). 맥락 재활용이 품질의 핵심
4. **정형화되면 템플릿 파일로 승격** — `report-template.md`를 저장해 "이 템플릿으로 새 데이터" 재사용

음성-텍스트 변환(회의록)은 도구 선택이 갈린다: 플랫폼 자막(화자 자동), Clova Note(화자 분리), Whisper 로컬(`whisper 파일.m4a --language ko` — 화자 구분 없음). `--language ko` 누락이 대표 실수.

## 데이터 처리

Excel/CSV는 진단 → 정제 → 통계 → 차트 체인: 구조 진단(타입, 빈 값, 중복) → 정제(날짜 통일, 통화 기호 제거, 빈 값 라벨링) → 요약 통계 표 → Claude Code로 차트 PNG(한글 폰트 명시). 10MB 이상은 필요한 시트만, 수식 Excel은 CSV 변환 후, 회계 수치는 원본 대조.

## 외부 서비스 연동 — 전부 MCP

Connectors든 수동 설정이든 **밑단은 모두 MCP**다. 차이는 설정 편의성뿐.

- **Connectors(권장)**: GUI에서 Slack, Gmail, Notion, GitHub 등 OAuth 연결 → "Slack #general 최근 10개 요약" 자연어. 서비스 간 크로스 작업 가능
- **수동 MCP**: `claude mcp add slack --scope user -- npx -y @anthropic/mcp-slack`, 확인 `claude mcp list` ([[MCP]])
- 회사 워크스페이스 연결은 IT 승인 선행

## 반복 자동화 3계층

| 계층 | 도구 | 특징 |
|---|---|---|
| Desktop 스케줄 태스크 | Cowork Schedule > New task | 최소 1분 간격, 컴퓨터+앱 켜짐 필요 |
| 클라우드 스케줄 | claude.ai/code/scheduled, `/schedule` | 머신 꺼져도 실행, 최소 1시간, 로컬 파일 접근 X |
| `/loop` | `/loop 10m 이메일 확인` | 세션 열린 동안만, 7일 후 만료 |

패턴: **형식을 수동으로 확정한 뒤 스케줄에 태운다** (일일 브리핑을 예시 데이터로 먼저 완성 → Connectors 실데이터 연결 → 스케줄 등록). 태스크는 5개 이내로 시작.

## 확장 — 병렬, 스킬, 브라우저, Vibe Coding

- **경쟁사 병렬 분석**: CLAUDE.md에 분석 기준(비교 항목, 출력 표 형식) 고정 → "각 경쟁사를 **병렬로** 분석" ("병렬로"가 서브에이전트 트리거, CLI 전용). 공개 정보만
- **Skills/플러그인**: `/plugin`으로 마켓플레이스 설치, 커스텀은 `.claude/skills/<이름>/SKILL.md` + `$ARGUMENTS` ([[Claude-Code-Workflows|Skills 상세]])
- **Chrome 자동화**: "Claude in Chrome" 확장 → "열린 탭 분석", "상품명/가격 표로 추출" → 스케줄과 결합해 정기 수집. **로그인 상태를 공유하므로 비밀번호 전달 금지**, 사이트 약관 확인
- **Vibe Coding**: 빈 폴더에서 `claude` → 기능/동작/디자인을 구체 서술 → "브라우저에서 열어줘" → 자연어 수정. 결과는 프로토타입 수준, 실서비스는 보안/성능 검토 필요

## 관통하는 원칙

1. **도구 선택 먼저** — 간편(GUI) vs 대량/자동화(CLI)를 상황에 맞게
2. **출력 형식 명시** — 표 컬럼, 포맷, 파일명을 프롬프트에
3. **대화 체이닝** — 초안 → 수정 → 형식 변환으로 맥락 재활용
4. **반복은 승격** — 템플릿 파일, CLAUDE.md, 스킬, 스케줄로
5. **AI 출력은 초안** — 수치 검증, 검토 후 발송/공유, 기밀은 보안 정책 확인

## 출처

- [클로드 코드 가이드 (비즈니스 파트 15챕터) — WikiDocs](https://wikidocs.net/book/19104)

## 관련 문서

- [[Claude-Code-Fundamentals|Claude Code 기초]]
- [[Claude-Code-Workflows|Claude Code 개발 워크플로우 (Skills, 서브에이전트)]]
- [[Claude-Code-Domain-Applications|Claude Code 도메인 응용]]
- [[MCP|MCP (Model Context Protocol)]]
