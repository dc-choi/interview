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

### 데이터 사용 준비와 권한 검증을 별도로 닫는다

부분 검증(2026-10-14): AWS 데이터 전략 가이드의 데이터 표준화, 분류, 품질과 역할 구분을 대조했다. 다음은 그 원칙을 분석 시스템의 검수에 적용한 설계 제안이다. 기존 Lake Formation 기능 전체의 검증일은 유지한다.

실제 소비자가 사용할 테이블마다 필드의 업무 의미, 필요한 최신성, 누락 허용 기준과 오류 대응 책임을 정한다. 테스트를 **권한이 맞는가**와 **허가받은 데이터가 용도에 맞는가**로 나누고, 허용/거부 질의와 품질 검사를 따로 수행한다. 조회 성공은 최신성이나 완전성의 검증을 대신하지 않는다.

예를 들어 주문 분석에는 접근 가능한 행 범위와 주문 시각, 취소 상태의 해석이 모두 필요하다. 다른 분석에 재사용할 공통 정의는 보존하되 현재 용도에 필요한 품질 조건부터 확인한다. 사업 효과의 우선순위와 측정은 [[Metrics-Framework#데이터 거버넌스의 활동량과 사업 성과를 나눈다|거버넌스 성과 지표]]로 분리한다.

## 분석 도구 통합

- Athena, Redshift Spectrum, AWS Glue ETL, EMR의 Apache Spark 등 지원 통합에서 세부 권한을 적용한다. 실제 엔진과 데이터 형식의 지원 범위는 도입 시 확인한다.

### Governed Tables와 현재 권한 관리를 구분한다

부분 검증(2026-10-14): **Governed Tables는 2024-12-31 지원이 종료됐다.** 이후 해당 테이블의 트랜잭션 생성, 쓰기와 Athena 조회를 사용할 수 없으며, 2025-02-17 이후에는 Governed Table API도 실패한다. Glue Data Catalog 메타데이터와 S3 데이터가 남아 있다는 사실은 기능을 계속 사용할 수 있다는 뜻이 아니다.

이 종료는 Lake Formation 전체나 Hive, Iceberg, Hudi, Delta Lake 테이블의 종료가 아니다. 과거 자료의 ACID 트랜잭션, 자동 압축과 time travel 설명을 현재 Lake Formation 권한 관리의 공통 기능으로 옮기지 않는다. 트랜잭션이 필요하면 테이블 형식과 이를 읽고 쓰는 엔진의 지원 범위를 따로 검토한다. Athena의 Iceberg 변경 반영은 [[Athena#Iceberg 테이블의 CDC 병합|Iceberg CDC 병합]]을 참고한다. 종료 공지 대조만 수행했으며 기존 기능 전체의 검증일은 유지한다.

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

## 분석 샌드박스의 읽기 권한은 유효 범위로 검증한다

부분 검증(2026-10-14): AWS의 데이터 필터와 제한 사항을 대조했다. 이 절은 분석자가 원천 데이터를 읽고 별도 공간에서 분석하는 설계에 적용할 권한 점검이며, 문서 전체의 검증일은 유지한다.

Lake Formation 데이터 필터는 통합된 분석 엔진의 조회 결과에서 행과 열 접근을 제한한다. 필터는 `SELECT`에 적용하며, 원본 객체를 익명화하거나 쓰기 권한까지 제한하는 기능으로 해석하지 않는다.

- **행과 열을 따로 정한다:** 행 조건은 읽을 레코드를, 열 포함 또는 제외 목록은 읽을 속성을 정한다. 컬럼 필터로 partition key를 숨길 수는 없다.
- **겹친 권한을 확인한다:** 사용자와 사용자가 속한 그룹에 각각 행 권한이 있으면 유효 행 권한은 합집합이다. all-rows 조건과 제한 조건이 동시에 적용되면 all-rows가 우선한다. 제한 필터를 추가하는 것만으로 기존의 넓은 권한이 축소되지 않는다.
- **교차 계정 재부여는 구분한다:** 외부 계정에 부여한 행 조건과 그 계정이 사용자에게 직접 부여한 행 조건은 교집합으로 제한된다. 이를 사용자와 그룹 사이의 합집합 규칙과 혼동하지 않는다.

설계 점검 예시: 분석 역할에는 필요한 원천 테이블의 읽기 범위를 정하고, 가공 결과의 쓰기 위치는 별도로 둔다. 실제 분석 역할로 허용 행, 거부 행과 제외 열을 조회하고 기존 S3 직접 접근 경로도 확인한다. 필터 생성 성공이나 관리자의 조회 성공만으로 샌드박스 격리를 판정하지 않는다.

## 데이터 메시에서 중앙 권한과 도메인 소유권을 나눈다

부분 검증(2026-10-14): AWS의 Lake Formation과 Glue 기반 데이터 메시 참조 설계를 대조했다. 이 절은 책임 배치와 공유 구조만 다루며, 문서 전체의 검증일은 유지한다.

데이터 메시(data mesh)는 도메인 팀이 데이터 제품의 수집, 처리, 제공과 품질 문제를 책임지는 운영 방식이다. Lake Formation의 중앙 권한 관리를 도입하는 것만으로 도메인 소유권까지 정해지는 것은 아니다.

중앙 카탈로그로 검색과 공유를 모으면서 원본 데이터와 파이프라인은 생산자 도메인에 유지할 수 있다. 이 참조 설계의 공유는 메타데이터 연결을 사용하며 원본 데이터를 중앙 계정에 복사하지 않는다. 소비자는 허가받은 데이터를 자신의 분석 환경에서 사용한다. 도메인 하나가 다른 도메인의 소비자이면서 새 데이터 제품의 생산자일 수도 있다.

설계 점검 제안: 생산자가 공개할 데이터셋, 갱신 주기와 품질 오류 대응 책임을 정하고, 중앙 운영자는 검색과 감사의 공통 기준을 정한다. 카탈로그 등록과 접근 허가는 따로 확인한다. 이 방식은 기존 데이터 레이크 위에 적용할 수 있지만, 도메인별 운영 책임이 필요하지 않은 작은 조직에까지 필수 구조로 삼지 않는다.

### 셀프서비스와 연합 거버넌스를 함께 둔다

부분 검증(2026-10-14): AWS의 데이터 메시 개념 설명을 추가 대조했다. 도메인 소유권, 제품으로서의 데이터, 셀프서비스 기반과 연합 거버넌스는 함께 설계할 책임이다.

- 도메인 팀은 데이터의 의미와 품질을 책임지고, 소비자가 이해할 스키마와 사용 인터페이스를 제공한다.
- 플랫폼 팀은 반복되는 수집, 처리, 카탈로그 등록과 관측 기능을 재사용 가능한 셀프서비스로 제공한다. 모든 도메인이 같은 기반을 따로 구축하게 하는 것은 이 원칙과 다르다.
- 연합 거버넌스는 공통 보안 정책과 메타데이터 규약을 유지하면서 도메인의 구현 자율성을 허용한다. 소유권 분산을 공통 기준 폐지로 해석하지 않는다.

적용 점검 제안: 새 데이터 제품 하나를 게시할 때 도메인이 직접 수행할 작업과 플랫폼이 제공할 기능, 공통 정책 검사를 구분한다. Lake Formation 권한 부여만 완료됐는지, 소비자가 의미와 품질을 이해하고 실제 사용할 수 있는지도 따로 확인한다. 기존 서비스 기능 전체의 검증일은 유지한다.

## Athena 권한 오류는 실패한 작업별로 나눈다

부분 검증(2026-10-14): Athena 권한 가이드, Lake Formation 권한 레퍼런스와 AWS Knowledge Center의 오류별 해결 절차를 대조했다. 이 절만 추가 검증했으며 기존 절의 검증 기준일은 유지한다.

Lake Formation으로 관리하는 데이터를 Athena에서 조회할 때는 실제 질의를 실행한 IAM 사용자나 역할을 기준으로 진단한다. 관리자에게 데이터베이스와 테이블이 보인다는 사실만으로 데이터 조회 권한까지 있다고 판단하지 않는다.

| 실패 지점 또는 오류 단서 | 확인할 권한과 범위 |
| --- | --- |
| 등록된 S3 위치를 참조하는 카탈로그 생성이나 변경 실패 | 해당 위치의 명시적 또는 암묵적 데이터 위치 권한을 확인한다. 명시적 권한은 `DATA_LOCATION_ACCESS`다 |
| 데이터베이스 권한 부족 | 대상 데이터베이스의 유효 `DESCRIBE` 권한을 확인한다 |
| `Required Create Table` | 대상 데이터베이스의 `CREATE_TABLE`과 IAM의 `glue:CreateTable`을 확인한다. 등록된 S3 위치를 가리키면 데이터 위치 권한 조건도 확인한다 |
| `COLUMN_NOT_FOUND`와 조회 가능한 열이 없다는 메시지 | 스키마 누락으로 단정하지 않고 데이터베이스 탐색 권한과 테이블 또는 필요한 열의 `SELECT` 권한을 확인한다 |

**데이터 위치 권한은 객체 읽기 권한이 아니다.** `DATA_LOCATION_ACCESS`는 등록된 S3 위치를 가리키는 Data Catalog 객체의 생성과 변경을 제어한다. 기존 테이블을 조회한다는 이유만으로 이 권한을 추가하지 않는다. 데이터베이스의 등록된 위치 아래에 테이블을 만들고 그 데이터베이스에 `CREATE_TABLE`이 있으면 암묵적 위치 권한이 성립할 수 있다.

`DESCRIBE`도 매번 별도로 부여해야 하는 것은 아니다. 리소스의 다른 Lake Formation 권한에 의해 암묵적으로 포함될 수 있다. 특히 열을 제한한 `SELECT`는 허용한 열의 메타데이터와 데이터만 노출하므로 오류 해결을 위해 전체 테이블 조회 권한으로 넓히지 않는다.

권한 경로 점검 제안:

1. 실제 실행 주체, catalog, database, table과 실패한 SQL 작업을 먼저 확인한다.
2. Athena API와 workgroup의 IAM 권한, `lakeformation:GetDataAccess`, 대상의 Lake Formation 권한을 나누어 확인한다.
3. 사용자 소유 S3 결과 버킷은 별도 IAM 권한으로 점검한다. Lake Formation의 원천 데이터 권한이 결과 파일 접근을 제한해 주지는 않는다. CTAS는 결과 테이블의 S3 위치에 쓰는 IAM 권한도 필요하다.
4. 필요한 범위만 조정한 뒤 같은 실행 주체로 허용 조회와 거부 조회를 재현한다. 이 절차는 진단 제안이며 실제 계정에서의 실행 결과는 아니다.

## 시험 빈출 포인트

- 데이터 레이크의 중앙 권한 관리와 세부 접근 제어가 핵심이면 Lake Formation을 검토한다.
- S3 객체 접근 권한과 분석 테이블의 행, 열 권한을 구분한다.
- 수집 자동화가 필요하면 blueprint의 원천과 증분 적재 전제를 확인한다. 중앙 권한 관리를 도입한다고 Glue 작업과 기존 IAM 검토가 없어지는 것은 아니다.

## 관련 문서

- [[Glue]], [[Athena]], [[Redshift]], [[S3]]

## 출처

- [What is a Data Mesh? — AWS](https://aws.amazon.com/what-is/data-mesh/)
- [Deprecation of Lake Formation’s Governed Tables Feature — AWS Big Data Blog](https://aws.amazon.com/blogs/big-data/deprecation-of-lake-formations-governed-tables-feature/)
- [AWS Prescriptive Guidance, Aligning your data strategy to your business goals](https://docs.aws.amazon.com/prescriptive-guidance/latest/strategy-aws-data/alignment.html)
- [AWS Prescriptive Guidance, Data strategy framework](https://docs.aws.amazon.com/prescriptive-guidance/latest/strategy-aws-data/data-strategy-framework.html)
- [How can I troubleshoot Lake Formation permission issues in Athena? — AWS re:Post Knowledge Center](https://repost.aws/knowledge-center/athena-insufficient-lake-formation-permissions)
- [Amazon Athena User Guide, Manage Lake Formation and Athena user permissions](https://docs.aws.amazon.com/athena/latest/ug/lf-athena-user-permissions.html)
- [AWS Lake Formation Developer Guide, Underlying data access control](https://docs.aws.amazon.com/lake-formation/latest/dg/access-control-underlying-data.html)
- [AWS Lake Formation Developer Guide, Lake Formation permissions reference](https://docs.aws.amazon.com/lake-formation/latest/dg/lf-permissions-reference.html)
- [Design a data mesh architecture using AWS Lake Formation and AWS Glue — AWS Big Data Blog](https://aws.amazon.com/blogs/big-data/design-a-data-mesh-architecture-using-aws-lake-formation-and-aws-glue/)
- [AWS Lake Formation Developer Guide, Data filtering and cell-level security in Lake Formation](https://docs.aws.amazon.com/lake-formation/latest/dg/data-filtering.html)
- [AWS Lake Formation Developer Guide, Data filtering limitations](https://docs.aws.amazon.com/lake-formation/latest/dg/data-filtering-notes.html)
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
