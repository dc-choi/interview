---
tags: [ai, agent, aws, bedrock, tool-use, idempotency]
status: done
verified_at: 2026-11-04
category: "AI엔지니어링(AIEngineering)"
aliases: ["Bedrock Agents 작업 실행", "Bedrock Agents Classic Action Groups"]
---

# Bedrock Agents 작업 실행

Bedrock Agents Classic의 action group은 모델이 선택할 작업과 필요한 입력을 정의한다. 작업을 고르는 단계, 실제 백엔드 실행, 결과를 모델에 돌려주는 단계를 구분해야 한다.

**제품 범위:** 2026-11-04 공식 문서 대조 기준, Amazon Bedrock Agents는 Agents Classic으로 이름이 바뀌었으며 2026-07-30부터 신규 고객을 받지 않는다. 기존 고객은 계속 사용할 수 있다. 이 제한은 Bedrock의 모델, Knowledge Bases와 Guardrails 전체의 종료를 뜻하지 않는다. 신규 에이전트나 이전을 검토할 때는 [[Bedrock-AgentCore-Runtime|AgentCore Runtime]]과 별도로 비교한다.

## 작업 정의와 실행 위치

| 구분 | 선택지와 계약 |
|---|---|
| 작업 정의 | OpenAPI 스키마의 API operation 또는 함수 이름과 파라미터를 담은 function details |
| 입력 수집 | 작업 설명과 필수 파라미터를 바탕으로 에이전트가 필요한 값을 수집 |
| Lambda 실행 | 작업 그룹에 연결한 Lambda가 이벤트를 받고 업무 로직을 수행한 뒤 규정된 응답을 반환 |
| 호출자 실행 | `RETURN_CONTROL`로 선택한 작업과 입력을 호출 애플리케이션에 돌려주고, 애플리케이션이 실행 결과를 다시 전달 |

따라서 기존 백엔드를 연결하려고 반드시 Lambda로 옮길 필요는 없다. Lambda를 선택한다면 API 스키마 방식의 `apiPath`, `httpMethod`, `requestBody`와 함수 방식의 `function`, `parameters`를 구분한다. 응답도 API 방식은 `httpStatusCode`와 콘텐츠 유형별 본문을, 함수 방식은 `functionResponse`를 사용한다. 일반 웹 서버의 응답을 그대로 반환하면 되는 계약으로 보지 않는다.

Lambda 방식은 에이전트의 호출을 허용하는 함수 resource-based policy도 필요하다. 이벤트 변환, 호출 권한과 업무 데이터 접근 권한은 서로 다른 점검 항목이다.

## RETURN_CONTROL의 왕복

1. 작업 그룹의 `actionGroupExecutor.customControl`을 `RETURN_CONTROL`로 설정한다.
2. 에이전트가 그 작업을 선택하면 `InvokeAgent` 응답의 `returnControl`에 `invocationInputs`와 `invocationId`가 온다.
3. 애플리케이션은 전달받은 API 또는 함수 입력으로 자체 시스템을 호출한다.
4. 다음 `InvokeAgent` 요청의 `sessionState`에 같은 `invocationId`와 `returnControlInvocationResults`를 넣는다. 결과는 기존 작업의 `actionGroup`과 함수 또는 API 식별 정보에 맞춘다.

`returnControlInvocationResults`를 보내면 그 요청의 `inputText`는 무시된다. 결과를 반환하는 요청과 새로운 사용자 발화를 보내는 요청을 섞지 않도록 호출 흐름을 설계한다. 반환된 작업 요청은 실행 완료의 증거가 아니므로, 실제 백엔드 결과를 받은 뒤 사용자 응답을 만든다.

## 사용자 확인과 중복 실행

특정 action에는 사용자 확인을 켤 수 있다. 확인 흐름에서 `apiResult` 또는 `functionResult`의 `confirmationState`는 `CONFIRM`이나 `DENY`를 담으며, 거부된 작업은 실행하지 않는다. 외부 API나 검색 결과에 섞인 지시로 원하지 않는 작업이 선택될 수 있으므로 변경 작업에는 이 경계를 검토한다.

**설계 제안:** 사용자 확인과 서버의 인가를 별도로 구현한다. 예약 변경이나 결제처럼 부작용이 있는 작업은 인증된 사용자, 대상 리소스와 최종 입력을 검사하고 업무 단위의 멱등성 키를 둔다. 에이전트의 `invocationId`를 업무 재시도 전체에 유효한 멱등성 키라고 자동 간주하지 않는다.

Powertools for AWS Lambda의 멱등성 유틸리티는 정한 시간 창 안에서 같은 키의 성공 결과를 재사용한다. 키를 만들 입력 필드와 영속 저장소가 필요하며, 데코레이터 추가만으로 외부 결제 시스템까지 하나의 트랜잭션이 되지는 않는다. 외부 요청 성공 뒤 결과 기록 전에 중단되는 경우는 [[Idempotency-Key|멱등성 키]]의 업무 계약과 함께 점검한다(설계 제안).

## 적용 확인

- 입력 누락, 잘못된 값과 권한 거부가 실제 작업 실행 전에 처리되는지 확인한다.
- 사용자 거부 뒤 백엔드가 호출되지 않는지 확인한다.
- 중복 요청, 타임아웃과 결과 반환 실패를 구분해 같은 업무가 두 번 처리되지 않는지 시험한다.
- API 스키마 방식과 함수 방식의 이벤트, 응답 형식을 각각 검사한다.

위 항목은 검증 제안이다. 실제 AWS 계정의 배포, IAM 정책이나 장애 복구를 시험한 기록은 아니다. 검색 품질과 지식 베이스 조회 계약은 [[Bedrock-Knowledge-Base-Retrieval]]에서 별도로 다룬다.

## 출처

- [Amazon Bedrock, Amazon Bedrock Agents Classic maintenance mode](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-classic-maintenance-mode.html)
- [Amazon Bedrock, Define actions in the action group](https://docs.aws.amazon.com/bedrock/latest/userguide/action-define.html)
- [Amazon Bedrock, Handle fulfillment of the action](https://docs.aws.amazon.com/bedrock/latest/userguide/action-handle.html)
- [Amazon Bedrock, Configure Lambda functions to send information that an Amazon Bedrock agent elicits from the user](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-lambda.html)
- [Amazon Bedrock, Return control to the agent developer by sending elicited information in an InvokeAgent response](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-returncontrol.html)
- [Amazon Bedrock, Get user confirmation before invoking action group function](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-userconfirmation.html)
- [Powertools for AWS Lambda (Python), Idempotency](https://docs.aws.amazon.com/powertools/python/latest/utilities/idempotency/)

## 관련 문서

- [[Bedrock-Model-Inference|Bedrock 모델 호출]]
- [[Bedrock-AgentCore-Runtime|AgentCore Runtime 실행 계약]]
- [[Bedrock-Knowledge-Base-Retrieval|Bedrock 지식 베이스 조회]]
- [[Idempotency-Key|멱등성 키]]
