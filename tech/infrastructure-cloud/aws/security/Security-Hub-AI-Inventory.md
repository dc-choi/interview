---
tags: [infrastructure, aws, security, ai, inventory]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["Security Hub AI Inventory", "AWS AI 자산 목록"]
---

# Security Hub AI Inventory

AWS 환경의 AI 자산을 발견 근거와 함께 조회하는 기능이다. 자산 발견과 위협 탐지는 구분한다. 아래 범위는 2026-10-07 공식 문서 기준이다.

## 발견 경로

| 대상 | 근거와 전제 |
| --- | --- |
| 관리형 AI | AWS Config configuration item으로 Bedrock, AgentCore, SageMaker의 지원 자원 유형을 발견한다. Security Hub 활성화 외 추가 설정은 필요하지 않다. |
| 자체 호스팅 AI | Inspector의 EC2/ECR SBOM으로 모델, 추론 서버와 지원 에이전트를 발견한다. Inspector 활성화가 필요하다. |
| 외부 AI endpoint | GuardDuty가 EC2의 DNS 활동에서 알려진 AI 서비스 도메인을 감지한다. GuardDuty 활성화가 필요하다. |

EC2의 Inspector agent-based scanning은 enhanced scanning mode가 필요하다. agentless 또는 hybrid도 가능하다. 모델 검색 경로는 기본 캐시와 Inspector에 설정한 사용자 경로다.

## 목록의 공백을 해석한다

- 자체 호스팅 발견은 EC2/ECR에 한정된다. Lambda 등 다른 컴퓨팅 유형은 지원하지 않는다.
- 외부 호출 귀속은 EC2 DNS 기준이며 Fargate, Lambda, SageMaker와 EKS 등 서비스 관리 컴퓨팅의 호출은 귀속하지 않는다.
- ECR 이미지는 부모 호스트에 귀속되지 않아 호스트별 AI 개수에 포함되지 않는다.
- 자체 호스팅 AI 자산에는 이 릴리스에서 finding이 없으며, finding 개수는 관리형 AI에만 표시된다.
- 신뢰도 임계값을 통과한 자원만 목록에 나타난다. 목록이 비었다고 AI 사용이 없다고 판단하지 않는다.

## 조회와 조사

관리자 계정은 조직의 활성화된 계정 범위를, 멤버 계정은 자기 계정만 조회한다. 자체 호스팅 자원의 상세 화면에서 SBOM 구성요소와 DNS 도메인 등 발견 근거를 확인한다.

운영 점검에서는 계정 범위, 수집 전제와 지원 유형을 먼저 확인한다. DNS 관측만으로 전송한 데이터 내용이나 침해 여부를 확정하지 않는다. 이는 발견 신호의 범위에서 도출한 조사 원칙이다.

## 출처

- [AWS Security Hub, AI Inventory in Security Hub](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-v2-ai-inventory.html)

## 관련 문서

- [[Security-Hub-Exposure-Analysis|외부 도달성과 잠재 영향 범위]]
- [[GuardDuty-Investigation|경보 조사와 대응 판단]]
