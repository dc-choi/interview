---
tags: [ai, agent, terminal, workspace, worktree, observability]
status: done
verified_at: 2026-11-15
category: "AI엔지니어링(AIEngineering)"
aliases: ["Agent Terminal Workspaces", "에이전트 터미널 작업 공간", "T3 Code"]
---

# 에이전트 터미널과 작업 공간

여러 코딩 에이전트를 실행할 때는 화면 배치, 실행 상태 관찰, 작업 파일 분리를 각각 확인한다. 터미널 창을 나눴다는 사실만으로 파일이 분리되거나 작업 결과가 검증되지는 않는다.

## 비교할 세 가지 책임

아래 분류는 제품의 기능을 비교하기 위한 분석 틀이다. 한 제품이 여러 책임을 함께 제공할 수 있다.

| 책임 | 확인할 것 | 공식 문서에서 확인한 예 |
|---|---|---|
| 터미널 표시와 입력 | 화면 렌더링, 탭, 분할, 키 입력 | Ghostty는 터미널 에뮬레이터이며 네이티브 탭과 분할을 제공한다 |
| 에이전트 상태 관찰 | 어떤 실행이 진행 중인지, 사용자 입력을 기다리는지 | Herdr는 pane의 에이전트를 식별하고 상태를 탭과 workspace에 모아 표시한다 |
| 작업 파일 분리 | 작업별 디렉터리, HEAD와 index, 기준 ref | Orca는 작업별 Git worktree를 중심으로 터미널, 편집과 diff 검토를 묶는다 |

이 기능 차이만으로 어느 제품이 더 빠르거나 안정적이라고 결론 내리지 않는다. 메모리 사용량과 원격 연결 품질은 같은 버전, 작업량과 연결 조건에서 별도로 측정할 항목이다.

## 상태 표시는 완료 증거와 다르다

Herdr는 지원하는 에이전트의 프로세스와 pane의 최신 화면을 읽거나, 통합 기능이 보고하는 상태를 사용한다. 화면 기반 판별은 알려진 표시 패턴에 의존하므로 새로운 승인 화면을 잘못 분류할 수 있다.

- `working`: 실행 중이라고 관찰한 상태다.
- `blocked`: 승인이나 질문 화면을 인식한 상태다.
- `idle`, `done`: 입력을 받을 준비가 된 상태다. `done`은 아직 확인하지 않은 완료 표시와도 관련된다.
- `unknown`: 상태를 확신하지 못한다는 뜻이며 성공이나 실패의 증거가 아니다.

따라서 상태 대기를 통과한 뒤에도 요구한 파일, diff와 검사 결과를 확인해야 한다. 예를 들어 화면에 `done`이 떠도 테스트 종료 코드와 실패 내역을 읽기 전에는 테스트 통과로 기록하지 않는다. 이 검증 분리는 상태 정의에서 도출한 운영 원칙이다.

### Corgi의 관찰과 복원 범위

2026-10-28 공식 README 기준, Corgi는 Ghostty 기반의 터미널 멀티플렉서 겸 에이전트 관리 도구다. 에이전트별 작업/입력 대기/완료 상태와 컨텍스트, 토큰 및 사용량 한도를 표시한다. Claude Code와 Codex 설정에 훅을 추가하며, 다른 도구의 통합 방식은 다를 수 있다. 관찰 기능 도입도 기존 에이전트 설정을 바꾸는 작업으로 취급한다.

