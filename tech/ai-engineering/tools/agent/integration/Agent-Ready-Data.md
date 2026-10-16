---
tags: [ai, agent, data, data-contract, governance, lineage, mcp]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["Agent-Ready Data", "에이전트용 데이터 준비", "에이전트 데이터 아키텍처", "Agentic Lineage"]
---

# 에이전트용 데이터 준비 — 사람이 무료로 해 주던 판단을 데이터에 넣는다

사람은 이상한 숫자를 보면 멈추고, 매출에 반품이 빠졌는지 되묻고, 왜 그렇게 결정했는지 나중에 설명할 수 있다. 에이전트는 그 판단을 대신 해 주지 않는다. 데이터가 준비되지 않으면 사람처럼 우아하게 성능이 떨어지는 대신 자신 있게 실패한다. 에이전트용 데이터 준비는 사람이 암묵적으로 해 주던 노동을 데이터 계약, 계보, 권한, 의미 정의와 실행 가능한 능력으로 옮기는 일이다. 더 좋은 모델이 나쁜 데이터를 구제하지 못한다. [[Agent-Ready-API-Design|에이전트 친화 API 설계]]가 인터페이스 쪽이라면 이 문서는 그 인터페이스 뒤의 데이터 쪽이다.

## 다섯 속성

| 속성 | 정의 | 구현 수단 |
|---|---|---|
| Trusted | 에이전트가 보기 전에 정확하고 신선하며 검증된 상태 | 데이터 계약, 격리 게이트, freshness SLA, 계층 아키텍처 |
| Contextual | 매출에 반품이 반영됐는지, 회계연도가 2월에 시작하는지 같은 의미가 명시됨 | 버전 관리되는 지표 정의, 시맨틱 모델 |
| Traceable | 30초 만에 내린 결정의 이유를 그 순간에 포착해 재구성 가능 | trace와 span 기반 agentic lineage, 장기 보관 |
| Governed | 접근 범위가 설계로 한정되고 통제되며 감사 가능 | 위임 접근, 단기 자격증명, 최소 권한 |
| Operational | 읽을 수 있는 데이터를 넘어 행동 가능한 데이터 | 검색, 실시간 질의, 쓰기의 3단계 접근과 capability 선언 |

다루는 순서도 이 표를 따른다. 신뢰할 수 있게 만든 뒤 추적과 거버넌스를 붙이고 그다음 의미 계층, 마지막에 실행이다.

## 신뢰 — 계약 검증 게이트와 격리

- 계약 검증 게이트가 스키마 일치, freshness SLA, 품질 규칙을 확인하고 하나라도 실패하면 데이터를 에이전트 앞이 아니라 dead letter queue로 보내고 알림을 낸다. 회로 차단기와 같은 패턴이다. 가격 데이터의 수집 시각이 24시간을 넘겼으면 에이전트는 현재 가격을 모른다고 답한다. 자신 있게 낡은 가격을 말하는 것보다 낫고, 이것은 모델이 아니라 데이터 아키텍처의 일이다.
- 계층 아키텍처(Medallion): Bronze는 원본 불변 수집(감사와 계보용), Silver는 검증과 중복 제거(스키마 적용, 계약 강제, 격리가 여기 산다), Gold는 인증된 데이터(시맨틱 모델이 컴파일되는 대상, 접근 통제). 에이전트는 Gold 이상만 본다. Bronze와 Silver는 사람의 디버깅용이다. 에이전트가 자기 쿼리 패턴을 관찰해 자주 쓰는 조합을 실체화하는 Adaptive Gold는 저자들의 제안이며 쿼리 패턴이 안정된 뒤에 시도할 대상이다.
- 비정형 데이터도 같은 규칙이 적용된다. 계약이 내용에서 주변 메타데이터로 옮겨갈 뿐이다. freshness 시계는 콘텐츠 변경 시점이 아니라 인덱스 재구축이 성공한 시점을 잰다. 아무것도 안 바뀐 것처럼 보여도 조용히 실패한 인덱서를 이 심장박동이 잡는다. 청크마다 source, version, timestamp, access scope를 요구하고 없으면 거부하며, 빈 청크, 잘린 청크, 근사 중복, OCR 오류, 임베딩 드리프트를 검사한다.
- 신뢰도 임계 라우팅: 임계 이상이면 자율 진행, 미만이면 사람에게 넘긴다. 임계는 모델의 자신감이 아니라 freshness, 완전성, 일관성 같은 데이터 수준 신호가 구동한다. 모델은 낡은 답에 확신할 수 있고 freshness SLA가 그 확신을 무효화한다. 계약이나 SLA 위반은 다른 신호와 무관하게 사람을 강제하는 하드 게이트로 시작하고, 가중 점수 합성은 단순 규칙을 이긴다는 증거가 생긴 뒤에 도입한다. 신호를 하나의 점수로 합성하는 방법은 미해결 설계 문제다.

