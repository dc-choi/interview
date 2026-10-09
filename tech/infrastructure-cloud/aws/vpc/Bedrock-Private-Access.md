---
tags: [aws, bedrock, vpc, privatelink, security]
status: done
verified_at: 2026-10-09
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

## 에이전트의 AccessDenied는 호출 주체별로 확인한다

Bedrock Agents의 생성, 준비와 실행 권한, 에이전트가 다른 서비스를 사용하는 권한은 서로 다르다. 아래는 Agents의 권한 구조이며 AgentCore의 실행 역할로 그대로 옮기지 않는다.

| 경계 | 확인할 권한 |
|---|---|
| API 요청자 | 수행할 작업에 맞는 `bedrock:CreateAgent`, `bedrock:PrepareAgent`, `bedrock:InvokeAgent` 등을 확인한다. `InvokeAgent`의 리소스는 agent ARN이 아니라 agent alias ARN이다 |
| 에이전트 서비스 역할의 신뢰 | `bedrock.amazonaws.com`의 `sts:AssumeRole`을 허용하고 `aws:SourceAccount`, `aws:SourceArn`으로 출처를 제한한다 |
| 서비스 역할의 모델 접근 | 선택한 모델에 대한 `bedrock:InvokeModel`을 확인한다. inference profile 사용 시 profile ARN과 추가 action이 필요하므로 해당 공식 정책 예제를 함께 확인한다 |
| 액션 그룹 Lambda | Lambda의 resource-based policy에서 Bedrock의 `lambda:InvokeFunction`을 허용한다. 서비스 역할에 Allow를 붙이는 것만으로 끝내지 않는다 |
| 지식 베이스와 S3 | 지식 베이스 검색 권한과 액션 그룹 OpenAPI 스키마의 `s3:GetObject`를 구분한다. 두 권한은 같은 접근이 아니다 |

연결이 성공해도 endpoint policy, SCP, permissions boundary나 명시적 Deny 때문에 호출이 거부될 수 있다. 실패한 action, 호출 역할과 대상 ARN을 먼저 특정하고 [[IAM-Policy|IAM 정책 평가]]에 따라 좁힌다. 진단을 위해 전체 관리자 권한을 상시 부여하지 않는다.

## 비공개 연결과 데이터 보존은 별도 설정이다

Bedrock 호출 경로를 비공개로 만들었다고 프롬프트와 응답이 어디에도 저장되지 않는 것은 아니다. 2026-10-09 공식 문서 기준으로 다음을 나누어 확인한다.

- **서비스의 보존 조건:** 사용하는 모델, API와 리전의 data retention 설정을 확인한다. 모델에 따라 안전성 검토를 위한 보존이 있을 수 있으므로 서비스 이름만으로 무보존을 약속하지 않는다. `none` 설정과 보존이 필요한 모델은 호환되지 않아 요청이 차단될 수 있다.
- **고객 계정의 호출 로그:** model invocation logging은 기본 비활성화지만, 켜면 지원되는 호출의 입력, 출력과 메타데이터를 CloudWatch Logs 또는 S3에 기록할 수 있다. 현재 이 기능은 `bedrock-runtime` 호출을 대상으로 하며 모든 endpoint에 적용되는 것은 아니다.
- **애플리케이션의 보관:** 대화 DB, 첨부파일, 검색 색인과 도구 실행 로그는 서비스의 추론 보존 설정과 별도로 점검한다. 이것은 애플리케이션 설계 항목이며 Bedrock 설정 하나로 삭제된다고 가정하지 않는다.

민감한 자료를 넣기 전에 실제 호출 경로와 저장 위치, 접근 역할, 보유기간을 확인한다. 비공개 전송, 모델 제공자의 접근 여부, AWS의 보존과 고객 계정의 로그 보관을 하나의 보안 보장으로 합치지 않는다.

## 비공개 OpenSearch Serverless를 지식 베이스에 연결한다

2026-10-10 공식 문서 대조 기준. 애플리케이션에서 Bedrock으로 들어가는 endpoint와 Bedrock Knowledge Bases에서 벡터 저장소로 나가는 접근은 별도 경계다.

| 경계 | 확인할 설정 |
|---|---|
| 컬렉션 네트워크 | network policy의 대상 컬렉션에 `AllowFromPublic: false`, `SourceServices: ["bedrock.amazonaws.com"]`을 설정한다 |
| 지식 베이스 서비스 역할 | 해당 컬렉션 ARN에 대한 IAM `aoss:APIAccessAll` 권한을 확인한다. 모델과 원본 데이터 접근 권한도 별도 필요하다 |
| 데이터 작업 | data access policy의 `Principal`에 서비스 역할을 넣고 대상 컬렉션과 인덱스에 필요한 작업을 허용한다. IAM 권한만으로 이 정책을 대신하지 않는다 |
| 운영자 접근 | 운영자가 인덱스를 생성하거나 조회하는 경로와 권한을 별도로 구성한다. 비공개 경로에는 OpenSearch Serverless 관리형 VPC endpoint를 허용할 수 있다 |

AWS 서비스의 private access는 컬렉션의 OpenSearch endpoint에 적용되며 Dashboards 접근까지 열지 않는다. Dashboards를 사용하려면 운영자에게 필요한 네트워크 경로와 권한을 별도로 확인한다. 화면 접근을 위해 컬렉션 자체를 공개하는 것을 필수 절차로 두지 않는다.

같은 컬렉션에 공개 허용 규칙이 겹치면 비공개 규칙보다 공개 허용이 우선한다. 이름 패턴으로 연결된 정책까지 함께 확인한다. 연결 시험은 서비스 역할의 수집과 검색, 운영자의 관리 작업을 나누어 수행한다. 이는 적용 점검 제안이며 이번 문서화에서 AWS 계정의 실제 연결을 시험한 것은 아니다.

## 출처

- [Amazon OpenSearch Service, Network access for Amazon OpenSearch Serverless](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-network.html)
- [Amazon OpenSearch Service, Data access control for Amazon OpenSearch Serverless](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-data-access.html)
- [Amazon Bedrock, Create a service role for Amazon Bedrock Knowledge Bases](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-permissions.html)

- [Amazon Bedrock, Identity-based policy examples for Amazon Bedrock Agents](https://docs.aws.amazon.com/bedrock/latest/userguide/security_iam_id-based-policy-examples-agent.html)
- [Amazon Bedrock, Create a service role for Amazon Bedrock Agents](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-permissions.html)
- [Amazon Bedrock, Data retention](https://docs.aws.amazon.com/bedrock/latest/userguide/data-retention.html)
- [Amazon Bedrock, Monitor model invocation using CloudWatch Logs and Amazon S3](https://docs.aws.amazon.com/bedrock/latest/userguide/model-invocation-logging.html)
- [Amazon Bedrock, Use interface VPC endpoints](https://docs.aws.amazon.com/bedrock/latest/userguide/vpc-interface-endpoints.html)
- [Amazon VPC, Control access to VPC endpoints using endpoint policies](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-access.html)
- [생성형 AI 보안 강화 전략의 첫번째, 심층 방어 아키텍처 설계 — Amazon Web Services Korea](https://www.youtube.com/watch?v=eI6rrOVDc_I)

## 관련 문서

- [[VPC-Connectivity|VPC 연결과 endpoint]]
- [[IAM|IAM 권한 평가]]
- [[LLM-Application-Security|LLM 애플리케이션 보안]]