실행 중 세션의 조회와 pane 입력/읽기를 CLI로 제공하지만, 재부팅 뒤 화면과 대화를 복원하는 것과 모든 프로세스의 실행 상태를 그대로 복원하는 것은 구분한다. 구체적인 경계는 [[Agent-Always-On-Mac-Host#세션 유지는 끊김과 재부팅을 나눠 본다|세션 복원의 범위]]를 따른다. 이 절은 문서 확인이며 설치나 복원 시험 결과가 아니다.

## Worktree가 나누는 것과 공유하는 것

Git linked worktree는 작업 파일과 `HEAD`, `index` 같은 작업별 정보를 분리하지만 저장소의 다른 정보를 공유한다. 파일 경로 분리는 별도 사용자 권한이나 네트워크 격리를 만드는 기능이 아니다.

Orca는 새 worktree에 없는 의존성, 캐시와 무시된 로컬 파일을 준비하는 복사 또는 공유 기능도 제공한다. 공유 디렉터리가 심볼릭 링크로 연결됐다면 서로 다른 작업 폴더에서도 같은 대상을 수정할 수 있으므로, worktree 개수만으로 변경 충돌이 없다고 판단하지 않는다.

작업을 나누기 전에 다음을 확인한다.

1. 각 실행의 작업 디렉터리와 기준 ref가 의도한 대상인가.
2. 수정할 파일과 공유 캐시의 쓰기 주체가 정해져 있는가.
3. 같은 DB, 포트나 외부 서비스를 사용한다면 충돌을 어떻게 막을 것인가.
4. 결과를 합칠 때 어떤 diff와 검사가 완료를 판정하는가.

세 번째와 네 번째 항목은 worktree 기능 외부에 남는 운영 책임이다. 보안 경계가 필요하면 [[Agent-Swarm-Containment|에이전트 군집 격리]]와 함께 검토한다.

### worktree는 장비의 계산 자원을 나누지 않는다

GitHub이 Copilot 런타임을 TypeScript에서 Rust로 옮긴 기록(2026-09-16 게시, 2026-09-23 갱신된 공식 글 기준)은 위임 단위를 둘로 나눈다. 서브에이전트는 부모 세션의 작업 공간 안에서 조사하고 답을 부모 맥락으로 돌려준다. 하위 세션(child session)은 자기 worktree, 브랜치와 에이전트 루프를 따로 가져 부모와 독립적으로 변경한다. 약 3만 줄인 파일 하나를 옮길 때 조정 세션은 한 시간 가까이 코드를 읽은 뒤 하위 세션 15개로 일을 나눴고, 끝난 커밋을 자기 브랜치로 가져오며 충돌을 풀었다.

파일은 나뉘었지만 15개 세션이 한 노트북에서 동시에 빌드와 테스트를 돌리자 장비가 멈췄다. 작성자는 서브에이전트와 하위 세션에 큰 빌드와 테스트 실행을 피하게 하고 빌드를 부모에게만 맡겼다. 나중에는 독립 포팅 세션 8개를 대상으로 별도 대화 세션을 빌드 관문으로 두어, 세션들이 빌드 허가를 요청하고 한 번에 하나만 빌드하게 했다(작성자는 이를 에이전트로 만든 mutex라고 불렀다). 운영 제안: 위 점검 목록의 세 번째 항목에 CPU 같은 장비 자원도 넣고, 비싼 검증 단계는 실행 주체와 동시 실행 수를 먼저 정한다. 이 기록은 한 사람의 장비와 작업에서 나온 운영 사례이며 적정 세션 수의 기준은 아니다. 하위 세션 결과를 합칠 때의 리뷰는 [[Independent-Agent-Code-Review#동작을 보존하는 이관의 리뷰|이관 리뷰]]를 본다.

서브에이전트와 하위 세션 말고도 위임 단위가 둘 더 있다. 2026-11-17 공개 발표는 서로 의존하는 병렬 작업(예: 같은 백엔드 변경에 걸린 웹 앱과 모바일 앱)을 먼저 계획을 쪼개 병렬로 구현하는 대신 동료(peer) 서브에이전트를 짝지어 서로 갱신하게 하는 방식을 소개했다. 소통이 필요한 경계를 Codex가 찾아야 해서 까다롭고, 모델이 서로 소통하는 법을 익혔다는 설명에는 근거가 제시되지 않았다. 부모 세션에 묶이지 않는 독립 스레드를 에이전트가 띄우고 사용자가 각각 조종하는 방식도 소개했으며, dots가 스레드를 대신 띄우게 할 수도 있다고 했다. 효과를 측정한 자료가 없다. 2026-11-21 공식 Subagents 문서는 독립적인 일을 서브에이전트에 맡기고 메인 스레드가 결과를 모으는 구조만 설명하고, 서로 갱신하는 동료 서브에이전트와 에이전트가 띄우는 독립 스레드는 찾지 못했다(CLI의 `/subagents`는 실행 중인 에이전트 스레드를 살펴보고 전환하는 명령이다). 이 부분은 문서의 `verified_at` 범위에 들지 않는다. 적용 제안: 짝 사이에서 합의한 API 변경과 공유 타입은 메시지로만 두지 않고 한 파일에 남기게 하고, 합칠 때는 위 점검 목록의 4번처럼 diff와 검사로 판정한다.

## 원격 제어면은 실행 위치와 권한 기본값을 함께 본다

로컬에 설치한 에이전트에 붙는 원격 제어면은 화면만 옮길 뿐 실행은 에이전트가 설치된 컴퓨터에서 그 사용자 권한으로 일어난다. 클라우드 VM이나 웹 세션에서 실행하는 원격 방식은 실행 위치와 파일 접근 범위가 다르므로([[Claude-Code-Customization#원격 제어 — 실행 위치 분리|원격 방식별 실행 위치]]) 도구마다 어디서 실행되는지부터 확인한다. 2026-10-27 공식 저장소 README와 사용자 문서(main 210b2e7c6a) 대조 기준, T3 Code는 내 컴퓨터에 설치하고 로그인해 둔 Claude Code, Codex, Cursor, Grok Build, OpenCode와 Google Antigravity를 데스크톱 앱, 웹 앱과 iOS, Android 앱에서 제어하는 오픈소스(MIT) 제어면이다. 모델을 따로 팔지 않고 각 에이전트의 기존 구독을 쓰며, README는 매우 초기 단계라 버그를 예상하라고 적는다.

- **실행 위치:** 에이전트가 설치된 컴퓨터에서 서버(`t3`)가 돌고 다른 기기가 그 서버에 붙는다. 그 컴퓨터가 켜져 있고 도달 가능해야 한다. 연결 경로는 계정 기반 T3 Connect, LAN이나 사설망 주소의 일회용 페어링 링크(QR), Tailscale HTTPS 등을 함께 두고 응답하는 첫 경로를 쓴다.
- **권한 모드:** 스레드마다 Supervised(명령과 파일 변경 승인), Auto-accept edits, Auto(제공자의 자동 검토), Full access 중 하나를 고른다. 새 스레드의 초기 기본값은 Full access다. 제공자마다 권한 강제 방식이 달라 자동 검토가 없는 제공자(OpenCode, Antigravity)의 Auto는 질문으로 대신한다.
- **경로별 권한:** 직접 페어링과 T3 Connect는 세션이 따로라 부여된 권한이 다를 수 있고, 화면에 표시되는 권한은 현재 사용 중인 경로에 대해서만 확인된다.

원격으로 쓰기 전에 새 스레드의 기본 권한을 낮추고, 페어링한 기기와 연결 경로를 점검한다. 휴대폰에서 승인할 수 있다는 편의와 별개로, 승인 없이 실행되는 범위는 위의 권한 모드와 각 에이전트의 자체 설정이 정한다(운영 제안). Claude Code 자체의 원격 제어는 [[Claude-Code-Customization#원격 제어 — 실행 위치 분리|원격 제어]], 상시 실행 호스트는 [[Agent-Always-On-Mac-Host|상시 실행 Mac 에이전트 호스트]]를 본다. Codex는 2026-11-17 발표에서 데스크톱 앱 없이 CLI로 앱 서버(하네스)를 띄워 개발 서버의 에이전트에 휴대폰으로 붙는 경로를 소개했다. 2026-11-21 공식 문서끼리도 이 점이 엇갈린다. Remote connections 문서는 여전히 휴대폰 설정을 데스크톱 앱에서 시작하고 CLI에서는 할 수 없다고 적지만, CLI 명령 문서는 `codex remote-control start`(원격 제어를 켠 로컬 app-server 데몬)와 `pair`(수동 페어링 코드)를 설명하고 릴리스 노트는 TUI의 `/rc`, `/remote`를 0.171.0(2026-11-20)에 더했다고 적는다([[Codex-CLI#App vs CLI|Codex CLI]]). 설치한 버전과 계정으로 확인하고, 앱을 거치지 않는 경로의 기본 권한도 위 권한 모드처럼 따로 본다(적용 제안). 세션 사이를 전환하는 에이전트 보기(`codex agents`, `/agents`)와 음성(`/voice`, 지원하는 빌드와 세션에 한함)도 CLI 명령 문서에 있다. 설치, 연결 품질과 권한 강제는 시험하지 않았다.

### 모바일 동반 앱과 원격 실행은 별도 기능이다

2026-11-03 Orca 공식 README는 모바일 동반 앱의 상태 관찰, 완료 알림과 후속 지시를 설명한다. 별도 SSH worktree 기능은 원격 호스트에서 에이전트를 실행하고 파일, Git과 터미널을 다룬다. 휴대폰에서 조작한다는 사실만으로 휴대폰에서 추론하거나 빌드한다는 뜻은 아니다.

운영 제안으로, 연결된 작업이 로컬인지 SSH 호스트인지 확인하고 그 호스트의 작업 디렉터리와 에이전트 권한을 검토한다. 완료 알림 뒤에도 diff와 검사 결과로 작업을 판정한다. 모바일 연결과 SSH 복구를 직접 시험하지 않았으며, 화면 통합만으로 하위 작업의 상태 판별 정확도가 보장된다고 보지 않는다.

## 앱 창과 실행 호스트를 분리하는 두 사례

2026-11-02 공식 문서 대조 기준이다. Herdr app은 `herdr-core`가 터미널을 실행해 창 종료나 앱 업데이트 뒤에도 작업이 남는 구조다. SSH 머신도 같은 사이드바에 모으며, OSC 7501 상태 프로토콜을 지원하는 에이전트는 실행, 완료와 입력 대기를 보고한다. 레이아웃과 JavaScript mod로 화면을 바꿀 수 있다.

현재 Herdr app과 기존 Herdr TUI는 별도 프로그램이고 실행 세션을 공유하지 않는다. 위의 화면 패턴 판별과 TUI 문서를 새 app의 모든 동작으로 옮기지 않는다. 창이 닫힌 뒤의 지속 실행도 호스트 재부팅 뒤 복구를 보장하는 설명은 아니다.

Prospero는 C++와 Dear ImGui 기반 네이티브 하네스로 Windows, macOS와 Linux에서 로컬 또는 원격 모델에 연결한다. 엔진을 SSH 원격 호스트나 백그라운드에서 실행할 수 있고 GUI 제어 도구를 제공한다. 문서는 권한 응답의 기한, SSH 단절 뒤 재접속과 원격 하위 에이전트를 설명한다. 원격의 설정과 도구 권한도 별도로 확인한다.

제공된 Prospero 알림의 네트워크 시간 제한, 오래 걸리는 셸의 백그라운드 전환과 중단 시 전체 프로세스 트리 종료는 구현과 플랫폼별로 추가 대조할 후속 항목이다. 두 제품 모두 설치, 연결과 취소 전파를 재현하지 않았다.

## 사람이 병목이 될 때

화면과 파일을 나눠도 세션이 늘면 사람의 검토와 결정이 병목이 된다. 단계별 위임 계층(오케스트레이터, PM과 worker), 도구가 제공하는 orchestration(Orca)과 계층 없이 판단 대기열을 저장소에 두는 방식은 [[Agent-Terminal-Workspaces-Human-Bottleneck|사람이 병목이 될 때의 위임 계층과 판단 대기열]]에서 다룬다.

## 이해 확인

- pane 두 개가 같은 디렉터리를 가리킬 때 파일 충돌 가능성을 설명할 수 있는가.
- 에이전트의 `done` 표시와 테스트 성공을 구분할 수 있는가.
- worktree를 나눠도 공유 캐시나 외부 DB의 쓰기 충돌이 남는 이유를 설명할 수 있는가.
- 휴대폰에서 지휘하는 에이전트의 명령이 어느 컴퓨터에서 어떤 권한으로 실행되는지 설명할 수 있는가.

## 출처

2026-10-07 공식 문서의 기능과 상태 정의를 대조했다. 제품을 설치하거나 성능, 원격 연결과 실제 상태 판별 정확도를 시험한 기록은 아니다. T3 Code 절은 2026-10-27 공식 저장소 문서를 대조했다.

- [Ghostty Documentation, About Ghostty](https://ghostty.org/docs/about)
- [Corgi — tals](https://github.com/tals/corgi) — 2026-10-28 README의 상태 표시, 훅 통합과 CLI 범위 부분 대조
- [Herdr Documentation, Agents](https://herdr.dev/docs/agents/)
- [Herdr Documentation, Agent automation](https://herdr.dev/docs/agent-automation/)
- [Orca Documentation, Worktrees](https://github.com/stablyai/orca/blob/main/docs/site/content/docs/model/worktrees.mdx)
- [Orca — stablyai](https://github.com/stablyai/orca) — 2026-11-03 Mobile Companion과 SSH Worktrees의 역할 부분 대조.
- [Git Documentation, git-worktree](https://git-scm.com/docs/git-worktree)
- [T3 Code — pingdotgg](https://github.com/pingdotgg/t3code) — README와 `docs/user/remote-access.md`, `docs/user/permission-modes.md`, 2026-10-27 main 210b2e7c6a 기준
- 사용자 제공 GeekNews 알림 요약(2026-10-16~27): T3 Code. 게시물 URL은 확인하지 못했고 위 저장소로 대조했다.

- [Herdr app — Herdr](https://herdr.dev/) — 2026-11-02 app/core 분리, OSC 7501, TUI와 세션 비공유 대조.
- [Prospero — skeeto](https://github.com/skeeto/prospero) — 2026-11-02 README 대조.
- [Prospero, Usage](https://github.com/skeeto/prospero/blob/master/docs/usage.md)
- [Prospero, Remote and background hosts](https://github.com/skeeto/prospero/blob/master/docs/remote.md)
- [Migrating the GitHub Copilot runtime to Rust, using Copilot — GitHub](https://github.blog/ai-and-ml/generative-ai/migrating-the-github-copilot-runtime-to-rust-using-copilot/) — 2026-09-16 게시, 2026-09-23 갱신. 2026-11-12 서브에이전트와 하위 세션의 구분, 하위 세션 15개의 분할과 빌드 관문 부분 대조.
- [New Ways of Working with Codex — AI Engineer, Dominik Kundel, Charlie Guo](https://www.youtube.com/watch?v=IPh9YsWvDQk) — 2026-11-17 공개 영상의 35:49~36:49와 53:50~56:38을 사람이 단 영어 자막과 대조. 동료 서브에이전트, 독립 스레드와 CLI 원격 연결 소개의 근거이며 2026-11-21 아래 공식 문서로 대조했다.
- [OpenAI, Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents) — 2026-11-21 메인 스레드가 결과를 모으는 구조와 에이전트 스레드 전환 대조. 동료 서브에이전트와 독립 스레드는 찾지 못함
- [OpenAI, Developer commands](https://learn.chatgpt.com/docs/developer-commands) — 2026-11-21 `codex remote-control`, `codex agents`, `/voice` 대조. 휴대폰 설정 경로는 [Remote connections](https://learn.chatgpt.com/docs/remote-connections)와 엇갈린다

## 관련 문서

- [[Agent-Loop-Engineering|루프 엔지니어링]] — 실행 반복과 정지 조건
- [[Agent-Swarm-Containment|에이전트 군집 격리]] — 공유 자원과 권한 경계
- [[Agent-Ready-API-Design|에이전트 친화 API 설계]] — 상태 조회와 실패 계약
- [[Claude-Code-Customization|Claude Code 원격 제어와 플러그인]]
- [[Agent-Always-On-Mac-Host|상시 실행 Mac 에이전트 호스트]]
- [[Agent-Terminal-Workspaces-Human-Bottleneck|사람이 병목이 될 때의 위임 계층과 판단 대기열]] — 오케스트레이터와 PM 계층, Orca orchestration, 저장소에 두는 판단 대기열
- [[Codex-CLI|Codex CLI]] — CLI의 원격 제어 명령과 휴대폰 연결 문서의 차이
