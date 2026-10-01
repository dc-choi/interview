---
tags: [performance, concurrency, redis, kafka, coupon, idempotency, testing]
status: done
verified_at: 2026-08-04
category: "성능&확장성(Performance&Scalability)"
aliases: ["First-Come Coupon Failure and Verification", "선착순 이벤트 경계 실패와 검증"]
---

# 선착순 이벤트 경계 실패, 복구와 검증

[[First-Come-Coupon-Patterns|선착순 이벤트 패턴]]의 Redis 판정, Kafka 발행과 consumer 적재는 하나의 트랜잭션으로 묶이지 않는다. 이 문서는 경계마다 생기는 실패, 이미 접수된 사용자를 잃지 않는 복구, 두 불변식을 따로 증명하는 검증을 다룬다.

## 경계 실패 설계

- Redis 승인 뒤 Kafka 발행 전 프로세스가 죽으면 수량만 예약되고 이벤트는 사라질 수 있다. `request_id`와 승인 상태를 남기고, 발행 재시도와 주기적 대사를 설계한다.
- Kafka 소비 결과 저장과 offset 커밋 사이에 장애가 나면 같은 메시지를 다시 받을 수 있다. `(event_id, user_id)` 고유 제약 또는 처리한 `event_id` 기록으로 소비자를 멱등하게 만든다.
- 실패 이벤트 테이블만 추가한다고 복구가 자동 보장되지는 않는다. 실패 기록 자체의 저장 실패, 무한 재시도, 독성 메시지를 고려해 재시도 횟수와 DLQ, 운영자 재처리 절차를 함께 둔다.

## 승인 뒤 consumer 실패: 수량 미달과 재발급

API가 `INCR`로 슬롯을 소비하고 발행한 뒤 consumer의 쿠폰 생성이 실패하면, 쿠폰은 없는데 카운터만 올라 한도보다 적게 발급된다. race condition이 만드는 초과 발급과 반대 방향의 정합성 실패다.

처리는 사용자가 이미 어떤 응답을 받았는지로 가른다.

| 실패 시점 | 사용자 응답 | 처리 |
|---|---|---|
| 접수 응답 전, 발행 실패를 확인 | 실패 | `DECR`과 `SREM`으로 슬롯과 참여 기록을 반납한 뒤 실패로 응답 |
| 접수 응답 전, 발행 결과 불확실(timeout 등) | 확정 전까지 보류 | 바로 반납하지 않고 `request_id`로 대사해 확정한다. 실제로 발행됐다면 반납이 초과 발급을 만든다 |
| 접수 응답 뒤, consumer 실패 | `ACCEPTED` | 슬롯을 반납하지 않고 같은 `user_id`로 재시도하거나 재발급 |

접수 뒤에 `DECR`하면 슬롯이 다른 사용자에게 넘어가 이미 접수 성공을 받은 사용자가 쿠폰을 잃는다.

- **전진 복구의 한 형태** — consumer가 실패한 `user_id`를 실패 이벤트 테이블에 저장하고 로그를 남기면, 배치가 주기적으로 읽어 같은 사용자에게 재발급해 결국 한도만큼 발급한다. 선착순 판정을 통과한 사용자의 권리를 유지한 채 앞으로 복구한다.
- **Kafka 밖에 남는 실패 상태** — 예외를 잡아 테이블에 적고 리스너가 정상 반환하면 offset이 커밋되어(auto-commit이나 컨테이너 기본 ack 모드 기준) 실패 상태가 Kafka 밖에만 남는다. 재발행 경로와 중복 방지를 애플리케이션이 직접 유지해야 하며, 대안인 retry topic과 DLT 설계는 [[MQ-Kafka-Retry-DLT|Kafka 재시도와 DLT]]를 따른다.
- **재발급도 멱등해야 한다** — consumer 재처리와 재발급 배치가 같은 사용자에게 겹칠 수 있으므로 `(user_id, event_id)` UNIQUE 위반을 이미 발급된 것으로 분류한다.
- **관측 신호** — Redis 카운터가 DB 발급 수보다 큰 차이가 이 수량 미달의 신호다. 그 차이를 재발급 대기 건수와 함께 본다.

## NestJS, TypeORM 적용 관점

- NestJS API는 Redis 스크립트 결과와 Kafka 발행 확인을 조합해 접수 상태를 반환하고, 실제 쿠폰 행 생성은 consumer 책임으로 둔다.
- TypeORM consumer는 전달받은 transactional entity manager 하나로 쿠폰 저장과 처리 이력 저장을 묶는다. 고유 제약 위반은 이미 처리된 이벤트로 분류한다.
- Redis, Kafka, MySQL을 하나의 TypeORM 트랜잭션으로 묶을 수는 없다. 각 경계에 식별자, 멱등성, 대사 작업을 배치하는 것이 핵심이다.