### 행동 이벤트의 검증과 적재 차단은 별도다

고객 행동을 에이전트 컨텍스트로 쓰려면 수집 성공, 검증 수행과 사용 허용을 구분한다. 위의 계약 검증 게이트는 설계 원칙이며, 수집 제품을 도입하면 같은 차단 동작이 기본 적용된다는 뜻은 아니다.

2026-10-10 Snowplow 공식 문서 기준, event specification 검증에 실패한 이벤트도 기본 설정에서는 `event_specification_validation` 정보를 붙여 정상 enriched 이벤트와 함께 전달한다. 실패 이벤트 경로로 보내려면 tracking plan의 Data quality rules를 별도로 설정한다.

- 이벤트가 선언한 specification을 찾지 못한 경우에는 실패 경로 전송을 설정해도 enriched 이벤트에 남는 예외가 있다.
- 검증 결과 entity가 없다고 검증 통과를 단정할 수 없다. 명시한 specification을 검증한 경우와 inference로 specification을 연결한 경우를 구분한다.
- 이벤트는 자신이 선언한 specification 버전으로 검증한다. 새 버전 적용에는 tracker 코드를 다시 생성하고 배포하는 과정이 필요하며, 여러 버전의 이벤트가 함께 존재할 수 있다.

따라서 에이전트에 전달하기 전에 specification의 존재와 버전, 실패 정보, 데이터 시각과 접근 범위를 검사하는 사용 게이트를 설계한다. 이 게이트는 애플리케이션 설계 제안이며 Snowplow의 기본 기능 보장을 뜻하지 않는다. 최신 행동이 수집됐다는 사실도 사용자의 의도나 자동 실행 승인을 증명하지 않는다.

## 추적 — agentic lineage

전통 lineage가 어떤 소스에 접근했는지를 추적한다면, agentic lineage는 왜 X에 접근했는지, 즉 소스 Z에서 Y를 찾았기 때문이라는 연결을 추적한다. 분산 추적의 trace와 span 모델을 그대로 쓴다. 예를 들어 신용장 승인 하나의 trace 안에 KYC 조회, 제재 목록 확인, 정책 엔진의 신용 조건 평가가 각각 span으로 놓이고, 마지막 span이 결정과 신뢰도, 전체 추론 체인을 담는다. 규제 관점에서 EU AI Act는 고위험 시스템에 생애 전반의 자동 로깅과 로그의 최소 6개월 보관을 요구하며, 이는 고립된 타임스탬프가 아니라 동작을 추적할 만큼의 로깅, 장기 보관, 사후에 어떤 소스를 봤고 어떤 로직을 적용했으며 어떤 대안을 기각했는지 재구성할 수 있을 것이라는 세 아키텍처 의무로 번역된다. 관측성은 나중에 붙이기가 훨씬 어려우므로 첫날부터 계측한다. → [[Audit-Log|감사 로그]]

## 거버넌스 — 귀속을 파괴하지 않는 접근

- 위임 접근: 에이전트가 광범위한 서비스 계정이 아니라 요청자 본인의 권한으로 행동한다. 공유 서비스 계정은 누가 접근했냐는 질문에 답할 수 없게 만든다.
- Just-in-time 자격증명: 작업별 단기 토큰. 특정 고객에 대한 제재 목록 조회 읽기로 범위를 좁힌 5분짜리 토큰을 발급하고 끝나면 만료시킨다.
- 최소 권한: 작업에 필요한 최소 접근만 준다.

세 패턴은 비공개 데이터 접근, 신뢰할 수 없는 콘텐츠 노출, 외부 통신 수단이 동시에 성립하는 순간(lethal trifecta)을 깨뜨린다. 권한 강제를 LLM 밖에 두는 원칙은 [[LLM-Application-Security|LLM 애플리케이션 보안]]의 완전 중재와 같다.

## 컨텍스트 — 지표 정의를 코드로

