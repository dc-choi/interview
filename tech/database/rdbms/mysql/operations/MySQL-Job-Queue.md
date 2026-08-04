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

- `business_key`는 같은 업무 요청의 중복 enqueue와 부수효과를 막는 멱등 경계다.
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

lease는 예상 처리 시간보다 무조건 길게 잡는 값이 아니다. 긴 job은 heartbeat로 lease를 연장하되 소유 worker token을 조건에 넣어 다른 worker가 회수한 job을 이전 worker가 완료 처리하지 못하게 한다.

## 운영 지표와 한계

- ready depth, oldest ready age, claim latency, 실행 시간과 retry/dead 비율
- expired lease 수, duplicate suppression 수와 worker별 처리량
- claim query의 examined rows, lock wait와 connection pool 사용량
- binlog, replica와 backup에 더해지는 write amplification

복잡한 routing, 긴 retention, 대규모 fan-out, 독립적인 replay와 높은 throughput이 필요하면 Kafka, SQS, RabbitMQ 같은 broker를 비교한다. MySQL queue도 성능 요구가 아니라 일관성 경계와 운영 비용을 기준으로 선택한다.

## 출처

- [MySQL 8.4 Reference Manual, Locking Reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html)
- [인프런, Hong, MySQL Job Queue](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338564)

## 관련 문서

- [[DML-Conflict-and-Batch-Patterns|MySQL DML 충돌 처리와 배치 패턴]]
- [[MySQL-Long-Transactions-and-Batch|MySQL 장기 트랜잭션과 배치]]
- [[At-Least-Once|At-Least-Once]]
- [[Idempotency-Key|Idempotency Key]]
- [[Transactional-Outbox|Transactional Outbox]]
