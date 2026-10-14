---
tags: [aws, bedrock, vpc, privatelink, security, iam, knowledge-base]
status: done
verified_at: 2026-10-14
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

## 모델 커스터마이징의 저장소와 암호화 키를 나눈다

2026-10-10 Bedrock 공식 문서 기준, model customization의 입력 파일은 고객 S3 버킷에 있고, 출력 지표 파일은 작업에서 지정한 S3 버킷에 저장된다. 생성된 custom model artifact는 AWS가 관리하는 S3 버킷에 저장된다. 세 대상을 하나의 저장소나 하나의 키 설정으로 취급하지 않는다.

- custom model은 기본적으로 AWS owned key로 암호화되며 customer managed key를 선택할 수 있다. 고객 S3 버킷의 암호화 설정과는 별도다.
- 출력 파일은 대상 S3 버킷의 SSE-S3 또는 SSE-KMS 설정을 따른다. 입력과 출력 버킷의 접근 권한, 암호화와 보관 정책을 각각 확인한다.
- custom model에 customer managed key를 사용하면 Bedrock은 KMS grant를 이용한다. grant를 철회하거나 키 정책에서 접근을 제거하면 해당 키로 암호화한 모델에 접근할 수 없게 된다.

저장 시 암호화가 학습 데이터의 출력 노출까지 막지는 않는다. 공식 문서는 미세조정한 모델이 학습 데이터 일부를 응답으로 재현할 수 있음을 명시한다. 출력되면 안 되는 기밀 자료는 학습 전에 제거한다. 네트워크 비공개 연결, 저장 암호화와 모델 출력 검사는 서로 다른 통제다.

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

## 지식 베이스 생성 오류는 막힌 주체부터 나눈다

2026-10-14 Bedrock, OpenSearch Serverless 공식 문서와 AWS 지원 문서 대조 기준. 지식 베이스 생성 오류는 요청자의 IAM 권한, 서비스 역할의 신뢰와 권한, 벡터 저장소의 정책 중 어디에서 막혔는지 먼저 나눈다. 루트 사용자로는 지식 베이스를 만들 수 없으므로 IAM 사용자나 역할로 시작한다.

| 오류나 증상 | 막힌 경계 | 확인할 설정 |
|---|---|---|
| `Bedrock Knowledge Base was unable to assume the given role`, 또는 콘솔에서 지식 베이스를 만들 때 기존 서비스 역할 목록에 사용자 지정 역할이 보이지 않음(AWS 지원 영상 기준) | 서비스 역할의 신뢰 | trust policy가 `bedrock.amazonaws.com`의 `sts:AssumeRole`을 허용하는지, `aws:SourceAccount`와 `aws:SourceArn`(`knowledge-base/*`) 조건이 실제 계정과 리전에 맞는지 본다. 생성 뒤에는 `*`를 실제 지식 베이스 ID로 좁힌다 |
| `... is not authorized to perform: iam:CreateRole` | 요청자의 역할 생성 | Bedrock에 새 서비스 역할 생성을 맡겼다면 요청자에게 `iam:CreateRole`과 `iam:CreatePolicy`가 필요하다. AWS 지원 문서는 역할에 정책을 붙이는 `iam:AttachRolePolicy`, `iam:PutRolePolicy`도 함께 허용하라고 안내한다. OpenSearch Service(Serverless 포함)를 벡터 저장소로 쓰는 지식 베이스면 `aoss:CreateAccessPolicy`, `iam:CreateServiceLinkedRole` 등 추가 권한도 필요하다 |
| `... is not authorized to perform: iam:PassRole` | 요청자의 역할 전달 | 요청자의 identity policy가 서비스 역할 ARN에 대한 `iam:PassRole`을 허용하는지 본다. `iam:PassedToService`는 `bedrock.amazonaws.com`으로 제한할 수 있다 |
| `ValidationException`의 `The knowledge base storage configuration provided is invalid...`(OpenSearch Serverless는 `[security_exception] 403 Forbidden`) | 서비스 역할의 벡터 저장소 권한 | OpenSearch Serverless면 서비스 역할의 컬렉션 ARN 대상 `aoss:APIAccessAll`과 data access policy의 `Principal`을 함께 본다. Secrets Manager secret으로 인증하는 벡터 저장소면 그 secret의 `secretsmanager:GetSecretValue`와, 고객 관리형 키로 암호화한 경우 그 키의 `kms:Decrypt`를 확인한다 |
| 같은 오류의 `[http_exception] server returned 401` | 컬렉션 네트워크 | 비공개 컬렉션의 network policy가 AWS 서비스 비공개 접근으로 `bedrock.amazonaws.com`을 허용하는지 위 절의 컬렉션 네트워크 설정으로 확인한다 |
| 같은 오류의 `no such index [bedrock-knowledge-base-default-index]` | 인덱스 존재와 반영 | 서비스 역할의 컬렉션 권한과 `vectorIndexName`의 인덱스가 실제로 있는지 본다. 운영자가 그 인덱스를 조회하거나 직접 만들 수 있으면 반영 지연일 수 있으므로 기다린 뒤 다시 시도하고, 만들 수 없으면 운영자의 권한부터 고친다. S3 데이터 소스면 AWS 지원 문서는 버킷의 CORS 설정 누락도 원인으로 들지만 Bedrock 사용 설명서의 지식 베이스 권한과 생성 문서에는 이 요구가 없으므로, 인덱스와 권한을 확인한 뒤에도 남을 때만 검토한다 |

