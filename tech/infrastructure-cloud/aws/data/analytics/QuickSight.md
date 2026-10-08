---
tags: [infrastructure, aws, quicksight, bi, visualization, analytics]
status: done
verified_at: 2026-10-09
category: "Infrastructure - AWS"
aliases: ["QuickSight", "Amazon QuickSight", "Amazon Quick Sight", "BI"]
---

# Amazon Quick Sight

Amazon Quick의 BI 기능. 서버리스 **머신러닝 기반 BI**로 대화형 대시보드를 만들고 데이터 소스에 직접 연결한다.

## 핵심

- 서버리스 BI — 오토 스케일링
- **SPICE 엔진** (Super-fast, Parallel, In-memory Calculation Engine): 인메모리 연산 엔진. xlsx, csv, json, tsv 등 데이터 소스를 가져와 빠르게 분석
- **ML Insights** (Enterprise Edition) — ML 이상 탐지(Random Cut Forest), 예측(forecasting), autonarratives. 도입부의 머신러닝 기반이라는 수식이 가리키는 기능

## 데이터 소스 통합

- **AWS**: RDS, Aurora, Athena, Redshift, S3
- **타사**: Salesforce, Jira, Teradata 등 외부 데이터베이스

## 사용 사례

- 비즈니스 분석, 시각화
- 임시 분석 수행
- 비즈니스 인사이트 대시보드

## 자연어 분석에는 업무 의미를 연결한다

2026-10-09 공식 Topics 문서 기준, Topic은 여러 데이터셋과 그 관계를 묶는 의미 계층이다. 데이터셋을 추가하기 전에 컬럼 설명, 동의어, 의미 유형과 사용자 정의 지침을 보강한다. Topic에는 데이터셋 사이의 조인 키와 업무 정의, 모호한 표현을 해석할 지침을 둘 수 있다. 기존 Topics는 legacy Topics로 구분되므로 과거 발표의 설정 화면과 현재 구성을 같은 것으로 가정하지 않는다.

자연어 분석 품질을 점검할 때는 다음을 적용한다(설계 제안).

- 판매 채널이라는 질문이 구매 채널 컬럼을 뜻하는지 업무 정의부터 확인한다. 비슷한 이름을 동의어로 등록하는 것만으로 서로 다른 지표를 합치지 않는다.
- 주문 수, 구매 수량과 구매자 수를 구분하고 집계 단위, 기간과 조인 관계를 명시한다.
- 업무 담당자가 검토한 질문과 기대 결과로 동의어와 관계 설정을 바꿀 때의 회귀를 확인한다. 결과가 표시되거나 SQL이 실행됐다는 사실만으로 의미상 정확성을 판정하지 않는다.

의미 정보는 해석을 돕는 설정이다. 데이터 접근 권한이나 결과 정확성을 대신 보장하지 않는다.

## 셀프서비스 BI와 조회 권한을 구분한다

업무 담당자가 직접 분석하도록 도구를 제공하는 것과 모든 데이터를 공개하는 것은 다른 결정이다. 지표의 정의와 집계 단위를 공유하더라도 조직별로 열람할 수 있는 행은 따로 제한할 수 있다.

부분 검증(2026-10-09): Amazon Quick의 사용자 기반 행 수준 보안(RLS) 문서를 대조했다. Enterprise Edition에서는 사용자 또는 그룹과 허용할 필드 값을 담은 권한 데이터셋으로 조회 행을 제한한다.

- RLS가 적용된 데이터셋의 소유자는 전체 데이터를 볼 수 있다. 제한된 독자의 결과를 소유자 계정만으로 검증하지 않는다.
- 사용자나 그룹에 적용할 규칙이 없으면 해당 주체는 데이터를 볼 수 없다.
- 반대로 사용자나 그룹을 지정하고 나머지 필터 열을 모두 `NULL`로 두면 전체 데이터 접근을 허용한다. 빈 필터를 접근 거부로 해석하지 않는다.

운영 점검 제안: 다른 조직의 독자, 규칙이 없는 독자와 데이터셋 소유자로 같은 대시보드를 조회한다. 정상 조회뿐 아니라 보이면 안 되는 행이 감춰지는지 확인한다. 이 권한 검증은 자연어 질문의 의미상 정확성이나 지표 정의 검증을 대신하지 않는다.

