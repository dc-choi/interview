---
tags: [database, rdbms]
status: done
category: "Data & Storage - RDB"
aliases: ["트랜잭션 격리 수준", "Isolation Level"]
---

# 트랜잭션 격리 수준

트랜잭션 격리 수준이 중요한 이유는, 격리 레벨을 어떻게 설정하느냐에 따라 읽기 일관성이 달라지기 때문이다.

즉, 트랜잭션 격리 수준에 따라 데이터 조회 결과가 달라질 수 있다는 말이다.

여러 트랜잭션이 동시에 읽고 쓰면서도 일관된 읽기 관점을 제공하기 위해 MVCC(Multi-Version Concurrency Control)를 사용한다.

## 레벨
### 레벨 0: Read Uncommitted

- 트랜잭션에서 아직 처리 중인 데이터를 다른 트랜잭션에서 읽는 것을 허용
- Dirty Read, Non-Repeatable Read, Phantom Read 현상 모두 발생
- MySQL에서 설정 가능하지만 권장하지 않음

### 레벨 1: Read Committed

- **Dirty Read 방지**: 트랜잭션이 커밋되어 확정된 데이터만 읽는 것을 허용
- Non-Repeatable Read, Phantom Read 현상은 발생
- 대부분의 RDBMS가 기본 모드로 채택하는 격리 수준

### 레벨 2: Repeatable Read

- MySQL InnoDB의 기본 격리 수준
- 일반 SELECT는 트랜잭션 시작 시점의 스냅샷을 반복해서 읽으므로, 다른 트랜잭션이 커밋해도 같은 쿼리 결과가 유지된다.
- 다른 트랜잭션의 갱신, 삭제 자체를 막는다는 뜻은 아니다. 잠금 읽기(`SELECT ... FOR UPDATE`, `FOR SHARE`)나 UPDATE/DELETE는 Current Read로 동작하며 lock을 획득한다.
- 표준 SQL에서는 Phantom Read 현상이 발생할 수 있음. InnoDB는 잠금 읽기와 범위 갱신에서 Next-Key Lock으로 phantom을 막는다.

### 레벨 3: Serializable

- 트랜잭션 결과가 어떤 직렬 실행 순서와 같아지도록 더 강하게 격리한다.
- 구현체마다 방식은 다르지만, InnoDB에서는 일반 SELECT도 공유 잠금 읽기처럼 동작해 range insert/update와 충돌할 수 있으므로 동시성이 크게 떨어진다.

## 격리 수준을 설정시 발생하는 문제점들
트랜잭션 격리 수준을 너무 낮게 하면 읽기 일관성을 제대로 보장할 수 없고, 너무 높게 하면 읽기 일관성은 강해지지만 데이터를 처리하는 속도(동시성)가 느려지게 된다.

![격리 수준 레벨](../../../img/Isolation_Level.png)

따라서 트랜잭션 격리 수준은 일관성 및 동시성과도 연관이 있다는 것을 알 수 있다.

## MVCC와 격리 수준의 관계

| 격리 수준 | 스냅샷 시점 | Consistent Read 동작 |
|-----------|-----------|---------------------|
| **Read Committed** | **매 쿼리마다** 최신 커밋 스냅샷 | 같은 트랜잭션 안에서도 SELECT할 때마다 다른 결과 가능 (Non-Repeatable Read) |
| **Repeatable Read** | **트랜잭션 시작 시점** 스냅샷 고정 | 트랜잭션 동안 동일 SELECT는 항상 같은 결과 |

- RR에서도 `SELECT FOR UPDATE`(Current Read)는 최신 커밋 데이터를 읽음 → 스냅샷과 다를 수 있음

## InnoDB RR에서의 Phantom Read 방지

- 표준 SQL에서 RR은 Phantom Read를 방지하지 못하지만, **InnoDB는 잠금 읽기와 범위 변경에서 Next-Key Lock**으로 방지
- 범위 조건의 `SELECT ... FOR UPDATE`, UPDATE, DELETE는 Gap Lock이 함께 걸려 해당 범위에 새 행 INSERT를 차단
- 일반 SELECT는 MVCC 스냅샷을 읽으므로 같은 트랜잭션 안에서 phantom이 보이지 않지만, 삽입 자체를 막는 lock을 잡지는 않는다.
- 단, 이로 인해 INSERT 동시성이 저하될 수 있음

