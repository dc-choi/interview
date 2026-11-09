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

### 데이터 인텔리전스는 저장 통합 위에 의미 맥락을 더한다

Databricks가 설명하는 data intelligence는 레이크하우스의 데이터와 메타데이터에 쿼리, 보고서와 lineage 같은 사용 맥락을 결합해 조직의 용어와 지표를 다루는 방향이다. 자연어 질의와 의미 기반 탐색은 그 적용 예다. 이는 2023-11-15 공개한 플랫폼 설계 관점이며, 모든 데이터의 의미를 자동으로 정확히 알아낸다는 보장은 아니다(2026-10-28 공식 글 부분 대조).

가상 예시로 활성 고객이 최근 30일 로그인 고객인지 최근 90일 구매 고객인지에 따라 필요한 테이블과 조건이 달라진다. 두 SQL이 모두 실행되더라도 같은 질문의 정답은 아니다. 적용할 때는 지표 정의와 기간, 제외 조건을 정본으로 남기고 생성된 SQL의 결과를 그 정의와 비교한다. 사용 이력에서 추론한 의미를 검토한 업무 정의와 구분하는 운영 방식을 권한다. 기존 제품 기능 전체를 재검증한 것은 아니므로 frontmatter의 검증일은 유지한다.

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

### 오류 없는 오답의 원인을 나눠 센다

가장 위험한 실패는 실행 오류가 아니라 정상 실행된 오답이다. 사용자는 틀렸다는 신호를 받지 못하므로 평가에서 오류 없는 오답을 따로 센다.

| 원인 | 예시 | 결과 |
|---|---|---|
| 코드값의 뜻 | 상태값을 추정해 `'COMPLETE'`로 거르지만 실제 값은 `'40'` | 0건을 반환하고 해당 건이 없다고 답한다 |
| 저장값의 표기 | "교육 상품"을 `LIKE '%교육%'`로 찾지만 실제 값은 `'Training'` | 있는 데이터를 없다고 답한다 |
| 선언되지 않은 관계 | 외래키 제약이 없어 이름이 비슷한 컬럼끼리 조인한다 | 행이 중복되거나 다른 대상이 섞인다 |
| 없는 데이터로 지표 계산 | 원가 데이터가 없는데 정가에서 판매가를 빼 마진이라 부른다 | 근거 없는 숫자를 그럴듯하게 낸다 |

필요한 데이터가 없으면 근사치를 지어내지 않고 계산할 수 없다고 답하게 한다([[LLM-Abstention|답변 보류]]). 구조화된 의미 모델의 효과를 보인 연구로, 보험 도메인 기업 스키마에서 GPT-4 제로샷의 정확도가 SQL DB 직접 질의 16%에서 같은 DB의 지식 그래프 표현 위 질의 54%로 올랐다는 벤치마크가 있다(Sequeda, Allemang, Jacob, 2023, 초록 기준). 단일 도메인, 단일 스키마의 결과라 그대로 일반화하지 않는다. 의미 모델 설계는 [[Ontology-Knowledge-Graph|온톨로지와 지식 그래프]]에서 다룬다.

### 맥락은 DB와 사용 이력에서 먼저 모은다

설명을 처음부터 손으로 쓰면 수천 테이블에서 멈추고, 코드값의 뜻을 아는 사람은 DBA보다 업무 담당자인 경우가 많다. DB가 이미 가진 정보부터 읽어 지도를 만들고, 사람은 고른 테이블의 의미만 쓴다.

| 원천 | 얻는 것 | 주의 |
|---|---|---|
| 카탈로그와 주석 | 테이블, 컬럼과 기존 설명 | 비었거나 낡았을 수 있다 |
| 선언된 외래키 | 확실한 조인 경로 | 레거시 ERP에는 선언되지 않은 경우가 흔하다 |
| 값 분포 표본 | 실제 코드값과 표기 | 개인정보가 섞이므로 판단에만 쓰고 저장하지 않는다 |
| 쿼리 이력 | 실제 조인, 늘 붙는 조건과 반복 질의 | 이력이 남은 범위만 보인다 |

2026-11-09 공식 문서 기준, PostgreSQL의 `pg_stat_statements` 확장은 서버에서 실행된 SQL의 계획과 실행 통계를 모으며 `shared_preload_libraries`로 미리 불러와야 한다. Oracle의 `V$SQLAREA`는 공유 SQL 영역의 통계를 SQL 문자열당 한 행으로 보여 주고 실행 횟수(`EXECUTIONS`)와 전체 문장(`SQL_FULLTEXT`)을 담는다. 메모리에 남은 문장만 보이므로 오래 안 쓴 질의는 빠질 수 있다. 스키마를 다시 읽을 때는 바뀐 테이블만 처리하고, 사람이 고친 설명을 덮어쓰지 않으며, 사라진 테이블은 지우지 않고 검토로 넘긴다.

### 반복 질의는 검증된 도구로 승격한다

