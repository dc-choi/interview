---
tags: [infrastructure, aws, analytics, etl, data-warehouse, bi]
status: index
category: "Infrastructure - AWS"
aliases: ["AWS Analytics Services", "AWS 분석 서비스"]
---

# AWS 분석 서비스

S3 데이터레이크에서 ETL, 쿼리, 데이터 웨어하우스, BI로 이어지는 AWS 분석 서비스 모음. 검색과 로그 분석은 [[OpenSearch-Service]], 상위 개관은 [[data|AWS 데이터 인덱스]] 참조.

- [[Redshift|Redshift]]: 컬럼 기반 데이터 웨어하우스, OLAP — MPP와 노드 타입, 분산 키와 정렬 키, Spectrum, Concurrency Scaling
- [[Athena|Athena]]: S3 데이터에 대한 서버리스 SQL — Presto/Trino 엔진, Glue Data Catalog 연계, Workgroup, 요금 절감
- [[Glue|Glue]]: 서버리스 ETL, Data Catalog, Crawler
- [[EMR|EMR]]: Hadoop, Spark 클러스터 — Master/Core/Task 노드, Spot 인스턴스 비용 절감
- [[Lake-Formation|Lake Formation]]: 데이터레이크 구축과 권한 관리 — Glue 기반, 분석 도구 통합
- [[QuickSight|QuickSight]]: 서버리스 BI 대시보드 — SPICE 인메모리 엔진, 데이터 소스 통합

## 함께 볼 문서

- [[data|AWS 데이터 인덱스]]
