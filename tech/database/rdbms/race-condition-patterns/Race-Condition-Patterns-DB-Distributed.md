---
tags: [database, concurrency, race-condition, patterns]
status: done
category: "Data & Storage - RDB"
aliases: ["DB 락과 분산 락 Race Condition", "단일 DB 다중 서버, 분산 환경 race"]
---

# 층위 2와 3: 단일 DB 다중 서버, 분산 환경

## 층위 2: 단일 DB + 여러 서버

API 서버가 3대, 같은 DB를 씀. 각자 트랜잭션을 열어도 Isolation Level에 따라 race 발생.

### 시나리오: 같은 시간대 예약
```
User A: SELECT ... WHERE time = 10AM → 빈 자리
User B: SELECT ... WHERE time = 10AM → 빈 자리 (A 아직 INSERT 안 함)
User A: INSERT reservation
User B: INSERT reservation → 이중 예약
```

단순 조회 후 삽입 패턴은 Read Committed, Repeatable Read만으로 안전하지 않을 수 있다. 빈 결과를 읽었을 때 아무 row도 잠기지 않거나, DB마다 phantom 방지 방식이 다르기 때문이다.

### 해결
**1. Pessimistic Lock** (`SELECT ... FOR UPDATE`):
```
BEGIN;
SELECT * FROM reservations WHERE time = 10AM FOR UPDATE;
INSERT ...;
COMMIT;
```
대기 시간 발생, 하지만 확실.
단, 빈 범위까지 막으려면 적절한 인덱스와 InnoDB RR의 Gap Lock처럼 범위 삽입을 막는 구현이 필요하다. DB 독립적으로는 Unique Constraint가 더 확실하다.

**2. Unique Constraint**:
```
CREATE UNIQUE INDEX ON reservations(time, resource_id);
```
DB가 중복을 거부. 애플리케이션은 예외 핸들링.

**3. Optimistic Lock (version 컬럼)**:
```
UPDATE products SET stock = ?, version = version + 1
WHERE id = ? AND version = ?
```
version 불일치면 rowsAffected=0 → 재시도. 경쟁 적을 때 효율적.

**4. Gap Lock, Next-Key Lock** (MySQL InnoDB):
범위 조건 조회 시 빈 공간까지 잠금. Phantom 방지. ([[MySQL-Gap-Lock]] 참고)

## 층위 3: 분산 환경

여러 서버 + 여러 DB + Redis, 메시지큐. 트랜잭션이 한 경계를 넘는 경우.

### 시나리오
- Redis에 재고 캐시, DB에 영속 상태 → 둘을 동기화하는 지점
- 서비스 A가 B를 호출하는 중간에 B의 상태 변경
- 여러 마이크로서비스가 같은 엔티티 수정

### 해결
**1. 분산 락 (Redis Redlock, Redisson)**:
- `SET lock-key value NX EX 30` (30초 만료)
- critical section 수행
- Lua로 `GET lock-key` 값이 내 토큰과 같을 때만 `DEL`

주의:
- **TTL보다 오래 걸리는 작업이면 위험** — TTL 만료 후 다른 서버가 락 획득
- **fencing token** 없으면 "TTL 만료한 줄 모르고 쓰기" 발생. fencing token은 단순 삭제 토큰이 아니라, 보호 대상 저장소가 더 작은 token의 쓰기를 거부하도록 만드는 단조 증가 번호다.
- **RedLock 자체의 안전성 논쟁** (Martin Kleppmann 비판) — 진짜 강한 보장이 필요하면 ZooKeeper, etcd

**2. Saga + Compensating Transaction**:
분산 트랜잭션 대신 각 단계가 성공, 실패 이벤트 발행, 실패 시 보상 동작. [[External-API-Integration-Patterns]] 참고.

**3. 이벤트 소싱 + 단일 Writer**:
특정 엔티티는 **한 서비스만 쓰기**, 다른 서비스는 이벤트 구독. race 자체를 설계로 제거.

**4. 상태 키 + 분산 락 (실전 조합)**:
우아한형제들 WMS 사례처럼 **상태 key로 유효 전이만 허용** + 분산 락으로 전이 순간 보호 → 병렬성과 정합성 양립.

## 안티패턴 실제 사례 (카카오 메시징 사고)

**상황**: 메시지 전송 후 리포트 생성. 리포트 생성이 메시지 상태와 race → 일부 리포트 누락.

**안티패턴**:
- 이벤트 발행 + 상태 업데이트를 **별개 트랜잭션**
- 이벤트 수신 측이 상태를 역조회해 처리

**수정**:
- **Transactional Outbox** 패턴: 메시지 상태 업데이트 + 이벤트 발행을 한 트랜잭션
- Outbox 테이블에서 이벤트를 별도 워커가 읽어 발행
- 상태와 이벤트의 정합성 자동 보장

상세: [[Transactional-Outbox]]

## 관련 문서
- [[Lock|DB Lock (Shared, Exclusive, Gap, Next-Key)]]
- [[MySQL-Gap-Lock|MySQL Gap Lock]]
- [[Distributed-Lock|분산 락 (Redlock, fencing token)]]
- [[Redis-Atomic-Operations|Redis 원자적 연산]]
- [[Isolation-Level|Isolation Level]]
- [[Transactional-Outbox|Transactional Outbox]]
