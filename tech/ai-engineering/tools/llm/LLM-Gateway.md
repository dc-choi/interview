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

## 출처

- [Guidance for Multi-Provider Generative AI Gateway on AWS — AWS Solutions Library Samples](https://github.com/aws-solutions-library-samples/guidance-for-multi-provider-generative-ai-gateway-on-aws)
- [LiteLLM, Virtual Keys](https://docs.litellm.ai/docs/proxy/virtual_keys)
- [LiteLLM, Budgets, Rate Limits](https://docs.litellm.ai/docs/proxy/users)

## 관련 문서

- [[LLM-Cost-Optimization|LLM 비용 최적화]]
- [[LLM-Failure-Handling|LLM 실패 처리]]
- [[Generative-AI-Multi-Tenancy|생성형 AI의 테넌트 격리]]
