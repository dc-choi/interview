---
tags: [database, mysql, partitioning, partition-pruning]
status: done
category: "Database - RDBMS"
aliases: ["MySQL Partitioning", "Partition Pruning", "RANGE 파티션"]
---

# MySQL Partitioning

큰 테이블을 **물리적으로 분할 저장**해 단일 쿼리가 부분 데이터만 스캔하도록 만드는 기법. 옵티마이저가 WHERE 조건으로 **불필요한 파티션을 가지치기(Partition Pruning)** 해 I/O를 줄인다. 샤딩과 달리 **단일 인스턴스 내 분할** — 분산 처리는 아니다.

## Partitioning vs Sharding

| 축 | Partitioning | Sharding |
|----|-------------|----------|
| 위치 | 단일 DB 인스턴스 | 여러 DB 인스턴스 |
| 분할 단위 | 테이블 내 파티션 | 인스턴스/DB 단위 |
| 트랜잭션 | 일반 트랜잭션 | 분산 트랜잭션, 2PC |
| 운영 | DB 자체 기능 | 애플리케이션, 미들웨어 |
| 목적 | I/O 감소, 관리 단순화 | 수평 확장, 트래픽 분산 |

파티션은 **단일 노드 한계 극복은 못 함** — 행 수, 디스크 용량은 그대로. 진짜 확장은 [[Sharding]].

## 파티션 종류

| 종류 | 분할 기준 | 적합 |
|------|----------|------|
| **RANGE** | 값의 범위 (`< value`) | 시간 기반 (월, 년, 분기) |
| **LIST** | 값의 집합 매칭 | 카테고리, 국가 코드 |
| **HASH** | 해시 함수 결과 | 균등 분산이 목표 |
| **KEY** | MySQL 내부 해시 (PK 자동) | HASH의 대안, 다중 컬럼 |
| **COLUMNS** (RANGE/LIST 변형) | 다중 컬럼 또는 비숫자 컬럼 | 복합 시간, 문자열 |

## RANGE 파티셔닝 — 시간 기반

```sql
CREATE TABLE orders (
  id BIGINT AUTO_INCREMENT,
  user_id INT,
  created_at DATE,
  amount DECIMAL(10,2),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (YEAR(created_at)) (
  PARTITION p2024 VALUES LESS THAN (2025),
  PARTITION p2025 VALUES LESS THAN (2026),
  PARTITION p2026 VALUES LESS THAN (2027),
  PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

- **운영 이점**: 오래된 파티션을 `ALTER TABLE ... DROP PARTITION p2024`로 **즉시 삭제** — `DELETE` 대비 비용 압도적으로 적음.
- **함정**: PK에 파티션 키 컬럼이 포함돼야 함 (위 예의 `(id, created_at)`). 단순 `id` PK는 파티션 불가.
- 시계열 로그, 주문, 이벤트에 표준.

## HASH 파티셔닝 — 균등 분산

```sql
CREATE TABLE user_logs (
  id BIGINT AUTO_INCREMENT,
  user_id INT,
  action VARCHAR(50),
  created_at TIMESTAMP,
  PRIMARY KEY (id, user_id)
) PARTITION BY HASH(user_id) PARTITIONS 8;
```

- 사용자 단위 작업이 균등 분산 — `WHERE user_id = ?` 시 한 파티션만.
- 단점: 시간 범위 쿼리는 **모든 파티션 스캔** → RANGE만큼 효과 없음.

## Partition Pruning

옵티마이저가 WHERE 조건으로 접근 안 할 파티션을 제외. **`EXPLAIN`의 `partitions` 컬럼**에서 확인.

```sql
EXPLAIN
SELECT * FROM orders WHERE created_at >= '2025-06-01' AND created_at < '2025-07-01';
-- partitions: p2025
```

가지치기 안 되는 패턴:
- `WHERE YEAR(created_at) = 2025` — 함수 적용으로 옵티마이저가 매핑 못 함. 항상 **raw 컬럼에 범위 비교**.
- `WHERE created_at = '2025-06-15'` 비교에 함수 사용, 암묵적 변환.
- 파티션 키 미포함 WHERE — 모든 파티션 스캔.

## 운영 작업

| 작업 | SQL | 비고 |
|------|-----|------|
| 파티션 추가 | `ALTER TABLE ... ADD PARTITION (PARTITION p2027 VALUES LESS THAN (2028))` | RANGE는 마지막 위치에만 |
| 파티션 삭제 | `ALTER TABLE ... DROP PARTITION p2024` | 데이터 즉시 회수 |
| 파티션 분할 | `REORGANIZE PARTITION p_future INTO (...)` | MAXVALUE 파티션 분할 |
| 파티션 교환 | `EXCHANGE PARTITION p2024 WITH TABLE archive_2024` | 아카이브 패턴 |
| 파티션 비우기 | `TRUNCATE PARTITION p2024` | DROP보다 메타데이터 유지 |

`EXCHANGE PARTITION`이 강력 — 아카이브용 별도 테이블로 옮기고 원본은 가벼운 상태 유지.

## 한계와 함정

- **PK, UNIQUE 인덱스에 파티션 키 포함 필수** — 모든 unique key가 파티션 키를 포함해야 함. 일반 인덱스는 자유.
- **외래 키 미지원** — InnoDB 파티션 테이블은 FK 못 가짐.
- **TRIGGER 파티션 한계** — 일부 동작 제한.
- **파티션 수 한계** — 8.0 기준 8192 (실제 운영은 100개 이하 권장).
- **JOIN 성능** — 파티션 단위 JOIN 최적화는 제한적, 풀스캔 발생 가능.
- **샤딩의 대체 X** — 단일 인스턴스 내 분할이라 실제 확장은 한계.
- **글로벌 인덱스 없음** — 모든 인덱스는 파티션 로컬. 파티션 키 미포함 검색은 모든 파티션 스캔.

## 도입 판단

| 조건 | 도입 가치 |
|------|----------|
| 시계열성 데이터, 오래된 데이터 주기 삭제 필요 | ✅ RANGE 강력 |
| 1억 row+ 큰 테이블 + 시간 범위 쿼리 | ✅ |
| 사용자별 격리, 균등 분산 | △ HASH 고려, 샤딩이 더 적합할 수 있음 |
| 작은 테이블 (<1000만 row) | ✗ 인덱스 튜닝이 우선 |
| 복잡한 JOIN, 서브쿼리 중심 | ✗ 옵티마이저 한계 — 효과 적음 |

## 면접 체크포인트

- Partitioning vs Sharding 차이 — 단일 인스턴스 vs 분산
- RANGE / HASH / LIST / KEY 선택 기준
- Partition Pruning 동작과 EXPLAIN으로 확인
- `WHERE YEAR(col)` 같은 함수 적용 시 가지치기 깨지는 이유
- `DROP PARTITION` vs `DELETE` — 시계열 데이터 회수 비용 차이
- PK에 파티션 키 포함이 필수인 이유 — 글로벌 인덱스 부재
- 파티셔닝의 한계 — FK 미지원, 단일 인스턴스 한계, 글로벌 인덱스 없음
- 샤딩으로 가야 할 시점 판단

## 관련 문서

- [[Sharding|샤딩]]
- [[Index|Index design]]
- [[Execution-Plan|EXPLAIN, 실행계획]]
- [[Schema-Migration-Large-Table|대용량 테이블 스키마 변경]]
- [[MySQL-Architecture|MySQL 아키텍처]]
