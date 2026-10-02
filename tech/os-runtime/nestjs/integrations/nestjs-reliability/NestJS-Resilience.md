---
tags: [nestjs, reliability, retry, timeout, circuit-breaker]
status: done
verified_at: 2026-10-01
category: "OS & Runtime - NestJS"
aliases: ["NestJS 외부 의존성 장애 제어"]
---

# NestJS 외부 의존성 장애 제어

`@nestjs/resilience`는 timeout, retry, breaker, bulkhead, outbound rate와 fallback을 entrypoint 또는 service policy에 적용한다. 실행 계약과 시간 예산을 함께 정해야 외부 장애가 내부 동시성 고갈로 번지는 것을 줄일 수 있다.

## 선언과 공유 범위

전역 interceptor의 decorator는 controller/resolver/WS/RPC entrypoint에 적용한다. service 메서드의 decorator는 효과가 없어 시작 시 warning을 낸다. service에서는 `ResilienceService.create()`/preset policy를 한 번 만들고 `execute()`한다.

defaults는 활성화된 stage의 빈 필드만 채우며 stage를 켜지 않는다. preset은 stage를 활성화한다. 같은 name의 breaker/bulkhead/outbound rate 상태는 **process 안에서** 공유되고 동일 name의 상충 설정은 시작 오류다. 여러 API 인스턴스의 전체 용량 제한으로 간주하지 않는다.

handler 설정은 class/preset/defaults 위에서 필드별로 병합된다. stage의 false는 상속 설정을 끈다. service/background가 같은 preset을 사용해도 route에서 override한 timeout은 그 route에만 적용된다.

## Timeout과 retry 시간

timeout은 시도별 예산이다. timeout signal의 reason은 ResilienceTimeoutError이며 fetch/driver에 signal을 전달해야 실제 I/O가 멈춘다. 무시하는 작업의 결과는 버리지만 작업 자체는 계속 실행된다. timeout으로 bulkhead slot을 반환한 뒤에도 무시한 작업은 계산된 동시성 밖에서 남을 수 있다.

최대 총시간은 각 시도의 timeout과 backoff 합이다. 1.5초 시도를 두 번 허용하고 사이에 최대 200ms 대기하면 약 3.2초가 필요하다. parent deadline이 nested policy signal에 전달되어 남은 시간 밖의 추가 시도를 막는다.

HTTP timeout은 504로 매핑한다. 408로 표시하면 client/proxy가 요청 전송 실패로 판단해 unsafe 요청을 다시 보내는 경계를 만들 수 있다.

retry attempts 기본 3은 **첫 시도를 포함**한다. 숫자 축약과 Infinity도 가능하지만 무한 재시도는 abort/deadline이 있는 동작에서만 판단한다. 기본 backoff는 200ms에서 2배로 증가, 최대 30초, full jitter다. equal/none 또는 `(failedAttempt, error) => duration`도 선택할 수 있다.

HTTP GET/HEAD/OPTIONS와 GraphQL query에는 자동 retry를 허용한다. POST/GraphQL mutation은 handler가 직접 `idempotent: true`로 반복 안전성을 선언해야 한다. preset/class의 retry만으로 side effect를 안전하다고 인정하지 않는다. WS/message/event에는 HTTP verb가 없으므로 handler의 직접 Retry opt-in이 필요하다. service policy에는 verb가 없어서 retry가 실행되며 caller가 안전성을 책임진다.

`@Idempotent()`는 클라이언트의 중복 요청을 묶고, retry의 idempotent 선언은 한 요청 안에서 server 실행을 반복하도록 한다. 한 기능을 켰다고 다른 기능이 자동 보장되지 않는다. 외부 provider에는 안정된 operation key도 전달한다.

## Breaker와 격리

| Stage | 주요 기본/계약 |
|---|---|
| breaker | count window 20, 최소 10개 결과, 실패율 50%, open 30초 |
| half-open | 다음 호출이 probe, 동시 probe 기본 1개, 성공 close/실패 open |
| bulkhead | maxConcurrent 10, maxQueue 0, queue timeout 기본 제한 없음 |
| outbound rate | interval/limit별 외부 호출 예산, maxWait 기본 0 |

breaker는 retry의 **각 시도**를 집계한다. 일반 client 4xx는 제외하고 408/429는 실패로 센다. policy 자체의 차단은 dependency 실패로 세지 않는다. `recordIf`/`retryIf`로 분류를 바꿀 수 있다.

