---
tags: [aws, bedrock, vpc, privatelink, security]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["Bedrock 비공개 연결", "Bedrock Private Access"]
---

# Bedrock 비공개 연결과 권한 경계

Amazon Bedrock의 interface VPC endpoint는 애플리케이션에서 Bedrock API로 가는 비공개 통신 경로를 제공한다. 네트워크 경로, AWS API 권한, 최종 사용자의 데이터 접근 권한을 나누어 설계한다.

## 호출할 API에 맞는 endpoint

| 호출 목적 | endpoint 서비스 이름 |
|---|---|
| Bedrock 제어 API | `com.amazonaws.<region>.bedrock` |
| 모델 추론 API | `com.amazonaws.<region>.bedrock-runtime` |
| 에이전트 구성 API | `com.amazonaws.<region>.bedrock-agent` |
| 에이전트 실행 API | `com.amazonaws.<region>.bedrock-agent-runtime` |

위 표는 대표 API 구분이다. 실제로 호출하는 API와 리전에서 제공하는 endpoint를 확인한다. 제어 API용 endpoint 하나로 모든 추론과 에이전트 호출을 처리한다고 가정하지 않는다.

선택한 서브넷에 endpoint의 네트워크 인터페이스가 생성된다. 이 경로로 Bedrock에 접근하는 VPC 인스턴스에는 public IP, 인터넷 게이트웨이나 NAT가 필요하지 않다. 다른 외부 API와 패키지 저장소에 대한 통신까지 해결되는 것은 아니다.

## DNS와 정책

- private DNS를 켜면 VPC 안에서 기본 서비스 DNS 이름으로 endpoint 경로를 사용할 수 있다.
- private DNS를 켜지 않으면 SDK나 CLI에 endpoint URL을 명시한다.
- 기본 endpoint policy는 해당 endpoint를 통한 Bedrock 접근을 폭넓게 허용한다. 필요한 principal, action과 resource로 제한하는 custom policy를 검토한다.
- endpoint policy는 IAM identity policy나 resource policy를 대체하지 않는다. endpoint 통과 허용과 실제 API 호출 허용을 함께 확인한다.

## 심층 방어에 적용한다

다음은 연결 기능을 애플리케이션에 적용할 때의 설계 점검이다.

1. 애플리케이션 실행 환경에서 DNS 해석, 연결, 실제 모델 호출을 각각 확인한다.
2. 허용한 역할과 모델로 성공하는지, 금지한 역할과 리소스로 거부되는지 확인한다.
3. 검색 문서는 모델에 넣기 전에 사용자별 접근 권한으로 제한한다. 에이전트의 도구 호출도 실행 직전에 권한을 확인한다.
4. Guardrails 같은 콘텐츠 필터와 네트워크 격리를 인가의 대체 수단으로 쓰지 않는다. 신뢰 경계와 고위험 행동 통제는 [[LLM-Application-Security|LLM 애플리케이션 보안]]에 연결한다.

PrivateLink를 도입했다는 사실만으로 데이터 유출이나 프롬프트 인젝션을 방어했다고 판정하지 않는다.

## 출처

- [Amazon Bedrock, Use interface VPC endpoints](https://docs.aws.amazon.com/bedrock/latest/userguide/vpc-interface-endpoints.html)
- [Amazon VPC, Control access to VPC endpoints using endpoint policies](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-access.html)
- [생성형 AI 보안 강화 전략의 첫번째, 심층 방어 아키텍처 설계 — Amazon Web Services Korea](https://www.youtube.com/watch?v=eI6rrOVDc_I)

## 관련 문서

- [[VPC-Connectivity|VPC 연결과 endpoint]]
- [[IAM|IAM 권한 평가]]
- [[LLM-Application-Security|LLM 애플리케이션 보안]]
