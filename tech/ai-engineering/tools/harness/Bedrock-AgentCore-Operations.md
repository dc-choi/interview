---
tags: [ai, agent, aws, bedrock, isolation, authorization]
status: done
verified_at: 2026-10-07
category: "AI엔지니어링(AIEngineering)"
aliases: ["Bedrock AgentCore Operations", "AgentCore 운영 경계"]
---

# Bedrock AgentCore의 실행, 권한과 상태 경계

Amazon Bedrock AgentCore는 에이전트의 실행 환경, 도구 연결, 자격증명, 기억과 관측 기능을 제공한다. 관리형 기능을 조합해도 사용자 식별, 데이터 접근 범위와 업무 결과 검증은 애플리케이션에서 설계해야 한다.

## 기능보다 책임 경계를 먼저 나눈다

| 구성요소 | 맡기는 기능 | 애플리케이션에서 확인할 것 |
|---|---|---|
| Runtime | 세션 실행과 환경 격리 | 사용자와 세션의 소유 관계, 재개 시 상태 복원 |
| Identity | 에이전트 identity와 자격증명 관리 | 접근 주체, 대상 리소스와 허용 권한 |
| Gateway | API와 Lambda 등을 MCP 호환 도구로 연결 | 도구별 인가와 입력 검증, 외부 부수 효과 |
| Memory | 대화 이벤트와 세션을 넘는 기억 | 저장 범위, 사용자별 조회 권한, 추출 결과의 검증 |
| Observability | 실행 단계, 지연, 토큰과 오류 관측 | 계측 범위, 민감 데이터, 업무 성공 판정 |

이 표의 애플리케이션 점검 항목은 각 서비스의 책임 범위를 바탕으로 한 설계 점검 제안이다.

## 세션 격리는 사용자 인증을 대신하지 않는다

Runtime의 microVM 기반 세션은 연산 자원, 메모리와 파일시스템을 분리한다. 같은 세션으로 이어지는 호출은 해당 연산 환경이 유지되는 동안 실행 문맥을 재사용한다. 하지만 **AgentCore가 사용자와 세션의 소유 관계를 강제하지는 않는다.** 백엔드가 인증된 사용자에게 속한 세션인지 확인하고 사용자별 세션 수와 수명을 관리해야 한다.

따라서 클라이언트가 보낸 세션 식별자를 그대로 신뢰해서는 안 된다. 다른 사용자의 세션 재사용 요청을 거절하는지 확인한다. 실행 환경이 분리돼 있어도 외부 DB, 객체 저장소와 기억 조회의 사용자별 권한 검증은 별도로 필요하다.

## 실행 환경의 상태와 영속 기억을 구분한다

기본 microVM의 메모리와 디스크 상태는 연산 환경의 수명에 묶인다. 중지와 재개를 넘어 파일을 유지하려면 별도 session storage 설정이 필요하다. 대화 이력처럼 구조화된 상태의 영속 보관에는 Memory를 사용할 수 있다. 실행 환경이 종료돼도 모든 데이터가 그대로 복원된다고 가정하지 않는다.

Memory의 short-term memory는 대화 턴과 이벤트를 저장하고, long-term memory는 대화에서 선호, 사실과 요약 등을 추출해 세션을 넘어 사용한다. 추출된 요약을 원문이나 승인된 업무 기록과 동일하게 취급하지 않는다. 재개에 필요한 상태와 모델이 추론한 기억을 나누는 것은 애플리케이션의 데이터 설계다.

### 이벤트 저장과 장기 기억 생성은 완료 시점이 다르다

2026-10-09 AgentCore Memory 공식 문서 기준이다. `CreateEvent`로 저장한 원시 대화는 short-term memory에 남고, 장기 기억은 백그라운드의 비동기 추출과 통합 과정을 거쳐 생성된다. 이벤트 저장 성공을 곧바로 장기 기억 검색 가능 상태로 해석하지 않는다.

| 목적 | 확인할 데이터와 API |
|---|---|
| 직전 대화 복원 | `ListEvents`와 `GetEvent`로 저장된 원시 이벤트를 읽는다. |
| 생성된 장기 기억 확인 | `GetMemoryRecord`와 `ListMemoryRecords`로 생성된 기록을 확인한다. |
| 질문에 맞는 기억 검색 | `RetrieveMemoryRecords`로 의미 검색한다. 원문 전체를 그대로 반환하는 API로 가정하지 않는다. |

개인화 기능을 검증할 때는 이벤트 저장 직후와 장기 기억 생성 뒤를 나눠 시험하는 것이 좋다. 즉시 필요한 주문 상태나 확정된 사용자 선택은 업무 정본에서 읽고, 아직 추출되지 않은 기억 때문에 이미 확인한 사실이 사라진 것으로 처리하지 않는다. 이는 비동기 생성 경계에서 도출한 설계 제안이다.

