---
tags: [ai, agent, orchestration, review, workspace]
status: done
verified_at: 2026-11-09
category: "AI엔지니어링(AIEngineering)"
aliases: ["Agent Terminal Workspaces Human Bottleneck", "사람 병목과 위임 계층", "판단 대기열", "owner inbox"]
---

# 사람이 병목이 될 때의 위임 계층과 판단 대기열

여러 코딩 에이전트의 화면, 실행 상태와 작업 파일을 나누는 방법은 [[Agent-Terminal-Workspaces|에이전트 터미널과 작업 공간]]이 다룬다. 이 문서는 세션이 늘수록 사람의 검토와 결정이 병목이 될 때 위임 계층을 두는 방식과, 계층 없이 사람의 판단 대기열을 세션 밖에 두는 방식을 다룬다.

## 사람이 병목이 되면 위임 계층을 나눈다

화면과 파일을 나눠도 이슈 작성, 계획 확정, PR 전 확인, PR 갱신 확인과 merge를 모두 한 사람이 맡으면 세션이 늘수록 사람의 주의와 맥락 전환이 병목이 된다. 2026-10-23 공개된 사내 발표는 한 개발자가 이 병목을 단계적으로 줄인 사례를 보여 준다. 아래 순서는 그 사례의 기록이며 표준 절차는 아니다.

| 단계 | 바꾼 것 | 줄이려던 문제 |
|---|---|---|
| 1 | 프로젝트와 티켓을 의존성 그래프로 시각화 | 지금 검토할 세션을 찾는 시간 |
| 2 | 작업 시작 때 세션 제목을 정하고 하네스 단계에 따라 진행 표시를 갱신하며 merge와 회고 뒤 세션을 자동으로 닫음 | 열린 세션 수의 누적 |
| 3 | 선행 이슈가 끝나면 의존 이슈 세션을 자동 시작 | 작업을 하나씩 직접 시작해야 하는 부담과 동시 세션 수의 한계 |
| 4 | merge를 감지해 EXP 배포 환경(발표의 명칭)에 올리고 계획 단계의 시험을 E2E로 실행, 기대와 다르면 후속 PR | 수동 통합 시험의 병목 |
| 5 | 프로젝트마다 PM 에이전트가 worker를 만들고 감독하며 결정이 필요한 사항만 사람에게 질문 | 프로젝트별 진행 상황과 맥락의 기억 |
| 6 | 여러 PM 위에 오케스트레이터를 두고 사람은 주로 오케스트레이터와 대화 | 비슷한 이름의 프로젝트를 어느 PM에 맡겼는지 혼동 |
| 7 | 결정 대기 항목과 준비된 PR을 웹 화면에 모음 | 터미널에서 결정 요청의 출처를 찾는 시간 |

4단계에서는 로컬 mock API를 통과한 변경도 외부 커머스 플랫폼의 특수 설정이나 요청 차이 때문에 실제 연동에서 다르게 동작한 경우가 드러났다. 6단계 이후에는 PR 리뷰에서 받은 지적 하나(특정 키워드를 쓰지 말라는 요청 같은)를 오케스트레이터에 전달해 전체 PM과 worker에 전파했고, 결정 사항은 해당하는 PM에만 전달하게 했다. 세션 제목, 진행 표시와 종료는 사용하던 터미널 도구의 CLI로 자동화했다(발표 기준, [[Agent-Terminal-Workspaces|에이전트 터미널과 작업 공간]]에 적은 제품과 같은 제품인지는 확인하지 않았다). 회고는 개발 세션의 전체 맥락을 이어 쓰지 않고, 저장한 대화 기록을 새 세션에서 읽게 해 토큰 사용을 줄였으며 회고 근거로 작업 지표를 쌓았다. 발표자가 밝힌 4개월간 약 500개 PR merge는 품질 지표와 비교군이 없는 자기 보고라 생산성 근거로 쓰지 않는다.

