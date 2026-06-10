---
tags: [database, olap, columnar, clickhouse, analytics, mergetree]
status: done
category: "데이터&저장소(Data&Storage)"
aliases: ["ClickHouse", "OLAP", "컬럼형 DB", "Column-oriented DB"]
---

# ClickHouse

ClickHouse는 **대량 데이터의 빠른 분석 조회**를 목적으로 설계된 컬럼 지향 OLAP DBMS. MySQL/PostgreSQL 같은 OLTP RDBMS와 경쟁 관계가 아니라 **역할이 다른 DB**로, 운영 DB와 함께 분석 워크로드를 분리 수용하는 구조에서 쓰인다.

## 행 vs 열 저장 — 왜 빠른가

| 항목 | 행 지향(MySQL/PostgreSQL) | 열 지향(ClickHouse) |
|---|---|---|
| 저장 단위 | 한 행의 모든 칼럼이 한 블록에 | 같은 칼럼 값이 연속 저장 |
| 일부 칼럼 SELECT | **전체 행 블록을 메모리에 적재** → 불필요한 I/O | **필요한 칼럼만 순차 읽음** |
| 압축 | 행 단위라 타입 혼재 → 압축률 낮음 | 같은 타입 연속 → LZ4, ZSTD로 **50~80% 압축** |
| 인덱스 의존도 | 매우 높음 (없으면 풀스캔) | 낮음 (정렬 키로 범위만 좁히면 됨) |
| 단건 조회 | 빠름 (PK 한 번 찾으면 행 통째) | **느림** (칼럼이 흩어져 있어 재조합 필요) |

집계 쿼리(`SUM`/`COUNT`/`AVG`)는 보통 1~3개 칼럼만 필요한데, 행 지향은 모든 칼럼을 I/O로 끌어와야 한다. 데이터가 수천만~수억 건이 되면 그 비효율이 분 단위 지연으로 누적된다.

## MergeTree 엔진

ClickHouse 테이블 엔진의 기본, 표준 패밀리. 데이터를 **파트(part)** 단위로 디스크에 쓰고, 백그라운드에서 파트를 머지하면서 정렬, 중복 제거, 압축을 최적화한다.

```
CREATE TABLE events (
    id          UInt64,
    user_id     UInt64,
    service_id  UInt32,
    event_type  LowCardinality(String),
    amount      Decimal(15,2),
    status      LowCardinality(String),
    created_at  DateTime
)
ENGINE = MergeTree()
ORDER BY (created_at, service_id, event_type);
```

### ORDER BY = 정렬 키 (PK 역할)
- ClickHouse의 PK는 **고유성 보장이 아니라 데이터 탐색 범위를 줄이기 위한 정렬 키**
- 쿼리의 WHERE 조건과 정렬 키가 맞을수록 파트 스킵으로 I/O 최소화
- 정렬 키 선정이 잘못되면 컬럼 지향의 장점이 사라짐

### MergeTree 변종
| 엔진 | 용도 |
|---|---|
| **MergeTree** | 일반 적재 |
| **ReplacingMergeTree** | 같은 키 INSERT 시 백그라운드 머지로 **중복 제거** → UPDATE 흉내 |
| **SummingMergeTree** | 같은 키의 숫자 칼럼을 자동 합산 |
| **AggregatingMergeTree** | 집계 상태(state)를 미리 저장. Materialized View와 짝 |
| **CollapsingMergeTree** | sign 칼럼으로 행 무효화 (이력 정리) |
| **ReplicatedMergeTree** | ZooKeeper/Keeper 기반 복제 |

### LowCardinality
값의 종류가 적은 문자열 칼럼(`status`, `event_type` 등)에 사용. 내부적으로 사전(dictionary)으로 인코딩해 **압축률, 필터 속도 동시 개선**. 카디널리티가 수만 이하일 때 효과적.

## 적합 / 부적합 케이스

### 적합
- 일별/월별 집계, KPI 대시보드
- 이벤트 로그, 결제 이력, 접속 기록처럼 **append-only로 쌓이는 시계열**
- 특정 칼럼만 골라 분석(`SELECT SUM(amount) WHERE date BETWEEN ...`)
- 다중 GROUP BY 집계 (서비스 × 날짜 × 타입)

### 부적합
- **단건 조회**(`SELECT * WHERE id = 12345`) — 행을 재조합하느라 오히려 느림. PK로 한 번에 찾는 OLTP가 적합
- **단건 INSERT** — 매 INSERT마다 새 파트 생성 → 머지 부담 폭증. 반드시 배치
- **트랜잭션** — 미지원. 결제, 주문처럼 ACID가 필요한 워크로드는 절대 부적합
- **빈번한 UPDATE/DELETE** — `ALTER TABLE ... DELETE` Mutation은 파트를 통째 재작성. 비용 큼. UPDATE는 ReplacingMergeTree로 대체하지만 즉시 반영 아님(머지 시점)

## 성능 차이의 구조적 원인

1. **컬럼 I/O 최소화** — 필요한 칼럼만 디스크에서 읽음
2. **LZ4/ZSTD 압축** — 디스크에서 읽는 바이트 자체가 적음 (테스트 기준 약 54% 절감)
3. **벡터화 실행 엔진** — SIMD로 한 번에 수천 값 연산
4. **파티션 + 정렬 키 프루닝** — WHERE 조건 밖 파트는 아예 스캔 안 함
5. **병렬 처리** — 파트별, 코어별 병렬 스캔, 쿼리 간 간섭 적음
6. **배치 INSERT 최적화** — 메모리에 모았다가 열 단위 압축으로 한 번에 디스크

