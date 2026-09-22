---
tags: [database, mysql, queue, skip-locked, idempotency]
status: done
verified_at: 2026-08-04
category: "Database - RDBMS"
aliases: ["MySQL Job Queue", "MySQL 작업 큐"]
---

# MySQL Job Queue

MySQL queue는 업무 변경과 job 생성을 한 transaction에 넣어야 하거나 별도 broker의 운영 비용이 더 큰 작은 규모에서 유용하다. 목표는 exactly-once 실행이 아니라 lease와 멱등 handler로 at-least-once 재처리를 안전하게 만드는 것이다.

## 상태와 복구 정보를 저장한다

아래 SQL은 상태와 선점 transaction의 최소 예시다. 회수 뒤 재실행을 허용하는 구현에는 뒤의 획득 시도 토큰과 조건부 결과 갱신을 함께 적용한다.

```sql
CREATE TABLE jobs (
  id BIGINT NOT NULL AUTO_INCREMENT,
  business_key VARCHAR(160) NOT NULL,
  state ENUM('ready', 'running', 'done', 'dead') NOT NULL,
  available_at DATETIME(6) NOT NULL,
  lease_until DATETIME(6) NULL,
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  payload JSON NOT NULL,
  last_error VARCHAR(500) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_jobs_business_key (business_key),
  KEY ix_jobs_claim (state, available_at, id)
) ENGINE=InnoDB;
```

- `business_key`의 unique 제약은 같은 업무 요청의 중복 enqueue를 막는다. 이미 시작한 외부 부수효과의 중복은 handler나 downstream의 멱등 처리가 별도로 막아야 한다.
- `available_at`은 지연 실행과 backoff, `lease_until`은 중단된 worker의 회수를 표현한다.
- payload에는 비밀과 불필요한 PII를 넣지 않고 schema version 또는 event type을 둔다.
- priority가 필요하면 claim index의 순서와 starvation 정책을 함께 설계한다.

## claim transaction을 짧게 유지한다

```sql
START TRANSACTION;

SELECT id
FROM jobs
WHERE state = 'ready'
  AND available_at <= NOW(6)
ORDER BY available_at, id
LIMIT 50
FOR UPDATE SKIP LOCKED;

UPDATE jobs
SET state = 'running',
    lease_until = NOW(6) + INTERVAL 1 MINUTE,
    attempts = attempts + 1
WHERE id IN (...claimed_ids...);

COMMIT;
```

worker는 claim한 ID와 lease를 받은 뒤 transaction을 끝내고 외부 API, 파일 I/O와 긴 계산을 수행한다. 성공한 job만 짧은 별도 transaction으로 `done` 처리한다. 실행 중 transaction을 계속 열어 두면 lock과 connection을 오래 점유해 queue를 직렬화한다.

`SKIP LOCKED`는 잠긴 row를 결과에서 제외하므로 일관된 일반 조회가 아니다. 여러 worker가 queue-like table을 경쟁 소비할 때는 유용하지만 회계 조회나 상태 집계에 사용하지 않는다.

## 실패와 중복을 정상 경로로 둔다

1. worker crash 뒤 `lease_until`이 지난 `running` job을 다시 `ready`로 회수한다.
2. 일시 오류는 횟수 제한, exponential backoff와 jitter로 재시도한다.
3. 영구 오류나 최대 시도 초과는 `dead`로 격리하고 원인, 재처리 권한과 절차를 둔다.
4. handler는 business key나 downstream idempotency key로 중복 실행을 흡수한다.
5. 완료 갱신이 유실되면 같은 job이 다시 실행될 수 있다고 가정한다.

lease는 예상 처리 시간보다 무조건 길게 잡는 값이 아니다. 긴 job은 heartbeat로 lease를 연장하되 현재 획득 시도를 식별하는 토큰을 조건에 넣는다.

## worker ID와 획득 시도 토큰을 구분한다