이벤트 metadata는 검색 보조용 속성이다. 공식 문서는 customer-managed key로 암호화되지 않으므로 민감한 내용을 넣지 말라고 명시한다. 이를 이벤트 본문 전체가 평문이라는 뜻으로 확대하지 않는다. 이 절의 추가 검증일은 기존 서비스 설명 전체의 재검증일이 아니다.

## 도구 연결과 실행 권한은 별도 계약이다

Gateway는 OpenAPI, Smithy, Lambda 같은 입력을 도구로 연결하고, 의미 검색으로 도구 후보를 찾는 기능을 제공한다. 도구 후보 검색을 사용자별 실행 권한 검사로 대체하지 않는다.

Identity와 Gateway의 인증 구성에서는 들어오는 사용자 또는 에이전트 요청과 외부 서비스로 나가는 호출을 나눠 본다. 외부 호출의 OAuth 2.0, API key나 AWS 권한 설정이 필요하며, 도구를 연결했다는 사실만으로 원래 서비스의 인가 규칙이 충족되지는 않는다. 변경 작업의 승인, 중복 실행 방지와 실패 복구도 따로 점검한다.

### Policy는 Gateway를 지나는 호출에 적용한다

AgentCore Policy는 policy engine을 Gateway에 연결하고 도구 접근 전에 정책을 평가한다. Cedar로 사용자와 도구 입력 조건을 표현할 수 있으며, 자연어로 생성한 정책은 검토할 후보로 취급한다. Gateway 구성의 `ENFORCE` 모드 예제는 정책을 실행 경로에서 강제하는 설정을 보여준다.

이 경계에서 도출할 점검은 두 가지다. 금지한 호출이 실제로 거절되는지 확인하고, 도구의 원래 endpoint를 직접 호출하는 우회 경로도 통제한다. Gateway에 연결한 정책만으로 별도 SDK나 직접 API 호출까지 보호된다고 가정하지 않는다.

### Temporal policy는 같은 세션의 이력을 평가한다

Dogwood temporal policy는 현재 요청과 같은 policy session에 기록된 이전 행동을 함께 평가한다. 예를 들어 일정 시간 안에 승인된 대상과 현재 변경 대상이 같은지, 선행 도구가 성공한 뒤 후속 도구를 호출하는지 검사할 수 있다. 현재 요청만 평가하는 Cedar 정책에 시간 이력 조건을 추가하는 방식이다.

호출자는 첫 요청부터 `x-amzn-bedrock-agentcore-policy-session-id`를 전달해야 한다. Gateway가 이 값을 대신 만들지 않으며, temporal policy가 있는 엔진에 세션 값 없이 요청하면 검증 오류가 난다. 정책을 추가하거나 수정하면 활성 temporal session이 무효화되고, 재사용 요청은 HTTP 409 `ConflictException`으로 실패한다. 새 세션에는 이전 이력이 없다.

설계와 검증에서는 다음 경계를 확인한다.

- 선행 성공을 요구하면 `request` 대신 `response` 이벤트와 필요한 출력 필드를 검사한다. 선행 도구 자체도 허용해야 하며 응답이 끝난 뒤 후속 호출을 보낸다.
- `count`와 `sum`은 세션 안의 이력만 집계한다. 호출자가 새 세션을 만들 수 있으므로 계정 전체 호출량이나 지출 상한을 대신하지 않는다.
- 적용 경로의 AgentCore Gateway와 Runtime은 같은 계정과 리전에 있어야 한다. Workload Access Token 전파가 필요하며, 중간의 자체 운영 구성요소는 전달 로직을 구현해야 한다. Gateway 역할에는 `bedrock-agentcore:GetWorkloadAccessToken` 권한도 필요하다.

운영 도입 전에는 `LOG_ONLY`로 결정을 관찰한 뒤 `ENFORCE`로 강제한다. 선행 호출 실패, 다른 대상의 승인 재사용, 새 세션과 정책 변경 뒤 요청을 각각 시험하는 것은 애플리케이션 점검 제안이다.

## 관측 데이터와 업무 성공을 분리한다

Observability는 CloudWatch 기반 관측과 OpenTelemetry 호환 데이터를 제공한다. 기본 지표 외의 상세 span과 trace는 에이전트 코드 계측이 필요할 수 있고, Memory의 span과 로그도 활성화 여부를 확인한다.

토큰, 지연과 오류율은 운영 지표다. 주문 처리나 분석 완료 같은 업무 성공은 결과 데이터와 별도 평가로 확인한다. 실행 시간이 짧거나 도구 호출이 성공했다는 이유만으로 답변의 정확성을 확정하지 않는다.

## 모델 접근 오류는 초기 구독과 호출 권한을 나눠 본다

