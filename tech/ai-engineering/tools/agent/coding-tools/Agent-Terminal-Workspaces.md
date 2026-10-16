---
tags: [ai, agent, terminal, workspace, worktree, observability]
status: done
verified_at: 2026-10-07
category: "AI엔지니어링(AIEngineering)"
aliases: ["Agent Terminal Workspaces", "에이전트 터미널 작업 공간"]
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

## Worktree가 나누는 것과 공유하는 것

Git linked worktree는 작업 파일과 `HEAD`, `index` 같은 작업별 정보를 분리하지만 저장소의 다른 정보를 공유한다. 파일 경로 분리는 별도 사용자 권한이나 네트워크 격리를 만드는 기능이 아니다.

Orca는 새 worktree에 없는 의존성, 캐시와 무시된 로컬 파일을 준비하는 복사 또는 공유 기능도 제공한다. 공유 디렉터리가 심볼릭 링크로 연결됐다면 서로 다른 작업 폴더에서도 같은 대상을 수정할 수 있으므로, worktree 개수만으로 변경 충돌이 없다고 판단하지 않는다.

작업을 나누기 전에 다음을 확인한다.

1. 각 실행의 작업 디렉터리와 기준 ref가 의도한 대상인가.
2. 수정할 파일과 공유 캐시의 쓰기 주체가 정해져 있는가.
3. 같은 DB, 포트나 외부 서비스를 사용한다면 충돌을 어떻게 막을 것인가.
4. 결과를 합칠 때 어떤 diff와 검사가 완료를 판정하는가.

세 번째와 네 번째 항목은 worktree 기능 외부에 남는 운영 책임이다. 보안 경계가 필요하면 [[Agent-Swarm-Containment|에이전트 군집 격리]]와 함께 검토한다.

## 이해 확인

- pane 두 개가 같은 디렉터리를 가리킬 때 파일 충돌 가능성을 설명할 수 있는가.
- 에이전트의 `done` 표시와 테스트 성공을 구분할 수 있는가.
- worktree를 나눠도 공유 캐시나 외부 DB의 쓰기 충돌이 남는 이유를 설명할 수 있는가.

## 출처

2026-10-07 공식 문서의 기능과 상태 정의를 대조했다. 제품을 설치하거나 성능, 원격 연결과 실제 상태 판별 정확도를 시험한 기록은 아니다.

- [Ghostty Documentation, About Ghostty](https://ghostty.org/docs/about)
- [Herdr Documentation, Agents](https://herdr.dev/docs/agents/)
- [Herdr Documentation, Agent automation](https://herdr.dev/docs/agent-automation/)
- [Orca Documentation, Worktrees](https://github.com/stablyai/orca/blob/main/docs/site/content/docs/model/worktrees.mdx)
- [Git Documentation, git-worktree](https://git-scm.com/docs/git-worktree)

## 관련 문서

- [[Agent-Loop-Engineering|루프 엔지니어링]] — 실행 반복과 정지 조건
- [[Agent-Swarm-Containment|에이전트 군집 격리]] — 공유 자원과 권한 경계
- [[Agent-Ready-API-Design|에이전트 친화 API 설계]] — 상태 조회와 실패 계약
