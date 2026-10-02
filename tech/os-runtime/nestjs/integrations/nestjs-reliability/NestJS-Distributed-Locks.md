---
tags: [nestjs, distributed-lock, fencing, scheduler]
status: done
verified_at: 2026-10-01
category: "OS & Runtime - NestJS"
aliases: ["NestJS lease와 분산 작업 소유권"]
---

# NestJS lease와 분산 작업 소유권

`@nestjs/locks`는 공유 store의 갱신 가능한 lease로 scheduled job과 leader를 조율한다. 멈췄다 살아난 holder의 실제 writes는 resource가 단조 증가 fencing token을 검증해야 막을 수 있다.

## 서로 다른 두 job 제어

| API | 보호 범위 |
|---|---|
| @OnOneInstance({key, ttl}) | `<key>:owner` lease로 한 인스턴스가 tick 사이에도 소유 |
| @WithoutOverlapping({key, ttl}) | `<key>` run lock을 실행 동안 보유, 진행 중 tick을 skip |
| @LeaderElection(key) | singleton provider가 긴 연결/역할을 맡고 인계 |

OnOneInstance만으로 긴 job의 같은 인스턴스 overlap을 막지는 않는다. 두 decorator는 같은 method의 key를 공유할 수 있다. WithoutOverlapping만 쓰면 인스턴스 중 누구든 한 번에 한 run이다. method wrapper라 Cron/Interval/Timeout과 직접 호출에도 적용된다.

key 기본 ClassName.methodName은 rename/minify/rolling deploy에서 바뀔 수 있으므로 중요한 작업은 안정된 explicit key를 쓴다. 다른 job, :owner lease와 election key 충돌은 시작 시 거부한다.

소유자는 ttl/3마다 갱신하며 죽으면 expiry 뒤 다음 tick의 인스턴스가 인수한다. 놓친 tick과 긴 실행 중 skip한 tick은 기록/보충하지 않는다. job은 특정 어제 날짜만 처리하기보다 아직 처리하지 않은 due 업무를 조회하고 필요하면 자신의 실행 ledger를 남긴다.

## 수동 lock과 context

Locks.withLock(key, fn, {ttl, wait, signal})은 callback 종료/예외 때 release한다. wait 기본 0은 한 번만 시도, 양수는 backoff하며 대기한다. 실패하면 LockNotAcquiredError다. acquire는 Lock 또는 null을 반환하고 직접 release/await using으로 수명을 끝낸다.

Lock은 key/owner/fencingToken/signal/held를 가진다. LocksContext는 job/withLock/run(lock,fn) 안에서 AsyncLocalStorage로 lock,token,signal을 제공하며 밖에서는 undefined다. 수동/예약 실행이 같은 일을 보호하려면 같은 run key를 잡고 undecorated work를 호출해 이중 lock을 피한다.

LockNotAcquiredError와 LockLostError에는 HTTP status가 없다. contention을 409 등으로 보여줄지는 handler가 결정한다. LockLostError의 detectedBy는 renewal/deadline이다. cancellation signal을 기다리는 I/O에도 전달한다.

## Lease의 blind spot과 fencing

살아 있는 holder는 마지막 확인된 renewal을 보내기 시작한 시점부터 ttl deadline을 계산해 store expiry보다 늦지 않게 포기한다. 하지만 process/event loop가 멈추면 deadline을 실행하지 못하고 새 holder가 생겨도 자신이 소유한다고 믿을 수 있다.

AbortSignal은 다음 실행 때 손실을 알려줄 뿐 이미 날아간 write를 회수하지 못한다. 보호 resource는 token을 함께 받아 **같은 write statement에서** 저장된 token보다 낮은 값을 거부해야 한다. 같은 run의 여러 쓰기를 허용할 때는 storedToken <= incomingToken을 사용하고 token 갱신도 원자적으로 묶는다.

leader의 이전 network 연결도 pause 동안 살아 있을 수 있다. notification을 두 leader가 받는 순간에 모든 후속 효과가 fencing/idempotency를 사용해야 한다. 외부 API가 token을 검증하지 않으면 lease만으로 효과를 단일 실행했다고 보장하지 못한다.

## Store 계약

singleton provider 생성자에서 LocksStorage.registerSource(this)를 호출한다. registry는 중복/형태를 검증하고 초기화 후 잠긴다. production에서 공유 store가 없으면 시작 실패다. in-memory 예외는 한 process만 보호한다.