## 상담 녹취의 분석 결과를 시각화한다

음성을 텍스트로 바꾸는 작업, 문의 유형을 분류하는 작업과 대시보드 집계는 다른 단계다. Quick Sight에는 분석 결과를 데이터셋으로 연결한다. 음성 파일을 S3에 넣었다는 사실만으로 상담 지표가 만들어지지는 않는다.

AWS의 공개 Post Call Analytics(PCA) 참조 구성에서는 분석 결과를 변환해 S3의 Parquet로 저장하고, Glue Data Catalog로 테이블을 정의한다. Athena가 조회하고 QuickSight가 시각화하며 예제는 SPICE를 사용한다. 이는 가능한 구성 예시이며 모든 상담 시스템에 같은 서비스 조합을 요구하지 않는다. 구성 흐름은 2026-10-07 공식 게시물로 대조했다.

다음은 이 흐름을 다른 상담 데이터에 적용할 때의 설계 점검 제안이다.

- 통화 식별자, 발생 시각과 분류 결과를 연결하고, 재처리 때문에 동일 통화를 중복 집계하지 않는지 확인한다.
- 분류 결과에서 근거 전사문으로 돌아갈 수 있게 하되, 원문 열람 권한과 집계 화면 권한을 구분한다.
- 전사 실패와 분류 불확실성을 빈 문자열이나 정상 문의로 합치지 않는다. 처리한 통화와 전체 통화의 수를 별도로 본다.
- 표본 원문과 분류 결과를 대조한다. 화면이 정상 표시됐다는 사실은 전사와 분류의 정확성을 증명하지 않는다.

업무 성과와 비용의 비교 기준은 [[Customer-Support-Operations-Metrics|고객지원 운영 지표]]에서 다룬다. 이탈 원인에 대한 추정과 실제 이탈 방지 효과도 따로 검증한다.

## 계정 간 템플릿으로 대시보드 재사용

부분 검증(2026-10-07): 이 절의 템플릿, 데이터셋 매핑, 공유 권한과 생성 상태를 AWS API Reference로 대조했다. 기존 서비스 개요 전체를 다시 검증한 날짜는 아니다.

템플릿은 분석과 대시보드를 재사용하는 데 필요한 메타데이터를 담고, 데이터셋을 placeholder로 추상화한다. 같은 스키마의 다른 데이터셋을 연결해 대시보드를 만들 수 있다. 따라서 템플릿 공유를 원본 데이터 복사나 데이터 소스 접근 권한의 이전으로 해석하지 않는다.

### 원본 계정과 대상 계정의 역할

1. 원본 계정에서 `CreateTemplate`의 `SourceEntity.SourceAnalysis`에 분석 ARN과 `DataSetReferences`를 지정한다. 이때 정한 `DataSetPlaceholder`가 이후 데이터셋을 연결하는 키다. `DescribeTemplate`으로 해당 버전의 `Template.Version.Status`가 `CREATION_SUCCESSFUL`인지 확인한 뒤 재사용한다.
2. 원본 계정에서 `UpdateTemplatePermissions`로 대상 계정에 필요한 템플릿 권한을 부여한다. 계정 간 템플릿 공유의 `Principal`에는 대상 AWS 계정 root ARN을 사용한다. 이는 공유 대상을 지정하는 값이며 root 사용자로 로그인하라는 뜻이 아니다.
3. 대상 계정에 연결할 데이터 소스와 데이터셋을 준비한다. 데이터셋 스키마는 원본 템플릿의 placeholder 스키마와 맞아야 한다.
4. 대상 계정에서 `CreateDashboard`를 호출한다. `SourceEntity.SourceTemplate.Arn`은 원본 템플릿 ARN, `DataSetReferences[].DataSetArn`은 대상 데이터셋 ARN, `DataSetPlaceholder`는 원본에서 정한 값으로 매핑한다.
5. 대상 대시보드의 사용자와 그룹 권한을 별도로 설정한다. 템플릿을 재사용할 권한과 생성된 대시보드를 볼 권한은 별개다.

