---
tags: [database, redis, cache, concurrency]
status: done
verified_at: 2026-08-26
category: "Data & Storage - Cache & KV"
aliases: ["Distributed Lock", "분산 락"]
---

# Distributed Lock

여러 프로세스/인스턴스가 공유 자원 접근을 조율하는 메커니즘. Redis TTL lock은 유효 기간 안의 상호 배제를 목표로 하는 **lease**이며, 만료 뒤에도 살아난 이전 소유자의 쓰기까지 막으려면 보호 대상이 fencing token을 검증해야 한다. 단일 DB의 Row Lock으로 해결할 수 없는 분산 환경에서 고려한다.

## 언제 필요한가

### DB Lock으로 충분한 경우
- 모든 인스턴스가 **같은 DB**를 바라봄
- `SELECT FOR UPDATE`로 행 단위 잠금 가능
- 예: 재고 차감, 발주 상태 변경 (단일 DB 환경)

### 분산 Lock이 필요한 경우
- DB가 분리(샤딩)되어 있거나 DB 외부 자원을 보호해야 할 때
- 예: 선착순 이벤트, 동일 대상의 중복 배치 실행, 외부 API 동시 호출 제한
- 여러 서비스가 독립 DB를 사용하면서 같은 자원에 접근하는 경우

## Redis 기반 분산 Lock

### 단일 인스턴스 Lock
```
SET resource_name random_lock_value NX PX 30000
```
- `NX`: 키가 없을 때만 설정 (lock 획득 시도)
- `PX 30000`: 30초 lease. 보유자가 crash하면 만료 뒤 다시 획득할 수 있지만, 작업이 lease를 넘기면 이전 보유자가 stale해질 수 있음
- 해제: `random_lock_value`를 비교 후 삭제 (다른 클라이언트의 lock을 삭제하지 않도록)

### Redlock 알고리즘
- **N개의 독립 Redis master**에 짧은 timeout으로 lock 획득 시도. 공식 설명은 `N = 5`를 예로 듦
- 과반수(`floor(N / 2) + 1`)에서 성공하고 획득에 쓴 시간이 lease보다 짧아야 lock 획득
- 실제 남은 유효시간은 원래 TTL이 아니라 `TTL - 획득 경과 시간 - clock drift 여유`로 계산한다. 과반수나 시간 조건을 충족하지 못하면 성공한 일부 인스턴스의 lock도 즉시 해제
- 과반수를 유지하는 범위의 Redis 장애를 견딜 수 있음
- Martin Kleppmann의 비판: 클럭 드리프트, GC pause 시 안전하지 않을 수 있음 → 정합성이 극도로 중요하면 Zookeeper/etcd 기반 lock 고려

## DB Lock vs Redis 분산 Lock

| 기준 | DB Lock (FOR UPDATE) | Redis 분산 Lock |
|------|---------------------|-----------------|
| 인프라 | 추가 불필요 | Redis 인스턴스 필요 |
| 적용 범위 | 같은 DB 내 레코드 | DB 외부 자원, 서비스 간 |
| 성능 | 트랜잭션 범위에 의존 | 네트워크 레이턴시 |
| 안정성 | DB 트랜잭션 보장 | 클럭/네트워크 이슈 가능 |
| 자동 해제 | 트랜잭션 종료 시 | TTL 만료 시 |

## 선택 기준
1. **단일 DB 환경** → DB Lock 우선. 인프라 단순성이 최우선
2. **분산 DB 또는 DB 외부 자원** → Redis 분산 Lock
3. **강한 정합성 필수** → 합의 기반 coordination과 보호 대상의 fencing token 검증을 함께 설계

## 주의사항
- Lock TTL은 작업 시간 상한과 장애 복구 시간을 기준으로 잡고, 긴 작업은 owner token을 확인하며 연장한다. 긴 TTL만으로 stale owner의 쓰기를 막을 수는 없다
- Lock 해제 시 반드시 **본인의 lock인지 확인** 후 삭제 (Lua 스크립트로 원자적 비교+삭제)
- Lock 획득 실패 시 재시도 전략: 고정 간격 또는 exponential backoff

### Fencing token과 외부 효과

