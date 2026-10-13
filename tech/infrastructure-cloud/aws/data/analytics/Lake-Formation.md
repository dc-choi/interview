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

### LF-Tag 권한과 DataZone 구독의 경계

부분 검증(2026-10-13): LF-TBAC와 Amazon DataZone의 Glue 자산 권한 부여 경로를 공식 문서와 대조했다.

**LF-TBAC**는 Data Catalog 리소스에 LF-Tag를 붙이고, 그 태그 표현식에 대해 principal이 수행할 `SELECT` 등의 권한을 부여하는 방식이다. 태그를 붙이는 행위 자체가 조회 권한 부여는 아니다. LF-Tag는 IAM 태그와 서로 대체할 수 없다. 테이블은 데이터베이스의 LF-Tag를, 열은 테이블의 LF-Tag를 상속하며 상속 값을 재정의할 수 있다.

**DataZone 구독**은 카탈로그의 자산을 찾고 프로젝트를 대신해 접근을 요청하는 흐름이다. 기본적으로 자산 소유자의 승인이 필요하지만 자동 승인 조건도 있으므로 모든 요청이 수동 심사를 거친다고 가정하지 않는다. 승인과 실제 권한 부여 완료도 구분한다.

- 관리 대상 Glue 테이블은 Lake Formation이 관리하는 테이블이어야 한다. DataZone은 필요한 권한을 가진 관리 역할을 통해 Lake Formation 권한을 부여한다.
- 이 DataZone Glue 자산 접근 관리 경로는 **LF-TBAC를 지원하지 않는다**. Lake Formation 자체의 태그 권한 기능과 DataZone 통합의 지원 범위는 별개다.
- DataZone이 접근 권한을 자동 부여하지 못하는 비관리 자산은 승인 이벤트를 EventBridge로 내보낸다. 별도 처리기가 권한을 만들고 그 결과를 DataZone에 반영해야 한다.

운영 점검 제안: 검색 가능, 구독 승인, 권한 부여 완료, 실제 질의 성공을 각각 확인한다. 태그 기반 권한으로 전환할 때는 기존 이름 기반 권한도 검토하여 의도보다 넓은 접근이 남지 않게 한다.

## 교차 계정 공유는 링크와 실제 권한을 나눈다

부분 검증(2026-10-13): 교차 계정 공유와 resource link 동작을 AWS 공식 문서로 대조했다. 문서 전체의 검증일은 유지한다.

Lake Formation은 Data Catalog 리소스의 교차 계정 공유에 AWS RAM을 사용한다. 다른 조직의 계정으로 공유하면 수신 계정에서 RAM 초대를 수락해야 한다. Hybrid access mode도 교차 계정 공유를 지원하므로, 기존 IAM 접근을 모두 제거하는 절차를 모든 공유 방식의 공통 전제로 삼지 않는다.

**Resource link**는 공유된 데이터베이스나 테이블을 가리키는 수신 측 Data Catalog 객체다. Athena와 Redshift Spectrum에서 공유 테이블을 질의할 때 사용한다. Glue ETL 스크립트는 resource link 없이도 공유 리소스를 참조할 수 있으며, 같은 이름이 겹치면 catalog ID로 구분할 수 있다.

- 링크의 `DESCRIBE` 권한과 대상 테이블의 `SELECT` 같은 데이터 권한은 별도로 부여한다. 링크 권한만으로 원본 조회 권한이 생기지 않는다.
- 링크 생성 시 대상 리소스의 존재나 교차 계정 권한을 검사하지 않는다. 생성 성공을 공유 완료의 증거로 삼지 않는다.
- 링크를 삭제해도 원본은 삭제되지 않는다. 원본을 삭제해도 링크가 자동으로 사라지지는 않는다.

운영 점검 제안: 실제 소비자 역할로 링크 조회, 허용된 질의, 거부되어야 할 질의를 각각 시험한다. 관리자의 성공 결과로 소비자 권한을 추정하지 않는다. 공유 수락, 카탈로그 탐색과 실제 데이터 조회를 별도 단계로 확인한다.

## 시험 빈출 포인트

- 데이터 레이크의 중앙 권한 관리와 세부 접근 제어가 핵심이면 Lake Formation을 검토한다.
- S3 객체 접근 권한과 분석 테이블의 행, 열 권한을 구분한다.
- 수집 자동화가 필요하면 blueprint의 원천과 증분 적재 전제를 확인한다. 중앙 권한 관리를 도입한다고 Glue 작업과 기존 IAM 검토가 없어지는 것은 아니다.

## 관련 문서

- [[Glue]], [[Athena]], [[Redshift]], [[S3]]

## 출처

- [AWS Lake Formation Developer Guide, Cross-account data sharing in Lake Formation](https://docs.aws.amazon.com/lake-formation/latest/dg/cross-account-permissions.html)
- [AWS Lake Formation Developer Guide, How resource links work in Lake Formation](https://docs.aws.amazon.com/lake-formation/latest/dg/resource-links-about.html)
- [AWS Lake Formation Developer Guide, Lake Formation tag-based access control](https://docs.aws.amazon.com/lake-formation/latest/dg/tag-based-access-control.html)
- [Amazon DataZone User Guide, Approve or reject a subscription request](https://docs.aws.amazon.com/datazone/latest/userguide/approve-reject-subscription-request.html)
- [Amazon DataZone User Guide, Grant access to managed AWS Glue Data Catalog assets](https://docs.aws.amazon.com/datazone/latest/userguide/grant-access-to-glue-asset.html)
- [Amazon DataZone User Guide, Grant access for approved subscriptions to unmanaged assets](https://docs.aws.amazon.com/datazone/latest/userguide/grant-access-to-unmanaged-asset.html)
- AWS SAA C03 Udemy 강의 요약본 (Stephane Maarek, 로컬)
- [AWS Lake Formation Developer Guide, Blueprints and workflows](https://docs.aws.amazon.com/lake-formation/latest/dg/workflows-about.html)
- [AWS Lake Formation Developer Guide, What is AWS Lake Formation?](https://docs.aws.amazon.com/lake-formation/latest/dg/what-is-lake-formation.html)
- [AWS Lake Formation Developer Guide, Hybrid access mode](https://docs.aws.amazon.com/lake-formation/latest/dg/hybrid-access-mode.html)
