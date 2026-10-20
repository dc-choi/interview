---
tags: [ai, llm, text-to-sql, data-discovery, bedrock]
status: done
verified_at: 2026-10-07
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Workflow Patterns Text-to-SQL", "Text-to-SQL", "데이터 디스커버리"]
---

# LLM 워크플로우 패턴: Text-to-SQL과 데이터 디스커버리

자연어 질문을 SQL로 바꾸고 데이터의 의미를 안내하는 패턴에서 맥락 구성, 메타데이터의 정본, 생성과 검증과 실행의 경계, 결과 비교와 오류별 복구 지점을 다룬다. 상위: [[LLM-Workflow-Patterns|LLM 워크플로우 패턴]].

## Text-to-SQL과 데이터 디스커버리

데이터 리터러시(데이터를 이해, 생성, 인사이트 도출, 소통하는 능력)를 비전문가에게 확장하는 패턴이다.

- **Text-to-SQL**: 자연어 질문에서 필요한 테이블, 조건, SQL 함수를 고려해 쿼리를 생성
- **데이터 디스커버리**: 테이블의 의미를 설명하고 어떤 데이터를 써야 하는지 안내

품질은 모델 능력뿐 아니라 **스키마와 업무 의미를 얼마나 정확히 전달하는지**에 달려 있다. 전체 스키마를 한꺼번에 넣기보다 질문에 맞는 데이터 도메인으로 범위를 좁히고 다음 맥락을 제공한다. 벡터 저장소는 관련 맥락을 찾는 선택지이며 필수 구성은 아니다.

| 맥락 | 담을 내용 |
|---|---|
| 스키마 | 테이블과 컬럼의 의미, 관계와 조인 조건, 대상 DB의 SQL 방언 |
| 업무 정의 | 동의어, 지표 산식, 포함하거나 제외할 데이터 조건 |
| 검토한 예시 | 자연어 질문과 올바른 SQL의 쌍, 해당 예시의 적용 범위 |

모호한 의미 검색을 결정론적 조회로 바꾸는 방향은 [[RAG-Retrieval-Engineering|엔티티 추출 후 구조화 조회]], 지표 정의 수렴은 [[Production-Agent-Architecture-Knowledge|Metric Registry]]와 연결된다. 이 맥락 구성은 AWS와 Cisco의 공개 설계에서 도메인 분류, 메타데이터와 예시 SQL을 함께 사용하는 방식과 대조했다(2026-10-07 확인).

### 메타데이터의 정본과 검색용 사본을 구분한다

스키마 설명은 검색에 넣기 전에 변경 이력을 남길 수 있는 정본에서 관리한다. dbt는 모델, 소스 테이블과 컬럼의 `description`을 YAML 속성으로 정의하고 문서에 반영할 수 있다(2026-10-09 공식 문서 확인). 이 기능만으로 Text-to-SQL 검색 색인이 자동 갱신되는 것은 아니므로 별도의 수집 경로를 확인한다.

다음은 이를 적용한 운영 설계 예시다. 컬럼이나 업무 정의를 바꾸는 변경에서 설명과 예시 SQL도 함께 검토하고, 검색용 메타데이터에는 원본 위치와 반영한 버전을 남긴다. 정본을 고친 시점과 검색에 반영된 시점을 구분해야 오래된 설명으로 만든 SQL의 원인을 추적할 수 있다. 설명이 존재한다는 사실은 업무 정의의 정확성을 보장하지 않으며, 변경 뒤에는 영향을 받는 질문과 기대 결과를 다시 대조한다.

### 생성, 검증과 실행의 경계

컬럼 이름을 맞혀도 그 안의 업무 값을 틀리면 실행에 성공한 잘못된 집계가 나온다. 예를 들어 취소 상태가 `C`로 저장되는 가상 스키마에서 모델이 `status = 'CANCELLED'`를 만들면, SQL 문법이 맞아도 취소 건수를 놓칠 수 있다. 상태값의 대응표와 지표 산식을 설명에 담고, 검토한 질문과 SQL 쌍으로 보완한 뒤 기대 집계와 대조한다.

2026-10-09 Bedrock 공식 문서 기준, 구조화 Knowledge Base의 query configuration에는 테이블과 컬럼의 `description`, 자연어 질문과 SQL의 쌍인 `curatedQueries`를 넣을 수 있다. `INCLUDE`와 `EXCLUDE`는 SQL 생성 맥락을 조절하는 설정이며 접근 통제의 대체물이 아니다. 생성 맥락의 적용은 비결정적이므로 설정 뒤에도 생성 SQL과 실제 결과를 검증한다. 위 상태값은 기능을 설명하기 위한 가상 예시이며 제품이 보장하는 자동 교정 규칙이 아니다.

