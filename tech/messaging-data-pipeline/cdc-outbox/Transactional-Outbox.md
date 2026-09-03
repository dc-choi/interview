---
tags: [messaging, reliability, pattern]
status: done
verified_at: 2026-09-03
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Transactional Outbox", "Outbox Pattern", "트랜잭셔널 아웃박스"]
---

# Transactional Outbox Pattern

DB 쓰기와 메시지 발행 사이의 유실을 막는 패턴. 이벤트 기반 아키텍처에서 생산자 측 신뢰성을 확보하는 핵심 패턴이다.

**원자성의 범위를 정확히 짚어야 한다**: 하나의 DB 트랜잭션으로 원자적으로 묶이는 것은 **비즈니스 테이블 쓰기와 outbox insert까지**다. outbox에서 브로커로의 발행은 별도 Relay가 수행하며 **at-least-once**라 같은 이벤트가 중복 발행될 수 있다. 따라서 브로커 발행까지 포함한 end-to-end 원자성을 보장하는 게 아니라, 소비자 측 [[Idempotency-Key|멱등성]]으로 중복을 흡수해야 신뢰성이 완성된다.

## 문제: Dual Write Problem

DB와 메시지 큐는 서로 다른 시스템이라 하나의 **로컬** 트랜잭션으로 묶이지 않는다. 양쪽이 XA/2PC를 지원하면 분산 트랜잭션을 검토할 수 있지만, 지원 범위와 가용성, 운영 비용 때문에 Outbox를 선택하는 경우가 많다.

```
발주 API:
  1) DB에 발주 저장     ← 성공
  2) EventBridge에 이벤트 발행  ← 여기서 crash하면?
```

- 1)은 성공했지만 2)가 실행되지 않음 → 이벤트 유실 → 후속 처리(수주, 알림)가 영원히 실행되지 않음
- 반대로 2)를 먼저 하면, 이벤트는 발행됐는데 DB 저장이 실패할 수 있음

Spring `TransactionSynchronization.afterCommit()` callback을 `TransactionSynchronizationManager.registerSynchronization(...)`으로 등록하거나 `@TransactionalEventListener(phase = AFTER_COMMIT)`에서 메시지를 보내도 이 간극은 닫히지 않는다. DB rollback 뒤 이벤트를 보내는 경우는 피하지만, commit 직후 프로세스가 종료되거나 broker 전송이 실패하면 DB 변경만 남는다. callback 순서 제어와 원자성은 다른 문제다.

## 해결: Outbox 테이블

```
[하나의 DB 트랜잭션]
  1) 비즈니스 데이터 INSERT (발주 테이블)
  2) outbox 테이블에 이벤트 INSERT  ← 같은 트랜잭션이므로 원자적

[별도 Relay 프로세스]
  3) outbox 테이블 폴링 (WHERE processed_at IS NULL)
  4) 메시지 큐(EventBridge/SQS/Pub/Sub)에 발행
  5) 발행 성공 시 processed_at 마킹
```

### 왜 되는가
- 비즈니스 데이터와 이벤트 기록이 **같은 DB 트랜잭션** → 둘 다 성공하거나 둘 다 실패
- Relay가 crash해도 outbox에 레코드가 남아 있으므로 재시작 후 재발행
- Relay 재시도와 outbox 보존으로 at-least-once 발행을 목표로 함. Relay가 계속 실행되고 장애를 감시, 복구한다는 운영 전제가 필요하며 소비자 측 [[Idempotency-Key|멱등성]]과 짝을 이룸

### Outbox 테이블 설계

```sql
CREATE TABLE outbox (
  id              BIGSERIAL PRIMARY KEY,
  aggregate_type  VARCHAR(50),    -- 'ORDER'
  aggregate_id    VARCHAR(50),    -- 발주 ID
  event_type      VARCHAR(100),   -- 'ORDER_CREATED'
  payload         JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  processed_at    TIMESTAMPTZ NULL  -- NULL이면 미발행
);
```