AgentCore 배포가 끝났어도 내부에서 호출하는 Bedrock 모델의 접근은 별도다. 먼저 실행 로그에서 실패한 API, 모델과 리전, 호출 역할을 확인한다. 배포 도구의 로컬 오류와 Runtime 내부의 모델 접근 오류를 같은 실패로 처리하지 않는다.

2026-10-07 Bedrock 공식 문서 기준으로 AWS Marketplace 구독이 필요한 serverless 모델은 계정의 첫 사용 때 활성화 절차가 필요하다. 이 초기 설정에는 `aws-marketplace:Subscribe`, `aws-marketplace:Unsubscribe`, `aws-marketplace:ViewSubscriptions` 권한이 사용된다. 이미 활성화한 모델의 호출에는 Marketplace 구독 권한이 필요하지 않다. 모델 호출 자체의 IAM 허용은 별도로 확인한다.

따라서 초기 활성화 역할과 상시 실행 역할을 나누는 구성을 검토한다. `AccessDeniedException`만 보고 Runtime 역할에 Marketplace 전체 권한을 추가하지 않는다. 구독 처리 중에도 접근 오류가 이어질 수 있으므로 선행 조건과 처리 상태를 확인한 뒤 제한적으로 재시도한다. 구독이 필요 없는 모델에 이 절차를 일괄 적용하지 않는다.

### Private Marketplace의 승인 범위도 확인한다

2026-10-09 AWS Marketplace 공식 문서 기준, Private Marketplace를 사용하는 조직에서는 IAM의 구독 권한과 상품 조달 승인을 구분한다. Experience는 승인된 상품 목록이고, audience는 조직 전체, OU 또는 계정이다. `Live` 상태인 experience가 연결된 audience를 통제한다.

모델 구독 과정에서 Private Marketplace 자격 오류가 나타나면 다음을 확인한다.

1. 호출 계정에 실제로 적용되는 governing experience를 찾는다. 계정에 직접 연결된 것뿐 아니라 상위 조직이나 OU에서 상속된 것도 확인한다.
2. 해당 experience의 승인 목록에 필요한 모델 상품이 있는지 확인한다. 하위 audience에 별도의 `Live` experience가 있으면 상위 목록의 승인을 합산하지 않는다.
3. 관리자에게 필요한 상품과 적용 계정을 명시해 승인 변경을 요청한다. Runtime 역할에 Marketplace 관리 권한을 추가하는 것으로 조달 정책 문제를 해결하지 않는다.

Experience를 만들었다는 사실만으로 적용이 끝나지 않는다. 상태, audience 연결과 승인 목록을 함께 확인한다. 이 점검은 Private Marketplace를 사용하는 경우의 조달 경계이며, 모든 Bedrock 계정에 이를 새로 만들라는 뜻이 아니다. 조달 승인 후에도 모델 호출 IAM과 리전별 사용 가능 여부는 별도 조건이다.

## 운영 점검

- 다른 사용자의 세션과 기억 조회를 거절하는가
- 실행 환경 종료 뒤 필요한 상태만 복원되며, 재개가 외부 변경을 중복 실행하지 않는가
- 자격증명 갱신 실패와 도구 권한 거절이 구분돼 기록되는가
- 각 실행 단계의 trace와 실제 업무 결과를 연결해 실패 위치를 찾을 수 있는가

가격, 실행 시간 상한, 리전과 target별 지원 범위는 이 문서의 대조 범위에 포함하지 않는다. 배포 전에 해당 구성의 공식 문서와 quota를 확인한다.

## 출처

- [AWS, Memory types](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory-types.html)
- [AWS Marketplace, Private Marketplace concepts](https://docs.aws.amazon.com/marketplace/latest/buyerguide/private-marketplace-concepts.html)
- [AWS Marketplace, Configuring Private Marketplace](https://docs.aws.amazon.com/marketplace/latest/buyerguide/configure-private-marketplace.html)
- [AWS, Temporal policies](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy-temporal.html)
- [AWS, Authoring temporal policies](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy-temporal-authoring.html)
- [AWS, Request access to models](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html)
- [AWS, Policy in Amazon Bedrock AgentCore: Control Agent Interactions](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy.html)
- [AWS, Create gateway with Policy Engine](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/create-gateway-with-policy.html)
- [AWS, Use isolated sessions for agents](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-sessions.html)
- [AWS, Security best practices for AgentCore Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-security-best-practices.html)
- [AWS, Overview of Amazon Bedrock AgentCore Identity](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/identity-overview.html)
- [AWS, Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html)
- [AWS, Add memory to your Amazon Bedrock AgentCore agent](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory.html)
- [AWS, Observe your agent applications on Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html)

## 관련 문서

- [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처]]
- [[MCP-Security-Boundaries|MCP 보안 경계]]
- [[Agent-Memory-Retain-Recall-Reflect|에이전트 기억의 저장, 검색과 추론]]
- [[LLM-Eval-Strategy|LLM 평가 전략]]
