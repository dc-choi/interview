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

## 관련 문서
- [[Lock|DB Lock]]
- [[Redis-Data-Structures|Redis 자료구조]]
- [[Idempotency-Key|멱등성 키]]
