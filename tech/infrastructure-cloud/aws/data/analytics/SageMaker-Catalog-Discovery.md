---
tags: [aws, sagemaker, catalog, metadata, text-to-sql, governance]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["SageMaker Catalog", "SageMaker 메타데이터 추천과 데이터 탐색"]
---

# SageMaker Catalog의 메타데이터와 데이터 탐색

SageMaker Catalog의 업무 메타데이터는 기술적인 테이블명과 사용자가 찾는 업무 개념을 연결한다. SageMaker Unified Studio에서는 자산을 설명하고 검색하는 과정, 접근 권한을 얻는 과정과 Data Agent로 분석 코드를 만드는 과정을 나누어 다룬다.

## 메타데이터 추천은 검토할 초안이다

AI 추천은 자산과 컬럼의 이름, 설명과 용어집 항목을 제안한다. 용어 추천은 시스템에 이미 있는 용어집과 정의를 탐색하므로 먼저 용어집을 정확히 관리해야 한다. 추천 결과는 편집, 수락 또는 거절할 수 있다.

예를 들어 `active_customer`를 설명할 때 최근 로그인 사용자와 최근 결제 고객은 다른 개념이다. 컬럼명으로 생성한 설명만 보고 의미를 확정하지 말고 원천 정의와 대조한다. 이 검토 예시는 메타데이터 추천을 적용하는 운영 원칙이다.

2026-10-07 공식 문서 기준으로 수락하거나 거절하지 않은 자동 생성 메타데이터는 자산을 게시해도 게시된 자산에 포함되지 않는다. 추천 생성, 검토와 게시를 별도 완료 조건으로 둔다. 이름, 설명과 용어 추천은 지원 리전 및 추론 경로가 다를 수 있으므로 사용할 기능의 조건을 각각 확인한다.

## 검색과 접근 권한

업무 이름, 설명, 용어집과 메타데이터는 기술 테이블명을 모르는 사용자의 데이터 발견을 돕는다. 검색에서 자산을 발견했다고 데이터 조회 권한을 얻은 것은 아니다.

도메인에 게시된 자산은 구독 요청과 소유자의 승인 절차를 거친다. 관리 대상 Glue/Redshift 자산은 서비스가 권한 부여를 관리할 수 있다. 비관리 자산은 구독 승인 이벤트와 별도의 연동으로 접근을 제공해야 한다. 승인과 실제 접근 가능 여부를 함께 확인한다.

### 구독 철회와 실제 권한 회수

2026-10-07 공식 문서 기준. 소유 프로젝트가 승인한 구독을 철회하는 `Revoke subscription`과 구독 프로젝트가 사용을 끝내는 `Unsubscribe`를 구분한다. 소유자가 철회한 구독은 다시 승인할 수 없으며, 이용자가 새 구독 요청을 해야 한다.

철회 화면에는 프로젝트의 subscription target에 자산을 유지하도록 허용하는 선택 사항이 있다. 이를 선택한 뒤 해당 target의 접근을 나중에 회수하려면 AWS Lake Formation에서 처리해야 한다. 따라서 구독 상태가 철회됐다는 사실만으로 모든 데이터 접근이 즉시 차단됐다고 판단하지 않는다.

비관리 자산은 승인 이벤트를 EventBridge로 받은 사용자 정의 handler가 실제 권한을 부여하고 결과 상태를 서비스에 보고하는 구조다. 이 연동에서는 권한 회수 경로도 별도로 설계하고 확인한다.

여러 조직이 데이터를 공유할 때는 승인 기록, 실제 조회 권한, 구독 종료와 보존 자료를 각각 점검한다. 같은 조회 주체로 철회 전후의 접근을 확인하고, 다른 경로로 부여한 권한과 이미 복사한 데이터의 처리도 검토한다. 이는 운영 점검 제안이며 구독 철회가 복사본 삭제나 연구 환경의 반출 통제까지 수행한다는 뜻은 아니다.

## 계보로 출처와 변경 영향을 추적한다

2026-10-07 공식 문서 기준. 데이터 계보는 OpenLineage 호환 시스템이나 API로 수집한 이벤트를 바탕으로 원천 데이터, 변환 작업과 소비 관계를 연결한다. 카탈로그 자산과 구독자 정보뿐 아니라 API로 전달한 외부 활동도 포함할 수 있다. 수집되지 않은 외부 작업까지 자동으로 발견했다고 해석하지 않는다.

| 보기 | 확인하는 범위 | 주의점 |
|---|---|---|
| Aggregated view | 현재 자산에 기여하는 작업과 상하위 의존 관계 | 컬럼 수준 계보는 지원하지 않는다 |
| Timestamp view | 특정 시점의 그래프와 그 시점에 각 작업의 최신 실행 | 컬럼 수준 계보를 확인할 때 사용한다 |

대부분 리전의 기본 보기는 Aggregated view이고 Opt-In 리전에서는 Timestamp view만 제공한다. 조사할 시점과 보기 모드를 먼저 정하고, 원천 컬럼부터 변환 작업과 결과 컬럼까지 따라간다. 그래프가 보인다는 사실만으로 데이터 값의 정확성이나 수집 범위의 완전성이 입증되지는 않는다.

## 품질 점수와 데이터 사용 판단

Unified Studio는 AWS Glue Data Quality 결과를 가져오고 API로 외부 품질 도구의 지표도 표시할 수 있다. Glue 데이터 소스의 품질 결과 자동 가져오기를 활성화한 뒤 데이터 소스를 실행하거나 예약한다. 게시된 자산은 새 지표가 추가되면 재게시 없이 listing에 반영되며, 규칙별 이력은 최대 30개 데이터 포인트다.

