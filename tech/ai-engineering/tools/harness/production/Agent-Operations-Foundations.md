---
tags: [ai, agent, operations, governance, reliability, aws, bedrock]
status: done
verified_at: 2026-11-14
category: "AI엔지니어링(AIEngineering)"
aliases: ["Agent Operations Foundations", "Operations for AI", "AIOps 운영 기반", "에이전트 운영 기반"]
---

# 에이전트 운영 기반 (Operations for AI)

AIOps는 보통 IT 운영에 AI를 적용하는 일을 말한다. AWS의 Agentic Operations Foundations 시리즈는 이를 두 방향으로 넓혀 나눈다. **AI for Operations**는 질문에 답하는 챗봇이나 경보를 분류하는 에이전트처럼 운영 업무를 돕는 기능이다. **Operations for AI**는 그 에이전트를 안전하고 믿을 수 있게, 감당할 수 있는 비용으로 운영하는 기반이다. 기능은 에이전트마다 다르지만 데이터 분류, 변경 관리, 평가와 장애 대비 같은 운영 기반은 반복되므로 한 번 표준으로 만들면 다음 에이전트를 내보내기 쉬워진다.

## 여섯 영역은 서로 약점을 옮긴다

같은 시리즈가 제시한 운영 영역 구분이다. 이 문서는 그중 거버넌스와 운영 신뢰성을 자세히 다루고, 데이터 접근과 통합, 비용, 보안과 포렌식, 조직 준비는 [[Agent-Operations-Integration-Cost-Security|에이전트 운영의 통합, 비용과 보안]]에서 이어 본다. 비용 일반은 [[LLM-Cost-Optimization|LLM 비용 최적화]], 통제 일반은 [[Agent-Governance-Controls|에이전트 거버넌스 통제]]를 따른다.

| 영역 | 확인할 질문 |
|---|---|
| 거버넌스와 컴플라이언스 | 어떤 데이터가 에이전트와 모델을 거쳐 어디에 남는가 |
| 운영 신뢰성 | 프롬프트, 모델, 도구와 코드가 바뀌어도 동작을 검증하고 되돌릴 수 있는가 |
| 데이터 접근과 통합 | 팀마다 따로 만든 연결 대신 일관된 연결 방식을 쓰는가 |
| 비용 관리 | 입력과 출력 토큰 비용이 폭주하기 전에 감지하는가 |
| 보안과 포렌식 | 에이전트가 탈취되면 무엇을 했는지 재구성할 수 있는가 |
| 조직 준비 | 운영할 역할, 기술과 절차가 있는가 |

여섯 영역은 동시에 작동한다. 데이터 품질의 약점은 신뢰성 문제로, 통제되지 않은 반복 호출은 비용 문제로 나타난다.

## 예시: 장애 분류 에이전트

경보가 울리면 로그와 최근 배포 이력을 보고 초기 진단을 쓰며, 필요하면 담당 팀에 티켓을 만든다. 조사와 보고만 하고 스스로 고치지 않는다. 도구는 로그 조회, 배포 이력과 티켓 생성 셋이다.

단순한 구조지만 처음 실행한 조사 기록에는 오류 메시지 속 고객 이메일, 로그인 실패 로그의 세션 토큰, 배포 이력의 개발자 이름이 들어간다. 원래 위치에서는 권한 있는 내부 인원만 읽던 데이터가 이제 모델을 거쳐 에이전트의 조사 기록으로 복제된다. 기능이 동작한다는 사실이 데이터가 거기 있어도 된다는 뜻은 아니다.

## 운영 데이터부터 분류한다

발표자의 고객 대화 경험으로는 업무 데이터베이스와 메일은 분류해도 운영 로그까지 분류한 조직은 드물다고 한다. 3계층 웹 서비스라면 웹 계층 로그에는 토큰과 헤더가, 애플리케이션 로그에는 문제 해결용으로 찍은 고객 정보가, DB 오류 로그에는 실패한 쿼리의 전체 메시지가 남을 수 있다.