5천만 건 이벤트 로그 테스트 기준:
- 월별 SUM: MySQL 49초 → ClickHouse 0.2초 (≈245배)
- 3중 GROUP BY: MySQL 208초 → ClickHouse 0.3초 (≈693배)
- 동시 요청 10개: MySQL 48초 → ClickHouse 0.9초
- 5천만 건 INSERT: MySQL 14분 → ClickHouse 49초 (≈17배)
- 저장 용량: MySQL 5.6GB → ClickHouse 2.6GB (≈54% 절감)

## Materialized View

일반 VIEW는 조회 시점에 원본을 다시 읽지만, **Materialized View(MV)는 INSERT 시점에 집계를 미리 계산해 별도 테이블에 저장**한다. 대시보드처럼 동일 집계를 반복 조회하는 패턴에서 추가 4~10배 개선이 흔하다.

- INSERT 트리거로 동작 — 원본 테이블에 INSERT되면 MV에도 자동 반영
- `AggregatingMergeTree` + `*State` 집계 함수와 짝지어 사용하면 부분 집계 누적 가능
- 단점: 원본 데이터 수정 시 MV는 자동 갱신되지 않음 → 재구성 필요

## 운영 패턴 — 적재 파이프라인

운영 DB(OLTP)에서 ClickHouse로 데이터를 흘려보내는 표준 흐름:

```
[MySQL/PostgreSQL] --CDC--> [Kafka] --> [Consumer] --> [ClickHouse]
                                                            ↓
                                                  [Materialized View] → [대시보드 API]
```

- 변경 데이터 캡처는 [[CDC-Debezium|Debezium]] 등으로
- ClickHouse 적재는 `INSERT` 배치를 수백~수천 건씩 묶어서 — `kafka` 테이블 엔진 또는 외부 컨슈머
- KPI 분석용 시계열 이력은 [[SCD-Type2|SCD Type 2]] 모델로

## MySQL 호환성

쿼리 문법 호환성이 매우 높다.
- `DATE_FORMAT`, `IF`, `CASE WHEN`, `LIKE`/`IN`/`BETWEEN`, `HAVING` 모두 동일
- MySQL Wire Protocol 지원 → MySQL Client로 접속 가능
- 익숙한 SQL 그대로 들고 와도 진입 장벽 낮음. 단, 위에서 본 적합/부적합 차이를 이해하지 못하면 "느린 MySQL"이 됨

## 흔한 실수

- **MySQL처럼 단건 INSERT 반복** → 파트 폭증으로 머지 폭주, 디스크 I/O 포화
- **정렬 키를 아무렇게나** → 컬럼 지향의 장점이 사라짐. WHERE 패턴 분석 선행 필수
- **UPDATE를 자주** → ReplacingMergeTree로 흉내는 가능하나 즉시 반영 아님. 분석 결과 신뢰성 깨짐
- **트랜잭션 기대** → 미지원. 데이터 정합성은 적재 파이프라인 단에서 보장해야
- **운영 DB를 ClickHouse로 대체** → 단건 조회와 트랜잭션이 무너지므로 절대 금지. 항상 분리 운용

## 면접 체크포인트

- ClickHouse가 빠른 구조적 이유 3~4가지 (컬럼 I/O, 압축, 정렬 키 프루닝, 벡터화, 병렬)
- ClickHouse의 PRIMARY KEY가 MySQL과 다른 점 (고유성 X, 탐색 범위 축소)
- MergeTree 변종 중 ReplacingMergeTree, AggregatingMergeTree의 쓰임
- UPDATE/DELETE가 비싼 이유와 대체 패턴
- OLTP DB와 ClickHouse를 함께 쓰는 표준 구조 (CDC → Kafka → ClickHouse)
- Materialized View로 추가 성능을 끌어내는 원리
- "단건 조회는 ClickHouse가 오히려 느릴 수 있는 이유"

## 사용 사례
- **카카오페이 증권** — 로그 플랫폼 OpenSearch → ClickHouse, 일 41TB, 200억 건, 비용 85% 절감
- **토스** — 인기 랭킹 시간당 1억 건 로그, 실시간 1초 미만 응답
- **SK텔레콤** — 2억 건 고객 행동 데이터, 응답 10초 이내
- **Netflix** — 일 5PB, 초당 1,060만 이벤트, 20초 이내 검색
- **LINE Yahoo Japan** — Kafka 인프라 모니터링, 초당 700만 행
- **NHN Cloud** — Notification Hub 카카오 통계 PoC, Cab-Verify 토큰 인증 이력(현 1억→예상 10억+), Resource Watcher MySQL 슬로 쿼리 해소

## 출처
- [NHN Cloud Meetup — MySQL 3분 vs ClickHouse 0.3초, 같은 쿼리입니다](https://meetup.nhncloud.com/posts/414)
- [ClickHouse 공식 문서 — Intro](https://clickhouse.com/docs/intro)

## 관련 문서
- [[OLTP-vs-OLAP|OLTP vs OLAP]]
- [[CDC-Debezium|CDC, Debezium]]
- [[SCD-Type2|SCD Type 2 (이력 차원 관리)]]
- [[MQ-Kafka|Kafka]]
- [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL]]
