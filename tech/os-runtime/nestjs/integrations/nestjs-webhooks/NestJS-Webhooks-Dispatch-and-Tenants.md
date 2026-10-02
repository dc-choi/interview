---
tags: [nestjs, webhook, outbox, multi-tenant]
status: done
verified_at: 2026-10-02
category: "OS & Runtime - NestJS"
aliases: ["NestJS Webhook 송신과 tenant 경계"]
---

# NestJS Webhook 송신과 tenant 경계

Webhook은 외부 구독자에게 상태 변화를 알리는 HTTP 전달이다. 업무 변경과 전송 요청을 같은 DB transaction에 넣고, commit 이후 outbox relay가 전송 대상별 delivery를 만든다. 네트워크 전송은 그 transaction 밖에서 일어난다.

## Transaction과 fan-out

`@nestjs/webhooks`의 `WebhooksModule`은 송신 시 `OutboxModule`이 필요하다. `dispatch(tx, messageOrArray)`의 첫 인자는 업무 transaction handle이며 메시지는 `type`, `tenant`, JSON-serializable `data`, 선택적 `id`를 가진다. TypeORM은 `dataSource.transaction()`의 EntityManager, Drizzle은 callback의 tx, Prisma는 interactive transaction client를 넘긴다. root DB나 autocommit manager를 넘기면 transaction 참여가 아니다.

1. 업무 row를 변경하고 같은 tx로 dispatch한다.
2. rollback되면 메시지와 업무 변경이 함께 사라진다.
3. commit된 메시지를 outbox가 `nestjs.webhooks.message` topic으로 넘긴다.
4. 해당 tenant의 enabled endpoint 중 이벤트 type 또는 `*`를 구독한 endpoint마다 delivery를 만든다.
5. worker가 delivery를 claim하고 서명한 POST를 전송한다.

`WEBHOOKS_OUTBOX_TOPIC`을 transport route로 분기한다면 `local`로 보내야 fan-out handler가 실행된다. commit 이후 `webhooks.notify()`는 이 process의 relay를 일찍 깨우는 최적화다. polling과 저장된 메시지가 복구 경계이며 notify 자체가 보존을 책임지지 않는다.

fan-out의 `(messageId, endpointId)` unique key가 outbox redelivery 때 이중 delivery 생성을 막는다. **전송은 at-least-once**다. 상대가 처리한 뒤 worker가 성공 기록 전에 죽으면 lease 만료 뒤 같은 메시지를 다시 전송한다.

## 구독 API와 인가

`WebhookEndpoints`는 `create`, `list`, `get`, `update`, `delete`, `getSecret`, `rotateSecret`를 제공한다. controller는 인증 결과의 tenant를 모든 조회와 변경의 scope에 넣는다. request body의 tenant를 그대로 신뢰하지 않는다. 다른 tenant의 ID는 404로 처리한다. operator의 tenant 없는 호출을 일반 고객 API에 노출하지 않는다.

`eventTypes` 옵션은 dispatch와 endpoint 구독 모두의 허용 목록이다. `*` 구독은 현재 보내는 모든 이벤트를 받고, 새 type을 추가하면 그것도 받는다. 구독 URL은 DTO의 문자열 검사뿐 아니라 package의 URL 정책으로 검증한다. `InvalidWebhookEndpointError`는 400, endpoint/delivery 없음은 404이며 package의 `status`를 HTTP exception으로 연결할 filter가 필요하다.

create는 endpoint와 새 secret을 함께 반환한다. list/get에는 secret이 없다. 잃어버린 secret은 rotation으로 교체하고, `getSecret()`을 노출한다면 재인증 등 추가 보호를 적용한다. 기존 Standard Webhooks endpoint를 옮길 때 create/rotate에 기존 `whsec_` secret을 제공해 수신 계약을 유지할 수 있다.

## 메시지 계약

body는 dispatch 시 직렬화된 `type`, `timestamp`, `data`이며 재시도와 replay에서 같은 bytes를 쓴다. 저장소의 body가 text인 이유다. 서명 header의 timestamp는 각 전송 시점, body의 timestamp는 dispatch 시점이다.

delivery 사이의 **순서 보장은 없다**. backoff, 여러 worker와 과거 replay 때문에 같은 주문의 업데이트가 역순으로 도착할 수 있다. 수신자는 데이터 버전 또는 event 시점을 비교하거나 webhook을 신호로 보고 API의 현재 상태를 다시 조회한다.

endpoint를 메시지 이후 생성했거나 fan-out 때 비활성화했다면 delivery가 없다. replay는 존재하는 delivery의 재전송이므로 과거 구독 누락분을 새로 만들지 않는다.

payload의 기존 field는 유지하고 추가한다. breaking change는 `order.shipped.v2`처럼 새 type으로 보내며 이전/새 이벤트를 같은 transaction에서 dispatch할 수 있다. `*` 구독자는 양쪽을 모두 받는다. 과거 replay는 보관된 이전 body 그대로이므로 수신자도 그 계약을 지원해야 한다.

## 출처

- [NestJS Documentation, Webhooks](https://docs.nestjs.com/http/webhooks)

## 관련 문서

- [[NestJS-Outbox]]
- [[NestJS-Webhooks-Verification-and-Inbox]]
- [[NestJS-Webhooks-Delivery-and-Operations]]
