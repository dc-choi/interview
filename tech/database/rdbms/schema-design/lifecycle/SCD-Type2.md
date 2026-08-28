---
tags: [database, data-modeling, data-warehouse, history, slowly-changing-dimension]
status: done
verified_at: 2026-08-28
category: "Data & Storage - RDB"
aliases: ["SCD Type 2", "Slowly Changing Dimension Type 2", "차원 데이터 이력 관리"]
---

# SCD Type 2 (Slowly Changing Dimension Type 2)

SCD(Slowly Changing Dimension)는 **시간이 지남에 따라 천천히 변하는 차원 데이터**를 어떻게 관리할 것인가에 대한 데이터 모델링 패턴. Type 2는 그중 **변경 이력을 모두 새 행으로 적재**해 과거 시점 상태까지 보존하는 방식. KPI 분석, 감사, 법적 추적, 머신러닝 학습용 시계열 데이터의 표준 모델.

## SCD 6가지 유형 빠른 비교

| 타입 | 설명 | 과거 보존 |
|---|---|---|
| **Type 0** | 변경 무시(원본 유지) | 불가 |
| **Type 1** | 덮어쓰기 (UPDATE) | 불가 |
| **Type 2** | **새 행 추가 + 유효 기간** | **가능 (모든 이력)** |
| **Type 3** | 컬럼 추가 (이전값/현재값) | 일부 (직전 1회) |
| **Type 4** | 별도 History 테이블 분리 | 가능 |
| **Type 6** | 1+2+3 하이브리드 | 가능 + 현재값 빠른 조회 |

대다수 실무 분석 파이프라인에서 **Type 2가 기본**. 단순 마스터 테이블은 Type 1, 핫 데이터와 이력을 분리하고 싶으면 Type 4.

## Type 2의 핵심 컬럼

```
id              | name    | tier     | valid_from           | valid_to             | is_current
----------------+---------+----------+----------------------+----------------------+-----------
1               | 홍길동  | bronze   | 2024-01-01 00:00:00  | 2024-06-01 12:00:00  | false
1               | 홍길동  | silver   | 2024-06-01 12:00:00  | 2024-12-01 09:00:00  | false
1               | 홍길동  | gold     | 2024-12-01 09:00:00  | 9999-12-31 23:59:59  | true
```

- **`valid_from`** — 이 행이 유효해진 시점 (필수)
- **`valid_to`** — 유효성이 끝난 시점 (다음 행의 `valid_from`과 일치). 현재 유효한 행은 `NULL` 또는 `9999-12-31`로 채움
- **`is_current`** — 빠른 현재값 조회용 플래그 (조회 패턴에 따라 선택)
- **자연키 + `valid_from`**이 복합 키. 자연키만으로는 유일하지 않음

## 적재 패턴

새 변경이 들어오면 두 단계로 처리:

1. **기존 현재 행을 종료** — `valid_to = :effective_at`, `is_current = false`로 UPDATE
2. **새 행 INSERT** — `valid_from = :effective_at`, `valid_to = NULL`, `is_current = true`

```sql
BEGIN;

UPDATE customer_scd
SET valid_to = :effective_at, is_current = false
WHERE customer_id = 1 AND is_current = true;

INSERT INTO customer_scd (customer_id, name, tier, valid_from, valid_to, is_current)
VALUES (1, '홍길동', 'gold', :effective_at, NULL, true);

COMMIT;
```

적재 작업에서 `effective_at`을 한 번만 계산해 두 쿼리에 같은 값으로 바인딩하고, 두 쿼리는 **반드시 같은 트랜잭션** 안에서 실행한다. 이렇게 해야 두 statement의 시각 함수 평가 차이로 구간이 벌어지지 않는다. 다만 같은 자연키를 동시에 적재하는 writer까지 트랜잭션만으로 직렬화되지는 않는다.

## 동시 적재 제약

같은 자연키의 변경은 순서가 정해져야 한다. 다음 중 하나로 writer를 직렬화하고, 기존 현재 행을 종료하는 경우 `UPDATE`의 영향 행 수가 정확히 1인지 확인한다.

- 안정적으로 존재하는 부모 또는 자연키 행을 `SELECT ... FOR UPDATE`로 잠그고 같은 트랜잭션에서 종료와 INSERT를 수행
- 자연키별 단일 consumer로 이벤트를 순서대로 처리
- 더 강한 격리 수준을 선택했다면 serialization failure를 재시도

동시에 현재 행이 둘 생기는 것을 저장소 차원에서도 막는다. `is_current`는 `NOT NULL`로 두고, PostgreSQL은 partial unique index를 쓸 수 있다.

```sql
CREATE UNIQUE INDEX customer_scd_one_current
ON customer_scd (customer_id)
WHERE is_current;
```

다른 DBMS에서는 동일한 불변식을 표현하는 제약 또는 generated column 기반 unique index를 설계한다.

## 조회 패턴

### 현재 시점

```sql
SELECT * FROM customer_scd WHERE customer_id = 1 AND is_current = true;
```

### 특정 시점(as-of)

```sql
SELECT * FROM customer_scd
WHERE customer_id = 1
  AND valid_from <= '2024-08-15'
  AND (valid_to IS NULL OR valid_to > '2024-08-15');
```

분석 쿼리에서 자주 쓰이는 패턴: "주문이 발생한 그 시점의 고객 등급으로 매출을 집계".

### 기간별 상태 변화

```sql
SELECT tier, valid_from, valid_to
FROM customer_scd
WHERE customer_id = 1
ORDER BY valid_from;
```

## 왜 Type 2가 KPI 분석에 핵심인가

