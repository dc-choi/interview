---
tags: [database, redis, cache]
status: done
category: "Data & Storage - Cache & KV"
aliases: ["Cache invalidation", "Cache Invalidation", "캐시 무효화"]
---

# Cache Invalidation

캐시된 데이터가 원본(DB)과 달라졌을 때 이를 갱신하거나 제거하는 전략. **캐시 도입보다 무효화 설계가 더 어렵다.**

## 무효화 전략

### TTL 기반 (Time-To-Live)
- 캐시 항목에 만료 시간을 설정, 만료 후 자동 삭제 → 다음 조회 시 DB에서 다시 적재
- 구현이 가장 단순. 대부분의 캐시 시스템에서 기본 지원
- **TTL이 짧으면**: 캐시 적중률 저하 → DB 부하 증가
- **TTL이 길면**: 데이터 불일치 허용 구간이 길어짐
- 적합: 약간의 지연이 허용되는 데이터 (대시보드, 리포트, 설정값)

### Write-Through (동시 쓰기)
- DB에 쓸 때 캐시도 동시에 갱신
- 캐시가 항상 최신 → 읽기 시 일관성 보장
- 단점: 쓰기 시마다 캐시 갱신 오버헤드. 읽히지 않는 데이터도 캐시에 적재될 수 있음
- 적합: 쓰기 직후 바로 읽기가 빈번한 데이터

### Write-Behind (비동기 쓰기)
- 캐시에만 먼저 쓰고, 일정 간격으로 DB에 반영
- 쓰기 성능 극대화, 하지만 캐시 장애 시 데이터 유실 위험
- 적합: 조회수 카운터, 좋아요 수 등 유실 허용 가능한 집계성 데이터

### Cache-Aside에서의 무효화
- Cache-Aside(Look-Aside) 패턴에서는 **쓰기 시 캐시를 갱신하지 않고 삭제**하는 것이 안전
- 이유: 갱신하면 DB 쓰기와 캐시 갱신 사이 race condition 발생 가능 → 오래된 데이터가 캐시에 남을 수 있음
- 삭제하면 다음 읽기에서 DB 조회 후 최신 데이터로 캐시 재적재 (lazy)

### 이벤트 기반 무효화
- DB 변경 이벤트(CDC, 메시지 큐)를 구독하여 관련 캐시를 무효화
- 여러 서비스가 같은 데이터를 캐싱할 때 일관된 무효화 가능
- 복잡도 증가하지만 분산 환경에서 가장 확실한 방법

## 캐시-DB 불일치 시나리오

### Race Condition 예시
```
1. TX-A: DB에서 데이터 읽기 (값: 100)
2. TX-B: DB에 데이터 쓰기 (값: 200) + 캐시 삭제
3. TX-A: 캐시에 데이터 쓰기 (값: 100) ← 오래된 값이 캐시에 적재
```
- 해결: TTL을 충분히 짧게 설정하여 불일치 구간 최소화, 또는 Write-Through 사용

### 캐시 아발란체 (Avalanche)
- 대량의 캐시가 동시에 만료 → 모든 요청이 DB로 몰림 → DB 과부하
- 해결: TTL에 jitter(랜덤 지연) 추가하여 만료 시점 분산
- [[Cache-Stampede|캐시 스탬피드]]와 함께 고려

## 트랜잭션 경계와 무효화 타이밍

캐시 무효화를 **트랜잭션 안**에서 하면 복잡한 경합이 발생한다. 실무는 보통 **커밋 이후(Post-Commit)** 에 무효화를 수행.

### Pre-Commit 무효화의 문제

```
트랜잭션 시작
  ├─ UPDATE users SET name = 'X'
  ├─ cache.evict('user:1')  ← 여기서 삭제
  └─ 다른 요청이 user:1 조회 → DB에서 아직 커밋 안 된 '원래 값'을 읽고 캐시에 적재
커밋
```

커밋 전에 evict하면 **다른 요청이 아직 보이지 않는 구 데이터로 캐시를 재적재**해버려 일관성이 깨진다.

### Post-Commit 무효화 패턴