SQL 문자열을 만드는 것과 권한 안에서 올바른 결과를 얻는 것은 별도 단계다. Amazon Bedrock Knowledge Bases의 `GenerateQuery`는 SQL 변환을 조회와 분리하고, `Retrieve`는 SQL 실행 결과를 반환한다. 생성 SQL의 정확도는 맥락, 스키마와 질문 의도에 따라 달라져 워크로드에 사용하기 전 평가가 필요하다(2026-10-07 공식 문서 기준).

다음은 이 경계를 분석 서비스에 적용한 설계 예시다.

1. **질문 확정:** 매출의 취소분 포함 여부나 기간처럼 결과를 바꾸는 조건이 업무 정의에 없으면 확인한다. 무인 처리에서는 추정 실행 대신 보류한다.
2. **SQL 생성과 검토:** 선택한 도메인의 스키마, 업무 정의와 예시를 사용한다. 문법 통과 외에 조인으로 집계가 중복되는지, 기간과 지표 정의가 맞는지 별도 검증한다.
3. **제한된 실행:** 분석용 DB 권한을 필요한 테이블의 조회 범위로 제한한다. 프롬프트에 읽기 전용이라고 적는 것으로 권한 통제를 대체하지 않는다.
4. **결과 대조:** 검토한 질문과 기대 결과를 가진 평가셋으로 결과를 비교하고, 모델이나 메타데이터가 바뀌면 같은 질문을 다시 평가한다.

AWS의 구조화 데이터 연결 지침은 임의 SQL 실행의 위험을 명시하고 제한된 역할, 읽기 전용 DB와 샌드박싱을 권고한다. Redshift 연결 예시도 조회 권한을 부여하되 `CREATE`, `UPDATE`, `DELETE` 권한은 부여하지 않도록 안내한다(2026-10-07 확인). 이는 데이터 변경 방지 경계이며, 조회 가능한 데이터의 테넌트와 민감정보 범위까지 자동으로 보장하지는 않는다.

### 실행 계획과 결과 건수만으로 정답을 판정하지 않는다

2026-10-10 Redshift 공식 문서 기준, `EXPLAIN`은 쿼리를 실행하지 않고 실행 계획을 보여 준다. 따라서 계획 생성 성공을 결과 데이터나 업무 의미의 검증으로 취급하지 않는다.

고객 추출 쿼리의 평가에서는 결과 건수가 같아도 고객 집합은 다를 수 있다. 예를 들어 기대 식별자가 `{1, 2}`이고 생성 쿼리의 결과가 `{3, 4}`이면 둘 다 2건이지만 오답이다. 검증용 고정 데이터에서 식별자 집합, 중복과 제외 조건을 함께 대조하는 방식을 검토한다. 집계 질의라면 집계값과 그룹별 결과를 비교한다. 이는 평가 설계 제안이며 특정 제품의 자동 평가 기능이 아니다.

질문과 SQL 예시를 보강할 때도 실패 원인이 예시 부족인지, 업무 정의나 쿼리 오류인지 먼저 구분한다. 실패한 결과를 검토 없이 검색 예시에 추가하거나, 예시에 넣은 질문만으로 개선을 평가하지 않는다.

### 오류 종류에 따라 복구 지점을 나눈다

같은 SQL을 반복 생성하는 대신 실패 원인이 있는 단계로 돌아간다. AWS의 공개 Text-to-SQL 구현도 실행 오류와 수정 힌트를 반환하고, 필요하면 테이블 목록과 스키마를 다시 조회한다(2026-10-07 확인).

| 실패 | 복구 방향 |
|---|---|
| 테이블이나 컬럼을 잘못 선택 | 접근 가능한 스키마를 다시 확인하고 대상 선정부터 수정 |
| SQL 문법이나 함수 사용 오류 | 대상 DB 방언과 오류 정보를 주고 SQL 생성 단계에서 수정 |
| 접근 권한 부족 | 권한 경계에서 중단하고 승인된 조회 범위를 확인 |

다음은 운영 설계 제안이다. 재시도 횟수와 총 실행 시간을 제한하고, 한도에 도달하면 실패 원인을 남겨 보류한다. 모델에 전달하는 오류에서는 민감한 값과 불필요한 내부 정보를 제거한다. 실행 성공만으로 질문의 의미나 집계 결과가 맞다고 판정하지 않으며, 오류 복구가 조회 권한을 넓히는 경로가 되어서는 안 된다.