`CreateDashboard`의 `SourceTemplate` ARN은 다른 AWS 계정과 Quick Sight 지원 리전을 가리킬 수 있다. 템플릿 위치와 생성할 대시보드 위치를 같은 값으로 가정하지 않는다. 데이터 소스 연결과 접근 권한은 대상 환경에서 따로 확인한다.

### 완료와 실패를 판정하는 기준

`DescribeDashboard` 응답의 최상위 `Status`는 HTTP 상태 코드다. 조회가 200으로 성공했다고 대시보드 생성이 끝난 것은 아니다. `Dashboard.Version.Status`가 신규 생성이면 `CREATION_SUCCESSFUL`, 갱신이면 `UPDATE_SUCCESSFUL`인지 확인한다. 진행 중 상태는 기다리고, 실패 상태는 같은 버전의 `Errors`를 확인한다.

완료를 확인할 때는 생성이나 갱신 응답의 `VersionArn`에 해당하는 버전 번호를 `DescribeDashboard.VersionNumber`로 지정한다. 버전 번호를 생략하면 최신 게시 버전을 조회하므로, 갱신 중인 새 버전 대신 기존 게시 버전의 성공 상태를 확인할 수 있다.

배포 검토에서는 placeholder와 실제 데이터셋 ARN의 매핑, 스키마 일치, 템플릿 공유 권한, 대상 사용자 권한을 나눠 점검한다. 마지막으로 대상 사용자 권한으로 대시보드가 열리고 의도한 데이터가 조회되는지 확인한다. 이 절은 문서로 확인한 절차이며 실제 AWS 계정에서의 실행 결과는 아니다.

## 시험 빈출 포인트 (AWS SAA-C03 강의 기준)

- **대시보드/시각화** → QuickSight
- Redshift나 S3 데이터 시각화 → QuickSight
- Athena와 함께 BI → QuickSight (Athena가 쿼리, QuickSight가 시각화)

## 관련 문서

- [[Athena]], [[Redshift]], [[S3]]

## 출처

- [Amazon Quick, Using row-level security with user-based rules to restrict access to a dataset](https://docs.aws.amazon.com/quick/latest/userguide/restrict-access-to-a-data-set-using-row-level-security.html)
- [Amazon Quick, Working with Amazon Quick Sight Topics](https://docs.aws.amazon.com/quick/latest/userguide/topics.html)
- AWS SAA C03 Udemy 강의 요약본 (Stephane Maarek, 로컬)
- [Amazon Quick, Visualize, analyze, and share data with Amazon Quick Sight](https://docs.aws.amazon.com/quick/latest/userguide/quick-bi.html)
- [Amazon Quick, Supported data sources](https://docs.aws.amazon.com/quick/latest/userguide/supported-data-sources.html)
- [Amazon Quick, Gaining insights with machine learning](https://docs.aws.amazon.com/quick/latest/userguide/making-data-driven-decisions-with-ml-in-quicksight.html)
- [Amazon Quick, Template](https://docs.aws.amazon.com/quicksight/latest/APIReference/API_Template.html)
- [Amazon Quick, CreateTemplate](https://docs.aws.amazon.com/quicksight/latest/APIReference/API_CreateTemplate.html)
- [Amazon Quick, DescribeTemplate](https://docs.aws.amazon.com/quicksight/latest/APIReference/API_DescribeTemplate.html)
- [Amazon Quick, ResourcePermission](https://docs.aws.amazon.com/quicksight/latest/APIReference/API_ResourcePermission.html)
- [Amazon Quick, UpdateTemplatePermissions](https://docs.aws.amazon.com/quicksight/latest/APIReference/API_UpdateTemplatePermissions.html)
- [Amazon Quick, CreateDashboard](https://docs.aws.amazon.com/quicksight/latest/APIReference/API_CreateDashboard.html)
- [Amazon Quick, DescribeDashboard](https://docs.aws.amazon.com/quicksight/latest/APIReference/API_DescribeDashboard.html)
- [Amazon Quick, DashboardVersion](https://docs.aws.amazon.com/quicksight/latest/APIReference/API_DashboardVersion.html)
- [Advanced reporting and analytics for the Post Call Analytics (PCA) solution with Amazon QuickSight — AWS Business Intelligence Blog](https://aws.amazon.com/blogs/business-intelligence/advanced-reporting-and-analytics-for-the-post-call-analytics-pca-solution-with-amazon-quicksight/)