AWS 관리형 정책 `AmazonBedrockFullAccess`(2026-10-14 확인한 v11)는 ARN이 `role/*AmazonBedrock*`에 맞는 역할을 `bedrock.amazonaws.com`에 전달하거나, `role/*SageMaker*ForBedrock*`에 맞는 역할을 `sagemaker.amazonaws.com` 또는 `bedrock.amazonaws.com`에 전달할 때만 `iam:PassRole`을 허용한다. `iam:CreateRole`과 `iam:CreatePolicy`는 포함하지 않는다. 이 정책만 가진 요청자는 두 패턴에 맞지 않는 사용자 지정 역할을 고르면 PassRole 오류를, 새 역할 생성을 맡기면 CreateRole 또는 CreatePolicy 오류를 받을 수 있다. PassRole의 일반 진단은 [[IAM-Policy|IAM 정책 평가]]의 PassRole 절을 따른다.

OpenSearch Serverless 공식 문서는 data access policy를 만든 뒤 권한이 적용되기까지 약 1분, 수정한 뒤 몇 분이 걸릴 수 있다고 안내한다. AWS 지원 문서는 운영자가 인덱스를 직접 만들 수 있는데도 `no such index`가 나면 약 5분 기다리라고 안내한다. 운영자가 콘솔의 인덱스 탭에서 403을 받으면 그 principal이 data access policy에 없는지, IAM의 `aoss:APIAccessAll`(Dashboards를 쓰면 `aoss:DashboardsAccessAll`도)이 없는지 확인한다. data access policy의 권한은 합산되고 정책 안에서 명시적으로 거부할 수 없으므로, 넓은 패턴의 정책이 있으면 다른 정책으로 좁히지 못한다.

벡터 저장소를 연결하는 지식 베이스의 서비스 역할에는 벡터 저장소 외의 실행 권한도 필요하다. 관리형 지식 베이스(Amazon Bedrock Managed Knowledge Base)는 별도 서비스 역할 문서를 따른다. 관리형 지식 베이스를 만들 때 지정한 고객 관리형 키는 키 정책으로 생성 주체에게 권한을 주고 Bedrock이 그 키에 만든 grant로 쓰므로, 서비스 역할에는 그 키의 권한이 필요하지 않다.

- 임베딩: 선택한 임베딩 모델 ARN에 대한 `bedrock:InvokeModel`, 리소스 `*`에 대한 `bedrock:ListFoundationModels`, `bedrock:ListCustomModels`
- S3 데이터 소스: 데이터 소스 버킷과 prefix로 한정한 `s3:ListBucket`, `s3:GetObject`. 고객 관리형 키로 암호화했으면 그 키의 `kms:Decrypt`
- 수집 작업 암호화: 수집 중 임시 저장 데이터에 고객 관리형 키를 지정하면 그 키에 대한 `kms:GenerateDataKey`, `kms:Decrypt`

`CreateDataSource`, `UpdateDataSource`, `StartIngestionJob`은 역할을 전달하지 않아 `iam:PassRole` 검사가 적용되지 않는다. 수집은 지식 베이스에 이미 연결된 서비스 역할로 실행되므로, 데이터 소스를 관리할 수 있는 주체는 S3 권한 없이도 그 역할이 읽을 수 있는 위치를 수집해 `Retrieve`로 조회할 수 있다. 서비스 역할의 읽기 범위를 필요한 버킷과 prefix로 좁히고 데이터 소스 작업을 특권 작업으로 관리한다.