자주 실행되는 다중 테이블 질의는 모델이 매번 새 SQL을 쓰게 두지 않는다.

1. 쿼리 이력에서 실행 횟수가 많고 테이블 둘 이상을 잇거나 집계하는 질의를 후보로 뽑는다.
2. 사람이 값 자리마다 입력으로 받을지 고정할지 정하고 미리 실행해 결과를 확인한다.
3. 승인한 질의만 이름과 쓰임새를 붙여 도구나 스킬로 등록한다. 모델은 어떤 도구를 부를지만 고른다.

금액 기준 승인 대상처럼 꼭 맞아야 하는 판정은 모델의 SQL 작성에 맡기지 않고 등록된 질의나 분기 코드가 맡는다([[Agent-Governance-Controls|에이전트 거버넌스 통제]]).

코드값의 뜻이 아직 확정되지 않았으면 교차 검증 결과가 그럴듯해도 단정하지 않고 담당자에게 묻는다. 확정된 매핑은 버전과 편집자를 남겨 지식에 기록하고 다시 조회하며, 다음 질문부터는 묻지 않는다.

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
- 업무 맥락 조회 결합(2026-11-03 세미나 발표): 같은 모델과 읽기 전용 계정에 업무 맥락 조회 도구와 "먼저 용어와 지표가 어느 테이블, 컬럼, 코드값인지 찾는다"는 지침 한 줄을 더해 업무 어휘 질문 정답률이 56%에서 100%(8문항 2회), 첫 시도 정답률이 25%에서 81%로 올랐다고 소개됐다. 단독 구성의 오답은 모두 오류 신호 없이 나왔고, 결합 구성은 질문당 약 9초가 더 걸렸다. 발표사 내부 데모 DB 표본이며 독립 검증된 수치가 아니다.

### SQL 분석에 외부 도구를 연결할 때

Databricks Genie Agent는 SQL과 파일 분석에 MCP connector의 외부 자료 조회와 행동을 결합할 수 있다. 2026-10-21 공식 AWS 문서 기준 이 기능은 Beta이며 관리자가 preview를 켜야 한다. Unity Catalog, Agent mode와 Unity Gateway의 리전 가용성, 사용자별 Workspace access와 Databricks SQL access가 필요하다. 작성자가 connector를 붙여도 사용자는 각자 외부 계정으로 인증하며 도구 호출은 질문한 사용자의 권한으로 실행된다.

- MCP 도구는 Agent mode에서만 실행하며 Chat mode에는 적용되지 않는다.
- 읽기 도구는 자동 실행하고 쓰기 도구는 승인을 요구한다. UI에서는 한 번 승인, 해당 대화 동안 같은 도구 승인, 거부를 선택할 수 있다.
- Agent mode API에서는 읽기 도구만 동작한다. Connector 인증과 쓰기 승인은 UI에서 완료한다.
- Gmail connector는 검색, 읽기와 초안 작성을 지원하지만 발송이나 기존 메시지 편집은 지원하지 않는다.

운영 설계에서는 SQL 결과와 외부 조회 결과의 기준 시점, 인용과 누락을 따로 점검하고, 필요한 개별 도구만 활성화한다. 외부 데이터 소스라는 이름만으로 조회 전용이라고 가정하지 않는다. 이번 대조는 Genie의 연결 계약에 한정하며 Free Edition의 제공 범위와 요금, 기존 AWS 기능 전체를 재검증한 기록은 아니다. 기존 `verified_at`은 유지한다.

### 고정한 SQL 로직과 평가용 정답을 구분한다

부분 검증(2026-10-24): Databricks Genie Agents의 품질 조정, 개념과 평가 문서를 대조했다. 아래는 AWS 문서의 기능 계약이며 실제 워크스페이스 실행을 재현하지 않았다. 기존 AWS 기능 전체의 검증일은 유지한다.

- **함수로 고정할 범위:** Unity Catalog에 등록한 SQL 함수는 scalar와 table-valued 형태를 지원한다. Genie는 사용자 질문에서 매개변수를 받아 함수를 호출하며 함수 내부 SQL을 보거나 수정할 수 없다. 사용자는 해당 함수의 `EXECUTE` 권한이 필요하다. 고정된 집계 로직을 재사용해도 올바른 함수와 매개변수를 골랐는지는 별도 검증한다.
- **맥락과 평가셋:** example SQL과 instructions는 응답을 만드는 맥락이다. benchmark 질문과 정답 SQL은 평가용이며 Genie의 맥락 개선에 직접 사용되지 않는다. 평가셋을 등록한 사실만으로 잘못된 업무 정의가 교정된다고 보지 않는다.
- **평가 모드:** Chat mode는 정답 SQL과 생성 SQL의 결과 집합을 비교한다. SQL 문자열이 다르다는 이유만으로 오답이라고 판정하지 않는다. Agent mode는 여러 단계로 분석하고 LLM judge가 응답을 평가하며, 선택적인 evaluation note로 평가 기준을 전달할 수 있다.
- **평가 입력:** benchmark의 각 질문은 새 대화로 실행되어 이전 대화의 맥락을 이어받지 않는다. Chat mode에서 정답 SQL이 없는 질문은 자동 정확도 평가 대신 수동 검토가 필요하다. 도구가 만든 정답 SQL도 저장 전에 사람이 질문에 맞는지 확인한다.

