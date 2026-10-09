---
tags: [infrastructure, aws, lake-formation, data-lake, analytics]
status: done
verified_at: 2026-10-10
category: "Infrastructure - AWS"
aliases: ["Lake Formation", "AWS Lake Formation", "Data Lake"]
---

# AWS Lake Formation

S3 데이터 레이크와 AWS Glue Data Catalog의 메타데이터에 대한 접근을 중앙에서 관리하는 서비스다. Lake Formation의 권한 모델은 IAM을 보완하며, 데이터 저장, 변환과 질의 실행을 모두 대신하는 단일 엔진은 아니다.

## Data Lake란

- 모든 데이터(정형, 반정형, 비정형)를 한 곳에 모아 저장
- 다양한 분석 도구(Athena, Redshift, EMR, Apache Spark)로 활용

## Lake Formation 기능

- **수집과 변환**: blueprint로 Glue crawler, job과 trigger를 생성해 적재 workflow를 구성한다. Glue 콘솔에서 DAG의 개별 노드 상태를 확인하며, 별도의 Glue workflow도 만들 수 있다.
- **블루프린트**: JDBC 관계형 DB의 snapshot, bookmark 기반 incremental load와 CloudTrail 및 ELB 로그 파일 bulk load가 있다. 이 수집 템플릿의 범위를 Lake Formation의 모든 외부 데이터 연동 범위로 확대하지 않는다.
- **증분 적재의 전제**: incremental blueprint는 처음에 지정 테이블의 전체 데이터를 적재하고 다음 실행을 위한 bookmark를 남긴다. 기존 행 수정까지 동기화하는 범용 CDC로 가정하지 않는다.
- **세분화된 액세스 제어**: 지원되는 분석 경로에서 데이터베이스, 테이블, 열, 행과 셀 수준의 권한을 관리한다.

## 저장, 메타데이터와 권한의 경계

S3 기반 데이터 레이크를 구성한다면 원본 객체 저장, Glue의 카탈로그와 ETL, Lake Formation 권한, Athena나 EMR 등의 분석 실행을 구분한다. 카탈로그가 있다는 사실은 데이터 품질이나 사용 권한의 검증을 뜻하지 않는다.

Hybrid access mode는 같은 Data Catalog 객체에 두 권한 경로를 허용한다. opt-in한 principal은 IAM과 Lake Formation 권한이 모두 필요하고, opt-in하지 않은 principal은 기존 S3와 Glue의 IAM 권한 경로를 사용한다. 따라서 일부 사용자에게 세부 권한을 적용했다는 이유로 기존 접근 경로 전체가 차단됐다고 판단하지 않는다.

운영 점검 제안: 접근 주체와 테이블을 정하고 허용 조회와 거부 조회를 각각 시험한다. CloudTrail을 통한 Lake Formation 접근 감사는 서비스 경유 접근을 확인하는 근거이며, 이것만으로 모든 데이터 경로의 감사와 규정 준수가 완료됐다고 결론 내리지 않는다.

## 분석 도구 통합

- Athena, Redshift Spectrum, AWS Glue ETL, EMR의 Apache Spark 등 지원 통합에서 세부 권한을 적용한다. 실제 엔진과 데이터 형식의 지원 범위는 도입 시 확인한다.

## 시험 빈출 포인트

- 데이터 레이크의 중앙 권한 관리와 세부 접근 제어가 핵심이면 Lake Formation을 검토한다.
- S3 객체 접근 권한과 분석 테이블의 행, 열 권한을 구분한다.
- 수집 자동화가 필요하면 blueprint의 원천과 증분 적재 전제를 확인한다. 중앙 권한 관리를 도입한다고 Glue 작업과 기존 IAM 검토가 없어지는 것은 아니다.

## 관련 문서

- [[Glue]], [[Athena]], [[Redshift]], [[S3]]

## 출처

- AWS SAA C03 Udemy 강의 요약본 (Stephane Maarek, 로컬)
- [AWS Lake Formation Developer Guide, Blueprints and workflows](https://docs.aws.amazon.com/lake-formation/latest/dg/workflows-about.html)
- [AWS Lake Formation Developer Guide, What is AWS Lake Formation?](https://docs.aws.amazon.com/lake-formation/latest/dg/what-is-lake-formation.html)
- [AWS Lake Formation Developer Guide, Hybrid access mode](https://docs.aws.amazon.com/lake-formation/latest/dg/hybrid-access-mode.html)
