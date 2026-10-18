---
tags: [palantir, foundry, ontology, osdk]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# OSDK 구독, WebSocket 상태와 cache 복구

TypeScript subscriptions는 generated SDK2.1.x 이상과 맞는 @osdk/client2.1.x를 요구한다. object set의 추가/변경/제거를 받으며 pivotTo로 만든 set은 지원하지 않는다. 문서는 같은 query에 active subscription 하나만 허용하므로 React 두 component가 같은 query를 각각 구독하는 설계를 피하고 공유 계층을 검토한다.

## callback과 누락

onSuccessfulSubscription 이전 변경은 callback에 반영되지 않을 수 있다. onOutOfDate는 전체 set을 HTTP로 다시 읽으라는 신호이며 onError는 subscription이 닫힌 상태다. unsubscribe를 unmount/소유권 종료 시 호출한다.

update의 primary key는 있지만 다른 property의 undefined는 삭제/undefined로 변경됐다는 뜻이 아니라 반환되지 않았다는 뜻일 수 있다. 새 schema property가 바뀌면 generated SDK가 아는 값이 같아도 event가 올 수 있다. requested properties와 현재 cache 값을 함께 고려한다.

상태 명칭은 source 간 차이가 있다. TypeScript subscribe 참조는 ADDED_OR_UPDATED/DELETED를, raw WebSocket과 React 예제는 ADDED_OR_UPDATED/REMOVED를 설명한다. 실제 사용 SDK version의 타입/packet을 확인하고 한 명칭으로 추정해 통일하지 않는다. raw REMOVED는 object 삭제 또는 filter에서 빠짐을 모두 뜻한다.

## raw WebSocket

endpoint는 `wss://<host>/api/v2/ontologySubscriptions/ontologies/<ontology>/streamSubscriptions`다. 인증은 WebSocket subprotocol의 `Bearer-<token>`이며 REST의 Bearer-space와 다르다. 문서는 path를 ontology API name으로 설명하지만 Python 예제 변수는 ONTOLOGY_RID로 이름 붙여 실제 endpoint의 식별자 조건을 다시 대조한다.

UUID request id로 요청/응답을 연결하고 requests에 objectSet/propertySet/referenceSet을 보낸다. 새 request 목록은 active subscription 전체를 갱신한다. 같은 것은 유지, 빠진 것은 닫고 새 것은 연다. 전체 해제는 빈 requests다.

subscribeResponses는 요청별 success의 subscription ID/error를 반환한다. qos는 서버 과부하이므로 exponential backoff+jitter로 재시도한다. objectSetChanged는 object/reference update를, refreshObjectSet은 HTTP full reload 필요를, subscriptionClosed는 error/USER_CLOSED 등 원인을 알린다.

## 제한과 구현 예제

server restart 뒤 subscription은 지속되지 않아 reconnect/resubscribe가 필요하다. subscription별 memory 한도로 닫힐 수 있고 join/full-text 일부는 완전성을 보장하지 않는다. geotemporal reference 변화는 별도 reference update/lastFetchedValue를 확인한다.

interface subscription은 underlying object type으로 온다. __apiName으로 full metadata의 implementsInterfaces2 property mapping을 받아 interface property로 remap하고 subscription 수명 동안 cache하는 방식을 문서가 권장한다.

Python raw 예제는 refresh 요청을 print만 하고 실제 reload/reconnect/backoff/remap을 구현하지 않는다. Country filter와 aircraft propertySet도 섞여 있어 그대로 운영 코드로 복사하지 않는다. event 수신 예제와 누락 없는 장기 cache 동기화 보장을 구분한다.

## 출처

- [Palantir, typescript-subscriptions](https://www.palantir.com/docs/foundry/ontology-sdk/typescript-subscriptions)
- [Palantir, websocket-subscriptions](https://www.palantir.com/docs/foundry/ontology-sdk/websocket-subscriptions)

## 관련 문서

- [[Palantir-OSDK]]
- [[Palantir-OSDK-React-Task-Cache]]
