---
tags: [database, redis, ecommerce, cart, consistency]
status: done
verified_at: 2026-08-04
category: "Data & Storage - Redis"
aliases: ["Redis Cart", "Redis 장바구니", "장바구니 주문 정합성"]
---

# Redis 장바구니와 주문 정합성

Redis 장바구니는 빠른 읽기와 짧은 수명에 잘 맞지만, 주문, 재고를 저장하는 RDB와 같은 트랜잭션에 참여하지 않는다. 핵심은 Redis 명령 사용법보다 **장바구니의 손실 허용 범위, checkout snapshot, RDB commit 이후 정리 실패를 어떻게 복구할지**를 먼저 정하는 것이다.

## 먼저 source of truth를 정한다

| 선택 | 의미 | 필요한 운영 장치 |
|---|---|---|
| Redis가 임시 projection | 유실되면 사용자가 다시 담을 수 있음 | TTL, eviction 관측, 장애 안내 |
| Redis가 장바구니 원본 | 재시작이나 eviction 뒤에도 복구해야 함 | AOF/RDB, replica, backup, 복구 훈련 |
| RDB가 원본, Redis가 가속 계층 | RDB에서 재구성 가능 | cache invalidation, lag 허용 기준 |

Redis에는 persistence가 있지만 설정에 따라 최근 쓰기가 유실될 수 있고, maxmemory 정책은 key를 퇴출할 수 있다. 따라서 "Redis를 쓴다"와 "장바구니가 내구적이다"는 같은 말이 아니다.

## Hash 모델링

한 고객의 장바구니를 하나의 Hash로 두는 기본형은 다음과 같다.

```text
key:   cart:{opaque-account-id}
field: sku-id
value: quantity 또는 { quantity, selectedOption, itemVersion }
```

- key에는 email, 전화번호 같은 직접 식별자를 넣지 않고 내부의 불투명 ID를 사용한다.
- field는 상품 자체보다 실제 구매 단위인 SKU 또는 option ID를 가리킨다.
- 장바구니에 보인 가격은 참고값이다. checkout에서는 판매 상태, 가격, 할인과 재고를 서버가 다시 검증한다.
- `HGETALL`은 Hash 크기에 비례하므로 장바구니 item 수에 상한을 두고 응답 크기를 관측한다.
- value를 숫자 quantity로 두면 `HINCRBY`를 쓸 수 있다. JSON value는 여러 속성을 함께 보존하지만 수량 변경을 Lua/Function의 read-modify-write로 원자화해야 한다.
- Redis Cluster에서 관련 key를 여러 개 쓴다면 같은 hash tag를 사용해야 multi-key 연산이 같은 slot에 머문다.

### TTL 경계

`EXPIRE`는 Hash 전체 key에 적용한다. 장바구니를 수정할 때마다 만료를 연장할지, 최초 생성 시각을 유지할지는 제품 정책이다. 쓰기와 `EXPIRE`를 별도 왕복으로 보내면 둘 사이의 crash로 만료 없는 key가 남을 수 있으므로, 조건이 단순하면 `MULTI/EXEC`, 조건 분기가 있으면 짧은 Lua script나 Redis Function으로 한 실행 경계를 만든다.

Redis 7.4부터 `HEXPIRE`로 Hash field별 TTL을 설정할 수 있다. 이전 버전이나 이를 지원하지 않는 호환 서비스에서는 field별 TTL이 없으므로 key 분리 또는 만료 시각을 담은 별도 index가 필요하다. 운영 버전 지원 여부를 확인하지 않고 명령을 전제로 삼지 않는다.

Redis의 만료는 접근 시 passive expiration과 주기적인 active expiration으로 처리된다. TTL을 정확한 시각에 실행되는 업무 scheduler로 사용하지 않는다.

## 장바구니 변경은 원자적으로 만든다

`HGET`으로 수량을 읽고 애플리케이션에서 더한 뒤 `HSET`하면 동시 요청의 변경 하나가 사라질 수 있다.

- 단순 증감은 `HINCRBY` 같은 단일 원자 명령을 우선한다.
- 최대 수량, 음수 금지, item 생성과 TTL 갱신을 함께 검사해야 하면 Lua/Function 또는 `WATCH` 기반 CAS를 사용한다.
- pipeline은 왕복 횟수만 줄이며 여러 명령을 원자화하지 않는다.
- 수정 결과에 cart version을 증가시켜 checkout snapshot과 이후 변경을 구분한다.

## Checkout의 두 일관성 경계

Checkout에는 서로 다른 두 경계가 있다.

```text
1. Redis: cart snapshot + version 읽기
2. RDB transaction: 가격/재고 재검증 -> 재고 차감 -> 주문/line/outbox 저장 -> commit
3. Redis: snapshot에 포함된 item만 compare-and-delete
```

### RDB 안의 경계

