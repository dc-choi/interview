---
tags: [senior, ai, claude-code, cli, context, permissions]
status: done
category: "Senior - AI 엔지니어링"
aliases: ["Claude Code Fundamentals", "클로드 코드 기초", "권한 모드", "Effort"]
---

# Claude Code 기초 — 설치, 세션, 모델, 권한, 컨텍스트

AI 코딩 에이전트를 쓰기 전에 알아야 할 운영 기본기. 관통하는 사고는 두 가지다 — **자율권은 신뢰 수준에 맞춰 단계적으로 올리고**, **컨텍스트는 크기가 정해진 작업 노트로 관리**한다.

## 설치 환경 선택

목적에 따라 5가지 중 고른다: 개발 → 터미널 CLI 필수, 일반 업무 → Desktop 앱, 체험 → 웹(claude.ai/code), IDE 통합 → VS Code/JetBrains, 이동 중 → 모바일. CLI 설치는 `curl -fsSL https://claude.ai/install.sh | bash`, 확인은 `claude --version`.

Desktop 앱의 3탭 구분이 핵심: **Chat**(파일 접근 없음, 첨부만), **Cowork**(클라우드 VM에서 자율 실행, 앱 닫아도 계속), **Code**(로컬 파일 직접 읽기/수정, 승인 필요).

## 대화와 세션

- 재개: `claude -c`(직전 이어하기), `/rename`으로 이름 붙인 뒤 `claude -r "이름"`, `/resume`(목록 선택)
- 파일 참조: `@경로`(자동완성)
- 되돌리기(체크포인트): `Esc Esc` 또는 `/rewind` → Restore code(파일만 되돌리고 대화 유지, 가장 자주 씀). 단 **체크포인트는 Claude가 수정한 파일에만, 30일간** 적용 — bash로 실행한 `mv` 같은 건 못 되돌린다. 장기 버전 관리는 Git

## 모델과 Effort

작업 난이도에 품질과 토큰 비용을 맞추는 두 손잡이:

- `/model`: 플래그십(장기 계획, 아키텍처) ~ 저비용 고속(단순 변환) 중 선택 ([[LLM-Model-Tiers|모델 티어]])
- `/effort [low~max|auto]`: 사고 깊이. 오타 수정은 low, 아키텍처 분석은 high 이상. max는 현재 세션만
- `ultrathink` 키워드를 메시지에 넣으면 그 턴만 더 깊이 추론 (in-context 지시, "think hard"류는 인식 안 됨)

높을수록 좋지만 토큰 = 비용이므로 업무별로 조절하는 것이 요점.

## 자율권과 안전 — 단계적 권한

권한 모드를 신뢰 수준에 따라 올린다: **plan → default(매번 승인) → acceptEdits → auto(분류기 백그라운드 검사) → bypassPermissions(위험)**. `Shift+Tab`으로 Normal→Plan→Auto-accept 순환.

- **Plan Mode 워크플로우**: Plan 전환 → 계획 요청 → 피드백 → 확정 → Normal/Auto-accept 전환 → "계획대로 실행". 실체는 컨텍스트에 "아직 코딩하지 마" 한 줄. **AI 작업의 최대 비용은 코딩 시간이 아니라 방향 수정 시간** — 10분 계획이 2시간 삽질을 막는다
- `/permissions` 규칙(`Bash(npm run *)` 형식), 우선순위 **Deny > Ask > Allow**
- **민감 정보 봉쇄**: `.env`, `secrets/`는 Read, Edit, Bash(cat)를 전부 deny해야 확실. deny는 1차 방어선이고 sandbox, hooks가 다층 방어 ([[Claude-Code-Workflows|Hook 강제]])

## 컨텍스트 관리

컨텍스트 윈도우는 크기가 정해진 작업 노트다.

- `/clear`(작업 전환 시 완전 초기화) vs `/compact`(같은 작업 지속 시 압축, `/compact API 변경에 집중`처럼 보존 지정)
- 압축 시 CLAUDE.md와 Auto Memory는 디스크에서 재주입되지만 **대화로만 한 지시는 유실될 수 있다** — 반복 규칙은 파일로
- `/context`로 사용량 확인(70% 넘으면 compact 고려), `/mcp`로 서버별 토큰 비용 확인 후 안 쓰는 것 해제
- 신호: 같은 문제를 두 번 이상 고치게 했다면 실패 시도가 컨텍스트를 오염시킨 것 → `/clear` 후 배운 것을 반영한 새 프롬프트가 낫다 (도구 출력이 컨텍스트를 채우는 원리는 [[Tool-Output-Filtering]])

## CLAUDE.md — 작업 기억

세션마다 자동 주입되는 규칙 파일.

- `/init`으로 생성(기존 파일은 개선안만 제안)
- **실수 기반 운영**: Claude가 실수할 때마다 "CLAUDE.md에 이 규칙 추가". 판단 기준은 "이걸 빼면 Claude가 실수할까?" — 자명한 지시나 코드에서 추론 가능한 것은 뺀다
- 넣을 것: 추측 불가한 빌드/테스트 명령, 비표준 스타일, 저장소 관례. 200줄 초과 시 `@import`나 `.claude/rules/`로 분리 (너무 길면 절반을 무시)
- 3범위: 프로젝트(./CLAUDE.md, Git 공유 — **API 키 절대 금지**), 사용자(~/.claude/CLAUDE.md), 관리 정책. Auto Memory는 Claude가 스스로 적는 MEMORY.md (처음 200줄/25KB만 로드). 상세 원칙은 [[Context-Engineering]]

## 체크포인트

- 권한 모드를 작업 신뢰도에 맞게 올리되 민감 파일은 deny로 봉쇄하는가
- 복잡한 작업에 Plan Mode를 선행하는가 (방향 수정 비용 > 실행 비용)
- /clear와 /compact를 작업 전환/지속으로 구분하는가
- 반복 규칙을 대화가 아니라 CLAUDE.md에 적어 압축 후에도 유지하는가

## 출처

- [클로드 코드 가이드 (클래스 101 기초 트랙) — WikiDocs](https://wikidocs.net/book/19104)

## 관련 문서

- [[Claude-Code-Workflows|Claude Code 개발 워크플로우]]
- [[Claude-Code-Customization|Claude Code 커스터마이즈]]
- [[Context-Engineering|컨텍스트 엔지니어링]]
- [[LLM-Model-Tiers|LLM 모델 티어 선택]]
- [[AI-Native-System|AI 네이티브 시스템 (부탁 vs 강제)]]