| Method | 원자성 |
|---|---|
| acquire(key, owner, ttl) | free/released/expired 조건을 쓰기에서 검사, 한 caller 승리, 이전보다 큰 token |
| renew(key, owner, ttl) | owner와 live expiry를 쓰기의 조건으로 갱신 |
| release(key, owner) | owner와 live expiry를 확인해 해제, token history를 낮추지 않음 |

만료는 **store clock**으로 whole millisecond를 측정한다. 오래된 row도 모든 method에서 expired로 취급한다. key는 500자까지의 Unicode string을 정확히 구분한다. token은 positive safe integer **number**여야 하며 DB bigint string을 그대로 반환하면 거부한다. number 변환 시 안전 정수 범위도 유지해야 한다.

## PostgreSQL과 Redis

PostgreSQL acquire는 ON CONFLICT 조건부 UPDATE다. token은 row lock을 잡은 뒤 SET에서 sequence를 읽고 `greatest(nextval, previous+1)`로 올린다. EXCLUDED에서 미리 뽑은 token을 쓰면 더 늦은 holder에 작은 token이 돌아갈 수 있다.

release는 row를 남겨 owner를 비운다. 다음 acquire가 이전 token을 floor로 쓸 수 있다. clock_timestamp는 실제 현재 시각이며 transaction 시작의 now를 expiry에 쓰지 않는다. session advisory lock만으로는 pool connection을 전체 job 동안 붙잡고 expiry/renewal/fencing 기능도 없어 이 row lease와 다르다.

TypeORM acquire의 query builder가 SET을 EXCLUDED로 표현하면 token 계약을 못 지키므로 parameterized SQL을 사용한다. renew/release는 conditional update/affected다. Prisma acquire도 조건부 upsert를 raw query로 구현한다. read-then-save는 takeover를 막지 못한다. sequence는 migration에 추가하며 ORM schema drift 검사만으로 sequence까지 검증했다고 주장하지 않는다.

Redis acquire는 SET NX PX와 counter INCR를 같은 Lua에서 수행한다. renewal/release도 owner compare 후 PEXPIRE/DEL이다. counter는 expiry 없이 보존하고 noeviction/persistence를 설정한다. lock eviction, FLUSHALL과 asynchronous failover의 counter 되감기는 token을 재발급하게 만들어 fencing을 깨뜨릴 수 있다.

두 key를 만지는 Lua는 Redis Cluster의 동일 slot 조건도 필요하다. 예시 key를 그대로 cluster에 넣어 작동한다고 가정하지 않는다. 복제/backup만으로 token 단조성이 자동 증명되지 않으며 선택한 store의 failover와 복원 계약을 검증한다.

## Election과 shutdown

LeaderElection singleton은 bootstrap부터 ttl/3마다 획득을 시도한다. acquired callback은 Lock을 받고 lost callback은 손실/자진 release 때 호출된다. acquired callback이 throw하면 step-down한다. job ownership과 선출 ttl 기본은 30초다.

shutdown hooks를 켜면 onModuleDestroy에서 진행 중 job을 끝내고 lease를 반환하며 beforeApplicationShutdown에서 나머지 lock을 반환한다. DB/Redis는 그 뒤 onApplicationShutdown에서 닫는다. shutdown 직전 1초 안에 시작한 job의 owner lease는 같은 tick의 지연 인스턴스가 다시 실행하지 않도록 그 1초 동안 유지할 수 있다.

ttl은 갱신 RTT와 허용할 event-loop stall보다 길고 crash 인계 지연은 감당할 만큼 짧게 잡는다. 긴 run은 갱신되므로 ttl을 실행 총시간에 맞출 필요는 없다. clock sync는 store expiry와 별개로 holder deadline과 scheduler tick의 차이를 줄인다.

lock-lost와 leadership-acquired/lost events 및 diagnostics channel을 관측한다. skipped tick은 debug다. contract suite는 실제 공유 store/pool의 concurrent caller, expiry, stale owner, token 상승을 검증한다. ManualLockClock/PGlite로 논리를 확인해도 실제 연결 간 경쟁을 모두 확인한 것은 아니다.

## 출처

- [NestJS Documentation, Distributed locks](https://docs.nestjs.com/reliability/locks)

## 관련 문서

- [[Distributed-Lock]]
- [[Distributed-Lock-Waiting]]
- [[NestJS-Events-and-Jobs]]
- [[NestJS-Outbox]]
- [[NestJS-Resilience]]
