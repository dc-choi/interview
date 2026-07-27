---
tags: [database, mysql, performance-schema, digest, performance-insights, prepared-statement]
status: done
category: "Database - RDBMS"
aliases: ["MySQL Digest Statistics", "max_digest_length", "performance_schema_digests_size", "events_statements_summary_by_digest", "Digest 통계 함정"]
---

# MySQL Digest 통계 운영 (PI 통계의 신뢰도 함정)

Performance Insights와 `events_statements_summary_by_digest`는 **정규화된 쿼리(digest)** 단위로 통계를 집계한다. digest는 리터럴을 추상화한 쿼리 형태(`WHERE id = ?`)로, 같은 모양의 쿼리를 한 줄로 묶어 통계를 낸다. 그런데 digest를 **만드는 방식과 저장하는 한계** 때문에 통계가 잘못 묶이거나 아예 유실될 수 있다 — 통계가 어긋나면 [[DB-Incident-Triage|시점 비교 분석]] 자체가 무너진다.

## max_digest_length — 긴 쿼리가 한 덩어리로 오묶임

MySQL은 **전체 SQL이 아니라 `max_digest_length` 바이트만큼 앞부분만 잘라** 정규화해 digest를 만든다. 기본값은 **1024바이트**.

- 앞 1024바이트가 같고 **뒤 조건만 다른** 긴 쿼리들은 서로 다른 쿼리인데도 **하나의 digest로 합쳐진다**.
- 결과적으로 통계가 뭉뚱그려져 어떤 쿼리가 진짜 문제인지 구분이 안 된다.
- **대응**: 관련 파라미터를 늘린다(예: **4096**). 메모리 사용량은 늘지만 실제 영향은 작다고 보고 적용 가능.

> `max_digest_length`(서버)와 `performance_schema_max_digest_length`(performance_schema)는 함께 맞춰야 한다.

## performance_schema_digests_size — 테이블이 차면 신규 통계 유실

digest 통계는 `events_statements_summary_by_digest` 테이블에 저장되고, 저장 가능한 digest 개수는 `performance_schema_digests_size`로 정해진다. 기본값 **10,000개**.

- 이 공간이 꽉 차면 **신규 쿼리의 통계가 더 이상 저장되지 않는다** → Performance Insights에서도 안 보인다. (초과분은 `NULL` digest 한 줄로 합산되어 버려짐)
- **대응 두 가지(병행 권장)**:
  1. `performance_schema_digests_size`를 늘린다.
  2. 일정 수준 이상 차면 주기적으로 `TRUNCATE performance_schema.events_statements_summary_by_digest`로 비운다(통계 리셋).

## Prepared Statement — PI 통계를 흐리게 한다

MySQL에서 Prepared Statement를 쓰면 Performance Insights에서 **쿼리 통계가 제대로 안 잡힐 수 있다**.

- MySQL은 Prepared Statement를 **커넥션 단위로 관리** → 여러 세션이 많이 만들면 **서버 메모리를 불필요하게 소모**.
- Prepared Statement는 **같은 쿼리를 여러 번 재사용**할 때 이득이다. 매 쿼리마다 prepare → execute → close를 반복하면 오히려 비효율.
- **가이드**: 재사용 없이 1회성으로 prepare/close를 반복하는 패턴이 보이면 Prepared Statement 사용을 줄인다. (드라이버의 동적 쿼리가 만드는 캐시 폭발은 [[Prepared-Statement-Cache|Prepared Statement 캐시 폭발]] 참고)

## PostgreSQL은 이 함정에서 비교적 자유롭다

| 항목 | MySQL | PostgreSQL |
|------|-------|------------|
| digest 식별 | SQL 텍스트 앞부분(`max_digest_length`) 절단 | **쿼리 파싱 결과(queryid) 기반** |
| 긴 쿼리 오묶임 | 발생 가능 | 적음 |
| 통계 테이블 포화 | 꽉 차면 신규 유실 → 수동 truncate 필요 | `pg_stat_statements`가 **덜 쓰인 쿼리를 밀어내고**(LRU 유사) 신규 저장 |

따라서 MySQL에서 필요한 digest 길이 조정이나 테이블 truncate 전략을 PostgreSQL에 그대로 옮길 필요는 없다.

## 면접 체크포인트

- digest(정규화 쿼리)가 통계 집계의 단위인 이유와 `max_digest_length` 절단의 부작용(긴 쿼리 오묶임)
- `performance_schema_digests_size` 포화 시 신규 쿼리 통계가 사라지는 메커니즘과 대응(증설 + truncate)
- Prepared Statement가 PI 통계를 흐리고 메모리를 쓰는 이유, 재사용 없는 prepare/close 반복의 비효율
- MySQL(텍스트 절단) vs PostgreSQL(파싱 기반 + LRU 제거) digest 처리 차이
- 통계가 왜곡/유실되면 시점 비교 분석이 무너진다는 연결

## 출처
- [KDMS 데이터베이스 인사이트 — DB 이슈 분석 도구와 운영 (YouTube)](https://www.youtube.com/watch?v=NrPY9J1a2ag&list=PLaHcMRg2hoBoFR-9MlfJP56xrcIxBInCm&index=5)

## 관련 문서
- [[MySQL-Slow-Query-Diagnosis|MySQL Slow Query 진단]] — events_statements_summary_by_digest 활용
- [[DB-Incident-Triage|DB 장애 분석 방법론]] — digest 통계 기반 시점 비교
- [[Prepared-Statement-Cache|Prepared Statement 캐시 폭발]] — 드라이버 동적 쿼리 함정
- [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL]] — 엔진 차이 전반
- [[RDS-Monitoring|RDS 모니터링]] — Performance Insights 운영
