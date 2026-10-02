---
tags: [nestjs, webhook, signature, inbox]
status: done
verified_at: 2026-10-02
category: "OS & Runtime - NestJS"
aliases: ["NestJS Webhook 검증과 inbox의 보장 범위"]
---

# NestJS Webhook 검증과 inbox의 보장 범위

서명 검증, payload validation과 업무 중복 방지는 각각 다른 경계다. 검증된 JSON이라는 사실만으로 외부 입력의 스키마와 업무 상태가 유효해지지 않는다.

## Raw body와 수신 모듈

`NestFactory.create(AppModule, { rawBody: true })`로 수신 bytes를 보존한다. Express와 Fastify 모두 지원한다. 파싱한 객체를 JSON으로 다시 직렬화해 검증하면 원래 서명 대상과 달라진다.

`receivers`에 이름별 scheme/secret을 등록하고 route 또는 controller에 `@VerifyWebhook(name)`을 붙인다. `@IncomingWebhook()`은 receiver, id, timestamp, payload, rawBody와 `processInTransaction()`을 제공한다. `@WebhookPayload()`는 payload만 주고 pipe를 받을 수 있다. HTTP 밖에 저장된 요청은 `WebhookVerifier.verify(receiver, { headers, rawBody })`로 검증한다.

수신만 하는 service는 `outgoing: false`를 module의 최상위 옵션으로 설정해 endpoint/delivery/worker를 제외할 수 있다. dedupe에는 그 service DB의 outbox inbox가 필요하며 `OutboxModule`과 inbox store를 등록한다. outgoing을 끈다고 inbox가 durable해지는 것은 아니다.

## Scheme별 서명 대상

| Scheme | 검증 대상과 ID | 주의 |
|---|---|---|
| standard | `webhook-id.timestamp.rawBody`의 HMAC-SHA256, `v1,` base64 signature | ID와 timestamp도 서명됨. 기본 tolerance는 현재의 앞뒤 5분 |
| stripe | `t.rawBody`의 hex HMAC-SHA256 | ID는 서명된 payload의 id. 기본 `stripe-signature` 또는 별도 header 이름 |
| github | rawBody의 hex HMAC-SHA256, `X-Hub-Signature-256` | timestamp가 없고 기본 `X-GitHub-Delivery` ID도 서명되지 않음 |

secret array로 rotation 기간의 이전/새 키를 모두 시도한다. 비교는 constant-time으로 한다. ID는 최대 255 code point이며 receiver의 consumer 이름도 최대 255다. 기본 consumer는 `webhooks:<name>`으로 안정적으로 유지한다.

GitHub의 캡처된 request는 timestamp 제한 없이 검증될 수 있다. unsigned delivery header만 dedupe key로 쓰면 새 header로 replay할 수 있다. `id` callback을 signed payload 기반 해시로 정하고 inbox retention을 replay 방어 기간으로 관리한다. 같은 payload의 별도 delivery를 동일하게 취급한다는 정책도 함께 판단한다. 발신 IP 제한은 서명 검증을 보완한다.

custom scheme은 `WebhookSignatureScheme`을 상속해 `verify(request, keys)`, 필요하면 `idFromPayload(payload, headers)`, `key(secret)`을 구현한다. `matches(expected, candidates)`를 constant-time 비교에 쓰고 서명된 timestamp를 반환하면 tolerance가 적용된다. key 변환은 startup 시 실행되어 잘못된 secret을 빨리 발견한다.

## Inbox의 crash 간극

기본 dedupe는 성공한 handler의 ID를 inbox에 기록한다. 한 process의 동시 중복은 흡수하지만 다른 process가 동시에 실행하거나 handler 성공과 inbox 기록 사이에 crash가 나면 재실행될 수 있다. handler가 실패하면 ID를 성공 처리하지 않아 발신자의 retry가 다시 실행한다.

DB 업무 변경은 `webhook.processInTransaction(tx, work)`로 inbox ID와 **같은 DB transaction**에서 수행한다. winner만 work를 실행하고, 오류면 ID와 업무 변경 모두 rollback한다. 결과의 `duplicate`가 true면 중복 처리다. 외부 결제나 메일 전송까지 exactly-once로 만드는 기능은 아니다.

결제 완료에서 출고 상태와 다음 webhook을 만들 때는 incoming inbox 기록, 업무 row 변경과 outgoing dispatch를 같은 tx로 묶을 수 있다. 다른 event ID로 같은 업무 사실을 전달할 수도 있으므로 상태 전이와 금액 검증은 업무 로직에 남긴다.

## 오류와 보존 기간

검증 실패는 발신자에 일반 401을 주고 `verification-failed` event에 receiver/reason을 남긴다. JSON parser가 거부한 body는 decorator 전에 400이므로 해당 event가 없을 수 있다. rawBody를 보존하지 않은 JSON/form 요청은 설정 오류 500, 그 밖의 unsupported body는 415가 될 수 있다.

`OutboxInbox.prune()`의 기간은 provider redelivery/replay 기간보다 길게 잡는다. ID가 지워진 후 같은 event가 들어오면 새 작업으로 처리한다. GitHub의 timestamp 없는 서명은 이 retention이 replay 차단 기간이기도 하다.

## 출처

- [NestJS Documentation, Webhooks](https://docs.nestjs.com/http/webhooks)

## 관련 문서

- [[NestJS-Webhooks-Dispatch-and-Tenants]]
- [[NestJS-Outbox]]
- [[Validation]]
- [[NestJS-Testing-Durable-Processes]]