open에서 시간이 지나면 timer가 자동 probe하는 것이 아니라 다음 요청이 탐색한다. probe가 끝나지 않으면 복구 여부를 배우지 못하므로 timeout을 둔다. `ResilienceService`의 lookup/iteration, trip/reset과 통계로 현재 상태를 확인할 수 있다.

bulkhead의 대기 queue는 동시 실행 수와 별도다. queue 상한과 queueTimeout을 두어 기다리는 요청 자체가 쌓이지 않게 한다. 거부는 503이며 언제 slot이 생길지 알 수 없으면 Retry-After가 없다. outbound rate 거부도 inbound 공격 제한의 429가 아니라 dependency 예산의 503/Retry-After다.

## Fallback과 파이프라인

fallback은 retry 바깥에서 최종 실패를 처리한다. 같은 class의 method 또는 `(error, ExecutionContext)` 함수를 사용하며 값/Promise/Observable을 반환할 수 있다. 기본적으로 일반 client 4xx는 처리하지 않고 `handleIf`로 조건을 좁힌다. 실패한 dependency를 fallback에서 다시 호출하지 않는다.

retry는 pipes, 안쪽 interceptor와 handler를 재실행한다. middleware와 guard는 요청당 한 번이다. SDK와 service, proxy에 retry를 겹치면 시도 수가 곱으로 증가하므로 한 계층이 책임지게 한다.

IdempotencyModule을 ResilienceModule보다 먼저 두면 replay와 in-flight 409가 breaker/retry 이전에 끝난다. 한 key 아래 모든 시도가 묶이고 최종 fallback도 저장될 수 있다. 기본적으로 5xx 결과는 key를 풀어 이후 클라이언트 retry를 허용한다.

## Health check의 결과와 취소

Terminus는 up/degraded를 info에 모아 HTTP 200, down이 하나라도 있으면 error와 503으로 응답한다. degraded를 unhealthy로 읽으면 부가 의존성의 장애 때문에 정상 핵심 service까지 재시작할 수 있다.

HealthIndicatorService.attempt()는 작업의 throw를 down으로 바꾼다. up/down/degraded를 직접 반환하는 indicator의 throw는 구현 오류로 간주해 전체 500이므로 의존성 I/O 실패는 attempt로 감싼다.

withTimeout(ms)는 indicator를 down으로 바꾸고 signal을 abort한다. 실제 fetch/driver에 signal을 전달해야 작업이 취소된다. built-in indicator의 예전 timeout 옵션은 deprecated다. cacheFor(ms)는 indicator key로 요청 간 결과와 실행 중 작업을 공유하므로 freshness와 key 충돌을 판단한다.

gracefulShutdownTimeoutMs 기본 0은 SIGTERM에서 대기하며 SIGINT는 unhealthy 전환 후 바로 종료한다. enableShutdownHooks가 있어야 적용된다. HttpHealthIndicator는 현재 Fetch HttpClient와 별개로 @nestjs/axios와 Axios HttpModule을 사용한다.

## 오류와 관측

`mapErrors` 기본 true는 undecorated entrypoint에서 던진 service policy 오류도 변환한다. false면 직접 처리한다.

- CircuitOpenError는 503과 Retry-After(초)다.
- timeout은 504, BulkheadFullError는 503이다.
- OutboundRateLimitError의 RATE_LIMITED는 503과 Retry-After다.
- GraphQL은 HTTP 200의 field extensions에 code/httpStatus/retryAfter를 담는다. 전체 응답을 바꾸는 Apollo `extensions.http`와 구분한다.
- WS/RPC는 code/statusCode/message/retryAfter payload를 사용한다. hybrid는 inheritAppConfig를 확인한다.

`ResilienceContext`는 signal/attempt를 AsyncLocalStorage로 전달한다. events$와 `nestjs:resilience:*` diagnostics channel은 retry, timeout, breaker 전이/거부, bulkhead, rate와 fallback을 관측하게 한다. name/source를 붙여 상태 공유 범위와 장애 원인을 구분한다. event의 존재만으로 alert/metrics 구독이 자동 구성된 것은 아니다.

## 출처

- [NestJS Documentation, Resilience](https://docs.nestjs.com/reliability/resilience)

- [NestJS Documentation, Terminus](https://docs.nestjs.com/recipes/terminus)

## 관련 문서

- [[External-Service-Resilience]]
- [[Retry-Backoff-Jitter]]
- [[NestJS-Idempotency]]
- [[NestJS-HTTP-Security]]
