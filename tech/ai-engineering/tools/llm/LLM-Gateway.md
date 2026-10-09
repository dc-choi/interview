---
tags: [ai, llm, gateway, litellm, aws, finops]
status: done
verified_at: 2026-10-07
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Gateway", "LLM 게이트웨이", "LiteLLM 프록시"]
---

# LLM 게이트웨이의 호출, 권한과 비용 경계

LLM 게이트웨이는 애플리케이션과 모델 제공자 사이에서 호출 인터페이스, 접근 제어와 사용량 추적을 모으는 프록시다. LiteLLM 기반 AWS 참조 구성은 ECS 또는 EKS에서 프록시를 운영하고, RDS에 virtual key와 설정을, Secrets Manager에 외부 제공자 자격증명을 보관한다.

## 키의 역할을 나눈다

관리용 master key와 애플리케이션에 배포할 virtual key를 구분한다. Virtual key에는 허용 모델과 예산을 지정하고, 사용자나 팀에 연결해 사용량을 추적할 수 있다. 운영 애플리케이션에 관리 키를 공용으로 배포하는 대신 업무별 권한과 귀속 단위를 정한다.

API 형식을 통합해도 모델의 답변 품질과 도구 호출 의미까지 같아지는 것은 아니다. 모델을 바꾸는 경로는 [[LLM-Failure-Handling|실패 처리]]와 같은 평가 조건으로 확인한다.

## 예산 설정의 저장소 의존성을 확인한다

2026-10-07 LiteLLM 문서 기준, 예산 검사는 DB에서 읽은 누적 사용액에 의존한다. DB 없이 구동하면 `litellm_settings.max_budget`은 요청을 차단하지 않으며, virtual key 기반 사용자와 팀 예산도 사용할 수 없다. 설정 파일에 금액을 적었다는 사실만으로 지출 차단을 보장하지 않는다.

아래는 이 의존성에서 도출한 운영 점검이다.

- 제한된 키로 허용 모델 호출과 비허용 모델 거절을 각각 확인한다.
- 작은 예산을 소진한 뒤 후속 요청이 차단되는지 확인한다.
- DB 장애와 사용량 기록 지연 때의 동작은 별도로 시험한다. DB 없는 배포의 동작으로 장애 시 동작까지 추정하지 않는다.
- 재시도와 폴백을 포함한 총사용량을 제공자의 청구 자료와 대조한다.

## 배포 예제와 운영 보장을 구분한다

AWS 참조 구성에는 CloudFront를 둔 공개 경로, ALB 직접 접근과 private VPC 경로가 있다. 선택한 경로의 인증, 네트워크 노출과 외부 모델로 나가는 데이터 범위를 확인한다. 내부 진입점이라고 외부 모델 전송까지 차단된다고 가정하지 않는다.

단일 서비스에 중앙 관리 요구가 없다면 프록시의 DB, 컨테이너와 운영 비용도 비교한다. 이 문서는 참조 구조와 제품 문서의 대조 결과이며, 특정 배포의 보안이나 가용성을 검증한 결과가 아니다.

## 호환성은 요청 수락과 기능 보존으로 나눠 확인한다

2026-10-08 공식 문서 대조 기준, Anthropic의 OpenAI SDK 호환 계층은 도구 호출의 `strict`를 무시하며, 지원하지 않는 필드 다수를 오류 없이 무시한다. 정상 응답을 받았다는 사실만으로 원래 요청의 제약이 적용됐다고 판정하지 않는다. 이 제약은 해당 호환 계층의 동작이며, 모든 게이트웨이 구현에 그대로 적용되는 것은 아니다.

Gemini의 Generate Content API에서는 모델 응답의 `thoughtSignature`가 후속 호출에 필요한 불투명 상태를 전달한다. 공식 Google Gen AI SDK를 사용하고 전체 모델 응답을 이력에 추가하면 서명을 자동으로 처리한다. 프록시가 응답에서 텍스트나 도구 이름만 추출해 다시 만들면 필요한 상태를 잃을 수 있다. 반환 의무와 위치는 모델별로 다르므로 해당 모델의 계약을 확인한다.

이 차이에서 도출한 게이트웨이 이전 점검은 다음과 같다.

- 일반 텍스트뿐 아니라 스트리밍, 도구 호출 왕복과 모델 고유 필드가 보존되는지 실제 클라이언트로 확인한다.
- 필수 기능을 지원하지 않는 경로는 명시적으로 거절하거나 지원 경로로 보낸다. 조용히 필드를 버리는 동작을 성공으로 처리하지 않는다.
- 폴백 후보는 모델 이름 외에 필요한 기능과 대화 상태의 호환 여부로 제한한다. 다른 제공자의 같은 계열 모델이라는 이유만으로 진행 중 대화를 옮기지 않는다.

위 목록은 제품별 제약에서 도출한 설계 점검이며, 특정 배포의 호환성을 시험한 결과는 아니다.

## 호출 계층과 프롬프트 배포 계약을 분리한다

호출 권한과 사용량을 모으는 것과 프롬프트의 작성, 버전, 평가를 관리하는 것은 별도 책임이다. 같은 플랫폼에 두더라도 운영 호출이 어떤 프롬프트와 모델 설정을 사용했는지 식별할 수 있어야 한다. 이는 프롬프트 관리 기능을 게이트웨이에 연결할 때의 설계 점검이다.

2026-10-10 Bedrock Prompt management 공식 문서 기준, 저장한 draft는 수정할 수 있고 배포용 version은 특정 시점의 스냅샷이다. `Converse`와 `ConverseStream`에서 관리 프롬프트를 호출할 때는 다음 제약을 지킨다.

