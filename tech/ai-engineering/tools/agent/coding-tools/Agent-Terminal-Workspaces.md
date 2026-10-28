---
tags: [ai, agent, terminal, workspace, worktree, observability]
status: done
verified_at: 2026-10-07
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

## 원격 제어면은 실행 위치와 권한 기본값을 함께 본다

로컬에 설치한 에이전트에 붙는 원격 제어면은 화면만 옮길 뿐 실행은 에이전트가 설치된 컴퓨터에서 그 사용자 권한으로 일어난다. 클라우드 VM이나 웹 세션에서 실행하는 원격 방식은 실행 위치와 파일 접근 범위가 다르므로([[Claude-Code-Customization#원격 제어 — 실행 위치 분리|원격 방식별 실행 위치]]) 도구마다 어디서 실행되는지부터 확인한다. 2026-10-27 공식 저장소 README와 사용자 문서(main 210b2e7c6a) 대조 기준, T3 Code는 내 컴퓨터에 설치하고 로그인해 둔 Claude Code, Codex, Cursor, Grok Build, OpenCode와 Google Antigravity를 데스크톱 앱, 웹 앱과 iOS, Android 앱에서 제어하는 오픈소스(MIT) 제어면이다. 모델을 따로 팔지 않고 각 에이전트의 기존 구독을 쓰며, README는 매우 초기 단계라 버그를 예상하라고 적는다.

- **실행 위치:** 에이전트가 설치된 컴퓨터에서 서버(`t3`)가 돌고 다른 기기가 그 서버에 붙는다. 그 컴퓨터가 켜져 있고 도달 가능해야 한다. 연결 경로는 계정 기반 T3 Connect, LAN이나 사설망 주소의 일회용 페어링 링크(QR), Tailscale HTTPS 등을 함께 두고 응답하는 첫 경로를 쓴다.
- **권한 모드:** 스레드마다 Supervised(명령과 파일 변경 승인), Auto-accept edits, Auto(제공자의 자동 검토), Full access 중 하나를 고른다. 새 스레드의 초기 기본값은 Full access다. 제공자마다 권한 강제 방식이 달라 자동 검토가 없는 제공자(OpenCode, Antigravity)의 Auto는 질문으로 대신한다.
- **경로별 권한:** 직접 페어링과 T3 Connect는 세션이 따로라 부여된 권한이 다를 수 있고, 화면에 표시되는 권한은 현재 사용 중인 경로에 대해서만 확인된다.

원격으로 쓰기 전에 새 스레드의 기본 권한을 낮추고, 페어링한 기기와 연결 경로를 점검한다. 휴대폰에서 승인할 수 있다는 편의와 별개로, 승인 없이 실행되는 범위는 위의 권한 모드와 각 에이전트의 자체 설정이 정한다(운영 제안). Claude Code 자체의 원격 제어는 [[Claude-Code-Customization#원격 제어 — 실행 위치 분리|원격 제어]], 상시 실행 호스트는 [[Agent-Always-On-Mac-Host|상시 실행 Mac 에이전트 호스트]]를 본다. 설치, 연결 품질과 권한 강제는 시험하지 않았다.

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
- [Git Documentation, git-worktree](https://git-scm.com/docs/git-worktree)
- [T3 Code — pingdotgg](https://github.com/pingdotgg/t3code) — README와 `docs/user/remote-access.md`, `docs/user/permission-modes.md`, 2026-10-27 main 210b2e7c6a 기준
- 사용자 제공 GeekNews 알림 요약(2026-10-16~27): T3 Code. 게시물 URL은 확인하지 못했고 위 저장소로 대조했다.

## 관련 문서

- [[Agent-Loop-Engineering|루프 엔지니어링]] — 실행 반복과 정지 조건
- [[Agent-Swarm-Containment|에이전트 군집 격리]] — 공유 자원과 권한 경계
- [[Agent-Ready-API-Design|에이전트 친화 API 설계]] — 상태 조회와 실패 계약
- [[Claude-Code-Customization|Claude Code 원격 제어와 플러그인]]
- [[Agent-Always-On-Mac-Host|상시 실행 Mac 에이전트 호스트]]