운영 DB는 보통 **현재 상태만** 저장(Type 1). 등급이 bronze → gold로 바뀌면 row가 그대로 UPDATE된다. 이 상태로 매출 분석을 하면:

- "지난달 gold 고객의 매출"을 뽑을 때, **지난달엔 silver였던 사용자가 오늘 gold라고 포함되어 버린다** → 분석 왜곡
- 등급 변화 자체를 KPI로 잡을 수 없음 (얼마나 자주 승격되는가, 등급 체류 기간)
- A/B 테스트의 "테스트 노출 시점 사용자 속성" 복원 불가

Type 2로 적재해두면 **"이벤트 발생 시점 = 그 시점 유효한 행"**으로 join해 모든 분석이 시점 일관성을 갖는다.

## 인덱스 전략

- `(natural_key, is_current)` — 현재 행 조회 최적화
- `(natural_key, valid_from)` — 시점 기반 join 최적화
- `valid_from`/`valid_to` 범위 조건이 많으면 **시간 컬럼을 파티션 키**로 (PostgreSQL declarative partitioning)
- 자연키 동등 조회에는 보통 B-tree를 사용한다. BRIN은 대형 append-oriented 테이블에서 `valid_from`처럼 heap 물리 위치와 자연스럽게 상관된 컬럼의 범위 조건에 검토한다. 높은 카디널리티만으로는 선택 기준이 아니다.

## 트레이드오프

### 장점
- 모든 변경 이력 보존 → 감사, 법적 요구사항 충족
- 시점 분석(as-of)이 자연스러움
- 운영 DB의 현재 상태와 무관하게 분석 시계열 일관성 유지

### 단점
- **저장 공간 증가** — 변경이 잦으면 row가 빠르게 늘어남. 1년에 평균 3회 변경되는 사용자 1000만 명 → 3000만 행/년
- **쿼리 복잡도** — "현재" 조건을 매번 붙여야 함. View로 감싸는 게 일반적
- **유니크 제약 깨짐** — 자연키만으로 UNIQUE 불가. 복합키로 재설계
- **JOIN 비용** — 다른 팩트 테이블과 시점 조건으로 join하면 비용 큼 → 자주 쓰는 시점은 비정규화 검토

## CDC 파이프라인과의 결합

운영 DB는 Type 1로 두고, CDC([[CDC-Debezium]])로 변경 이벤트를 캡처해 분석 DB에 Type 2로 적재하는 패턴이 표준.

```
[OLTP MySQL (Type 1)] --binlog--> [Debezium] --> [Kafka] --> [Batch Server] --> [Analytics DB (Type 2)]
```

- OLTP는 단순한 현재 상태만 유지 → 운영 성능 영향 최소
- 분석 DB(PostgreSQL, BigQuery, Snowflake)는 Type 2로 풍부한 시계열 분석 지원
- Debezium의 `before`와 `after`는 nullable이므로 `op`별로 처리한다. `r`(snapshot read)과 `c`(create)는 `after`로 신규 row를 열고, `u`(update)는 `before`의 현재 row를 닫은 뒤 `after`로 신규 row를 열며, `d`(delete)는 `before`의 현재 row만 닫는다

이벤트 페이로드 예시(Debezium):
```json
{
  "op": "u",
  "before": { "customer_id": 1, "tier": "silver" },
  "after":  { "customer_id": 1, "tier": "gold" },
  "source": { "ts_ms": 1700000000000 }
}
```

MySQL 커넥터의 `source.ts_ms`는 소스 DB에서 변경이 만들어진 시각이다. 다만 업무 유효 시점이나 고유한 순서 키는 아니다. 동일 timestamp의 순서는 transaction/binlog 메타데이터로 풀고, snapshot 이벤트로 과거의 업무 유효 시점이 복원된다고 간주하지 않는다. 도메인이 유효 시점을 제공하면 그 값을 우선하고, 소스 변경 시각을 선택했다면 같은 `effective_at`으로 기존 구간과 신규 구간을 연다.

## 면접 체크포인트

- SCD Type 1과 Type 2의 차이, Type 2를 선택하는 상황
- Type 2의 두 SQL을 같은 transaction으로 묶어 부분 적용에 따른 current row 0개 상태를 막고, 자연키별 직렬화와 unique invariant로 current row 2개 상태를 막는 이유
- `valid_to`를 `NULL` vs `9999-12-31`로 두는 트레이드오프 (인덱스, 범위 쿼리 단순성)
- 운영 DB와 분석 DB의 역할 분리 — 왜 운영 DB를 직접 Type 2로 만들지 않는가
- CDC + Type 2가 "이벤트 시점 사용자 속성" 분석을 가능하게 하는 이유
- 변경이 잦은 컬럼은 별도 차원으로 분리해야 하는 이유(미니 차원 패턴)

## 출처
- [Jochong — KPI를 위한 데이터 준비하기: Kafka + Debezium CDC 파이프라인 도입](https://jochong.tistory.com/26)
- [Debezium, Debezium connector for MySQL](https://debezium.io/documentation/reference/stable/connectors/mysql.html)
- [PostgreSQL 18 Documentation, BRIN Indexes](https://www.postgresql.org/docs/current/brin.html)
- [PostgreSQL 18 Documentation, Partial Indexes](https://www.postgresql.org/docs/current/indexes-partial.html)

## 관련 문서
- [[CDC-Debezium|CDC, Debezium]]
- [[MQ-Kafka|Kafka]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[Schema-Design|Schema Design]]
- [[Schema-Migration-Large-Table|Schema Migration]]
