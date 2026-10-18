---
tags: [palantir, action, audit, monitoring, recovery]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Palantir Action 로그와 복구"]
---

# Action의 의사결정 기록, 관측과 복구

Action log는 성공한 Action 제출을 Ontology 객체로 남기는 기능이다. 모든 편집 이력, 실패 집계, 경보와 실행 취소는 서로 다른 기능이므로 감사 요구를 먼저 나눠 본다.

| 질문 | 사용할 기능 |
|---|---|
| 누가 언제 어떤 문맥에서 결정했는가 | Action log |
| 변경 경로와 관계없이 객체에 무슨 편집이 있었는가 | Edit history |
| 성공/실패 횟수와 소요 시간은 어떤가 | Action metrics |
| 실패나 지연을 언제 알릴 것인가 | Monitoring |
| 제출한 편집을 취소할 수 있는가 | Action revert |

## 로그 객체 하나는 성공한 제출 하나다

Action type 하나에 log object type 하나가 대응한다. 한 번 제출해 열 개 객체를 변경하면 log도 열 개가 아니라 하나이며 변경 대상 모두에 연결된다. API/SDK 제출과 Action-backed inline edit도 기록 대상이다. Backing datasource 직접 쓰기와 legacy Forms writeback 등 Action type을 거치지 않은 편집은 포함하지 않으며, 실패도 log 객체로 기록하지 않는다.

Capabilities에서 Create action log objects를 켜고 backing log type을 생성한다. 편집 대상 object type의 Datasources/Edits에서 Only allow Action types with action logs를 설정하면 로그 없는 Action을 막을 수 있다. 이 설정은 Allow edits를 켜고 저장한 뒤 표시되며, 편집을 끄면 함께 해제된다. Action 실행자에게 log type 생성에 필요한 권한도 있어야 한다.

## 결정의 문맥을 기록하되 schema를 관리한다

필수값은 Action RID, type RID와 version, UTC timestamp, 실행 사용자, 변경 객체의 primary key다. Webhook/알림 식별자와 수신자, Scenario RID, revert 여부/사용자/시각 등의 provenance도 포함한다. 변경 객체의 임의 속성을 edited objects 값에 추가하는 기능은 지원하지 않는다.

선택값으로 파라미터와 단일 object reference parameter의 속성을 기록할 수 있다. 이 방법으로 변경하지 않은 우선순위나 생성일 같은 결정 당시 문맥을 남긴다. 다중 object reference parameter의 속성과 media reference parameter는 지원하지 않는다.

Log 속성 타입은 만든 뒤 변경할 수 없다. 연결한 원천 속성 타입이 바뀌면 Action 검증이 실패하므로 새 타입의 log 속성을 만들고 mapping을 바꾼다. 새 log 속성은 색인이 끝나야 기록을 시작한다. Log를 켜도 과거 제출을 backfill하지 않는다. Function-backed Action은 Edits provenance 선언이 필요하다.

Edit history도 별도 enablement가 있다. 2024년 10월 OSv2 GA 공지는 Track user edit history를 켠 이후의 변경만 기록하고 OSv1에서 이전한 history는 보이지 않는다고 명시했다. OSv2에 현재 편집 상태가 이전됐다는 것과 과거 edit timeline이 보존됐다는 것은 다르다. ([October 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-10))

Summary는 최대 20부분이며 literal 부분마다 50문자 제한이 있다. Parameter 부분에는 이 문자 제한을 적용하지 않지만 object type parameter 참조는 지원하지 않는다. 로그도 일반 Action의 편집 scale 제한을 사용한다.

## 시작, commit과 조회 반영 시각을 구분한다

OSv2의 log/edit history timestamp는 저장 제출을 준비할 때 잡는 commit timestamp다. Query에 보이기 시작한 정확한 시각은 아니다. Rule의 Current User/Time은 실행 시작 시각으로 실행 중 고정되므로 log 시각보다 이를 수 있다. Revert는 원 log 시각을 덮어쓰지 않고 별도 revert timestamp를 남긴다.

이는 지연을 분석할 때 시작 시각, log commit 시각과 관찰한 조회 반영 시각을 나눠야 하는 이유다. Log timestamp 차이만으로 외부 시스템 반영 완료를 입증하지 않는다.

## Metrics와 경보는 실패 경로를 다룬다

Action metrics는 최근 30일 성공/실패와 p95 duration을 제공하며 log 설정과 독립이다. Run history는 최근 7일 실행을 조회한다. Action type Viewer가 필요하고 Ontology Manager와 Workflow Lineage에서 볼 수 있다. Workshop Observability Chart에 표시할 수도 있다.

실패는 parameter, scale limit, 인증/제출 조건, side effect, function, 사용자 표시 function error, conflict와 unclassified 등으로 나뉜다. Metrics 문서의 scale 설명은 단위가 모호하므로 제한 수치는 [[Palantir-Action-Rules-and-Parameters]]의 전용 scale reference를 따른다.

Monitoring은 p95 duration과 시간창 내 실패 건수 임계값을 감시한다. Workflow Lineage, Workshop과 OSDK application을 dynamic scope로 정하면 사용 Action의 추가/제거를 따라간다. Metrics를 보는 것과 threshold/구독을 설정해 실제 알림을 받는 것은 별도 작업이다.

## Undo는 전체 업무 rollback이 아니다

Action revert는 OSv2 객체 편집에 사용할 수 있으며 실행한 사용자만 할 수 있다. 성공 toast의 Undo가 기회이고, 이후 객체에 다른 편집이 한 번이라도 있으면 다른 속성 변경이어도 revert할 수 없다. 제출 뒤 revert 설정을 껐다 다시 켜도 원 제출은 되돌릴 수 없다.

Revert는 객체 편집만 취소하며 webhook과 알림을 취소하거나 보상 호출하지 않는다. 새 OSv2 Action에는 기본 활성화되지만 2024년 5월 이전 Action은 수동 활성화 여부를 확인한다. OSv1만 변경하는 Action은 지원하지 않는다.

삭제 후 toast가 사라졌을 때 공식 문서가 제시하는 복구는 새 object type으로 migration하면서 원하는 편집을 함수로 복사하거나, 기존 type의 모든 편집을 drop하는 경로다. 둘 다 영향이 크므로 일반적인 개별 삭제 복원 버튼으로 해석하지 않는다.

## 출처

- [Palantir, Action log](https://www.palantir.com/docs/foundry/action-types/action-log)
- [Palantir, Action metrics](https://www.palantir.com/docs/foundry/action-types/action-metrics)
- [Palantir, Action monitoring](https://www.palantir.com/docs/foundry/action-types/monitoring)
- [Palantir, Revert or undo actions](https://www.palantir.com/docs/foundry/action-types/action-reverts)
- [Palantir, October 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-10)

## 관련 문서

- [[Palantir-Actions-and-Functions|실행, 격리와 권한]]
- [[Palantir-Action-Rules-and-Parameters|규칙과 입력 계약]]
- [[Palantir-Action-External-Effects|외부 효과의 실패 경계]]