Anthropic은 중앙 LLM이 작업을 동적으로 나눠 worker에 위임하고 결과를 종합하는 구성을 orchestrator-workers로 설명하며, 필요한 하위 작업을 미리 예측할 수 없는 복잡한 작업에 맞는다고 본다. 같은 글은 에이전트가 검토 지점이나 막힌 상황에서 사람의 피드백을 받으려고 멈출 수 있다고 설명한다. 원문은 orchestrator-workers를 미리 정한 코드 경로의 workflow로 분류하며, 여러 단계의 감독 계층은 다루지 않는다. 위 사례의 오케스트레이터, PM과 worker 2단 계층은 이 구성을 사람의 결정 요청을 모으는 쪽으로 확장한 형태로 읽을 수 있다. 같은 정의의 그래프 관점은 [[Agent-Graph-Engineering|그래프 엔지니어링]]에서 다룬다.

적용 제안은 다음과 같다.

- 계층이 하나 늘 때마다 요약이 한 번 더 끼므로 원래 근거가 빠질 수 있다. 결정 요청에는 원 세션, PR, 검사 결과를 함께 올리게 한다.
- 리뷰 지적을 전체에 전파하기 전에 그 지적이 모든 프로젝트에 적용될 조건인지 검토하고, 채택한 것만 결과물 하나의 수정과 구분해 지침 파일 변경으로 남긴다. 기준은 [[Harness-Adoption-Ladder#원격으로 피드백할 때도 검토 대상은 실제 산출물이다|결과물 수정과 공통 규칙 변경의 구분]]을 따른다.
- PM이나 오케스트레이터가 완료라고 보고해도 merge 판단은 diff, 시험 결과와 배포 환경 확인으로 한다. 위임 계층은 사람의 검토 횟수를 줄이는 장치이지 검증을 대신하지 않는다.

발표에 나온 도구 구성과 배포 자동화는 재현하지 않았다.

### 위임 계층을 도구가 제공하는 경우

같은 orchestrator-workers 구성을 터미널 작업 공간이 기능으로 제공하기도 한다. 2026-11-15 Orca 공식 orchestration 문서 기준, 이 기능은 Settings의 Experimental에서 켜며 조정 에이전트가 `orca orchestration` CLI로 다음 단위를 다룬다.

- **Run:** 지속 이름공간이자 기본 수신함이다(만들 때 `--objective`로 목표를 준다). worker를 배치하거나 일정을 정하지 않는다.
- **Task:** 명세, 의존성과 상태(`pending`, `ready`, `dispatched`, `completed`, `failed`, `blocked`)를 가진 작업 항목이다.
- **Dispatch:** Task 하나를 터미널 하나에서 시도한 기록이다. worker는 끝나면 성공이나 실패를 밝힌 `worker_done`을 이 Dispatch에 보고한다.
- **Decision gate:** 조정자가 소유한 질문으로, 답이 정해질 때까지 해당 Task를 막는다.

worker는 Task마다 `--agent`로 Claude Code, Codex 같은 다른 에이전트를 고르고 일부 에이전트는 실행 단위 `--model`, `--effort`를 받는다(`--effort`는 `--model`과 함께 써야 하고 해당 모델이 그 수준을 지원할 때만 적용된다). 조정자는 worker를 띄운 뒤 차례를 끝내고, worker가 보고하거나 질문하거나 멈추면 Orca가 조정자를 깨워 수신함을 확인하게 한다. worker의 질문은 터미널 입력 대신 `orca orchestration ask`로 조정자 수신함에 모이며, 문서는 이를 worker와 조정자 사이의 질문으로 규정한다. 사람이 직접 보는 것은 권한 프롬프트다. 허용은 기본적으로 사람만 할 수 있고, orchestration 설정에서 조정자 승인을 켜면 조정자도 승인할 수 있다. 위의 운영 제안은 그대로 남는다. `worker_done`의 성공은 worker의 자기 보고이므로 merge 판단은 diff와 검사 결과로 한다. 이 기능은 설치하거나 실행해 보지 않았다.

## 위임 계층 없이 한 사람이 여러 세션을 돌릴 때

위임 계층을 두지 않고 한 사람이 세션 여러 개를 직접 돌린 기록도 같은 병목을 보고한다. 아래 세 사례는 2026-10~11월 공개된 개인 글과 에세이를 원문과 대조한 것이며, 산출과 효과는 모두 작성자의 자기 보고다.

- **연구 엔지니어 한 명(2026-10-31):** Claude Code, OpenCode, Codex나 Pi 에이전트 약 5~6개에 각자 Git worktree를 주고 구현, 버그 재현과 수정, 테스트와 PR 작성을 맡긴다. 코드의 90% 이상을 에이전트가 쓰고, 사람은 방향과 설계 판단, 지침 파일과 리뷰 규칙의 갱신, 에이전트가 자기 작업을 시험할 테스트 장치 제작과 수동 검증을 맡는다. 비용으로는 코딩에는 없던 과자극과 소진, 프롬프트를 하나만 더 보내고 싶은 충동, 에이전트의 질문에 동료에게 하듯 서둘러 답하던 습관을 들었다.
- **스타트업 엔지니어 한 명(2026-11-03):** 한 번에 3~5개 일을 진행하고 에이전트가 기능 하나에 1~2시간씩 돈다. 하루가 끝나면 전보다 지치고, 반응형 수정이 계획한 일의 집중을 빼앗는 상태를 thrashing에 비유했다. 오후 6시에 일을 끝내는 규칙으로 버틴다고 적었다.
- **개발자 한 명(2026-11-08):** 응답을 기다리며 다른 작업을 시작하다 스레드 20개 가까이를 오가게 됐고, 원인을 작업 순서(sequencing)와 맥락(context)의 문제로 진단했다.

세 번째 사례는 사람의 판단 대기열을 대화창이 아니라 저장소에 둔다.

- 티켓은 다루는 코드 옆의 Markdown 파일이고 보드 상태도 커밋한다. 세션이 죽어도 대기열이 남는다.
- 에이전트는 주기마다 보드를 돌며 새 티켓을 조사하고, 사람이 안전하다고 표시한 티켓만 구현하며, 테스트와 브라우저 확인을 돌린다. 민감한 코드는 브랜치에서 만들고 먼저 묻고, 프로덕션 배포는 사람만 한다.
- 스크립트가 보드 전체를 읽어 변경 리뷰, 질문 답변, 트레이드오프 판정처럼 사람만 할 수 있는 항목을 우선순위 목록(owner inbox)으로 만든다. 검토 화면은 주기마다 git에서 다시 만드는 보기 전용이고 판정은 티켓에 다시 적는다.
- 사람은 한 번에 하나를 꺼내 맥락을 읽고 결정하거나 행동을 요청한 뒤 대기열로 돌려보낸다. 항목을 닫으면서 그 맥락도 머리에서 내려놓는 것이 핵심이라고 작성자는 설명한다.

작성자는 여전히 지치지만 산만함과 길을 잃은 느낌은 줄었다고 적었고, 남은 문제로 티켓 맥락을 20분이 아니라 1분 안에 파악하게 만드는 일과 사람의 판정을 기다리는 티켓이 끝없이 도는 것을 막는 일을 들었다. 앞 사례의 7단계와 같은 방향이지만, 기록을 git에 두어 세션 종료와 도구 교체에도 대기열이 남는다는 점이 다르다.

Thoughtworks Technology Radar Vol.35(2026-11)도 세션을 병렬로 돌리거나 밤새 맡기는 방식의 주된 병목을 사람의 주의와 리뷰 용량으로 본다. 리뷰가 따라가지 못하면 승인 단계가 실제 확인 없이 형식만 남는 human-in-the-loop theater(Caution)가 되므로, 세션을 늘리기 전에 리뷰와 배포 파이프라인이 감당할 용량부터 확인하고 일이 쌓이는 단계는 path-to-production mapping(Adopt)으로 찾으라고 권한다. 변경의 위험에 따라 검토 강도를 나누는 방식은 [[Code-Review-AI-Agent-Operations#위험에 따른 검증|위험에 따른 검증]], 주의 잔류와 전환 비용은 [[Flow-Vs-Agent-Orchestration|몰입과 멀티 에이전트 오케스트레이션]]을 본다.

운영 제안은 다음과 같다.

- 동시 세션 수는 장비나 요금제 한도가 아니라 그날 실제로 검토할 수 있는 양으로 정한다.
- 판단 대기열은 세션 밖의 지속 기록(저장소의 티켓이나 이슈 트래커)에 두고, 각 항목에 원 세션, diff와 검사 결과를 붙인다.
- 일을 끝내는 시각을 정하고, 그 뒤에 도착한 완료 알림은 다음 날 대기열로 넘긴다.

## 이해 확인

- 세션 수가 늘 때 파일 충돌과 별개로 사람의 검토가 병목이 되는 이유와, 위임 계층을 넣어도 남는 검증 책임을 설명할 수 있는가.
- 판단 대기열을 대화창 대신 저장소에 둘 때 얻는 것과 남는 문제를 설명할 수 있는가.

## 출처

2026-11-21 [[Agent-Terminal-Workspaces|에이전트 터미널과 작업 공간]]에서 분리했다. 공식 문서와 대조한 날짜는 아래 항목별로 적었고, 발표와 개인 글의 산출과 효과는 재현하지 않았다.

- [AI로 나만의 작은 조직 만들기 — 채널데브톡](https://www.youtube.com/watch?v=OBsXG7aondY) — 2026-10-23 공개 발표, 로컬 음성 전사문으로 위임 계층과 E2E 자동화 사례 대조.
- [Building effective agents — Anthropic](https://www.anthropic.com/engineering/building-effective-agents) — 2026-11-09 orchestrator-workers 정의와 사람 피드백 지점 대조.
- [Orca Documentation, Orchestration](https://github.com/stablyai/orca/blob/main/docs/site/content/docs/cli/orchestration.mdx) — 2026-11-15 활성화 위치, Run, Task, Dispatch, Decision gate 정의와 worker별 에이전트, 모델, effort 지정 대조.
- [Orca로 LLM 오케스트레이션 액기스 모음 — YouTube, 코드팩토리](https://www.youtube.com/watch?v=d893Vei2Ll4) — 2026-11-05. 오케스트레이션 절의 단서로만 쓰고 용어와 동작은 공식 문서로 대조.
- [How I use AI (Oct 2026) — Ben Stolovitz](https://ben.stolovitz.com/posts/how-use-ai-oct-2026/) — 2026-10-31 게시. 2026-11-09 병렬 에이전트 수, worktree 분리, 사람의 역할과 피로 서술 대조.
- [How software engineering is changing: a tale of two eras — The Pragmatic Engineer, Neil Kakkar](https://newsletter.pragmaticengineer.com/p/how-software-engineering-is-changing) — 2026-11-03. 2026-11-09 동시 작업 수, 피로와 작업 종료 규칙 대조.
- [How I'm fighting the AI Brain Fry — Sergey Kuhne](https://sergeykuhne.com/blog/fighting-ai-brain-fry) — 2026-11-08. 2026-11-09 git 기반 티켓, owner inbox와 남은 문제 대조.
- [Technology Radar Vol. 35 — Thoughtworks](https://www.thoughtworks.com/content/dam/thoughtworks/documents/radar/2026/11/tr_technology_radar_vol_35_en.pdf) — 2026-11. 2026-11-09 Putting more agents to work 테마와 human-in-the-loop theater, path-to-production mapping 블립 대조.

## 관련 문서

- [[Agent-Terminal-Workspaces|에이전트 터미널과 작업 공간]] — 화면과 상태 표시, worktree 분리, 원격 제어면
- [[Agent-Graph-Engineering|그래프 엔지니어링]] — orchestrator-workers의 그래프 관점
- [[Harness-Adoption-Ladder|하네스 도입 계단]] — 계획 의존성, 게이트와 공통 규칙 변경
- [[Code-Review-AI-Agent-Operations|에이전트 시대 코드 리뷰 운영]] — 위험에 따른 검토 강도
- [[Flow-Vs-Agent-Orchestration|몰입과 멀티 에이전트 오케스트레이션]] — 주의 잔류와 전환 비용
- [[Developer-Role-AI-Era#구현이 싸질 때 옮겨 가는 병목 — 결정과 승인 대역폭|결정과 승인 대역폭]] — 사람의 감독 용량 병목
- [[Autonomous-Graph-Driven-Development|자율 그래프 주도 개발]] — 사람의 판단을 질문 이슈로 모으고 동시 작업 한도를 검토 속도에 맞춘 무인 개발 그래프
