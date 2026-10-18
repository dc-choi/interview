---
tags: [palantir, foundry, ontology, osdk]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# React task/project hook의 page와 구독 한계

advanced To-do의 useProjects/useTasks는 custom SWR hook 예제다. generic @osdk/react cache 전체의 보장을 증명하는 코드가 아니다. 설명과 linked reference TSX를 함께 대조했다.

## useProjects

AdvanceTodoProject에 withProperties/pivotTo/where/aggregate로 coding/learning task의 전체/COMPLETED/IN PROGRESS/NOT STARTED 개수를 각각 계산한다. client에서 Number로 더해 총계를 만든다. 모든 task row를 frontend로 옮기지 않고 server aggregate를 쓰는 패턴이다.

실제 코드는 fetchPage 한 번의 data만 map하며 nextPageToken을 순회하지 않는다. source의 모든 project를 읽는다는 설명을 전수 보장으로 쓰지 않는다. cache key는 projects, focus revalidation은 false이고 polling/subscription은 구현하지 않는다. 새 task type/link/status가 추가되면 정의를 바꿔야 한다.

## useTasks

OsdkITask에 projectId filter, dueDate desc/status asc 정렬과 includeAllBaseObjectProperties를 요청한다. creator/assignee ID를 uniq/compact 후 batch로 조회하고 raw instance와 User를 묶는다. User에 image bytes는 없으므로 avatar는 별도 picture 요청이다.

cache key는 tasks+project primary key다. reference도 한 fetchPage만 사용하므로 큰 project의 모든 task가 포함된다고 가정하지 않는다. 이후 client-side status filter는 이미 받은 page 범위에만 적용된다.

## event 처리의 실제 범위

ADDED_OR_UPDATED에서 data에 같은 primary key가 이미 있는 경우만 user detail을 가져와 map으로 교체한다. 신규 object를 append하지 않으므로 다음 revalidation 전까지 새 task가 나타나지 않을 수 있다. REMOVED는 현재 cache에서 제거한다.

onOutOfDate는 reload가 필요하다는 주석뿐이고 실제 reload가 없다. onError는 console log이며 재구독을 구현하지 않는다. data가 effect dependency에 있어 cache 변경 때 구독 정리/재생성도 일어난다. 빠른 event와 async user lookup의 완료 순서가 바뀔 수 있어 결과 순서를 확인한다.

unmount cleanup은 unsubscribe를 호출한다. 구독 API 자체의 같은-query 단일 subscription 제한과 함께 공유 소유권을 계획한다. initial load/reload/paging과 live event 사이의 누락 없는 경계를 예제만으로 보장하지 않는다.

## 상태와 적용 판단

두 hook은 loading/validating/error와 data??[]를 반환한다. 빈 array와 fetch error를 UI에서 분리한다. SWR 기본 retry 이상의 전용 복구 정책은 코드에 없다. scope/key에 auth user, ontology와 type이 필요한 앱은 캐시 오염 조건을 별도 점검한다. 이는 예제의 고정 단일 앱 범위 밖으로 재사용할 때 필요한 설계 판단이다.

## 출처

- [Palantir, useprojects-hook](https://www.palantir.com/docs/foundry/ontology-sdk-react-applications/useprojects-hook)
- [Palantir, useprojects-tsx](https://www.palantir.com/docs/foundry/ontology-sdk-react-applications/useprojects-tsx)
- [Palantir, usetasks-hook](https://www.palantir.com/docs/foundry/ontology-sdk-react-applications/usetasks-hook)
- [Palantir, usetasks-tsx](https://www.palantir.com/docs/foundry/ontology-sdk-react-applications/usetasks-tsx)

## 관련 문서

- [[Palantir-OSDK-React]]
- [[Palantir-OSDK-Subscriptions]]
- [[Palantir-OSDK-React-Admin-Media]]
