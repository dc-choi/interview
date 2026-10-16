---
tags: [aws, sagemaker, lakehouse, iceberg, redshift, governance]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["SageMaker Lakehouse", "SageMaker 레이크하우스"]
---

# SageMaker Lakehouse의 데이터 접근 경계

SageMaker의 lakehouse architecture는 S3 데이터 레이크와 Redshift 데이터 웨어하우스에 카탈로그와 접근 경로를 제공한다. 기반은 AWS Glue Data Catalog와 Lake Formation이며, 호환되는 분석 엔진에서 Iceberg 인터페이스로 데이터를 다룬다.

## 저장소, 카탈로그와 실행 엔진

| 계층 | 역할 | 확인할 점 |
|---|---|---|
| S3와 Redshift Managed Storage(RMS) | 데이터 저장 | 기존 데이터 등록과 새 저장소 구성을 구분 |
| Glue Data Catalog | 카탈로그, 데이터베이스와 테이블 메타데이터 제공 | 원천과 카탈로그의 계층 대응 |
| Lake Formation | 공유 데이터 접근 권한 관리 | 실제 조회 주체에 적용되는 정책 |
| Athena, Redshift와 Spark 등 | 조회와 데이터 처리 | 엔진별 읽기, 쓰기와 DDL 지원 |

기존 Redshift 데이터를 등록해 조회하거나 새 카탈로그를 만들어 S3/RMS에 데이터를 저장할 수 있다. 업무 메타데이터와 구독 절차는 [[SageMaker-Catalog-Discovery|SageMaker Catalog]]에서 별도로 다룬다.

## Iceberg 인터페이스와 기능 호환성

2026-10-07 공식 제한 문서 기준. 아래는 Redshift 데이터를 Glue Data Catalog에 등록하는 경로의 제약이며 일반 S3 Iceberg 테이블 전체의 제약으로 확대하지 않는다.

- RMS 테이블의 time travel과 Athena를 통한 RMS 테이블 DDL은 지원하지 않는다.
- RMS 테이블은 Glue Iceberg REST Catalog의 extension endpoint로 접근한다. 일반 REST endpoint와 같은 것으로 취급하지 않는다.
- Athena는 한 번에 특정 카탈로그 하나에 연결하며 여러 카탈로그를 가로질러 조회할 수 없다.
- 원천 Redshift의 row-level security와 dynamic data masking 정책은 공유 경로에 그대로 강제되지 않는다. 공유 데이터에는 Lake Formation 권한이 적용된다.

따라서 Iceberg로 접근할 수 있다는 사실만으로 모든 엔진의 기능이나 원천 보안 정책이 그대로 유지된다고 판단하지 않는다.

## 도입 확인 순서

다음은 위 기능과 제약에서 도출한 운영 점검 절차다.

1. 대상 테이블의 저장소, 카탈로그 계층과 조회 엔진을 정한다.
2. 관리자 대신 실제 분석 역할로 허용할 행과 열, 차단할 데이터를 조회한다.
3. 필요한 조인, DDL, 쓰기와 과거 시점 조회를 개별적으로 확인한다.
4. 기존 조회 경로와 결과, 지연 및 비용을 비교한 뒤 전환 범위를 정한다.

## 출처

- [AWS, How the lakehouse architecture of Amazon SageMaker works](https://docs.aws.amazon.com/sagemaker-lakehouse-architecture/latest/userguide/lakehouse-how.html)
- [AWS Lake Formation, Limitations for bringing Amazon Redshift data warehouse data into the AWS Glue Data Catalog](https://docs.aws.amazon.com/lake-formation/latest/dg/notes-ns-catalog.html)

## 관련 문서

- [[Redshift|Redshift의 데이터 공유와 Spectrum]]
- [[S3-Tables-Maintenance|S3 Tables의 유지보수와 권한]]
- [[Lake-Formation|Lake Formation]]
- [[SageMaker-Catalog-Discovery|업무 메타데이터와 구독]]
