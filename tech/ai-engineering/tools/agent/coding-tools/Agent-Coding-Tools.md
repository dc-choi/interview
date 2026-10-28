---
tags: [ai, agent, coding-agent, index]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["Agent Coding Tools", "코딩 에이전트 작업 도구"]
---

# 코딩 에이전트 작업 도구

코딩 에이전트가 저장소에서 일할 때 쓰는 도구 — 코드 탐색의 증거 수준, 재사용 작업 단위인 스킬, 여러 에이전트의 터미널과 작업 공간 분리, IDE의 에이전트 실행과 도구 노출, 에이전트를 상시 실행하는 호스트 운영. 지시 설계는 [[Agent-Instruction-Design|에이전트 지시 설계]]에 있다. 상위: [[agent|에이전트 심화]].

## 목차

- [[Agent-Code-Search|에이전트 코드 인텔리전스]]: rg 전수 검색, Semble 후보 발견, Serena 심볼 검증/수정, Graphify 구조 경로, index freshness
- [[Agent-Skills|에이전트 스킬]]: 재사용 작업 단위 = 온디맨드 플레이북, SKILL.md 폴더+description 자동 로드, 점진적 공개, Claude vs Codex 같은 포맷 다른 관례, 스킬 vs 훅, 수명주기 감사, 표면별 설치와 외부 스킬 신뢰
- [[Agent-Skills-Kiro|Kiro Steering, 훅, 스킬, MCP와 Powers]]: Steering 포함 모드와 AGENTS.md, Hooks 형식과 차단 경계, 스킬 범위와 이식 점검, MCP 설정 병합과 도구 승인, workspace 신뢰, Powers 키워드 활성화, plugin.json과 스킬, API 명세 조회와 생성 코드 검증, SageMaker Unified Studio 원격 작업 경계
- [[Agent-Terminal-Workspaces|에이전트 터미널과 작업 공간]]: 화면 배치, 상태 관찰, worktree 분리와 완료 검증, 원격 제어면(T3 Code)의 실행 위치와 권한 기본값
- [[JetBrains-IDE-Agent-Integration|JetBrains IDE의 코딩 에이전트 통합]]: Air in IDEs의 실행 화면과 세션 diff, ACP registry, 구독 인증 경로, 내장 MCP 서버의 도구 노출과 Brave mode, 로그포인트와 에이전트 디버깅, 스킬 설치 위치, ThinkRail의 pi 호스트와 worktree, SPEC.md 그래프와 승인
- [[Agent-Always-On-Mac-Host|상시 실행 Mac 에이전트 호스트]]: 잠자기 방지와 정전 뒤 시동, FileVault와 자동 로그인의 재시작 절충, Remote Login과 Tailscale SSH, 세션 유지 방식의 재부팅 한계, Corgi의 화면/대화 복원과 에이전트 훅, 플러그인과 업데이트 소유

- [[Agent-Reverse-Engineering|에이전트 역공학과 실행 하네스]]: REA의 연결 도구와 공식 배포 경로, 하드웨어 버스 기록 비교(hw-harness), 매칭 디컴파일과 정적 재컴파일의 동등성 구분, 게임 상태 재현, 브라우저 이식의 검증, Xbox Labs 발표, Ruby 생태계 보강과 국내 저작권법의 프로그램코드역분석 요건

## 함께 볼 문서

- [[agent|에이전트 심화]]