같은 프로세스가 여러 실행을 맡는다면 고정 worker ID만으로 현재 실행의 소유권을 판정할 수 없다. 다음은 이전 외부 호출이 lease보다 오래 걸리고 같은 프로세스가 회수된 job을 다시 가져갈 수 있을 때의 조건부 시나리오다.

1. 실행 A가 job을 선점한 뒤 외부 호출에서 지연된다.
2. lease가 만료되어 job이 `ready`로 회수된다. 이 상태 변경이 실행 A의 외부 호출까지 취소하지는 않는다.
3. 같은 worker ID를 쓰는 실행 B가 job을 다시 선점한다.
4. 뒤늦게 돌아온 A가 `state = running AND worker_id = W`로 결과를 갱신하면 B의 실행을 완료하거나 실패 처리할 수 있다.

이는 상태와 소유자 값이 이전 값으로 돌아오는 ABA 문제다. 프로세스 시작 때 한 번 만든 UUID도 실행마다 재사용하면 이 구분을 해결하지 못한다.

- 선점할 때마다 새 `claim_token`을 저장하거나 job의 세대 번호를 원자적으로 증가시키고, 실행은 자신이 받은 값을 끝까지 유지한다.
- 완료, 실패와 heartbeat 갱신은 job ID, 실행 상태와 획득 시도 토큰을 같은 UPDATE 조건으로 검사한다. 회수 시 기존 토큰을 무효화하고 재선점 시 새 값을 부여한다. 영향 행 수가 0이면 이전 실행은 상태를 덮어쓰지 않는다.
- 업무 멱등키는 재시도 사이에 유지하고, 획득 시도 토큰은 선점마다 바꾼다. 두 키는 목적이 다르다.
- DB의 조건부 갱신은 이미 보낸 외부 요청을 취소하지 않는다. 외부 부수효과에는 멱등 처리가 필요하고, 외부 쓰기의 순서까지 보호하려면 수신 측이 검증하는 fencing 규약을 별도로 설계한다. 임의 UUID는 단조 증가 fencing token과 다르다.

검증할 때는 [[Deterministic-Test|barrier로 실행 순서를 고정]]해 A 선점 → 회수 → 같은 worker의 B 재선점 → A 결과 도착을 만든다. A의 성공, 실패와 연장이 모두 거절되고 B의 상태가 유지되는지 확인한다. 다른 worker로 교체되는 경우만 검사하면 이 경로를 놓친다.

2026-09-22 보강: 로컬 알림 과제의 고정 worker ID, 병렬 실행과 CAS 조건을 대조해 일반화한 설계 검토다. 실제 장애 재현 결과는 아니다. 획득 요청별 고유값과 조건부 해제 원칙은 Redis 공식 문서와 대조했으며, 위 DB 적용은 그 원리를 확장한 설명이다.

## 운영 지표와 한계

- ready depth, oldest ready age, claim latency, 실행 시간과 retry/dead 비율
- expired lease 수, duplicate suppression 수와 worker별 처리량
- claim query의 examined rows, lock wait와 connection pool 사용량
- binlog, replica와 backup에 더해지는 write amplification

복잡한 routing, 긴 retention, 대규모 fan-out, 독립적인 replay와 높은 throughput이 필요하면 Kafka, SQS, RabbitMQ 같은 broker를 비교한다. MySQL queue도 성능 요구가 아니라 일관성 경계와 운영 비용을 기준으로 선택한다.

## 출처

- [MySQL 8.4 Reference Manual, Locking Reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html)
- [Redis, Distributed Locks](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/) — 획득 요청별 고유값과 소유권 조건 검사
- [인프런, Hong, MySQL Job Queue](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338564)

## 관련 문서

- [[Distributed-Batch-Execution|분산 배치 실행 (트리거 외부화와 원자적 선점)]]
- [[DML-Conflict-and-Batch-Patterns|MySQL DML 충돌 처리와 배치 패턴]]
- [[MySQL-Long-Transactions-and-Batch|MySQL 장기 트랜잭션과 배치]]
- [[At-Least-Once|At-Least-Once]]
- [[Idempotency-Key|Idempotency Key]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[Distributed-Lock|분산 락과 fencing]]