비즈니스 로직이 BI 도구나 임시 SQL 뷰가 아니라 버전 관리되는 정의 안에 산다(예: 매출 = 주문 금액 - 할인 금액). 시맨틱 모델은 에이전트를 똑똑하게 만들지 않고 추측을 못 하게 막는다. 한 text-to-SQL 벤치마크에서는 같은 모델이 원시 스키마 기준 20% 미만이던 정확도가 시맨틱 레이어를 두자 92.5%를 넘었다는 제3자 인용이 있다. 데이터를 신뢰할 수 있게 만든 뒤 가장 수익률이 높은 투자다.

### 시맨틱 뷰로 지표 정의를 공유할 때의 점검

2026-10-12 확인한 Snowflake 문서 기준, 시맨틱 뷰는 업무 개념을 스키마 수준 객체로 저장한다. 구성 요소는 업무 엔티티에 대응하는 논리 테이블, 공유 키로 논리 테이블을 잇는 관계, 업무 이벤트나 거래를 나타내는 행 단위 값인 팩트, 누가, 무엇을, 어디서, 언제라는 질문에 답하는 범주 속성인 디멘션, 팩트나 컬럼을 집계한 KPI인 메트릭이다. 이 계층이 없으면 보고서와 애플리케이션마다 계산이 어긋날 수 있으므로 순매출 같은 지표를 집계식과 함께 한곳에 정의한다.

- **조인과 집계 규칙:** Cortex Agents는 시맨틱 뷰에 명시한 관계가 없으면 테이블을 조인하지 않고, 서로 다른 시맨틱 뷰를 가로질러 조인하지도 않는다. 다대다 관계는 직접 지원하지 않아 공유 디멘션(브리지) 테이블을 두고 다대일 관계 두 개로 표현한다. 시점별 스냅샷처럼 특정 차원으로 더하면 안 되는 지표는 `NON ADDITIVE BY`로 그 차원을 지정한다. 그러면 해당 차원으로 정렬한 마지막 행의 값을 집계하며, 기본 오름차순에서는 시간 차원의 최신 스냅샷이 된다.
- **설명, 동의어와 값 찾기:** Snowflake 모델링 지침은 테이블과 컬럼의 업무 설명을 정확도에 가장 중요한 요소로 꼽는다. 동의어는 정보 제공용이라 다른 정의에서 이름으로 참조할 수 없고, 사내 용어, 약어와 옛 이름에 한해 직접 넣기를 권한다. 질문의 필터 값이 저장된 값과 다르게 표현될 수 있으므로, 서로 다른 값이 10개 정도 이하인 디멘션은 샘플 값으로, 그보다 많거나 값이 자주 바뀌는 텍스트 디멘션은 Cortex Search 서비스로 실제 값을 찾게 하고, 숫자와 날짜 컬럼에는 검색 서비스를 붙이지 않는다. Snowsight에서 정의한 샘플 값은 메타데이터라 마스킹 정책이 적용되지 않고 시맨틱 뷰에 `GET_DDL`을 실행한 사용자에게 그대로 보이므로 민감하지 않은 대표값을 쓴다.
- **검증 쿼리:** 검증 쿼리는 자연어 질문과 검증한 SQL의 쌍이며, Cortex Analyst는 비슷한 질문에 답할 때 저장된 관련 SQL을 활용한다. SQL에는 원본 이름이 아니라 시맨틱 모델의 논리 테이블과 컬럼 이름을 쓰고, 부정확한 쿼리는 성능과 정확도를 오히려 떨어뜨릴 수 있다. 설명이 갖춰진 뒤 자주 묻는 질문부터 더하고, 불완전한 모델을 메우는 수단으로 쓰지 않는다. Semantic View Autopilot은 생성 과정에서 받은 예시 SQL 중 유효성 검사를 통과한 쿼리를 검증 쿼리로 자동 추가하므로, 그 SQL이 질문의 업무 의미에 맞는지는 담당자가 따로 대조한다.
- **평가와 배포:** Cortex Analyst 평가 기능은 검증 쿼리를 정답 세트로 삼아 생성 SQL의 실행 결과를 비교한다. 평가할 쿼리를 뺀 시맨틱 뷰의 임시 사본으로 SQL을 생성해 그 쿼리가 생성에 영향을 주지 않게 하고, 이전에 맞히던 질문이 틀리게 된 회귀를 따로 집계한다. 한 번의 실행은 시맨틱 뷰 하나만 평가하고 멀티턴 평가는 지원하지 않는다. 정의는 YAML이나 SQL DDL로 Git에 두고 CI/CD에서 테스트와 정확도 확인을 통과할 때만 배포하며, 문제가 생기면 Git의 이전 정상 정의를 다시 배포한다. 사용 사례를 아는 업무팀과 데이터 접근을 아는 데이터 엔지니어링팀이 소유권을 함께 진다.
- **도구 간 정의 교환:** 도구마다 시맨틱 레이어를 다시 만들면 지표 정의가 각 제품 안에 갇히고 계산이 서로 어긋날 수 있다. Apache Ossie(incubating, 이전 이름 Open Semantic Interchange)는 메트릭, 디멘션과 관계를 표현하는 벤더 중립 YAML 기반 형식이며, 2026-07-08 Snowflake 블로그 기준 Apache Incubator에서 인큐베이션 중이다. Snowflake의 Ossie YAML 가져오기 프로시저는 미리 보기 기능이고 0.1.1 버전만 받으며, SNOWFLAKE나 ANSI_SQL 방언 식이 없는 필드와 메트릭은 경고 없이 건너뛴다. 변환 뒤에는 지표 목록과 대표 질문의 결과를 원래 도구와 대조한다.
- **실행 권한:** Cortex Analyst가 만든 SQL은 계정의 가상 웨어하우스에서 역할 기반 접근 통제를 따라 실행된다. 시맨틱 뷰는 소유자 권한으로 동작해 시맨틱 뷰에 SELECT 권한이 있으면 원본 데이터 권한 없이도 조회할 수 있으므로, 접근 범위는 시맨틱 뷰의 권한 부여와 원본에 건 정책으로 통제한다. 마스킹과 행 접근 정책은 시맨틱 뷰에 직접 걸 수 없고, 원본 테이블과 컬럼에 건 정책이 시맨틱 뷰로 전파되어 적용된다. Cortex Agents는 호출 사용자의 기본 역할로 세션 권한을 정한다. 2026-09-02 적용 예정으로 공지된 동작 변경 이후에는 에이전트 명세에서 `orchestration.tool_not_accessible`을 생략하면 기본값 `accept`에 따라 접근 가능한 도구만으로 답하고 경고를 함께 보낸다. 부분 답변을 허용하지 않을 업무는 `reject`(또는 기존 동작인 `legacy`)를 새 에이전트 버전에 명시한다. 이 사전 점검은 Cortex Search, Cortex Analyst, MCP와 스킬 도구에만 적용되므로 사용자 정의 함수와 저장 프로시저의 실행 실패는 따로 확인한다. 이 항목과 위의 대조 절차는 문서 내용을 운영에 옮긴 제안이다.

