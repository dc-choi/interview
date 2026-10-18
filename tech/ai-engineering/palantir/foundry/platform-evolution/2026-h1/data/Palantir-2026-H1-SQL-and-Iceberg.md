---
tags: [palantir, foundry, release-history, "2026"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2026 상반기 SQL engine, worksheet와 Iceberg transaction

2026년 2~6월 공식 출시 기록을 10월 16일 스냅샷에서 대조했다. 아래 지원/제약은 발표 당시 범위이며 현재 정본, 설치 버전과 enrollment 설정을 별도로 확인한다.

## Query와 저장소의 실행 단위

2월 Furnace는 legacy Spark/Direct Read를 대체하는 기본 SQL warehousing engine으로 소개됐다. parsing과 실행을 분리하고 Spark/Trino를 workload별 선택하며 transforms compute rate를 사용했다. in-platform/ODBC/JDBC/Arrow Flight SQL의 공통 dialect와 실제 query 지원을 확인한다. Execute SQL Query API GA는 tabular dataset/table을 path/RID로 참조한다.

5월 SQL Studio beta, 6월 15일 주 GA는 common Spark SQL dialect의 data/object mode를 제공했다. Furnace는 tabular read/write, Ontology SQL은 object storage와 M2M link를 읽고 지원 형태는 in-memory, 복잡한 형태는 Spark로 보낸다.

- 결과 preview는 기본 1,000행, 권한이 있으면 최대 10,000행이다. 화면 preview를 전체 결과 건수로 읽지 않는다.
- dataset CREATE TABLE, Iceberg CREATE/INSERT/UPDATE/DELETE와 SHOW FUNCTIONS를 구분한다. Ontology object write는 이 공지의 SQL write 지원 범위와 다르다.
- worksheet는 private/Project 저장, save version과 restore, unsaved auto-staging, 여러 tab을 제공한다. Open in SQL Studio는 새 tab을 추가한다.
- Ontology SQL Function은 beta opt-in이며 Workshop/Action/Automate/OSDK에서 재사용한다. 초기 beta 공지는 같은 기능을 experimental이라고도 적었다.
- **5월 27일 SQL Studio branch selector 제공 기록과 6월 GA 장문의 Global Branching 향후 계획이 상충**한다. 지원 여부를 실제 resource와 app version에 맞춰 확인한다. worksheet Marketplace/Git production workflow/stored procedure도 당시 roadmap 항목이었다.

## Iceberg의 데이터 일관성

3월 Foundry Iceberg multi-output job은 모든 table write를 하나의 all-or-nothing transaction으로 commit/discard해 중간 실패의 일부 output을 남기지 않게 했다. 이 범위를 외부 client의 임의 여러 요청까지 일반화하지 않는다.

3월 BYOB storage는 GCS를 S3/ADLS에 추가했고 4월 branch는 schema/partition/sort를 독립 추적했다. virtual/managed Iceberg와 Databricks/Snowflake/BigQuery virtual table에 PK unique/non-null, schema/column, last updated와 build/job health check가 확대됐다. 저장 format, 외부 source, compute routing와 monitor scope를 각각 확인한다.

## 출처

- [2026 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes)
- [June 16, 2026, SQL Studio, Foundry's dedicated SQL application, is now generally available — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#2d9b3cba-b146-41eb-9376-ffbff774f81a)
- [May 7, 2026, Introducing SQL Studio, Foundry's dedicated SQL application — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#1206b2ed-96c7-426e-853e-33dce4a3bebb)
- [March 19, 2026, Health checks are now available for virtual and Iceberg tables — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#ebe958ea-9382-4edc-b489-70f07178c3dd)
- [June 10, 2026, Support for multiple editor tabs — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#5f415bea-9a93-4518-9701-b5544b59a31b)

## 관련 문서

- [[Palantir-2026-H1-Platform-Evolution]]
- [[Palantir-Iceberg]]