Spring 기준 구현:

- **`@TransactionalEventListener(phase = AFTER_COMMIT)`**: 도메인 이벤트를 발행하고 커밋 성공 이후에만 캐시 삭제 리스너가 실행
- **`@EntityListener`** (JPA): 엔티티 변경 시점에 이벤트 발행, 실제 evict는 `AFTER_COMMIT` 핸들러에서
- 이 조합으로 "DB 커밋된 사실"만 캐시에 반영

### 커밋 후 Evict 실패 — Circuit Breaker 강제 개방

Post-Commit 무효화의 근본 문제: **커밋은 이미 완료**되었는데 **캐시 evict가 실패**하면? 트랜잭션을 되돌릴 수 없고, 캐시에는 stale 데이터가 남는다.

현실적 해법:
- **재시도 + DLQ**: evict 명령을 메시지 큐에 넣어 eventual consistency
- **Circuit Breaker 강제 개방**: Evict 실패가 감지되면 해당 캐시에 대한 Circuit을 열어 **모든 읽기를 DB로 우회**. 캐시 TTL 만료 또는 수동 복구까지 fallback
- **짧은 TTL + 주기 새로고침**: 일관성 윈도우를 TTL 길이로 제한 → 최악의 경우에도 TTL 후 자동 복구

### Strong Consistency가 필수인 경우

대부분 캐시는 eventual consistency가 허용되지만, **개인정보 동의·철회·결제 같은 도메인**은 stale이 법적·보안 문제로 이어진다.

- **Replication Read Replica 지양**: 복제 지연 동안 철회된 동의가 여전히 "유효"로 조회되면 개인정보 오남용
- **단일 Source of Truth + Write-Through 또는 Post-Commit Evict**
- **Evict 실패 대비 Circuit Breaker**를 반드시 설계
- **감사 로그**: 캐시 사용 구간을 기록해 추적 가능하게

## 무효화와 후속 이벤트의 순서 경합

DB 변경 후 여러 후속 작업이 동시에 일어날 때 순서가 뒤섞일 수 있다. 대표 예: **캐시 Evict · Kafka 이벤트 발행 · 외부 API 호출**.

- Evict가 Kafka 이벤트보다 늦으면, 이벤트를 받은 Consumer가 캐시에서 **변경 전 값**을 읽음
- 반대로 Evict가 먼저 나가면 다른 소비자가 DB 조회로 정상 동작

### 순서 보장 패턴

- **`TransactionSynchronizationManager`**: Spring이 제공하는 트랜잭션 훅. `registerSynchronization`으로 커밋 후 작업 순서 명시
- **`@Order`**: 여러 리스너의 우선순위 지정
- **단일 Post-Commit 작업으로 통합**: Evict → 이벤트 발행을 하나의 리스너에서 순서대로 실행하는 것이 단순·안전
- **이벤트에 "캐시 무효화 완료" 시점 정보 포함**: Consumer가 판단 가능

### 정책 먼저 재설계

복잡한 동시성 제어를 **코드로 해결하기보다 정책을 재정의**하는 것이 더 단순할 때가 많다.

- "요청 처리"의 경계를 **API 응답 직전까지**로 재정의 → 응답 반환 전 모든 후속 작업 완료 보장
- "Cache miss 시 DB 조회"의 허용 지연을 명시화 → Circuit Open 상태의 동작 정의
- 비동기 이벤트와 캐시 무효화를 **같은 AFTER_COMMIT 훅**에 묶어 순서를 코드가 아닌 플로우로 보장

## 출처
- [Toss — 캐시를 적용하기까지의 험난한 길 (TPS 1만 Strong Consistency 캐싱)](https://toss.tech/article/34481)

## 관련 문서
- [[TTL|TTL 전략]]
- [[Cache-Strategies|Cache 전략]]
- [[Cache-Stampede|Cache Stampede]]
- [[Distributed-Lock|분산락]]
- [[CDC-Debezium|CDC · Debezium (이벤트 기반 무효화)]]
- [[External-Service-Resilience|외부 서비스 복원성 (Circuit Breaker)]]