## 검증 시나리오: 두 불변식을 따로 증명한다

쿠폰 1장이 정상 발급되는 단건 테스트는 통과해도, 동시 요청에서는 한도보다 많이 발급될 수 있다. 동시성 결함은 부하 순간을 재현하고 최종 상태를 단언해야 드러난다.

| 불변식 | 입력 | 단언 |
|---|---|---|
| 총량 | 서로 다른 사용자 N명(N > 한도)의 동시 요청 | 발급 수 = 한도 |
| 1인 1회 | 같은 사용자의 동시 반복 요청 | 그 사용자의 발급 수 = 1 |
| 혼합 | 중복 사용자가 섞인 동시 요청 | 발급 수 = min(한도, 고유 사용자 수), 사용자별 1장 |

혼합 입력은 1인 1회를 consumer의 DB UNIQUE에만 맡겨 중복 요청이 수량 슬롯을 먼저 소비하는 결함처럼, 한쪽 불변식만 보는 테스트가 놓치는 수량 미달을 잡는다.

- **동시 요청 생성** — Java에서는 `ExecutorService`에 N건을 제출하고 `CountDownLatch`로 모두 끝나기를 기다린다. 작업이 예외로 끝나 `countDown()`이 호출되지 않으면 시간 제한 없는 `await()`는 끝나지 않으므로 `countDown()`은 `finally`에서 부르고, `await(timeout, unit)`이 `false`를 돌려주면 실패로 처리한다. NestJS 쪽은 `Promise.all`로 동시에 보내되 대량이면 동시 실행 수를 제한한다 — [[Redis-Atomic-Operations|Redis 원자 연산]]의 흔한 실수 항목.
- **외부 상태 초기화** — Redis 카운터와 Set은 테스트가 끝나도 남으므로, 초기화하지 않으면 다음 실행은 이미 한도에 찬 카운터에서 시작한다. `FLUSHALL`은 선택한 DB뿐 아니라 모든 DB의 키를 지우므로 공유 Redis에서는 테스트 전용 key prefix나 DB 번호만 지운다. DB 쪽 초기화는 [[Test-Isolation|테스트 격리]]를 따른다.
- **비동기 완료 대기** — 발행 완료와 consumer 적재 완료 사이에는 시간차가 있다. 고정 `sleep`으로 완료를 추측하지 않고 최종 조건을 제한 시간 안에서 폴링하며, 제한 시간 초과 시 consumer lag와 실패 원인을 출력한다.

## 출처
- [Apache Kafka 4.3.1 — KafkaConsumer](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html)
- [TypeORM — Transactions](https://typeorm.io/docs/transactions/)
- [Redis Docs — FLUSHALL](https://redis.io/docs/latest/commands/flushall/)
- [Java SE 25 API — CountDownLatch](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/CountDownLatch.html)
- [실습으로 배우는 선착순 이벤트 시스템, 문제점 — 인프런, 최상용](https://www.inflearn.com/courses/lecture?courseId=329894&unitId=153928)
- [실습으로 배우는 선착순 이벤트 시스템, 문제점 해결하기 — 인프런, 최상용](https://www.inflearn.com/courses/lecture?courseId=329894&unitId=155153)
- [실습으로 배우는 선착순 이벤트 시스템, Consumer 사용하기 — 인프런, 최상용](https://www.inflearn.com/courses/lecture?courseId=329894&unitId=158584)
- [실습으로 배우는 선착순 이벤트 시스템, 발급가능한 쿠폰개수를 1인당 1개로 제한하기 — 인프런, 최상용](https://www.inflearn.com/courses/lecture?courseId=329894&unitId=159888)
- [실습으로 배우는 선착순 이벤트 시스템, 쿠폰을 발급하다가 에러가 발생하면 어떻게 하나요? — 인프런, 최상용](https://www.inflearn.com/courses/lecture?courseId=329894&unitId=163908)

## 관련 문서
- [[First-Come-Coupon-Patterns|선착순 이벤트(쿠폰, 재고, 티켓) 패턴]]
- [[MQ-Kafka-Retry-DLT|Kafka 재시도와 DLT]]
- [[Idempotent-Consumer|멱등 컨슈머]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[Redis-Atomic-Operations|Redis 원자 연산]]
- [[Test-Isolation|테스트 격리]]
