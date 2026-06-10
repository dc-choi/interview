---
tags: [infrastructure, aws, glue, etl, serverless, data]
status: done
category: "Infrastructure - AWS"
aliases: ["Glue", "AWS Glue", "Glue Data Catalog"]
---

# AWS Glue

추출·변환·로드(**ETL**) 서비스 관리. 분석을 위해 데이터를 준비·변환하는 데 유용한 **완전 서버리스** ETL.

## 핵심

- 서버리스 (인프라 관리 없음) — 사용한 만큼 과금
- Spark 기반이지만 인프라가 추상화됨
- 예: S3 버킷·Amazon RDS → (Extract) → **Glue ETL** → (Load) → Redshift Data Warehouse

## Glue Data Catalog

- 메타데이터 중앙 저장소 — 테이블·열·데이터 형식
- **Glue Crawler** 실행: S3·RDS·DynamoDB·JDBC 연결 데이터 소스를 스캔하여 스키마 자동 카탈로그
- **Athena·Redshift Spectrum·EMR**가 데이터·스키마 검색 시 백그라운드에서 활용

## 부가 기능

- **Glue Job Bookmarks**: 새 ETL 작업 실행 시 이전 데이터 재처리 방지 (incremental)
- **Glue Elastic Views**: SQL로 여러 데이터 스토어를 결합/복제 → 가상 테이블 ("뷰")
- **Glue DataBrew**: 사전 빌드된 변환으로 GUI 기반 데이터 정리·정규화
- **Glue Studio**: ETL 작업 생성·실행·모니터링 GUI

## 시험 빈출 포인트

- "**서버리스 ETL**" → Glue
- "S3에 있는 데이터에 스키마 자동 발견" → Glue Crawler + Data Catalog
- "Athena 쿼리할 때 테이블 메타 어디?" → Glue Data Catalog
- "ETL 작업 재처리 방지" → Glue Job Bookmarks
- "GUI로 데이터 정리·정규화" → Glue DataBrew

## 관련 문서

- [[Athena]] · [[Redshift]] · [[EMR]]

## 출처

- AWS SAA C03 Udemy 강의 요약본 (Stephane Maarek, 로컬)