- `modelId`에 프롬프트 버전 ARN을 전달하고 변수 값은 `promptVariables`로 전달한다.
- `additionalModelRequestFields`, `inferenceConfig`, `system`, `toolConfig`를 같은 요청에 넣을 수 없다.
- 추가한 `messages`는 프롬프트에 정의된 메시지 뒤에 붙는다.

따라서 게이트웨이가 모델 직접 호출용 공통 필드를 무조건 덧붙이면 관리 프롬프트 호출 계약을 어길 수 있다. 호출 유형별로 필드를 구성하고, 프롬프트 버전 변경 전후에 같은 평가 입력으로 결과를 비교하는 방안을 검토한다. 버전 생성 자체가 출력 품질 검증은 아니다. 이 절은 Bedrock API 계약을 확인한 것이며 특정 게이트웨이의 구현이나 배포 동작을 시험한 결과는 아니다.

## 처리량 확장은 호출 한도와 데이터 이동을 함께 검토한다

게이트웨이 인스턴스를 늘리는 것과 모델 제공자의 처리 한도를 늘리는 것은 다르다. 2026-10-10 Bedrock 공식 문서 기준, 계정에 적용되는 quota는 공개 기본값보다 낮을 수 있으므로 Service Quotas에서 실제 값을 확인한다. API 진입점의 여유 용량만으로 모델 추론의 여유를 판단하지 않는다.

Cross-Region inference profile은 요청을 해당 프로파일의 목적지 리전으로 라우팅한다. 출발 리전에 따라 목적지가 달라질 수 있으므로 사용할 각 출발 리전에서 `GetInferenceProfile`의 `models`에 담긴 모델 ARN을 확인한다. 프로파일 이름의 지역 접두사만으로 데이터 처리 위치를 확정하지 않는다.

프로파일의 목적지 중 하나라도 SCP에서 차단되면 다른 목적지가 허용돼 있어도 요청이 실패할 수 있다. 조직의 데이터 위치 제약을 먼저 확인하고 그 범위에 맞는 프로파일과 IAM/SCP를 선택한다. 처리량을 늘리기 위해 금지된 리전을 일괄 허용하는 방식으로 해결하지 않는다.

다음은 이 제약에서 도출한 설계 점검이다. 모델, 리전과 호출 경로별 포화 및 스로틀링을 관측하고, 대기열이나 부하 제한을 검토한다. 다른 모델로의 폴백은 앞 절의 기능 호환성뿐 아니라 데이터 전송 허용 범위도 만족해야 한다. 멀티 리전 호출 자체를 모든 장애의 복구 보장으로 취급하지 않는다.

## 공통 플랫폼에서도 업무별 정책을 보존한다

모델 호출 API를 공통화해도 업무마다 허용 데이터, 답변 범위와 비용 귀속은 다를 수 있다. 공통 인증만 검사하고 모든 요청에 같은 정책을 적용하면 개별 업무의 제약을 놓칠 수 있다. 테넌트 격리의 구현 조건은 [[Generative-AI-Multi-Tenancy|생성형 AI의 테넌트 격리]]에서 다룬다.

2026-10-10 대조한 2024년 9월 BT Group 공개 사례는 업무별 테넌트, PII 필터, 예산 추적과 애플리케이션 범위를 벗어난 질문의 필터링을 함께 설명한다. 이는 중앙 플랫폼 안에서도 업무별 경계를 유지하는 사례다. 발표만으로 각 통제의 누락 가능성이나 실제 차단 효과까지 검증한 것은 아니다.

적용 시에는 인증된 호출자를 업무 정책에 연결하고 허용 모델, 데이터 처리 위치와 비용 귀속을 함께 결정하는 방안을 검토한다. 업무별 정상 요청뿐 아니라 다른 업무의 데이터 접근과 범위 밖 요청도 시험한다. 이 점검안은 해당 사례의 상세 구현을 재현했다는 뜻이 아니다.

## 출처

- [당근은 왜 LLM Router를 직접 만들었을까? — 당근 팀, 2026 당근 빌더 밋업](https://www.youtube.com/watch?v=anmRVnqdyco)
- [Guidance for Multi-Provider Generative AI Gateway on AWS — AWS Solutions Library Samples](https://github.com/aws-solutions-library-samples/guidance-for-multi-provider-generative-ai-gateway-on-aws)
- [LiteLLM, Virtual Keys](https://docs.litellm.ai/docs/proxy/virtual_keys)
- [LiteLLM, Budgets, Rate Limits](https://docs.litellm.ai/docs/proxy/users)
- [Anthropic, OpenAI SDK compatibility](https://platform.claude.com/docs/en/cli-sdks-libraries/libraries/openai-sdk)
- [Google AI for Developers, Thought signatures (Generate Content API)](https://ai.google.dev/gemini-api/docs/generate-content/thought-signatures)
- [Amazon Bedrock, Deploy a prompt to your application using versions in Prompt management](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-management-deploy.html)
- [Amazon Bedrock, Test a prompt using Prompt management](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-management-test.html)
- [Amazon Bedrock, Quotas for Amazon Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/quotas.html)
- [Amazon Bedrock, Supported Regions and models for inference profiles](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html)
- [BT Group’s Digital Unit launches ‘GenAI Gateway’ platform, powered by AWS — Amazon Press Center](https://press.aboutamazon.com/aws/2024/9/bt-groups-digital-unit-launches-genai-gateway-platform-powered-by-aws-accelerating-the-companys-safe-adoption-of-generative-ai-at-scale)

## 관련 문서

- [[LLM-Cost-Optimization|LLM 비용 최적화]]
- [[LLM-Failure-Handling|LLM 실패 처리]]
- [[Generative-AI-Multi-Tenancy|생성형 AI의 테넌트 격리]]