적용 제안: 반복되는 매출이나 리텐션 정의는 검토한 SQL로 고정하고, 기간 경계, 취소분과 중복 조인의 예외를 평가 질문으로 둔다. 같은 의미의 다른 표현과 실제 후속 질문 대화도 따로 시험한다. 평가 통과를 전체 데이터와 모든 질문의 정확성 보장으로 확대하지 않는다.

## 출처
- [Data + AI Platforms — Databricks](https://www.databricks.com/blog/what-is-a-data-intelligence-platform) — 2023-11-15 게시, 데이터와 사용 맥락을 결합하는 data intelligence 개념을 2026-10-28 대조.
- [Databricks, Tune Genie Agent quality](https://docs.databricks.com/aws/en/genie-agents/tune-quality)
- [Databricks, Genie Agents concepts](https://docs.databricks.com/aws/en/genie-agents/concepts)
- [Databricks, Test and monitor a Genie Agent](https://docs.databricks.com/aws/en/genie-agents/monitor)
- [Databricks, Connect a Genie Agent to external tools and sources](https://docs.databricks.com/aws/en/genie-agents/external-tools)
- [Amazon Redshift, Creating and interpreting a query plan](https://docs.aws.amazon.com/redshift/latest/dg/c-the-query-plan.html)
- [Amazon Bedrock User Guide, Create a knowledge base by connecting to a structured data store](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-structured-create.html) — query configurations와 생성 맥락의 비결정성.
- [dbt Developer Hub, description](https://docs.getdbt.com/reference/resource-properties/description)
- [Dynamic text-to-SQL for enterprise workloads with Amazon Bedrock Agents — AWS](https://aws.amazon.com/blogs/machine-learning/dynamic-text-to-sql-for-enterprise-workloads-with-amazon-bedrock-agents/)
- [Enterprise-grade natural language to SQL generation using LLMs: Balancing accuracy, latency, and scale — AWS](https://aws.amazon.com/blogs/machine-learning/enterprise-grade-natural-language-to-sql-generation-using-llms-balancing-accuracy-latency-and-scale/)
- [Amazon Bedrock User Guide, Generate a query for structured data](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-generate-query.html)
- [Amazon Bedrock User Guide, Set up your query engine and permissions for creating a knowledge base with structured data store](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-prereq-structured.html)
- [LLM 에이전트 실무 사례 (물어보세, 스마트 마이 노트, HyperCLOVA X Skill Universe) — 개발 컨퍼런스 (YouTube)](https://www.youtube.com/watch?v=wEVPnYOuAf8&list=PLgXGHBqgT2TtGi82mCZWuhMu-nQy301ew)
- [arXiv, A Benchmark to Understand the Role of Knowledge Graphs on Large Language Model's Accuracy for Question Answering on Enterprise SQL Databases](https://arxiv.org/abs/2311.07509) — 2026-11-09 초록의 16%와 54%, 보험 도메인 스키마 대조
- [PostgreSQL, F.32. pg_stat_statements](https://www.postgresql.org/docs/current/pgstatstatements.html)
- [Oracle, Database Reference: V$SQLAREA](https://docs.oracle.com/en/database/oracle/oracle-database/26/refrn/V-SQLAREA.html)
- [[IT-Chosun-Monthly-AX-2026-11-03|IT조선 월간AX 세미나 기록]] — 2026-11-03 제네시스랩(유대훈) 발표. 오류 없는 오답 유형, 맥락 원천, 쿼리 이력의 도구 승격과 실측 사례를 반영했고 수치는 발표 기준이다.

## 관련 문서
- [[LLM-Workflow-Patterns|LLM 워크플로우 패턴 (묶음 인덱스)]]
- [[LLM-Workflow-Patterns-Chain-vs-Agent|체인과 에이전트, 그리고 절충]]
- [[LLM-Workflow-Patterns-Function-Calling|Function Calling과 스킬 시스템]]
- [[LLM-Workflow-Patterns-Data-and-Operations|데이터와 모델, 환각 통제와 운영]]
- [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링]] — 리트리벌, 구조화 조회, 근거 추적
- [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처]] — 에이전트 위임의 신뢰 설계, 운영 루프
- [[Ontology-Knowledge-Graph|온톨로지와 지식 그래프]] — 흩어진 정의를 한곳에 두는 의미 모델
- [[Agent-Ready-Data|에이전트용 데이터 준비]] — 지표 정의를 코드로 공유하는 시맨틱 뷰
