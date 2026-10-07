---
tags: [observability, logging, splunk, s3, federated-search]
status: done
verified_at: 2026-10-07
category: "관측가능성(Observability)"
aliases: ["Splunk S3 Federated Search", "로그 연합 검색"]
---

# Splunk S3 연합 검색

연합 검색은 S3 데이터를 Splunk에 미리 수집하고 색인하지 않고 조회해 결과를 분석에 연결한다. 자주 탐지할 로그와 장기 보관할 로그를 나눈 [[Log-Pipeline|로그 파이프라인]]에서 조회 경로를 추가하는 선택지다.

## 저장과 조회의 경계

Splunk Cloud Platform의 기능 활성화, 지원 형식의 S3 데이터, 이를 가리키는 Glue 테이블과 접근 권한을 준비한다. Federated index를 Glue 테이블에 연결하고 `sdselect`로 조회한다. AWS에 배포한 Splunk Cloud 환경이 대상이며 단일 인스턴스 배포는 지원하지 않는다.

사전 수집을 줄여도 조회는 무제한 무료가 아니다. 데이터 스캔 사용권(DSU)과 실제 검색량을 확인한다. 저빈도 조사와 반복 탐지의 비용, 지연을 같은 데이터로 비교하는 것이 적용 판단 기준이다.

## 보관돼 있어도 바로 검색되지는 않는다

- Glacier Flexible Retrieval과 Deep Archive는 조회 전에 객체 복원이 필요하다. 고객이 만든 Glue 테이블에는 `read_restored_glacier_objects=true`도 설정한다.
- Intelligent-Tiering의 Archive Access와 Deep Archive Access 계층은 지원하지 않는다.
- 같은 Glue 테이블의 객체는 파일 형식과 압축 형식이 같아야 한다.

따라서 Splunk로 재수집하지 않는다는 설명을 S3 보관 계층의 복원도 필요 없다는 뜻으로 읽지 않는다. 보존 기간과 조사에 허용할 대기 시간을 함께 정한다.

## 보안 로그의 정규화

Amazon Security Lake는 지원 AWS 로그를 OCSF 스키마와 Parquet 형식으로 정규화하고 S3에 저장한다. 사용자 정의 소스는 적재 전에 이 형식과 파티션 등의 요구사항을 맞춰야 한다. 일반 S3 원문 로그와 같은 준비 상태로 보지 않는다.

정규화된 저장소가 있어도 탐지 규칙, 조회 권한과 대응 절차는 별도로 확인한다. 마스킹을 생략하거나 보안에 필요한 로그를 버리는 방식으로 비용을 줄이지 않는다.

## 출처

- [Splunk, About Federated Search for Amazon S3](https://help.splunk.com/en/splunk-cloud-platform/search/federated-search/10.3.2512/search-data-stored-in-amazon-s3/about-federated-search-for-amazon-s3)
- [AWS, Source management in Security Lake](https://docs.aws.amazon.com/security-lake/latest/userguide/source-management.html)
- [AWS, Collecting data from custom sources in Security Lake](https://docs.aws.amazon.com/security-lake/latest/userguide/custom-sources.html)
- [Splunk, Gen AI, S3, Security Lake로 데이터 가치 극대화 — Amazon Web Services Korea](https://www.youtube.com/watch?v=UB8DhQSGlrc)

## 관련 문서

- [[Log-Pipeline|로그 전달과 보존 설계]]
- [[PII-Masking|민감정보 마스킹]]
- [[S3-Storage-Performance|S3 스토리지 계층]]