## Relay 구현 방식

| 방식 | 장점 | 단점 | 선택 기준 |
|------|------|------|------------|
| **Polling** | 구현 단순, 별도 변경 로그 인프라 불필요 | 폴링 지연, claim과 중복 발행 제어 필요 | 허용 지연과 DB 조회 부하를 감당할 수 있음 |
| **CDC (Change Data Capture)** | 변경 로그 기반으로 낮은 지연 | Debezium, Kafka Connect 등 운영 요소 증가 | 이미 CDC 운영 역량이 있거나 낮은 지연이 중요함 |

### Polling 방식
- 주기적으로 `WHERE processed_at IS NULL` 조회 → 발행 → 마킹
- NestJS `@Cron('*/5 * * * * *')`로 5초 간격 구현 가능
- 단일 코드베이스에서 바로 구현할 수 있어 소규모 팀에 적합
- 인스턴스를 2개 이상 띄우는 순간 같은 행을 여러 Relay가 집는다 → 아래 다중 인스턴스 절

### CDC 방식
- Debezium이 DB 변경 로그(PostgreSQL WAL, MySQL binlog 등)를 읽어 outbox 테이블 변경을 감지
- 변경 즉시 Kafka로 발행 → 거의 실시간
- 애플리케이션의 별도 polling relay 코드는 줄일 수 있지만 outbox 기록과 connector 설정, CDC 인프라 운영은 필요

## Relay를 여러 인스턴스에서 돌릴 때

폴링 Relay를 애플리케이션에 심으면 Relay의 인스턴스 수가 애플리케이션의 인스턴스 수를 따라간다. NestJS `@Cron`은 그 프로세스의 스케줄러에 잡을 등록하므로, 서비스를 3개 태스크로 띄우면 스케줄러도 3개가 되어 세 프로세스가 같은 `processed_at IS NULL` 행 집합을 동시에 읽는다. 아무 장치가 없으면 같은 이벤트가 인스턴스 수만큼 발행된다. 배포 중 구인스턴스와 신인스턴스가 겹치는 순간에도 같은 일이 일어난다.

중복 제거 축은 셋이고, 실무에서는 보통 섞어 쓴다.

| 축 | 방식 | 얻는 것 | 잃는 것 |
|---|---|---|---|
| 행 단위 claim | 트랜잭션 안에서 `FOR UPDATE SKIP LOCKED`로 배치를 잠그고 상태를 전이 | 인스턴스 수만큼 처리량이 늘고 중복 조회가 사라짐 | claim 상태 컬럼과 좌초 회수 로직이 추가로 필요 |
| 단일 러너 선출 | advisory lock이나 리더 선출로 한 프로세스만 폴링 | 구현이 가장 단순하고 발행 순서가 한 곳으로 모임 | 처리량이 한 인스턴스에 묶이고 그 프로세스가 멈추면 발행 전체가 멈춤 |
| 중복 발행 허용 | 제어 없이 발행하고 소비자 멱등으로 흡수 | Relay 코드가 가장 얇음 | 브로커 비용과 소비자 부하가 인스턴스 수에 비례 |

### 행 단위 claim

```sql
BEGIN;

SELECT id, event_type, payload
FROM outbox
WHERE processed_at IS NULL
ORDER BY id
LIMIT 100
FOR UPDATE SKIP LOCKED;

-- 같은 트랜잭션에서 claim 표시(claimed_at, claimed_by)까지 하고 즉시 커밋
COMMIT;
```