이 절은 Snowflake 문서의 부분 대조이며 실제 계정에서 정확도나 권한 동작을 시험한 결과는 아니다. 질문과 SQL 예시로 생성 맥락을 구성하고 평가하는 일반 원칙은 [[LLM-Workflow-Patterns-Text-to-SQL|LLM 워크플로우 패턴의 Text-to-SQL]] 문서에서 다룬다.

## 실행 — 읽기에서 쓰기로, 엔드포인트가 아니라 능력으로

- 접근 스펙트럼 3단계: 검색(RAG, 벡터 검색, 대부분의 조직이 여기 머문다), 실시간 질의(라이브 시스템 상태 확인), 쓰기(티켓 생성, 레코드 갱신, 워크플로 트리거, 가장 강력하고 위험). 세 층을 별개의 통제된 접근 수준으로 유지한다.
- [[MCP|MCP]] 프리미티브의 위험 그래디언트: Resources는 읽기 전용, Prompts는 행동을 형성, Tools는 상태를 바꾼다. Resources를 먼저 노출하고 거버넌스 아래에서만 Tools로 승격한다.
- 안티패턴: 기존 REST 엔드포인트를 1대1로 감싸 도구 50개를 만드는 것. 구분이 흐린 이름이 늘어나면 모델의 선택 정확도가 급락한다. 대안은 풍부한 설명과 파라미터를 가진 5개에서 10개의 비즈니스 capability다. 프로토콜과 무관한 원칙이다.
- capability 선언: 누가 누구로서 호출할 수 있는지(permissions), 오작동 시 책임자(owner), 행동하는 capability는 preconditions와 reversibility를 추가로 갖는다. preconditions는 계획 단계에서 읽은 값이 아니라 행동 시점의 라이브 상태로 확인한다. reversibility는 깨끗하게 되돌릴 수 있음, 보상 트랜잭션으로 비용을 들여 되돌릴 수 있음, 불가역의 세 등급이다. 되돌릴 수 있는 큰 금액의 내부 원장 정정이 회수 불가능한 작은 외부 지급보다 자동화하기 안전하다. 불가역 행동은 에이전트가 어느 단계에 도달했든 사람 승인을 요구한다.

