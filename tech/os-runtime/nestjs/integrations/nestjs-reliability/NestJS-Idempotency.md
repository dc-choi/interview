---
tags: [nestjs, idempotency, concurrency]
status: done
verified_at: 2026-10-01
category: "OS & Runtime - NestJS"
aliases: ["NestJS 요청 멱등성 키"]
---

# NestJS 요청 멱등성 키

`@nestjs/idempotency`는 같은 요청 시도의 key를 원자적으로 획득하고 완료 결과를 저장해 retry에 재생한다. 서로 다른 key의 업무 실행, 외부 결제의 이미 발생한 효과와 DB transaction은 별도 보호가 필요하다.

## Key와 fingerprint

`IdempotencyModule`의 global interceptor는 `@Idempotent()`가 있는 handler만 처리한다. `required: true`로 key 없는 실행을 400으로 거부한다. key는 1~255자의 printable ASCII string이며 payload의 숫자는 decimal 문자열로 취급한다. HTTP 기본 header는 Idempotency-Key다.

사용자별 `scope`를 지정한다. scope 없이 key를 공유하면 다른 사용자의 결과가 재생될 수 있다. 의도적으로 provider event ID를 공유할 때만 `scope: false`를 명시한다. guard가 먼저 실행되어 인증된 사용자를 scope로 읽을 수 있다.

fingerprint는 scope, method/URL 또는 GraphQL field/message pattern, 정렬된 object key의 payload를 SHA-256으로 묶는다. custom fingerprint가 body의 timestamp를 제외해도 route와 scope는 계속 포함된다. 같은 key의 다른 요청을 새 작업으로 덮어쓰지 않는다.

| 상태 | 응답 |
|---|---|
| key 없음/잘못된 값 | 400 REQUIRED/INVALID |
| 첫 실행 진행 중 | 409 KEY_IN_USE, Retry-After |
| 같은 fingerprint 완료 | 저장 status/body, HTTP Idempotent-Replayed: true |
| 같은 key의 다른 fingerprint | 422 KEY_REUSED |
| record 복호화 불가 | 500 RECORD_UNREADABLE, handler 재실행하지 않음 |

클라이언트는 사용자가 새로운 실행을 결정할 때 key를 만들고 pending 작업과 함께 저장한다. 연결 실패/timeout, 5xx, in-flight 409에는 같은 key를 재사용한다. 결제 거절 등 확정 4xx 이후 다른 입력으로 실행하면 새 key를 만든다. 409의 code를 확인해 already-paid와 구분한다.

## 결과 보관과 interceptor 순서

기본적으로 500 미만 결과를 저장한다. validation pipe의 400과 업무 4xx도 재생한다. 5xx/unknown error는 key를 풀어 다시 실행할 수 있게 한다. `storeIf(status, error)`로 side effect 이후의 특정 실패나 전체 5xx를 저장할 수 있다.

실제 client body는 controller/handler serializer가 처리한 뒤 저장한다. 재생은 그 내부 pipeline을 건너뛴다. 다른 global interceptor가 밖에 있으면 재생을 다시 변환한다. AppModule의 APP_INTERCEPTOR는 imported module보다 바깥에 등록될 수 있다. 바깥 ClassSerializerInterceptor는 plain replay object의 excluded field를 노출할 수 있어 시작을 거부한다. idempotency를 바깥으로 두도록 등록 순서를 정한다.

error replay는 custom subclass 대신 plain HttpException으로 재구성되어 filter를 다시 지난다. filter가 instanceof만으로 처리하면 첫 실행과 달라질 수 있다. StreamableFile, stream, passthrough 없는 @Res는 저장하지 않고 key를 푼다. 응답 크기의 package 상한은 없으므로 작은 결과를 반환한다.

재생 header 기본 목록은 Location, Content-Type, Content-Language, Content-Location, ETag와 Last-Modified다. 원본 body에 속한 header를 재생하며 Set-Cookie/CORS/rate-limit 같은 요청별 header는 재생하지 않는다. `replayHeaders`에도 금지된 header를 넣으면 시작 오류다.

## Store의 원자성

store는 생성자에서 `IdempotencyStorage.registerSource(this)`에 등록하는 singleton이다. 중복은 replace를 명시하지 않으면 거부하고 초기화 후 registry는 잠긴다. production에서 공유 store가 없으면 시작 실패다. in-memory 예외는 restart와 다른 인스턴스에서 중복 실행을 허용하는 선택이다.

