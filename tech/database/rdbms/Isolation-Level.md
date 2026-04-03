---
tags: [database, rdbms]
status: done
category: "Data & Storage - RDB"
aliases: ["트랜잭션 격리 수준", "Isolation Level"]
---

# 트랜잭션 격리 수준

트랜잭션 격리 수준이 중요한 이유는, 격리 레벨을 어떻게 설정하느냐에 따라 읽기 일관성이 달라지기 때문이다.

즉, 트랜잭션 격리 수준에 따라 데이터 조회 결과가 달라질 수 있다는 말이다.

이처럼 트랜잭션 격리 수준에 따라 데이터 조회가 달라지게 하는 기술을 MVCC(Multi Version Concurrency Consistency)라고 한다.

## 레벨
### 레벨0: Read Uncommited
```
1. 트랜잭션에서 아직 처리중인 데이터를 다른 트랜잭션에서 읽는 것을 허용
2. Dirty Read, Non-Repeatable Read, Phantom Read 현상 발생
3. Mysql에서는 설정 가능하지만 권장하지 않음
```

### 레벨1: Read Commited
```
1. Dirty Read 방지: 트랜잭션이 커밋되어 확정된 데이터를 읽는 것을 허용
2. Non-Repeatable Read, Phantom Read 현상 발생
3. 대부분의 RDBMS가 기본 모드로 채택하고 있는 격리 수준
```

### 레벨2: Repeatable Read
```
1. Mysql InnoDB에서 기본으로 채택하고 있는 격리 수준
2. 선행 트랜잭션이 읽은 데이터는 트랜잭션이 종료될 때까지 후행 트랜잭션이 갱신하거나 삭제하는 것은 불허함으로써 같은 데이터를 두 번 쿼리했을 때 일관성 있는 결과를 리턴
3. Phantom Read 현상 발생
```

### 레벨3: Serializable Read
```
1. 선행 트랜잭션이 읽은 데이터를 후행 트랜잭션이 갱신하거나 삭제하지 못할 뿐만 아니라 중간에 새로운 레코드를 삽입하는 것도 막아줌. 완벽하게 읽기 일관성 모드를 제공
2. INSERT, UPDATE, DELETE 전부 불가능하고 READ시 DML 작업이 동시에 진행될 수 없다.
```

## 격리 수준을 설정시 발생하는 문제점들
트랜잭션 격리 수준을 너무 낮게 하면 읽기 일관성을 재대로 보장할 수 없고, 너무 높게 하면 읽기 일관성은 완벽하게 보장하지만 데이터를 처리하는 속도(동시성)가 느려지게 된다.

![격리 수준 레벨](../../../img/Isolation_Level.png)

따라서 트랜잭션 격리 수준은 일관성 및 동시성과도 연관이 있다는 것을 알 수 있다.

## MVCC와 격리 수준의 관계

| 격리 수준 | 스냅샷 시점 | Consistent Read 동작 |
|-----------|-----------|---------------------|
| **Read Committed** | **매 쿼리마다** 최신 커밋 스냅샷 | 같은 트랜잭션 안에서도 SELECT할 때마다 다른 결과 가능 (Non-Repeatable Read) |
| **Repeatable Read** | **트랜잭션 시작 시점** 스냅샷 고정 | 트랜잭션 동안 동일 SELECT는 항상 같은 결과 |

- RR에서도 `SELECT FOR UPDATE`(Current Read)는 최신 커밋 데이터를 읽음 → 스냅샷과 다를 수 있음

## InnoDB RR에서의 Phantom Read 방지

- 표준 SQL에서 RR은 Phantom Read를 방지하지 못하지만, **InnoDB는 Next-Key Lock**으로 방지
- 범위 조건 조회 시 Gap Lock이 함께 걸려 해당 범위에 새 행 INSERT를 차단
- 단, 이로 인해 INSERT 동시성이 저하될 수 있음

## RC vs RR 실무 선택

### RC로 변경하면 좋아지는 점
- Gap Lock이 비활성화 → INSERT 동시성 향상
- 각 쿼리가 최신 데이터를 읽음 → 일부 상황에서 더 직관적

### RC로 변경하면 위험한 점
- Phantom Read 허용 → 범위 조건 결과가 트랜잭션 중 변할 수 있음
- 트랜잭션 안에서 "읽은 데이터가 커밋 전에 바뀔 수 있다"는 것을 인지해야 함

### 판단 기준
- 읽기 일관성이 중요하고 Gap Lock 비용이 감수 가능 → **RR** (기본값 유지)
- INSERT 동시성이 중요하고 Phantom Read를 앱에서 감수 가능 → **RC**
- 대부분의 경우 InnoDB 기본값 RR로 충분

## 관련 문서
- [[Transactions|트랜잭션]]
- [[Lock|DB Lock]]
- [[Index]]