## 사례
- 데이터 분석 보조: Text-to-SQL + 데이터 디스커버리 + 지식 공유(위키, Slack 서포트 채널 자동 답변 + 근거 링크), 질문 분류 후 멀티 체인, 일부는 평가 노드를 둔 그래프 에이전트로 구성. Slack을 UI로, LLMOps로 배포/모니터링.

### SQL 분석에 외부 도구를 연결할 때

Databricks Genie Agent는 SQL과 파일 분석에 MCP connector의 외부 자료 조회와 행동을 결합할 수 있다. 2026-10-21 공식 AWS 문서 기준 이 기능은 Beta이며 관리자가 preview를 켜야 한다. Unity Catalog, Agent mode와 Unity Gateway의 리전 가용성, 사용자별 Workspace access와 Databricks SQL access가 필요하다. 작성자가 connector를 붙여도 사용자는 각자 외부 계정으로 인증하며 도구 호출은 질문한 사용자의 권한으로 실행된다.

- MCP 도구는 Agent mode에서만 실행하며 Chat mode에는 적용되지 않는다.
- 읽기 도구는 자동 실행하고 쓰기 도구는 승인을 요구한다. UI에서는 한 번 승인, 해당 대화 동안 같은 도구 승인, 거부를 선택할 수 있다.
- Agent mode API에서는 읽기 도구만 동작한다. Connector 인증과 쓰기 승인은 UI에서 완료한다.
- Gmail connector는 검색, 읽기와 초안 작성을 지원하지만 발송이나 기존 메시지 편집은 지원하지 않는다.

운영 설계에서는 SQL 결과와 외부 조회 결과의 기준 시점, 인용과 누락을 따로 점검하고, 필요한 개별 도구만 활성화한다. 외부 데이터 소스라는 이름만으로 조회 전용이라고 가정하지 않는다. 이번 대조는 Genie의 연결 계약에 한정하며 Free Edition의 제공 범위와 요금, 기존 AWS 기능 전체를 재검증한 기록은 아니다. 기존 `verified_at`은 유지한다.

## 출처
- [Databricks, Connect a Genie Agent to external tools and sources](https://docs.databricks.com/aws/en/genie-agents/external-tools)
- [Amazon Redshift, Creating and interpreting a query plan](https://docs.aws.amazon.com/redshift/latest/dg/c-the-query-plan.html)
- [Amazon Bedrock User Guide, Create a knowledge base by connecting to a structured data store](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-structured-create.html) — query configurations와 생성 맥락의 비결정성.
- [dbt Developer Hub, description](https://docs.getdbt.com/reference/resource-properties/description)
- [Dynamic text-to-SQL for enterprise workloads with Amazon Bedrock Agents — AWS](https://aws.amazon.com/blogs/machine-learning/dynamic-text-to-sql-for-enterprise-workloads-with-amazon-bedrock-agents/)
- [Enterprise-grade natural language to SQL generation using LLMs: Balancing accuracy, latency, and scale — AWS](https://aws.amazon.com/blogs/machine-learning/enterprise-grade-natural-language-to-sql-generation-using-llms-balancing-accuracy-latency-and-scale/)
- [Amazon Bedrock User Guide, Generate a query for structured data](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-generate-query.html)
- [Amazon Bedrock User Guide, Set up your query engine and permissions for creating a knowledge base with structured data store](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-prereq-structured.html)
- [LLM 에이전트 실무 사례 (물어보세, 스마트 마이 노트, HyperCLOVA X Skill Universe) — 개발 컨퍼런스 (YouTube)](https://www.youtube.com/watch?v=wEVPnYOuAf8&list=PLgXGHBqgT2TtGi82mCZWuhMu-nQy301ew)

## 관련 문서
- [[LLM-Workflow-Patterns|LLM 워크플로우 패턴 (묶음 인덱스)]]
- [[LLM-Workflow-Patterns-Chain-vs-Agent|체인과 에이전트, 그리고 절충]]
- [[LLM-Workflow-Patterns-Function-Calling|Function Calling과 스킬 시스템]]
- [[LLM-Workflow-Patterns-Data-and-Operations|데이터와 모델, 환각 통제와 운영]]
- [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링]] — 리트리벌, 구조화 조회, 근거 추적
- [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처]] — 에이전트 위임의 신뢰 설계, 운영 루프