## 업무 모델과 도구 입력을 같은 계약으로 연결한다

업무 의미를 설명한 문서와 실제 도구가 조회하는 컬럼이 어긋나면 컨텍스트가 있어도 실행에 실패한다. 2026-10-10 Celonis Agent Tools 공식 문서 기준, `load_data`, `get_insights`, `search_data`는 `knowledge_input`에 정의한 KPI, 레코드 속성, 필터와 이벤트 로그를 사용한다. 도구 설정이 참조한 컬럼 ID가 knowledge model에 없으면 런타임 오류가 난다.

같은 종류의 도구를 여러 개 노출할 때 추가 인스턴스에는 `unique_id`가 필요하며, 모델에 보이는 이름은 `{tool_id}_{unique_id}` 형태가 된다. 일반적인 도구 설명 대신 어떤 업무 조건에서 쓸지 설명한다. `load_data`에 `columns`를 설정하면 custom mode로 전환되어 질의를 설정에서 정의하며, 모델이 채울 값은 `input_schema`로 선언한 placeholder로 제한한다. 이 동작을 모든 도구의 공통 입력 규칙으로 확대하지 않는다.

운영 적용 제안: 주문 상태 확인, 협력사 자원 조회, 외부 예약과 내부 상태 반영을 각각 검증한다. 조회 시점 뒤 상태가 바뀌거나 외부 예약만 성공한 경우를 재현하고, 실행 직전 조건 확인과 재시도의 중복 방지를 설계한다. 도구가 발견되거나 호출됐다는 기록만으로 여러 시스템의 업무 완료를 판정하지 않는다. 이는 연동 설계 제안이며 해당 제품이 원자적 완료를 제공한다는 주장이 아니다.

## 단계적 자율성 — 신입에게 첫날 법인카드를 주지 않는다

| 단계 | 에이전트 | 사람 | 기록 |
|---|---|---|---|
| Shadow | 행동을 추천 | 검토하고 적절하면 실행 | 모든 추천과 시간에 따른 정확도 |
| Supervised | 행동을 준비하고 승인 대기 | 승인 또는 거부 | 제안과 사람의 결정 |
| Autonomous with guardrails | 정의된 경계 안에서 행동 | 가드레일 정의 | 모든 행동, 예외에 알림 |
| Full autonomy | 모든 행동 수행 | 스팟 체크 | 다른 에이전트와 사람의 연속 감시 |

- 경계는 거래 금액이 아니라 되돌릴 수 있는가로 긋는 것이 낫다. 되돌릴 수 있는가가 안전한 자율성의 더 나은 예측자다.
- 승격은 감이 아니라 증거로 한다. 프로덕션 관찰만이 아니라 각 단계 전에 테스트한다. 에이전트는 비결정적이고 호출 비용이 크며 부작용 있는 도구로 행동하므로, 도구와 모델 상호작용을 목이나 재생으로 대체해 CI에서 결정론적으로 돌리고 라이브 호출 대신 eval로 결정을 채점한다.

## 시작점

1. 첫날부터 계측한다. 관측성은 단계가 아니라 전 과정에 흐르는 상수다.
2. 모든 것을 계약화한다. freshness SLA, 엄격한 스키마 강제, 나쁜 데이터 격리.
3. 모델보다 컨텍스트에 투자한다.
4. 쓰기 전에 읽기다. Resources로 시작해 거버넌스를 갖춘 뒤 Tools로 간다.

## 면접 체크포인트

- 사람은 우아하게 성능이 떨어지지만 에이전트는 자신 있게 실패한다는 차이가 데이터 설계에 무엇을 요구하는지 말할 수 있는가.
- 격리 게이트와 freshness SLA가 왜 모델이 아니라 데이터 아키텍처의 일인지 설명할 수 있는가.
- agentic lineage가 전통 lineage와 어떻게 다른지, 규제가 요구하는 세 아키텍처 의무를 말할 수 있는가.
- 도구 50개 안티패턴과 capability 선언의 네 요소, reversibility 세 등급을 설명할 수 있는가.
- 자율성 승격 기준이 왜 금액이 아니라 가역성이고 왜 관찰이 아니라 테스트와 eval 증거여야 하는지 말할 수 있는가.

