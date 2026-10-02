---
tags: [nestjs, webhook, retry, ssrf]
status: done
verified_at: 2026-10-02
category: "OS & Runtime - NestJS"
aliases: ["NestJS Webhook 전송 정책과 운영"]
---

# NestJS Webhook 전송 정책과 운영

delivery worker는 endpoint별 장애와 lease를 다루며, 전송 자체와 성공 기록 사이의 crash를 수신자의 중복 방지와 함께 해결한다.

## Retry와 endpoint pacing

2xx만 성공이며 3xx redirect도 실패다. 기본 retry는 첫 실행을 포함한 10회, 5초에서 4배 증가, 최대 1일, equal jitter다. `retry: false`는 한 번만 시도한다. `Retry-After`의 초 또는 HTTP-date를 cap 안에서 반영한다. 429/502/503/504는 endpoint 전체를 잠시 쉬게 하며 header가 없으면 5초다. 같은 endpoint의 다른 delivery는 그동안 attempt를 소비하지 않는다.

410 Gone은 delivery를 rejected로 끝내고 endpoint를 gone으로 비활성화한다. 차단된 목적지, `NonRetryableWebhookError`, `retryIf` false도 바로 끝낸다. budget을 다 쓰면 failed/exhausted다. 기본 `disableEndpointAfter: '5d'` 동안 성공이 없으면 endpoint를 failing으로 끄며 성공하면 실패 시계를 초기화한다.

비활성화 중 dispatch한 메시지는 그 endpoint의 delivery를 만들지 않는다. 이전 pending delivery는 차례가 오면 endpoint-disabled로 실패하고, 다시 활성화한 후 그 **기존 delivery**는 retry할 수 있다. 비활성화 기간의 이벤트 전체를 복구하는 기능과 구분한다.

## Replay와 로그

`WebhookDeliveries.retry(idOrFilter, { tenant })`는 같은 ID/body로 새 round를 시작해 attempts를 0으로 돌리고 이전 history를 유지한다. completed delivery도 replay할 수 있다. 수신 inbox가 ID를 보존하면 handler를 다시 실행하지 않는다. bulk filter에는 endpoint/status/since를 사용하고 tenant 인가를 유지한다.

attempt log에는 statusCode, duration, error와 응답 body의 앞부분(기본 4096 bytes)이 들어간다. 외부 endpoint의 응답에 민감 정보가 있을 수 있으므로 로그 공개와 retention을 관리한다. `stats()`의 pending/due/leased/failed와 `lagMs`를 관측하고 `prune('30d')` 등 보존 정책을 직접 실행한다.

`WebhooksEvents.events$`와 `nestjs:webhooks:<type>` diagnostics channel은 delivered, retry-scheduled, delivery-failed, endpoint-disabled, destination-blocked, verification-failed를 내보낸다. endpoint-disabled는 고객 통보, destination-blocked는 보안 조사, lagMs는 처리 지연으로 해석한다.

## Worker와 timeout

| 옵션 | 기본 | 계약 |
|---|---|---|
| pollInterval / batchSize | 1초 / 50 | 한 poll의 claim 수 |
| concurrency | endpoint 10개 | 한 worker의 같은 endpoint delivery는 순차, 다른 worker까지 직렬화하지 않음 |
| lease | 1분 | exclusive claim, 이후 쓰기는 owner로 fencing |
| delivery.timeout | 15초 | DNS부터 응답까지 한 attempt 전체, lease보다 짧아야 함 |

worker는 API process 일부에서만 켤 수 있다. `runOnce()`로 한 batch를 직접 실행할 수 있고 stopped worker에서도 동작한다. `stop()`은 claim을 멈추고 진행 중 attempt를 기다린 뒤 미시작 lease를 반환한다. `enableShutdownHooks()`를 켜고 DB pool은 drain 뒤 닫는다. lease fencing은 stale worker의 DB 기록을 막지만 이미 보낸 HTTP request를 되돌리지 못한다.

## SSRF와 transport 경계

기본 transport는 public HTTPS만 허용한다. URL credential, loopback/private/shared/unique-local/link-local 등의 목적지를 검사하고 DNS의 모든 응답을 확인한 뒤 검증한 주소에 socket을 고정한다. redirect와 환경 proxy를 따라가지 않는다. 전송 시 다시 검사하므로 구독 이후 DNS 변경도 다룬다.

`allowHttp`와 `allowPrivateNetworks`는 개발 환경용이다. link-local/cloud metadata는 이 옵션을 켜도 차단된다. 필요한 사설 범위만 `allowedAddresses` CIDR로 연다. custom `lookup` 결과도 검사한다. private CA는 HttpWebhookTransport의 `ca`로 기존 Node trust에 추가할 수 있다.

URL 등록 정책은 `delivery`, 실제 연결 정책은 transport다. custom instance를 쓰면 허용 CIDR 등을 양쪽에 맞춘다. `WebhookTransport.send(request, { signal, attempt })`는 응답이 있으면 status와 body를 반환하고 응답 자체가 없을 때 throw한다. custom transport는 기본 SSRF guard를 대체하므로 guard를 직접 유지하거나 기본 transport를 감싼다.

## Secret rotation

endpoint secret은 기본 24시간 overlap 동안 새/이전 secret으로 모두 서명한다. 수신자는 양쪽을 허용하다가 이전 키를 제거한다. 유출 시에만 `overlap: 0`의 즉시 폐기를 판단한다.

`encryption.keys`는 최신 key를 앞에 놓고 첫 key로 암호화, 모든 key로 복호화한다. secret manager에서 공급한다. 과거 plaintext secret은 읽을 수 있고 다음 rotation에서 암호화되므로 옵션 활성화만으로 모든 기존 row가 다시 암호화되지는 않는다.

## 출처

- [NestJS Documentation, Webhooks](https://docs.nestjs.com/http/webhooks)

## 관련 문서

- [[NestJS-Webhooks-Storage]]
- [[NestJS-Webhooks-Verification-and-Inbox]]