| Method | 원자성 계약 |
|---|---|
| acquire(key, owner, fingerprint, lockTtl) | free/expired key에서 한 caller만 승리, 다른 caller는 진행/완료 record 읽음 |
| complete(key, owner, response, ttl) | 같은 owner의 살아 있는 lock만 완료로 전환 |
| release(key, owner) | 같은 owner의 살아 있는 lock만 삭제 |
| extend(key, owner, lockTtl) | 같은 owner의 살아 있는 lock만 갱신 |

owner는 시도별 난수로 이전 시도의 late write를 막는 compare token이다. 이 계약의 random owner를 [[NestJS-Distributed-Locks|단조 증가 resource fencing token]]과 혼동하지 않는다. owner/expiry 확인은 쓰기의 WHERE/Lua 안에서 해야 한다. 업무 transaction 인자를 받지 않고 별도로 저장한다.

PostgreSQL acquire는 조건부 ON CONFLICT UPDATE이며 Prisma upsert만으로 조건을 표현할 수 없어 raw query가 필요하다. 나머지는 conditional update/delete와 영향 row 수를 확인한다. TypeORM save/read-then-write는 takeover 경쟁을 놓친다.

DB record key는 hash로 index 길이를 제한할 수 있다. response의 Unicode NUL을 보존해야 하면 PostgreSQL jsonb가 이를 거부한다는 점을 고려해 json을 사용한다. expiry를 쓰기 시 다시 확인하는 prune과 호스트 시계 동기화, renewal의 pool 비용이 필요하다.

Redis는 single-key Lua로 상태 확인/쓰기/PEXPIRE를 묶을 수 있다. Lua 오류가 이전 writes를 rollback하지 않으므로 duration은 whole millisecond로 검증한다. noeviction과 persistence를 관리한다. 서로 다른 service는 prefix를 분리한다. fake Redis 검증으로 실제 Lua를 실행했다고 판단하지 않는다.

## TTL과 효과 이후 실패

완료 ttl 기본 24시간은 client의 최대 retry window보다 길어야 한다. 만료 뒤 같은 key는 새 실행이다. lockTtl 기본 60초는 process crash의 대기 시간이며 실행/저장 중 lockTtl/3마다 갱신해 긴 handler도 유지한다. retryAfter 기본 1초는 header에서 초 단위 올림이다.

renewal/complete/release 실패의 lock-lost는 결과가 store에 남지 않았을 수 있다는 뜻이다. external effect를 수행한 뒤 DB가 실패하면 기본 5xx release로 같은 효과를 반복할 수 있다. 사용자 ID와 key를 결합한 외부 provider key, 조건부 업무 전이와 특정 실패 보관을 같이 설계한다. outbox는 DB와 event 기록의 간극을 닫지만 외부 결제와 DB를 하나의 transaction으로 만들지는 않는다.

## Transport별 중복과 암호화

GraphQL은 idempotencyKey argument를 우선하고 header를 fallback으로 사용한다. key에 field path/alias가 들어가므로 retry 문서도 같아야 한다. Date 같은 결과 타입을 재생하며 field extensions에 상태를 담고 HTTP replay header는 쓰지 않는다.

RPC는 payload idempotencyKey 다음 transport header를 읽고 keyFrom으로 eventId 등을 지정할 수 있다. key에는 handler class/method를 붙여 한 event의 여러 consumer를 구분한다. 진행 중 중복을 처리 완료로 ack하지 말고 broker가 redelivery하게 한다. class decorator는 기본 GET/GraphQL query를 건너뛰고 명시한 handler 선언은 예외다. context별 scope 함수를 http/graphql/rpc로 나눌 수 있다.

개인/결제 결과는 AES-256-GCM으로 암호화한다. random key, random IV와 key ID를 사용하고 record key를 authenticated data로 묶어 다른 key 아래로 복사한 record를 거부한다. encryption 상태에서 plaintext는 거부한다.

rotation은 먼저 모든 인스턴스가 old,new를 읽게 배포하고, 다음 new,old로 발급 key를 바꾸며, 완료 ttl 후 old를 제거한다. 읽을 key가 없어도 실행을 다시 하지 않고 fail-closed 500을 반환한다. 처음 보관부터 암호화하거나 기존 record 만료까지 호환 계획을 둔다.

events$와 replayed/rejected/lock-lost diagnostics channel을 관측한다. CORS에서 Idempotency-Key를 allowedHeaders, Idempotent-Replayed/Retry-After를 exposedHeaders로 공개해야 browser client가 계약을 사용할 수 있다.

## 출처

- [NestJS Documentation, Idempotency keys](https://docs.nestjs.com/reliability/idempotency)

## 관련 문서

- [[Idempotency]]
- [[Idempotency-Key]]
- [[NestJS-Resilience]]
- [[NestJS-Outbox]]
- [[NestJS-Authorization]]