현재 기준 구현은 NestJS와 TypeORM이다. `QueryRunner` 또는 transaction callback이 제공한 `EntityManager` 하나로 재고 확인, 차감, 주문 저장을 수행한다. 충돌이 높은 재고는 `pessimistic_write`, 한 SQL로 불변식을 표현할 수 있으면 `quantity >= requested` 조건부 UPDATE를 검토한다. transaction 안에서 전역 Repository를 섞으면 다른 connection으로 빠질 수 있다.

### RDB와 Redis 사이의 경계

RDB commit 뒤 cart를 삭제하면 DB rollback인데 cart가 사라지는 순서는 피할 수 있다. 그러나 commit 직후 process가 종료되면 주문은 생겼는데 cart는 남는다. 이것은 DB와 Redis의 dual write 문제이며 순서만 바꿔서는 닫히지 않는다.

- 주문과 같은 DB transaction에 `OrderCreated` 또는 `CartCleanupRequested` outbox row를 기록한다.
- relay가 Kafka 같은 broker로 발행하고 consumer가 Redis cleanup을 재시도한다.
- consumer는 order ID나 event ID로 멱등하게 처리한다.
- cleanup 실패를 metric과 dead-letter/retry 상태로 노출하고 reconciliation job으로 오래된 건을 찾는다.

Kafka key를 cart ID나 order ID로 맞추면 같은 key의 event가 한 partition에 모여 순서를 다루기 쉬워진다. 이것이 RDB와 Redis를 하나의 transaction으로 만들거나 중복 처리를 없애는 것은 아니다.

## 새로 담은 상품을 지우지 않는다

Checkout 도중 사용자가 같은 장바구니를 수정할 수 있다. commit 후 key 전체를 `DEL`하면 snapshot 이후 추가한 item까지 지울 수 있다.

1. checkout 시작 시 item 목록과 cart version을 읽는다.
2. order에는 확정된 item, 수량, 가격 snapshot을 저장한다.
3. cleanup은 version이 같을 때만 전체 삭제하거나, 주문에 포함된 field가 같은 수량/version일 때만 제거한다.
4. version이 바뀌었으면 새 변경을 보존하고 주문된 수량만 차감하는 정책을 적용한다.

이 compare-and-delete도 Redis 안에서는 Lua/Function으로 원자화한다. 제품 정책에 따라 checkout 동안 cart를 잠그는 방법도 있지만, lock 만료, 사용자 대기와 장애 복구 비용을 함께 비교한다.

## NestJS 경계

```text
Controller -> Checkout Application Service
           -> Cart Port -> Redis adapter
           -> Order/Stock Port -> TypeORM adapter
           -> Outbox Port -> TypeORM adapter
```

Controller는 입력 검증과 HTTP 변환을 담당하고, checkout service가 순서를 조정한다. Redis record, TypeORM entity와 API DTO를 같은 객체로 공유하지 않는다. 단순 CRUD라면 통합 모델도 가능하지만 저장소가 둘이면 adapter의 mapping 경계가 특히 중요하다.

## 실패 시 기대 상태

| 실패 지점 | 기대 결과 | 복구 |
|---|---|---|
| RDB commit 전 | 주문/재고 모두 rollback, cart 유지 | 요청 재시도 |
| RDB commit 후 cleanup 전 | 주문 존재, cart가 일시적으로 남음 | outbox consumer 재시도 |
| cleanup 중 새 cart 변경 | 새 item 보존 | version/field 비교 삭제 |
| Kafka 중복 전달 | 결과 한 번만 반영 | event/order ID 멱등성 |
| Redis eviction/재시작 | 정의한 손실 예산 안에서 처리 | persistence 또는 RDB 재구성 |

## 출처

- [Redis Docs, Hashes](https://redis.io/docs/latest/develop/data-types/hashes/)
- [Redis Docs, HEXPIRE](https://redis.io/docs/latest/commands/hexpire/)
- [Redis Docs, EXPIRE와 만료 처리](https://redis.io/docs/latest/commands/expire/)
- [Redis Docs, Key eviction](https://redis.io/docs/latest/develop/reference/eviction/)
- [Redis Docs, Persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)
- [NestJS Docs, Database와 QueryRunner](https://docs.nestjs.com/techniques/database)
- [TypeORM Docs, Transactions](https://typeorm.io/docs/transactions/)
- 김빌 강사, [요구사항과 ERD](https://www.inflearn.com/courses/lecture?courseId=336546&unitId=275733), [Redis 기본](https://www.inflearn.com/courses/lecture?courseId=336546&unitId=273690), [Redis 연동](https://www.inflearn.com/courses/lecture?courseId=336546&unitId=273691), [장바구니 리팩터링](https://www.inflearn.com/courses/lecture?courseId=336546&unitId=273692), [오류 수정](https://www.inflearn.com/courses/lecture?courseId=336546&unitId=273693), [결과 확인](https://www.inflearn.com/courses/lecture?courseId=336546&unitId=273694)

## 관련 문서

- [[Redis-Atomic-Operations|Redis 원자적 연산]]
- [[TTL|TTL 전략]]
- [[Persistence|Redis Persistence]]
- [[Lock|DB Lock]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[Ecommerce-Shopping-Mall-ERD|이커머스 도메인 모델링]]