콘솔의 Quick create에서 Amazon OpenSearch Serverless를 고르면 컬렉션과 인덱스, 필수 필드를 함께 만든다(Aurora PostgreSQL Serverless, Neptune Analytics, S3 Vectors도 고를 수 있다). 공식 문서는 벡터 저장소 자동 생성을 원하면 API 대신 콘솔을 쓰라고 안내한다. API나 IaC로 기존 컬렉션에 연결할 때는 컬렉션을 만들어도 인덱스가 생기지 않으므로 인덱스를 먼저 만든다. 벡터 필드(faiss 엔진, 임베딩 모델과 같은 차원), 텍스트 필드와 Bedrock 관리 메타데이터 필드를 두고 그 이름을 지식 베이스의 `vectorIndexName`과 `fieldMapping`에 맞춘다. 2026-10-14 CloudFormation Template Reference 기준 `AWS::OpenSearchServerless::Index`로 `knn_vector` 필드와 k-NN method를 선언할 수 있다. 쓰는 IaC 도구에 인덱스 리소스가 없으면 Lambda 같은 custom resource로 만든다. 직접 만들든 IaC로 만들든 인덱스를 만드는 주체에게 IAM `aoss:APIAccessAll`과 data access policy의 `aoss:CreateIndex`가 필요하다.

## 출처

- [Amazon Bedrock, Encryption of custom models](https://docs.aws.amazon.com/bedrock/latest/userguide/encryption-custom-job.html)
- [Amazon OpenSearch Service, Network access for Amazon OpenSearch Serverless](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-network.html)
- [Amazon OpenSearch Service, Data access control for Amazon OpenSearch Serverless](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-data-access.html)
- [Amazon Bedrock, Create a service role for Amazon Bedrock Knowledge Bases](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-permissions.html)
- [Amazon Bedrock, Create a service role for managed Amazon Bedrock Knowledge Bases](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-managed-permissions.html)
- [Amazon Bedrock, Prerequisites for creating an Amazon Bedrock knowledge base with a unstructured data source](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-prereq.html)
- [Amazon Bedrock, Prerequisites for using a vector store you created for a knowledge base](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-setup.html)
- [Amazon Bedrock, Create a knowledge base by connecting to a data source](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-create.html)
- [Amazon Bedrock, Encryption of knowledge base resources](https://docs.aws.amazon.com/bedrock/latest/userguide/encryption-kb.html)
- [AWS Managed Policy Reference, AmazonBedrockFullAccess](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonBedrockFullAccess.html)
- [AWS CloudFormation, AWS::OpenSearchServerless::Index](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-opensearchserverless-index.html)

- [Amazon Bedrock, Identity-based policy examples for Amazon Bedrock Agents](https://docs.aws.amazon.com/bedrock/latest/userguide/security_iam_id-based-policy-examples-agent.html)
- [Amazon Bedrock, Create a service role for Amazon Bedrock Agents](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-permissions.html)
- [Amazon Bedrock, Data retention](https://docs.aws.amazon.com/bedrock/latest/userguide/data-retention.html)
- [Amazon Bedrock, Monitor model invocation using CloudWatch Logs and Amazon S3](https://docs.aws.amazon.com/bedrock/latest/userguide/model-invocation-logging.html)
- [Amazon Bedrock, Use interface VPC endpoints](https://docs.aws.amazon.com/bedrock/latest/userguide/vpc-interface-endpoints.html)
- [Amazon VPC, Control access to VPC endpoints using endpoint policies](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-access.html)
- [생성형 AI 보안 강화 전략의 첫번째, 심층 방어 아키텍처 설계 — Amazon Web Services Korea](https://www.youtube.com/watch?v=eI6rrOVDc_I)
- [How do I troubleshoot permission errors that I get when I create a knowledge base in Amazon Bedrock? — AWS re:Post Knowledge Center](https://repost.aws/knowledge-center/bedrock-knowledge-base-permission-errors)
- [How do I troubleshoot permission errors when creating a knowledge base in Amazon Bedrock? — Amazon Web Services](https://www.youtube.com/watch?v=LYkLyNiVGeg)

## 관련 문서

- [[VPC-Connectivity|VPC 연결과 endpoint]]
- [[IAM|IAM 권한 평가]]
- [[IAM-Policy|IAM 정책과 PassRole]]
- [[OpenSearch-Service-Security-Observability|OpenSearch Serverless 보안 경계]]
- [[LLM-Application-Security|LLM 애플리케이션 보안]]