## 출처

- [Celonis, Tools for MCP Server/Agent Tools assets](https://developer.celonis.com/mcp-server-asset/tools/tools_for_mcp_server) — 2026-10-10 knowledge model 참조와 도구 입력 구성을 대조했다.
- [Snowplow, Event specification validation](https://docs.snowplow.io/docs/event-studio/tracking-plans/event-specification-validation/) — 2026-10-10 검증 실패의 기본 전달, specification 누락 예외와 버전 적용을 대조했다. 기존 본문의 법률 및 벤치마크 주장은 이번 검증 범위에 포함하지 않았다.
- [Making Your Data Ready for Agentic AI — martinfowler.com, Pramod Sadalage와 Prem Chandrasekaran](https://martinfowler.com/articles/making-data-ready-for-agentic-ai.html)
- [에이전트형 AI를 위한 데이터 준비하기 — GeekNews](https://news.hada.io/topic?id=33657)
- [Snowflake, Overview of semantic views](https://docs.snowflake.com/en/user-guide/views-semantic/overview) — 2026-10-12 시맨틱 뷰 절의 구성 요소, 검증 쿼리, 평가, 정의 교환과 실행 권한을 아래 Snowflake 문서와 함께 대조했다. 기존 본문의 법률 및 벤치마크 주장은 이번 검증 범위에 포함하지 않았다.
- [Snowflake, CREATE SEMANTIC VIEW](https://docs.snowflake.com/en/sql-reference/sql/create-semantic-view)
- [Snowflake, Best practices for modeling semantic views](https://docs.snowflake.com/en/user-guide/views-semantic/best-practices-modeling)
- [Snowflake, Best practices for developing and deploying semantic views](https://docs.snowflake.com/en/user-guide/views-semantic/best-practices-dev)
- [Snowflake, Semantic View Autopilot](https://docs.snowflake.com/en/user-guide/views-semantic/autopilot)
- [Snowflake, Improve literal search to enhance Cortex Analyst responses](https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-analyst/cortex-analyst-search-integration)
- [Snowflake, Cortex Analyst](https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-analyst)
- [Snowflake, Cortex Analyst Verified Query Repository](https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-analyst/verified-query-repository)
- [Snowflake, Cortex Analyst evaluations](https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-analyst-evaluations)
- [Snowflake, SYSTEM$CREATE_SEMANTIC_VIEW_FROM_OSSIE_YAML](https://docs.snowflake.com/en/sql-reference/stored-procedures/system_create_semantic_view_from_ossie_yaml)
- [Snowflake, Cortex Agents](https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents)
- [Snowflake, Cortex Agents Run API](https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents-run)
- [Cortex Agents and Snowflake CoWork: Runs proceed when some tools are inaccessible — Snowflake](https://docs.snowflake.com/en/release-notes/bcr-bundles/un-bundled/bcr-2425) — 2026-10-12 확인 시 2026-09-02 적용 예정이며 바뀔 수 있다고 표시
- [Apache Ossie (Incubating): The New Name for Open Semantic Interchange — Snowflake](https://www.snowflake.com/en/blog/apache-ossie-open-semantic-interchange-incubator/)

## 관련 문서

- [[Agent-Ready-API-Design|에이전트 친화 API 설계]] — 인터페이스 쪽의 설계 원칙
- [[MCP|MCP]] — Resources, Prompts, Tools 프리미티브
- [[LLM-Application-Security|LLM 애플리케이션 보안]] — 과도한 위임과 완전 중재
- [[Audit-Log|감사 로그]] — 추적과 보관
- [[Data-Integrity-Constraints|데이터 무결성 제약]] — 규칙을 어느 계층에 둘 것인가
- [[LLM-Workflow-Patterns|LLM 워크플로우 패턴]] — Text-to-SQL의 맥락 구성, 생성 SQL 검증과 평가
- [[Production-Agent-Architecture-Knowledge|프로덕션 에이전트 아키텍처]] — Metric Registry와 조회 우선순위
- [[QuickSight#자연어 분석에는 업무 의미를 연결한다|Amazon Quick Sight Topics]] — 다른 BI 제품의 의미 계층 설정과 점검