TTL이 지난 뒤 GC pause나 네트워크 지연에서 돌아온 이전 owner가 작업을 계속할 수 있다. lock을 얻을 때 단조 증가 fencing token을 받고, DB나 외부 시스템이 마지막으로 수락한 token보다 큰 요청만 반영하게 해야 stale owner를 막을 수 있다. Redis lock이나 owner 비교 삭제만으로는 이 검증이 되지 않는다.

결제와 주문처럼 되돌리기 어려운 외부 효과는 lock으로 중복을 줄일 수는 있어도 lock만으로 중복 결제를 막을 수 없다. provider가 보장하는 idempotency key, 영속 상태 전이, timeout 뒤 결과 조회 또는 대사를 함께 둔다 ([[Idempotency-Key|멱등성 키]]).

## Lock 범위 설계 패턴 — "Lock + 상태 키"

분산 락을 **그대로 작업 전체에 걸면** 처리 시간이 길어져 병목이 되는 경우가 있다. 재고 이관, 배치 작업처럼 **병렬 처리가 가능한 다단계 작업**이 대표.

### 문제 — 순진한 Lock

```
[할당 요청]          [취소 요청]
   │                    │
   ▼                    ▼
Lock 획득(요청 단위)  Lock 획득(요청 단위)  ← 동시 실행 방지 OK
   │                    │
   ▼                    ▼
N개 SKU 순차 처리       …
```

- 문제 1: 하위 N개 항목을 **병렬로 할당할 수 없음** — 락이 요청 단위라 각 SKU 처리가 직렬화
- 문제 2: 락 대기 시간이 **SKU 개수에 비례** 하게 증가 → 처리량 하락

### 해결 — 분산 락 + 상태 키

```
[할당 요청]
   │
   ▼
Lock 획득 → 상태 키 확인(ALLOCATION/CANCEL) → 상태 설정 → Lock 해제
   │                                                        
   ▼ (락 밖에서)
N개 SKU 병렬 할당
   │
   ▼
Lock 획득 → 할당 상태 변경 → Lock 해제
```

- 락은 **짧은 구간(상태 확인, 변경)** 에만 보유 → 병목 최소화
- 오래 걸리는 실제 처리(SKU 할당)는 **락 밖에서 병렬** 수행
- 상태 키가 **할당/취소 동시 실행 방지** 를 담당 (충돌 방지 역할 수행)

### 패턴의 일반화

```
Lock → 짧은 의사결정(상태 전이) → Unlock
실제 작업은 락 외부에서 수행
필요하면 종료 시점에 다시 Lock → 상태 전이 → Unlock
```

이 패턴은 다음에도 적용 가능:
- **주문 상태 전이** (진행 중 → 완료): 상태 확인, 변경만 락, 알림, 이메일 발송은 락 밖
- **배치 작업 시작/종료** 체크만 락, 본 작업은 외부
- **재고 할당/취소**: 위 사례
- **결제 처리**: 동시 실행만 짧게 조율하고, 외부 결제 API는 idempotency key와 영속 상태 전이로 보호

### 주의

- 상태 키와 분산 락이 **같은 저장소**(Redis)에 있을 때 원자적 상태 전이는 Lua 스크립트로 처리
- 상태 키에 TTL을 둘 때는 lease 회수 뒤 이전 worker가 완료 상태를 덮지 못하게 owner 또는 fencing 조건을 둠
- 작업이 비동기이거나 외부 효과가 있으면 **idempotency key**와 영속 완료 기록을 함께 사용 ([[Idempotency-Key]])

## 출처
- [Redis 공식 문서, Distributed Locks with Redis](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/)
- [우아한형제들 기술블로그 — WMS 재고 이관을 위한 분산 락 사용기](https://techblog.woowahan.com/17416/)
- [velog @imkkuk — Redis로 동시성 문제 해결하기](https://velog.io/@imkkuk/Redis%EB%A1%9C-%EB%8F%99%EC%8B%9C%EC%84%B1-%EB%AC%B8%EC%A0%9C-%ED%95%B4%EA%B2%B0%ED%95%98%EA%B8%B0)
- [4sii — Redis 분산 락](https://4sii.tistory.com/456)

## 관련 문서
- [[Lock|DB Lock]]
- [[Redis-Data-Structures|Redis 자료구조]]
- [[Redis-Atomic-Operations|Redis 원자적 연산]]
- [[Race-Condition-Patterns|Race Condition 패턴 (3계층 해결)]]
- [[Idempotency-Key|멱등성 키]]