- **목록과 태그:** 데이터 원천마다 민감도, 소유자와 보존 기간을 기록한다. 새 원천을 IaC로 만들 때 이 값을 태그로 붙이면 새 구성에도 같은 기준이 따라간다.
- **보존 기간의 상속:** 원천 로그는 3개월만 보관해야 하는데 에이전트의 조사 기록이 7년 보관되면, 원천에서 지킨 보존 의무를 파생 기록이 어긴다. 조사 기록과 모델 입출력 로그의 보존 기간은 입력 원천 중 가장 엄격한 기준에 맞추는 것이 안전하다(설계 제안).
- **품질 기준:** 완전성, 정확성, 일관성, 적시성과 유효성으로 원천을 채점하면 데이터의 약점이 에이전트 판단의 약점으로 번지기 전에 찾을 수 있다.

### 오래된 지식과 끊긴 계보는 오진을 만든다

지식 문서가 수집할 로그 파일 이름을 알려 주는데 파일 이름이 바뀌고 문서는 그대로라면, 에이전트는 파일이 없다는 사실을 장애 원인으로 지목하거나 파일을 찾느라 호출을 반복해 비용을 쓴다.

2026-11-14 Bedrock 공식 문서 기준, Knowledge Base 데이터 원천의 동기화는 마지막 동기화 이후 추가, 수정, 삭제된 문서만 처리하는 증분 방식이다. 일반 Knowledge Base는 원천 파일을 바꿀 때마다 콘솔의 Sync나 `StartIngestionJob`으로 동기화해야 다시 색인된다. Managed Knowledge Base는 기본값이 On-demand이며 일, 주, 월 단위 동기화 일정을 설정할 수 있다. 원천이 바뀐 순간 동기화를 시작하려면 그 트리거는 따로 만든다.

S3와 Custom 원천은 동기화 없이 문서를 직접 넣는 direct ingestion도 지원한다. S3 원천은 첫 동기화가 여전히 필요하고, 직접 넣은 변경은 S3 위치에 반영되지 않아 S3도 함께 고치지 않으면 다음 동기화에서 덮어써질 수 있다. 이 경로를 쓰면 원천과 색인이 다시 어긋나지 않는지 함께 관리한다.

데이터를 만드는 처리 단계도 기록한다. 태그로 서비스 토폴로지를 만드는데 한 서버에 태그가 빠지면, 에이전트는 그 서버의 로그를 수집 대상으로 알지 못하고, 상위 서버가 토폴로지에 없는 대상을 호출하는 이유를 쫓는다. 계보가 없으면 실제 원인인 태그 누락 대신 에이전트나 토폴로지 생성기를 의심하게 된다.

## 무엇을 말하는지와 무엇을 하는지를 따로 통제한다

가장 좋은 방법은 민감 데이터를 처음부터 로그에 남기지 않는 것이다. 분류 결과로 원천을 고칠 수 없을 때 보정 장치를 둔다.

### 추론 경로의 Guardrails는 모델 입출력 텍스트를 다룬다

2026-11-14 Bedrock Guardrails 공식 문서 기준, 추론 호출에 연결한 민감 정보 필터는 PII를 입력 프롬프트와 모델 응답에서 각각 차단(`BLOCK`)하거나 `{EMAIL}` 같은 유형 표기로 가린다(`ANONYMIZE`). 입력과 출력의 동작을 따로 설정할 수 있다. 다음은 적용 범위 밖이다.

- 모델 호출 로그의 `input` 필드는 guardrail 개입과 관계없이 원래 요청을 담는다. trace의 `match` 필드에도 원래 PII 값이 들어간다.
- 텍스트만 평가하며 도구 호출 인자, 도구 결과와 도구 정의는 검사하지 않는다.