2026-05-20 릴리스부터 Unified Studio 안에서 DQDL 규칙을 작성하고 평가할 수 있다. 카탈로그 테이블에서는 요청 시 또는 예약 평가를 하고, Visual ETL에서는 Evaluate Data Quality 변환을 사용한다. 품질 결과를 카탈로그로 가져오는 설정과 규칙을 실행하는 설정은 별도다.

다음은 분석에 적용할 검토 기준이다.

1. 전체 점수와 함께 규칙 정의, 실패한 컬럼과 평가 시각을 확인한다.
2. 점수 이력이 바뀌면 원천 데이터 변화와 규칙 변경을 구분한다.
3. 통과한 규칙이 분석에 필요한 결측, 중복과 최신성 조건을 실제로 검사하는지 확인한다.
4. 품질 표시를 적재 차단으로 해석하지 않는다. 실패 시 후속 처리를 막는 설정은 [[Glue#Data Quality: 검사와 적재 차단을 나눈다|Glue Data Quality의 실행 경계]]에서 따로 확인한다.

## Data Agent가 업무 질문을 코드로 바꾸는 과정

업무 맥락 통합은 기술 메타데이터와 용어집, 메타데이터 양식, 요약 및 README를 함께 사용한다. Agent는 관련 테이블을 찾고 SQL이나 PySpark 코드의 카탈로그, 테이블과 컬럼 참조를 구성한다.

- 현재 프로젝트가 구독한 게시 자산과 프로젝트 내부의 미게시 자산을 탐색한다.
- 관련 자산에 접근할 수 없으면 접근이 필요하다고 알리고 해당 테이블에 대한 코드를 생성하지 않는다.
- 셀 내부 코드 생성은 접근 가능한 구독 자산과 로컬 자산을 사용한다.

Query Editor의 대화형 SQL 생성에서는 후속 질문으로 쿼리를 수정할 수 있다. 복잡한 질문은 계획을 검토한 뒤 생성하며, 생성한 SQL은 검토 후 실행한다. 쿼리 실패 시 AI의 수정 제안을 받을 수 있지만 실행 성공만으로 집계의 의미가 맞는 것은 아니다.

## 분석에 적용할 검토 기준

다음은 기능을 실제 분석에 적용할 때의 설계 체크포인트다.

1. 질문의 지표 정의, 기간과 대상 집단을 먼저 정한다.
2. 찾은 자산의 업무 정의, 조인 키와 최신성을 확인한다.
3. 생성 SQL의 조인으로 행이 중복되거나 필터로 대상이 누락되는지 확인한다.
4. 개인정보 제외 요청은 컬럼 검토와 데이터 접근 통제로 집행한다. 프롬프트 한 문장을 접근 통제로 취급하지 않는다.
5. 작은 검증 데이터의 기대 결과와 실행 결과를 대조한다.

일반적인 Text-to-SQL의 생성, 검증과 실행 경계는 [[LLM-Workflow-Patterns#생성, 검증과 실행의 경계|LLM 워크플로 패턴]]에서 다룬다.

## 출처

- [Amazon SageMaker Unified Studio, Revoke an existing subscription](https://docs.aws.amazon.com/sagemaker-unified-studio/latest/userguide/revoke-subscription.html)
- [Amazon SageMaker Unified Studio, Unsubscribe from an asset](https://docs.aws.amazon.com/sagemaker-unified-studio/latest/userguide/unsubscribe-from-subscription.html)
- [Amazon SageMaker Unified Studio, Grant access for approved subscriptions to unmanaged assets](https://docs.aws.amazon.com/sagemaker-unified-studio/latest/userguide/grant-access-to-unmanaged-asset.html)
- [Amazon SageMaker Unified Studio, Data lineage](https://docs.aws.amazon.com/sagemaker-unified-studio/latest/userguide/datazone-data-lineage.html)
- [Amazon SageMaker Unified Studio, Aggregated lineage view](https://docs.aws.amazon.com/sagemaker-unified-studio/latest/userguide/aggregated-lineage-view.html)
- [Amazon SageMaker Unified Studio, Data quality](https://docs.aws.amazon.com/sagemaker-unified-studio/latest/userguide/data-quality.html)
- [Amazon SageMaker Unified Studio, Release notes](https://docs.aws.amazon.com/sagemaker-unified-studio/latest/userguide/release-notes.html)
- [Amazon SageMaker Unified Studio, Using machine learning and generative AI](https://docs.aws.amazon.com/sagemaker-unified-studio/latest/userguide/autodoc.html)
- [Amazon SageMaker Unified Studio, Data discovery, subscription, and consumption](https://docs.aws.amazon.com/sagemaker-unified-studio/latest/userguide/discover-data.html)
- [Amazon SageMaker Unified Studio, Using Business Context with the SageMaker Data Agent](https://docs.aws.amazon.com/sagemaker-unified-studio/latest/userguide/data-agent-business-catalog.html)
- [Amazon SageMaker Unified Studio, Generate SQL with the Data Agent](https://docs.aws.amazon.com/sagemaker-unified-studio/latest/userguide/sql-query-data-agent.html)

## 관련 문서

- [[Glue|Glue Data Catalog와 ETL]]
- [[Athena|Athena의 SQL 분석]]
- [[LLM-Workflow-Patterns|Text-to-SQL과 데이터 디스커버리]]
