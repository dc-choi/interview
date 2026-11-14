---
tags: [ai, agent, coding-agent, index]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["Agent Coding Tools", "코딩 에이전트 작업 도구"]
---

# 코딩 에이전트 작업 도구

코딩 에이전트가 저장소에서 일할 때 쓰는 도구 — 코드 탐색의 증거 수준과 팀이 반복 질의할 코드베이스 지식 지도, 재사용 작업 단위인 스킬, 여러 에이전트의 터미널과 작업 공간 분리, IDE의 에이전트 실행과 도구 노출, 에이전트를 상시 실행하는 호스트 운영. 지시 설계는 [[Agent-Instruction-Design|에이전트 지시 설계]]에 있다. 상위: [[agent|에이전트 심화]].

## 목차

- [[Agent-Oriented-Programming-Languages|에이전트용 프로그래밍 언어]]: Zerolang의 그래프 편집과 텍스트 검토, Mog의 호스트 capability와 보안 검증 경계
- [[Agent-Diagram-Evidence|에이전트 다이어그램의 근거와 검증]]: Archify의 독립 HTML, 커밋 근거, 자동 검사와 의미 검증, 버전별 라이선스
- [[Agent-Code-Search|에이전트 코드 인텔리전스]]: rg 전수 검색, Semble 후보 발견, Serena 심볼 검증/수정, Graphify 구조 경로, index freshness
- [[Codebase-Knowledge-Map|대규모 코드베이스 지식 지도]]: 규모 측정과 공통 식별자, 결정론적 파서와 호출 관계 보강, 확인, 추론과 미해결의 구분, 템플릿과 재구축 동일성 검사, 그래프 순회 상한, 상시 벡터 DB 없는 exact 비교
- [[Agent-Skills|에이전트 스킬]]: 재사용 작업 단위 = 온디맨드 플레이북, SKILL.md 폴더+description 자동 로드, 점진적 공개, Claude vs Codex 같은 포맷 다른 관례, 스킬 vs 훅, 수명주기 감사, 표면별 설치와 외부 스킬 신뢰
- [[Agent-Skills-Kiro|Kiro Steering, 훅, 스킬, MCP와 Powers]]: Steering 포함 모드와 AGENTS.md, Hooks 형식과 차단 경계, 스킬 범위와 이식 점검, MCP 설정 병합과 도구 승인, workspace 신뢰, Powers 키워드 활성화, plugin.json과 스킬, API 명세 조회와 생성 코드 검증, SageMaker Unified Studio 원격 작업 경계
- [[Agent-Terminal-Workspaces|에이전트 터미널과 작업 공간]] — 화면과 상태, worktree 분리, Herdr app/core와 TUI 구분, Prospero 원격 호스트, 한 사람이 돌리는 병렬 세션의 비용과 저장소에 두는 판단 대기열
- [[JetBrains-IDE-Agent-Integration|JetBrains IDE의 코딩 에이전트 통합]]: Air in IDEs의 실행 화면과 세션 diff, ACP registry, 구독 인증 경로, 내장 MCP 서버의 도구 노출과 Brave mode, 로그포인트와 에이전트 디버깅, 스킬 설치 위치, ThinkRail의 pi 호스트와 worktree, SPEC.md 그래프와 승인
- [[Agent-Always-On-Mac-Host|상시 실행 Mac 에이전트 호스트]]: 잠자기 방지와 정전 뒤 시동, FileVault와 자동 로그인의 재시작 절충, Remote Login과 Tailscale SSH, 세션 유지 방식의 재부팅 한계, Corgi의 화면/대화 복원과 에이전트 훅, 플러그인과 업데이트 소유

- [[Agent-Reverse-Engineering|에이전트 역공학과 실행 하네스]]: REA의 연결 도구와 공식 배포 경로, 하드웨어 버스 기록 비교(hw-harness), 매칭 디컴파일과 정적 재컴파일의 동등성 구분, 게임 상태 재현, 브라우저 이식의 검증, Xbox Labs 발표, Ruby 생태계 보강과 국내 저작권법의 프로그램코드역분석 요건

- [[Independent-Agent-Code-Review|독립 에이전트 코드 리뷰]]: 정적 검사, 발견과 검증 분리, 인용 실재와 리뷰 전달 범위, OpenQodex 사례

- [[Agent-Language-Port|에이전트로 하는 대규모 언어 이전]]: Bun의 Zig에서 Rust로의 일괄 포팅, 언어 중립 테스트 오라클, 구현과 적대적 리뷰 분리, 같아 보이지만 다르게 동작하는 코드의 회귀, 병합과 출시 분리, 점진 교체와 비교

## 함께 볼 문서

- [[agent|에이전트 심화]]