따라서 장애 분류 에이전트처럼 로그를 **도구 결과**로 받는 구조에서는 추론 경로의 guardrail만으로 조사 기록의 PII가 사라진다고 가정하지 않는다. 도구 계층이나 조사 기록 저장 전에 가리고, 모델 호출 로그의 접근과 보존도 따로 통제한다(위 범위에서 도출한 설계 제안). 로그 마스킹 방식은 [[PII-Masking|PII 마스킹]]을, 도구 경로에 guardrail 검사를 따로 거는 방법은 [[LLM-Application-Security#관리형 가드레일의 검사 범위 — Amazon Bedrock Guardrails 사례|Bedrock Guardrails의 검사 범위]]를 따른다. 민감 정보 탐지는 확률적이므로 원천에서 남기지 않는 예방 조치를 대신하지 않는다.

### Policy는 Gateway 경계에서 도구 호출을 판정한다

2026-11-14 AgentCore 공식 문서 기준, AgentCore Policy는 Gateway를 지나는 요청을 에이전트 코드 밖에서 평가한다. 정책 엔진은 명시적으로 허용하지 않은 행동을 거부하고(default-deny), 허용과 금지가 겹치면 금지가 이긴다. 자연어로 쓴 요구를 Cedar 정책으로 바꾸고, 지나치게 넓거나 좁은 규칙과 만족할 수 없는 조건을 자동 추론으로 표시한다. 생성 결과는 검토할 후보다.

- `LOG_ONLY`는 결정을 기록만 하고, `ENFORCE`는 실제로 허용하거나 거부한다. 기록으로 정책을 관찰한 뒤 강제로 전환한다.
- `bedrock-agentcore:UpdateGateway` 권한이 있으면 `ENFORCE`를 `LOG_ONLY`로 바꾸거나 정책 엔진을 떼어 낼 수 있다. 이 권한 자체를 보호 대상으로 둔다.
- 정책은 Gateway에서 Guardrails를 참조할 수도 있다. permit과 forbid 정책은 요청 입력(`context.input.*`)의 민감 정보나 프롬프트 공격을 검사해 호출을 허용하거나 거부한다. `suppressOutput`은 도구가 실행된 뒤 응답(`context.output.*`)을 검사해 위반 시 응답 전체를 호출자에게 돌려주지 않는다. 도구는 이미 실행된 상태이며 값만 가리는 마스킹은 없다. 이 guardrail 조건과 temporal 조건은 Cedar 호환 상위 언어인 Dogwood의 조건 블록으로 쓰며, 2026-11-14 기준 guardrails in policies는 서울 리전에서 지원하지 않는다.
- 이상 행동이 보이면 금지 정책을 더해 해당 도구 접근을 경계에서 끊는 회로 차단기로 쓰자는 운영 제안이 있다. 정책 변경이 반영되기까지의 시간은 확인하지 못했다. temporal policy를 추가하거나 수정하면 그 엔진의 활성 temporal session이 무효화되며([[Bedrock-AgentCore-Operations#Temporal policy는 같은 세션의 이력을 평가한다|temporal policy]]), 일반 정책 변경이 세션에 주는 영향은 확인하지 못했다. 원래 endpoint를 직접 부르는 우회 경로는 [[Bedrock-AgentCore-Operations#Policy는 Gateway를 지나는 호출에 적용한다|AgentCore 운영 경계]]대로 따로 막는다.

기본 역할 분담은 추론 경로의 Guardrails가 모델 입력 프롬프트와 응답 텍스트를, Policy가 에이전트가 호출하는 행동을 통제하는 것이다. 한쪽 통제를 다른 쪽이 대신한다고 가정하지 않는다.

## 문맥으로 들어온 편향을 시험한다

티켓 이력에 처리 팀 이름이 남아 있고 한 팀의 해결 시간이 20% 짧다면, 속도를 보상하는 프롬프트는 그 팀으로 배정을 몰아줄 수 있다. 학습 데이터가 가중치에 남긴 편향과 달리, 지식 문서와 실시간 로그는 실행마다 문맥 창에 직접 들어가므로 출력이 달라지는 방향을 시험 없이 예측하기 어렵다.

- 판단에 영향을 주면 안 되는 속성만 바꾼 시험을 둔다. 같은 티켓에서 팀 이름만 바꿔 같은 결정이 나오는지 본다.
- 이런 쏠림은 수천 건 단위에서 드러날 수 있으므로 운영 중에도 팀별 배정 수를 집계한다.

## 바뀌는 모든 구성요소를 릴리스로 다룬다

에이전트는 프롬프트, 버전이 있는 모델 호출, 버전이 있는 MCP 도구와 에이전트 코드로 이뤄진다. 프롬프트를 고치면 동작이 바뀌고, 모델 버전을 올리면 같은 프롬프트를 다르게 읽으며, 도구가 결과를 담는 형식이 바뀌면 모델이 보는 내용이 달라진다. 어느 변경이든 소프트웨어 릴리스로 취급한다.

- **버전 고정과 되돌리기:** AgentCore Runtime은 구성 변경마다 immutable 버전을 만들고 `DEFAULT` 엔드포인트는 최신 버전을 따라간다. 운영 호출은 고정 엔드포인트로 받고 롤백은 엔드포인트 이동으로 준비한다. 세부는 [[Bedrock-AgentCore-Runtime#버전과 엔드포인트로 배포를 통제한다|Runtime 버전과 엔드포인트]]를 따른다.
- **출력이 아니라 결과를 평가:** 맞는 말을 했는지가 아니라 맞는 도구를 맞는 순서로 호출했는지를 본다. 2026-11-14 공식 문서 기준 AgentCore Evaluations는 trace를 평가하며, 내장 평가자와 LLM 기반 사용자 정의 평가자는 LLM-as-a-Judge로 채점하고 Lambda 기반 code-based 평가자는 도구 호출 확인 같은 결정적 검사를 맡는다. online evaluation은 CloudWatch Logs나 에이전트 엔드포인트의 운영 trace를 세션 비율로 표본 추출해 계속 평가하고(콘솔 기본값 10%), on-demand evaluation은 지정한 span이나 trace ID만 평가한다. 변경 전후 비교와 회귀 시험용 dataset evaluation은 public preview다.
- **모델 교체의 기준선:** 토큰 사용량, 지연, 오류율, 출력 형식 준수와 성공률을 먼저 기록한다. 개발 단계에서 의존하는 모든 구성요소와 함께 시험한 뒤 승격하고, 롤백 경로를 준비한다. 바꾸기 전에 무엇이 개선돼야 하는지도 정한다.

## 에이전트의 장애를 계획한다

- **실패를 전제한다:** 모델이 느리거나 응답하지 않으면 우아하게 실패하거나 사람에게 넘긴다.
- **장애 주입:** 시험용 데이터 원천에 지연을 넣거나 데이터 접근을 끊고 에이전트의 동작을 관찰한다. 에이전트마다 실패 방식을 정리한 지도와 runbook을 만들고 게임 데이로 연습한다. 방법은 [[Chaos-Testing|카오스 테스트]]를 따른다.
- **수동 역량 유지:** 에이전트에 의존할수록 사람이 직접 분류하는 법을 잊는다. 수동 절차를 백업 계획으로 남기고 연습한다.
- **보조 리전의 전제:** 에이전트만 다른 리전에 복제해도 읽을 데이터가 그 리전에 동기화돼 있지 않으면 쓸모가 없다. 기존 장애 조치 설계와 함께 본다.
- **장애 분류 체계:** 기존 장애 범주가 에이전트 고유의 실패를 담지 못하면 범주를 더해 추세를 추적한다.

## 운영 점검

- 에이전트가 읽는 운영 데이터 원천마다 민감도, 소유자와 보존 기간이 기록돼 있는가
- 조사 기록과 모델 호출 로그의 보존 기간이 입력 원천의 의무보다 길지 않은가
- 도구 결과로 들어오는 PII를 추론 경로 guardrail과 별도로 처리하는가
- Gateway 정책이 `ENFORCE`이며 이를 바꿀 수 있는 권한이 제한돼 있는가
- 프롬프트, 모델, 도구 변경이 평가를 거쳐 고정 엔드포인트로 배포되는가
- 무관한 속성만 바꾼 편향 시험과 운영 중 배정 집계가 있는가
- 장애 주입과 수동 절차 연습을 정기적으로 하는가

AWS 발표 기준 Policy in AgentCore는 2026-03-03, AgentCore Evaluations는 2026-03-31에 정식 출시(GA)됐다. 가격, quota, 리전 지원과 preview 상태인 세부 기능은 이 문서의 대조 범위에 포함하지 않으므로 도입 전에 공식 문서에서 확인한다.

## 출처

- [Agentic Operations Foundations - Module 1 - What is AIOps — Amazon Web Services](https://www.youtube.com/watch?v=WD0caEH76og)
- [Agentic Operations Foundations - Module 2 - Governance and Reliability — Amazon Web Services](https://www.youtube.com/watch?v=DbAxrTSNtUI)
- [AWS, Evaluate agent performance with Amazon Bedrock AgentCore Evaluations](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/evaluations.html)
- [AWS, Online evaluation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/online-evaluations.html)
- [AWS, Create online evaluation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/create-online-evaluations.html)
- [AWS, On-demand evaluation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/on-demand-evaluations.html)
- [AWS, Custom code-based evaluator](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/code-based-evaluators.html)
- [AWS, Dataset evaluation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/dataset-evaluations.html)
- [AWS, Policy in Amazon Bedrock AgentCore: Control Agent Interactions](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy.html)
- [AWS, Policy in AgentCore, Core concepts](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy-core-concepts.html)
- [AWS, Policy enforcement modes](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy-enforcement-modes.html)
- [AWS, Guardrails in policies](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy-guardrails-in-policies.html)
- [AWS, Temporal policies](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy-temporal.html)
- [AWS, Sync your data with your Amazon Bedrock knowledge base](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-data-source-sync-ingest.html)
- [AWS, Sync a data source](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-managed-sync.html)
- [AWS, Ingest changes directly into a knowledge base](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-direct-ingestion.html)
- [AWS, Remove PII from conversations by using sensitive information filters](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-sensitive-filters.html)
- [Policy in Amazon Bedrock AgentCore is now generally available — AWS What's New](https://aws.amazon.com/about-aws/whats-new/2026/03/policy-amazon-bedrock-agentcore-generally-available/)
- [Amazon Bedrock AgentCore Evaluations is now generally available — AWS What's New](https://aws.amazon.com/about-aws/whats-new/2026/03/agentcore-evaluations-generally-available/)
- [AWS, AgentCore Runtime versioning and endpoints](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agent-runtime-versioning.html)

## 관련 문서

- [[Agent-Operations-Integration-Cost-Security|에이전트 운영의 통합, 비용과 보안]]
- [[Bedrock-AgentCore-Operations|Bedrock AgentCore 운영 경계]]
- [[Bedrock-AgentCore-Runtime|AgentCore Runtime 실행 계약]]
- [[Agent-Governance-Controls|에이전트 거버넌스 통제]]
- [[Production-Agent-Architecture-Eval-and-Operations|Eval, 운영 루프와 고가용성]]
- [[LLM-Application-Security|LLM 애플리케이션 보안]]
- [[MCP-Incident-Investigation|MCP 기반 장애 조사]]
- [[PII-Masking|PII 마스킹]]
- [[Chaos-Testing|카오스 테스트]]
