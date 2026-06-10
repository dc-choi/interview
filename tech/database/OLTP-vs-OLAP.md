---
tags: [database, oltp, olap, architecture, data-warehouse]
status: done
category: "데이터&저장소(Data&Storage)"
aliases: ["OLTP vs OLAP", "트랜잭션 처리 vs 분석 처리"]
---

# OLTP vs OLAP

OLTP(Online Transaction Processing)와 OLAP(Online Analytical Processing)는 **워크로드 성격에 따라 DB를 분리하는 분류**. 같은 "DB"라도 설계 철학, 저장 구조, 보장 모델이 다르며, 한쪽으로 다른 쪽 일을 시키면 성능과 정합성 양쪽 모두 무너진다.

## 핵심 비교

| 구분 | OLTP | OLAP |
|---|---|---|
| 대표 제품 | MySQL, PostgreSQL, Oracle | ClickHouse, BigQuery, Snowflake, Redshift |
| 주요 작업 | 단건 조회/INSERT/UPDATE/DELETE, 트랜잭션 | 대량 집계, 통계, 분석 |
| 워크로드 단위 | 한 행 / 한 트랜잭션 | 수억 행 스캔, 집계 |
| 저장 단위 | 행(Row) | 열(Column) |
| 보장 모델 | ACID — 정합성 절대 | 빠른 읽기, 압축, 처리량 |
| 동시성 | 수천~수만 트랜잭션 | 수십 분석 쿼리 (대신 한 쿼리가 무거움) |
| 데이터 신선도 | 즉시 반영 | 분~시간 지연 허용 |
| 설계 철학 | "1건도 틀리면 안 된다" | "1억 건을 빠르게 본다" |

## 워크로드가 다른 이유

### OLTP의 전제
- 사용자 요청 하나가 곧 한 트랜잭션 (주문, 결제, 로그인)
- 응답 지연이 사용자에게 직접 보임 → 100ms 단위 최적화
- 데이터 한 건의 정합성이 비즈니스 결과를 결정 → ACID 절대
- 동시 트랜잭션 수천 개 → Lock, Isolation Level이 핵심 관심사

### OLAP의 전제
- 분석가/대시보드가 시점, 기간을 잘라 집계
- 응답 지연은 초~분 단위까지 허용 (사용자가 즉시 결과를 기다리지 않음)
- 한 쿼리가 수억~수조 행을 스캔 → 처리량, 압축, 병렬이 핵심
- 트랜잭션 정합성보다 **분석 결과의 일관성**이 중요 (시점 기준)

## 저장 구조가 갈라지는 지점

OLTP는 한 행에 모든 칼럼이 모여 있어야 단건 조회, 트랜잭션이 빠르다. OLAP는 같은 칼럼이 모여 있어야 집계, 압축, SIMD가 가능하다. 두 요구는 물리적으로 양립 불가 — 그래서 두 DB를 동시에 만족시키는 단일 엔진은 일반적으로 존재하지 않는다(HTAP 시도는 있으나 대부분 한쪽에 무게가 쏠림).

## 함께 쓰는 표준 구조

운영 DB(OLTP)와 분석 DB(OLAP)를 **분리**하고 데이터 파이프라인으로 연결.

```
[OLTP: MySQL/PostgreSQL]
        │
        ├─ 트랜잭션 처리 (주문, 결제, 로그인)
        │
        └─ CDC (Debezium) ─→ Kafka ─→ [OLAP: ClickHouse/BigQuery]
                                              │
                                              └─ 집계, 대시보드, KPI
```

- 운영 트래픽이 분석 쿼리에 간섭받지 않음 (DB 레벨 격리)
- 분석 DB에서는 [[SCD-Type2|SCD Type 2]] 같은 이력 모델로 시점 일관성 확보
- 운영 DB는 가벼운 스키마를 유지, 분석 DB는 정렬 키, Materialized View로 별도 최적화

## 부적합 시그널

### OLTP DB로 분석을 돌리고 있는 신호
- 대시보드 쿼리가 분 단위로 느려짐, 타임아웃 발생
- 인덱스를 늘려도 한계 (행 풀스캔이라 인덱스로 해결 안 됨)
- 분석 쿼리 하나가 다른 트랜잭션을 막음 (CPU/락 경합)
- 대용량 적재 중 운영 트래픽 영향

### OLAP DB로 OLTP를 흉내내는 신호
- 단건 조회가 오히려 느림 (행 재조합 비용)
- 단건 INSERT 반복으로 파트 폭증 / 머지 폭주
- UPDATE/DELETE가 빈번해서 분석 결과가 신뢰 불가
- 트랜잭션, 외래키 제약이 필요한데 흉내내려 함

이런 시그널이 나오면 **DB를 바꾸지 말고 추가**해야 한다.

## 면접 체크포인트

- OLTP와 OLAP의 워크로드 차이와 설계 철학 차이
- 저장 구조(행 vs 열)가 워크로드 차이에서 자연스럽게 도출되는 이유
- 한 DB로 둘 다 처리하려고 할 때 발생하는 구체적 문제
- OLTP + OLAP를 분리하고 연결하는 표준 구조(CDC → Kafka → OLAP)
- 분석용 시점 일관성을 위한 SCD Type 2의 역할
- ACID 보장이 OLAP에서 풀리는 이유 (속도-정확성 트레이드오프)

## 출처
- [NHN Cloud Meetup — MySQL 3분 vs ClickHouse 0.3초, 같은 쿼리입니다](https://meetup.nhncloud.com/posts/414)

## 관련 문서
- [[ClickHouse|ClickHouse]]
- [[CDC-Debezium|CDC, Debezium]]
- [[SCD-Type2|SCD Type 2]]
- [[RDBMS|RDBMS (OLTP)]]
- [[MQ-Kafka|Kafka]]
