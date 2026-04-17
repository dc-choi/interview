---
tags: [database, redis, cache, concurrency]
status: done
category: "Data & Storage - Cache & KV"
aliases: ["Distributed lock", "Distributed Lock", "분산 락"]
---

# Distributed Lock

여러 프로세스/인스턴스가 공유 자원에 동시 접근할 때, **하나의 프로세스만 접근하도록 보장**하는 메커니즘. 단일 DB의 Row Lock으로 해결할 수 없는 분산 환경에서 필요하다.

## 언제 필요한가

### DB Lock으로 충분한 경우
- 모든 인스턴스가 **같은 DB**를 바라봄
- `SELECT FOR UPDATE`로 행 단위 잠금 가능
- 예: 재고 차감, 발주 상태 변경 (단일 DB 환경)

### 분산 Lock이 필요한 경우
- DB가 분리(샤딩)되어 있거나 DB 외부 자원을 보호해야 할 때
- 예: 선착순 이벤트, 중복 결제 방지, 외부 API 동시 호출 제한
- 여러 서비스가 독립 DB를 사용하면서 같은 자원에 접근하는 경우

## Redis 기반 분산 Lock

### 단일 인스턴스 Lock
```
SET resource_name lock_value NX EX 30
```
- `NX`: 키가 없을 때만 설정 (lock 획득 시도)
- `EX 30`: 30초 후 자동 만료 (lock 보유자가 crash해도 자동 해제)
- 해제: `lock_value`를 비교 후 삭제 (다른 클라이언트의 lock을 삭제하지 않도록)

### Redlock 알고리즘
- **5개 이상의 독립 Redis 인스턴스**에 동시에 lock 획득 시도
- 과반수(3개 이상)에서 성공하면 lock 획득
- 단일 Redis 장애에도 동작하는 내결함성 확보
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
3. **강한 정합성 필수** → Zookeeper / etcd 기반 합의 알고리즘

## 주의사항
- Lock TTL은 작업 예상 시간보다 넉넉하게 설정 (너무 짧으면 작업 중 lock 만료 → 다른 클라이언트가 lock 획득)
- Lock 해제 시 반드시 **본인의 lock인지 확인** 후 삭제 (Lua 스크립트로 원자적 비교+삭제)
- Lock 획득 실패 시 재시도 전략: 고정 간격 또는 exponential backoff

## Lock 범위 설계 패턴 — "Lock + 상태 키"

분산 락을 **그대로 작업 전체에 걸면** 처리 시간이 길어져 병목이 되는 경우가 있다. 재고 이관·배치 작업처럼 **병렬 처리가 가능한 다단계 작업**이 대표.

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

- 락은 **짧은 구간(상태 확인·변경)** 에만 보유 → 병목 최소화
- 오래 걸리는 실제 처리(SKU 할당)는 **락 밖에서 병렬** 수행
- 상태 키가 **할당/취소 동시 실행 방지** 를 담당 (충돌 방지 역할 수행)

### 패턴의 일반화

```
Lock → 짧은 의사결정(상태 전이) → Unlock
실제 작업은 락 외부에서 수행
필요하면 종료 시점에 다시 Lock → 상태 전이 → Unlock
```

이 패턴은 다음에도 적용 가능:
- **주문 상태 전이** (진행 중 → 완료): 상태 확인·변경만 락, 알림·이메일 발송은 락 밖
- **배치 작업 시작/종료** 체크만 락, 본 작업은 외부
- **재고 할당/취소**: 위 사례
- **결제 처리**: 중복 체크만 락, 외부 결제 API 호출은 외부

### 주의

- 상태 키와 분산 락이 **같은 저장소**(Redis)에 있을 때 원자적 처리는 Lua 스크립트 사용
- 상태 키에도 TTL 설정 (좀비 상태 방지)
- 작업이 비동기면 **idempotency key** 함께 사용 ([[Idempotency-Key]])

## 출처
- [우아한형제들 기술블로그 — WMS 재고 이관을 위한 분산 락 사용기](https://techblog.woowahan.com/17416/)
- [velog @imkkuk — Redis로 동시성 문제 해결하기](https://velog.io/@imkkuk/Redis%EB%A1%9C-%EB%8F%99%EC%8B%9C%EC%84%B1-%EB%AC%B8%EC%A0%9C-%ED%95%B4%EA%B2%B0%ED%95%98%EA%B8%B0)
- [4sii — Redis 분산 락](https://4sii.tistory.com/456)

## 관련 문서
- [[Lock|DB Lock]]
- [[Redis-Data-Structures|Redis 자료구조]]
- [[Redis-Atomic-Operations|Redis 원자적 연산]]
- [[Race-Condition-Patterns|Race Condition 패턴 (3계층 해결)]]
- [[Idempotency-Key|멱등성 키]]