## RC vs RR 실무 선택

### RC로 변경하면 좋아지는 점
- 일반적인 검색, 인덱스 스캔에서 Gap Lock 사용이 줄어듦 → INSERT 동시성 향상
- 각 쿼리가 최신 데이터를 읽음 → 일부 상황에서 더 직관적

### RC로 변경하면 위험한 점
- Phantom Read 허용 → 범위 조건 결과가 트랜잭션 중 변할 수 있음
- 트랜잭션 안에서 "읽은 데이터가 커밋 전에 바뀔 수 있다"는 것을 인지해야 함

### 판단 기준
- 읽기 일관성이 중요하고 Gap Lock 비용이 감수 가능 → **RR** (기본값 유지)
- INSERT 동시성이 중요하고 Phantom Read를 앱에서 감수 가능 → **RC**
- 대부분의 경우 InnoDB 기본값 RR로 충분

## Oracle → MySQL 이관 시 격리 수준 함정

기본 격리 수준이 Oracle은 READ COMMITTED(RC), MySQL InnoDB는 REPEATABLE READ(RR). **같은 코드를 그대로 옮기면 Phantom-Read 회피 의도가 깨지거나, 잔액, 재고 같은 누적값에서 동시 갱신 충돌이 발생할 수 있다.**

전형적 사례: 결제, 잔액 차감 로직
```
1. SELECT balance FROM accounts WHERE user_id = ?  -- 잔액 읽기
2. (트랜잭션 안에서 잔액 검증)
3. UPDATE accounts SET balance = ... WHERE user_id = ?
```

- Oracle (RC): 매 SELECT가 실행 시점의 최신 커밋 스냅샷을 읽음. 같은 트랜잭션 안에서 재조회하면 결과가 바뀔 수 있다.
- MySQL (RR): 일반 SELECT는 트랜잭션 시작 시점 스냅샷을 유지. 앞에서 읽은 값을 애플리케이션이 오래 들고 계산하면 최신 커밋과 어긋날 수 있다.
- 두 DB 모두 잔액, 재고처럼 누적값을 다룰 때는 격리 수준에 기대지 말고 잠금 읽기, 조건부 UPDATE, 제약 조건으로 불변식을 DB에 걸어야 한다.

대응 패턴:
1. **잔액 읽기를 락 안으로** — `SELECT ... FOR UPDATE`로 Current Read 강제. 락이 풀린 뒤 최신 커밋 데이터를 읽음
2. **트랜잭션 격리 수준 명시적 변경** — Spring이라면 `@Transactional(isolation = Isolation.READ_COMMITTED)`로 해당 트랜잭션만 RC
3. **DB 기본값 변경** — `transaction-isolation = READ-COMMITTED` (DBA 협의 필수, 영향 범위 큼)

격리 수준은 절대적으로 좋고 나쁨이 없다. 비즈니스 요구사항(누적값 갱신, 재고, 잔액, 예약)과 동시성 요구사항(처리량, 응답시간) 사이의 트레이드오프이며, 이관 시점은 이 가정을 다시 검토할 좋은 기회다.

## 출처
- [m0rph2us — MySQL Isolation Level 이해하기](https://m0rph2us.github.io/mysql/transaction/2020/07/06/understanding-mysql-isolation-level.html)
- [네이버파이낸셜 — 실무에서 만나는 DB Isolation Level](https://medium.com/naverfinancial/실무에서-만나는-db-isolation-level-e94a904bbf9d)
- [woojjam — 트랜잭션과 동시성 제어](https://woojjam.tistory.com/9)

## 관련 문서
- [[Isolation-Level-Beyond-ANSI|ANSI 격리의 한계, Strict Serializable, Snapshot Isolation]]
- [[Transactions|트랜잭션]]
- [[Lock|DB Lock]]
- [[Index]]