- `SKIP LOCKED`는 잠긴 행을 결과에서 빼므로 인스턴스들이 서로 다른 행을 가져간다. 다만 일관된 스냅샷이 아니라서 PostgreSQL과 MySQL 문서 모두 일반 트랜잭션 작업에는 부적합하고 큐 성격 테이블의 경쟁 소비에 쓰라고 명시한다.
- **발행 I/O를 claim 트랜잭션 안에 넣지 않는다.** 브로커 호출을 트랜잭션 안에서 하면 락과 커넥션을 네트워크 지연만큼 붙잡아 Relay가 직렬화된다. claim 트랜잭션은 잠그고 표시하고 끝내며, 발행과 `processed_at` 마킹은 밖에서 짧은 트랜잭션으로 한다.
- claim 이후 프로세스가 죽으면 그 행이 claim 상태로 남는다. lease와 하트비트 기반 회수가 필요하고, 설계는 [[SQS-Worker-Reliability#PROCESSING으로 좌초된 행 회수|좌초 회수]], [[MySQL-Job-Queue|MySQL 작업 큐]]와 같다.

### 단일 러너 선출

- PostgreSQL advisory lock은 시스템이 사용을 강제하지 않는 애플리케이션 규약이다. 전체 poll, publish 주기를 한 runner로 제한하려면 전용 연결의 세션 수준 락이나 별도 leader election을 사용하고 `finally`에서 해제한다. 연결이 끊기면 세션 락도 풀린다.
- 트랜잭션 수준 advisory lock은 짧은 claim 또는 상태 전이만 보호할 때 적합하다. 원격 broker I/O까지 보호하려고 트랜잭션을 오래 열어 두지 않는다. 락을 못 잡은 인스턴스는 그 틱을 건너뛰며, 승자가 죽은 뒤 다음 선출까지의 시간이 발행 공백이다.

### 어느 축도 중복을 없애지는 못한다

claim을 걸어도 발행은 성공했는데 `processed_at` 마킹 직전에 프로세스가 죽으면 그 이벤트는 회수 뒤 다시 발행된다. 발행과 마킹이 서로 다른 시스템이라 여기서 dual write가 다시 나타나기 때문이다. Outbox는 dual write를 없앤 것이 아니라 **유실을 중복으로 바꾼** 패턴이고, 위 세 축은 중복의 빈도를 줄일 뿐이다. 중복을 실제로 흡수하는 것은 소비자 측 [[Idempotent-Consumer|멱등 처리]]다.

## 3계층 이벤트 전파 구조

실무에서는 이벤트를 **수명, 범위가 다른 3개 층**으로 분리하는 경우가 많다.

| 계층 | 수명 | 수단 | 용도 |
|---|---|---|---|
| **Application Event** | 트랜잭션 내, 프로세스 내 | Spring `ApplicationEvent`, `@TransactionalEventListener` | 도메인 내 비관심사 분리 (감사 로그, 메트릭) |
| **Internal Event** | 서비스 내부 | Outbox → SNS, SQS, Kafka | 한 컨텍스트 내 비동기 처리 |
| **External Event** | 서비스 간 공개 | Outbox → Kafka (일반화된 스키마) | 다른 서비스, 팀에 공개 |

분리의 이유:
- **스키마 안정성**: 외부 이벤트는 한 번 공개하면 바꾸기 어려움 → 내부에서만 쓸 정보가 외부로 새지 않게 경계
- **성능, 비용 분리**: 모든 이벤트를 외부 브로커로 내보내면 비용, 지연 증가
- **Backward Compatibility**: 외부 이벤트는 의도적으로 **안정된 추상 형태**로 정의

## 이벤트 설계 — 목적이 아닌 사실을 발행

이벤트 이름은 **"무엇을 해달라"** (명령)가 아니라 **"무엇이 일어났다"** (사실)가 되어야 한다.

- 나쁜 예: `FamilyAccountUnlinkCommand` ("가족계정 해제해줘") — 발행자가 구독자의 행동을 지시
- 좋은 예: `IdentityVerificationRevoked` ("본인인증이 해제됐다") — 사실만 알리고, 구독자가 각자 대응 결정

사실 기반 이벤트는 **새 구독자가 추가될 때 발행자 수정 불필요** → 느슨한 결합 유지.

## Zero Payload 전략 — 오래된 payload 완화와 스키마 유연성

분산 환경에서 이벤트는 **순서가 뒤바뀌거나 중복 도착**할 수 있다 (네트워크 재시도, 파티션 리밸런싱). 순서를 보장할 수 없는 구독자가 현재 상태만 필요하다면:

- 이벤트 페이로드에 **전체 상태를 담지 않고 식별자만** 싣는다
- Consumer는 식별자로 **Source of Truth를 다시 조회** → 오래된 상태 스냅샷을 적용하는 위험을 줄임
- 스키마 변경에도 유연 (페이로드가 최소하므로 호환성 이슈 감소)

트레이드오프는 조회 1회 추가와 source DB 부하다. **재조회는 순서를 보장하지 않는다.** 중간 상태 전이, 외부 부수효과, projection 갱신처럼 순서가 의미 있으면 원본의 단조 증가 version, change sequence 또는 LSN을 이벤트에 싣고 소비자가 더 오래된 값을 거부해야 한다. 브로커의 순서 보장도 key 또는 partition 범위를 확인하고, 처리 자체는 멱등이어야 한다 ([[OpenSearch-Indexing-Internals|색인 내부 구조]], [[Idempotent-Consumer|멱등 컨슈머]]).

## Event Store

Outbox 테이블을 단순 발행 대기열이 아닌 **모든 이벤트의 영구 저장소**로 확장하면 추가 이점.

- 발행 실패 시 배치로 재발행
- 엔티티 활동 추적 (감사, 분석)
- 과거 이벤트 리플레이로 새 Read Model 구축 (CQRS 보조)
- 기록 테이블 통합 → DB 스키마 단순화

Event Sourcing은 더 나아가 **상태 자체를 이벤트 스트림으로만 관리**하지만, Event Store + Outbox는 상태도 유지하면서 감사, 복구 능력을 얻는 **중간 지점**.

## 출처
- [PostgreSQL 공식 문서, SELECT — The Locking Clause (SKIP LOCKED)](https://www.postgresql.org/docs/current/sql-select.html)
- [PostgreSQL 공식 문서, Explicit Locking — Advisory Locks](https://www.postgresql.org/docs/current/explicit-locking.html)
- [MySQL 8.4 공식 문서, Locking Reads (SKIP LOCKED, NOWAIT)](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html)
- [Apache Kafka Documentation, Introduction (topic partition ordering)](https://kafka.apache.org/documentation/)
- [Spring Framework, TransactionSynchronization](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/transaction/support/TransactionSynchronization.html)
- [Chris Richardson, Transactional Outbox](https://microservices.io/patterns/data/transactional-outbox.html)
- [Dowon Lee 강사, Dual Write, Outbox와 CDC](https://www.inflearn.com/courses/lecture?courseId=332731&unitId=289780)
- [최상용 강사, 트랜잭션 이후 Kafka 이벤트 발행](https://www.inflearn.com/courses/lecture?courseId=337778&unitId=344376)
- [우아한형제들 — 회원시스템 이벤트기반 아키텍처 구축하기](https://techblog.woowahan.com/7835/)
- [우아한형제들 — 배민스토어에 이벤트 기반 아키텍처를 곁들인](https://techblog.woowahan.com/13101/)

## 관련 문서
- [[Delivery-Semantics|전달 보장]]
- [[Idempotency-Key|멱등성 키]]
- [[Idempotent-Consumer|멱등 컨슈머]]
- [[Messaging-Patterns|메시징 패턴]]
- [[MySQL-Job-Queue|MySQL 작업 큐 (lease와 SKIP LOCKED claim)]]
- [[SQS-Worker-Reliability|SQS 워커 신뢰성 (좌초 회수, 재시도 간격)]]
- [[MQ-Kafka|Kafka]]
