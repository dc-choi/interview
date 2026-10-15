---
tags: [infrastructure, aws, organizations, multi-account, governance, scp]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["Organizations", "AWS Organizations", "SCP", "Service Control Policy"]
---

# AWS Organizations

여러 AWS 계정을 **동시에 관리**해주는 글로벌 서비스. 멀티 계정 전략의 기반.

## 핵심

- **관리 계정 (Management Account)** + **멤버 계정 (Member Account)** 구성
- 멤버 계정은 한 조직에만 소속됨
- **통합 결제** (Consolidated Billing): 모든 계정 비용 합산 청구
- API로 계정 자동 생성 가능
- 모든 계정에 CloudTrail 활성화 → 중앙 S3 계정으로 로그 전송 가능
- 관리 계정에서 모든 멤버 계정 관리

## 멀티 계정 전략 이점

- **계정과 VPC의 경계가 다르다** — 계정은 권한, 비용과 워크로드의 분리 단위이고 VPC는 네트워크 경계다. 계정 분리만으로 안전성이 보장되지는 않는다
- 환경별 격리 (dev/staging/prod)
- 비용 분리 (팀, 프로젝트별)
- 폭발 반경 축소

## 계정과 OU를 나누는 기준

부분 검증(2026-10-16): AWS 멀티 계정 설계 원칙을 대조했다. OU는 회사 조직도를 그대로 복사하기보다 같은 보안, 규제와 운영 통제가 필요한 계정을 묶는 단위로 사용한다. 공통 SCP를 OU에 적용하면 계정마다 같은 정책을 따로 관리하는 부담을 줄일 수 있다.

운영과 비운영 워크로드를 분리하고, 운영 계정에는 하나 또는 밀접하게 연결된 소수 워크로드를 배치하는 것이 AWS의 권고다. 처음부터 깊은 OU 계층을 만들기보다 필요한 범위부터 확장한다. 관리 계정에는 그 계정에서만 관리해야 하는 자원과 데이터로 범위를 제한하고 일반 워크로드 배치를 피한다. 관리 계정에 SCP가 적용되지 않기 때문이다.

계정 분리는 영향 범위를 줄이는 수단이다. 계정 간 역할과 공유 서비스의 의존성이 남아 있으면 장애나 권한 오용의 영향이 다른 계정으로 이어질 수 있으므로 실제 접근 경로도 검토한다(설계 점검 제안). 이 절만 대조했으며 기존 정책 기능 전체의 검증일은 유지한다.

## SCP (Service Control Policy)

- 조직 루트, OU와 계정에 연결하는 조직 정책이다. 멤버 계정의 주체가 가질 수 있는 **권한 상한**을 제한하며 권한을 직접 부여하지 않는다.
- IAM 정책과 비슷한 문법으로 허용 목록이나 차단 목록을 작성한다. 실제 접근 허용에는 별도의 IAM 또는 리소스 정책 등이 필요하다.
- 상위 경로의 제한을 하위 OU나 계정에서 더 넓게 허용해 풀 수 없다. `AdministratorAccess`도 SCP의 제한을 넘지 못한다.
- 멤버 계정의 root와 위임 관리자 계정에도 적용하지만 **관리 계정의 사용자와 역할, service-linked role에는 적용하지 않는다**.
- SCP를 사용하려면 Organizations의 all features가 필요하다. 통합 결제만 활성화한 조직에서는 사용할 수 없다.

## SCP, RCP와 선언적 정책의 경계

| 정책 | 통제 대상 | 예시 |
|---|---|---|
| SCP | 멤버 계정의 IAM 주체가 수행할 수 있는 작업 | 조직 내부 역할이 특정 서비스를 사용하지 못하게 제한 |
| RCP | 멤버 계정의 지원 리소스에 대한 접근 | 외부 주체가 조직 내부 S3 리소스에 접근하는 조건 제한 |
| 선언적 정책 | 지원 서비스의 설정 기준 | 서비스 수준에서 조직의 구성 기준 유지 |

SCP는 조직 외부 주체의 권한을 직접 제한하지 않는다. 외부 계정에 열어 둔 버킷을 보호하려면 리소스 정책과 RCP의 적용 여부를 함께 본다. RCP도 권한을 부여하지 않으며 관리 계정의 리소스와 service-linked role에는 적용하지 않는다. 모든 서비스에 같은 RCP가 적용된다고 가정하지 말고 지원 목록을 확인한다.

선언적 정책은 API 호출 권한 대신 서비스 control plane에서 구성 기준을 집행한다. 정책 유형별 지원 속성과 상속 규칙을 확인하며 SCP의 평가 방식을 그대로 대입하지 않는다. [[AWS-Control-Tower|Control Tower]]의 탐지 통제는 위반을 알리는 별도 기능이다.

### TLS 강제 RCP의 범위를 읽는 방법

부분 검증(2026-10-13): Organizations의 RCP 구문 예제는 `Action: s3:*`, `Resource: *`와 `aws:SecureTransport` 조건을 조합해 TLS를 사용하지 않는 S3 요청을 거부한다. 여기서 `Resource: *`는 모든 AWS 통신을 암호화한다는 뜻이 아니다. 실제 범위는 statement의 작업, RCP 지원 리소스와 정책이 연결된 계정 경계로 결정된다.

`aws:SecureTransport`는 요청이 TLS를 사용하는지 검사한다. 이 조건만으로 저장 데이터의 암호화 방식이나 KMS 키 선택까지 강제하지는 않는다. 전송 보호와 저장 시 암호화의 요구사항은 별도 정책과 설정으로 검증한다.

2026-10-14 AWS RCP 샘플 저장소 대조 기준, HTTPS 강제 샘플은 `Principal: *`와 `BoolIfExists` 조건으로 `aws:SecureTransport`가 `false`인 요청을 거부한다. 대상 작업은 S3, STS, KMS, SQS, Secrets Manager, Cognito(`cognito-identity`, `cognito-idp`), CloudWatch Logs, DynamoDB, ECR, OpenSearch Serverless(`aoss`)다. RCP 지원 서비스 목록은 이 샘플보다 넓고 바뀔 수 있으므로 조직이 쓰는 서비스와 샘플의 `Action`을 대조하고, 목록에 없는 서비스는 이 정책으로 보호되지 않는다고 본다.

RCP 예제는 그대로 배포하라는 권고가 아니다. 테스트 OU에서 허용할 TLS 요청과 거부할 비 TLS 요청, 서비스 연동에 필요한 예외를 확인한 뒤 범위를 넓힌다. 관리 계정 리소스와 service-linked role 호출은 RCP의 제한 대상이 아니라는 점도 검증 대상 선정에 반영한다. 이는 정책 문서 대조에 따른 점검 절차이며 실제 조직에 적용한 결과가 아니다. 기존 절 전체의 검증일은 유지한다.

## 초기 조직에서 먼저 검토할 예방 통제

부분 검증(2026-10-14): Organizations의 SCP와 S3 정책 문서, IAM root 관리 문서, S3 Block Public Access 문서, Bedrock 교차 리전 추론 문서, GuardDuty 권한 참조와 AWS 샘플 정책 저장소를 대조했다. 이 절만 대조했으며 문서 전체의 검증일은 유지한다.

운영 담당자가 따로 없는 초기 조직은 한 번 연결하면 멤버 계정마다 반복 설정하지 않아도 되는 거부 정책부터 검토할 수 있다(운영 제안). 샘플은 그대로 배포할 정책이 아니며 아래 적용 전 검증 순서대로 테스트 OU에서 넓힌다.

- **승인 리전 외 사용 차단(SCP):** `aws:RequestedRegion`이 승인 리전이 아니면 Deny하고 글로벌 서비스는 `NotAction`으로 제외하며, 지정한 관리 역할만 `ArnNotLike` `aws:PrincipalArn`으로 예외 처리한다. 글로벌 서비스 목록은 길고 바뀌므로 최신 샘플과 대조한다. 적용 범위와 예외는 [[AWS-Control-Tower|Control Tower의 리전 차단]]을 본다.
  - Bedrock 교차 리전 추론은 리전 차단 SCP에서 따로 다룬다. 지리 프로필은 프로필의 대상 리전을 모두 허용하거나 `bedrock:InferenceProfileArn` 조건으로 프로필 예외를 둔다. global 프로필은 리전 무관 모델 리소스를 평가할 때 `aws:RequestedRegion`이 `unspecified`이므로 허용 목록에 `unspecified`를 넣거나 같은 조건으로 예외를 둔다. 프로필 예외를 쓰면 다른 서비스의 허용 리전을 넓히지 않아도 되지만, 원래 호출 리전의 차단까지 풀리지는 않는다.
- **멤버 계정 root 사용 차단(SCP):** `aws:PrincipalArn`이 `arn:aws:iam::*:root`와 `ArnLike`로 맞으면 Deny한다. 이 조건 키에 root ARN을 쓰면 해당 계정의 root 사용자만 제한하며, 리소스 정책의 `Principal`에 root ARN을 써서 계정에 권한을 위임하는 것과 의미가 다르다. 관리 계정 예외에 더해 root로 Enterprise Support 플랜에 가입하는 일 같은 일부 root 작업은 SCP로 막을 수 없다.
- **보안 서비스 중단 방지(SCP):** CloudTrail의 `StopLogging`, `DeleteTrail`, `UpdateTrail`, `PutEventSelectors`, Config의 `StopConfigurationRecorder`, `DeleteConfigurationRecorder`, `DeleteDeliveryChannel`, GuardDuty의 `DeleteDetector`, `UpdateDetector`, `DisassociateFromAdministratorAccount` 같은 작업을 Deny하고 보안 운영 역할만 `ArnNotLike` `aws:PrincipalArn`으로 예외 처리한다. 사용 중단된 이전 이름 `DisassociateFromMasterAccount`도 별도 IAM 작업으로 남아 있고 AWS 샘플에는 이 이름만 있으므로 두 작업을 함께 거부한다. AWS 샘플의 CloudTrail 정책은 보호할 trail ARN을 지정한다. 조직 trail은 멤버 계정 사용자가 삭제하거나 로깅을 끄거나 기록할 이벤트 유형을 바꿀 수 없어 CloudTrail 보호의 대안이 된다.
- **전송 구간 TLS 강제(RCP):** 위의 TLS 강제 RCP 절을 본다.
- **S3 퍼블릭 액세스 차단 설정 보호:** 아래 S3 절을 본다.

예외로 둔 관리 역할을 다른 주체가 수정하거나 맡을 수 있으면 예외가 우회 경로가 된다. AWS 샘플에는 지정한 역할의 정책과 신뢰 정책 변경, `sts:AssumeRole`을 관리 역할 외에는 거부하는 SCP가 있으므로 함께 검토한다(설계 점검).

### root 자격 증명의 중앙 관리

IAM의 Organizations 신뢰 접근을 켜고 root 자격 증명 관리와 멤버 계정의 privileged root 작업을 활성화하면, 관리 계정이나 IAM 위임 관리자가 멤버 계정의 root 비밀번호, access key, 서명 인증서를 지우고 MFA를 비활성화할 수 있다. 활성화 뒤 Organizations에서 만드는 새 계정은 기본적으로 root 자격 증명이 없다.

root가 필요한 일부 작업은 `sts:AssumeRoot`로 받은 짧은 privileged session에서 한다. 세션 범위는 `S3UnlockBucketPolicy`, `SQSUnlockQueuePolicy`, `IAMDeleteRootUserCredentials` 같은 작업 정책으로 정하며, 모든 주체를 거부하는 버킷 정책이나 큐 정책 삭제, root 자격 증명 삭제와 비밀번호 복구 허용이 여기에 해당한다. `AssumeRoot`는 전역 STS endpoint를 지원하지 않아 리전 endpoint로 호출한다.

root 차단 SCP를 쓰면서 이 세션을 허용하려면 AWS 샘플처럼 `aws:AssumedRoot` 키가 없는 요청(`Null` 조건)에만 Deny를 건다. 자격 증명 삭제는 root 로그인과 복구 경로를 없애고, SCP는 root 주체의 작업 권한을 제한한다는 점에서 역할이 다르다.

### S3 퍼블릭 액세스 차단 설정 보호

S3 Block Public Access(BPA)는 조직, 계정, 버킷과 액세스 포인트 수준에서 설정하며 S3는 적용되는 설정 중 가장 엄격한 조합을 쓴다. BPA는 기존 버킷 정책과 ACL을 바꾸지 않으므로 설정을 해제하면 공개 정책이나 ACL이 남은 리소스가 다시 공개된다. 그래서 설정을 켜는 것과 해제를 막는 것을 함께 설계한다.

| 방식 | 동작 | 제약 |
|---|---|---|
| SCP | 계정 수준 설정은 변경과 삭제 모두 `s3:PutAccountPublicAccessBlock`, 버킷 수준은 `s3:PutBucketPublicAccessBlock`으로 평가되므로 두 작업을 Deny하고 관리 역할만 예외로 둔다 | 관리 계정에는 적용되지 않는다 |
| Organizations의 S3 정책(2025-11-26 출시) | 네 설정을 `all` 또는 `none`으로 함께 지정한다. 연결 범위의 계정 수준 설정을 덮어쓰고 계정 수준 변경을 막으며, 새로 가입한 계정도 위치에 따라 상속한다 | 설정을 하나씩 고를 수 없다. all features와 S3 정책 유형 활성화가 필요하다 |

버킷 수준 Deny는 BPA를 켜는 호출도 같은 작업으로 평가되어 함께 막는다. 버킷을 만들며 BPA를 설정하는 배포 역할은 예외에 넣고, 계정 수준 설정을 SCP나 조직 S3 정책 `all`로 보호해 충분하면 버킷 수준 Deny의 생략을 검토한다(운영 점검).

조직 정책이 `all`이면 버킷 수준에서 BPA를 꺼도 더 엄격한 계정의 유효 설정이 적용된다. 정책을 분리하면 S3가 보존해 둔 이전 계정 수준 설정으로 돌아가므로 분리 전에 그 설정과 공개 정책이 남은 버킷을 확인한다(운영 점검). 공개가 필요한 계정은 정책 연결 범위에서 나누거나 버킷을 공개하지 않는 제공 경로를 검토한다([[S3-Security-Cost|S3 보안과 비용]]).

## 백업 정책의 상속과 실행 조건

2026-10-10 AWS 공식 문서 기준이다. 백업 정책은 조직 루트, OU와 계정에 연결하며, 상위 정책과 계정 정책을 상속 규칙에 따라 합친 **effective backup policy**가 해당 계정의 백업 계획을 결정한다. 하위 정책의 재정의가 가능하므로 조직 전체가 같은 설정이라고 단정하지 않는다.

- **완전한 정책:** 개별 정책은 부분 설정이어도 되지만 최종 effective policy에는 필수 요소가 모두 있어야 한다. 불완전하면 해당 리소스의 백업이 수행되지 않는다.
- **실행 역할과 저장소:** 정책이 참조하는 IAM 역할은 각 대상 멤버 계정에, backup vault는 각 대상 계정의 지정 리전에 미리 존재해야 한다. 정책 연결이나 trusted access 활성화만으로 멤버 계정의 `AWSBackupDefaultServiceRole`이 생성되지는 않는다.
- **리소스 선택:** 태그 기반 선택에서는 정책의 키와 값에 맞는 리소스가 대상이다. OU에 계정을 넣는 것과 그 계정의 모든 리소스가 백업되는 것은 다르다.
- **관리 권한 위임:** AWS Backup의 위임 관리자 등록과 Organizations의 백업 정책 관리 권한 위임을 구분한다. 등록만으로 정책 편집이 허용되지 않으며, 관리 계정의 resource-based delegation policy와 위임 계정 주체의 `AWSBackupOrganizationAdminAccess` 정책 등 필요한 IAM 권한을 함께 확인한다.

운영 점검에서는 effective policy, 선택된 리소스, 실행 역할과 vault, 실제 백업 작업의 성공 여부를 각각 확인한다. 정책 배포 성공을 백업 성공으로 간주하지 않는 것이 이 구조에서 도출되는 점검 원칙이다. 이 절의 검증일은 기존 SCP, RCP 설명 전체의 재검증일이 아니다.

## 태그 규격, 생성 시 필수 태그와 삭제 방지

2026-10-13 AWS 공식 문서 기준, 태그 정책과 SCP는 서로 다른 조건을 통제한다. 태그 정책을 연결한 사실만으로 모든 리소스에 필수 태그가 있다고 판단하지 않는다.

| 통제할 조건 | 수단과 범위 |
|---|---|
| 태그 키의 대소문자와 허용 값 | 태그 정책에 규격을 정의하고 지원하는 리소스 유형의 enforcement를 활성화한다. 태그가 없는 리소스와 정책에 정의되지 않은 태그는 준수 평가 대상이 아니다 |
| 생성 요청의 필수 태그 누락 | 생성 시 태깅과 조건 키를 지원하는 API에 SCP를 적용한다. EC2에서는 `ec2:RunInstances`에 `aws:RequestTag/<키>`의 누락을 `Null` 조건으로 검사해 Deny하는 방식이 있다 |
| 생성 후 필수 태그 삭제 | 생성 차단과 별도로 `ec2:DeleteTags` 등 삭제 작업을 제한한다. 보호할 태그와 기타 태그를 구분하고 실제 요청에서 조건이 작동하는지 검증한다 |

필수 태그가 여러 개이면 각각 빠진 경우를 독립적으로 거부해야 한다. AWS의 EC2 예시는 키마다 별도 Deny statement를 둔다. 태그 정책이 태그의 존재를 강제한다거나 EC2 예시가 모든 서비스의 생성 API에 그대로 적용된다고 일반화하지 않는다.

정상 요청의 IAM 권한도 필요하다. EC2 생성 요청에 태그를 포함하면 `ec2:RunInstances`뿐 아니라 `ec2:CreateTags` 권한도 평가한다. 규격에 맞는 태그를 넣고도 실패하면 SCP를 완화하기 전에 해당 권한과 요청 대상을 확인한다.

테스트 계정에서는 태그 누락, 잘못된 값, 정상 값, 필수 태그 삭제와 기타 태그 변경을 나누어 확인한다(운영 점검 제안). SCP가 적용되지 않는 관리 계정이나 service-linked role의 성공 결과를 멤버 계정 일반 역할의 검증으로 대신하지 않는다. 이 절만 추가 대조했으며 실제 조직 정책을 배포하거나 실행하지 않았다.

## 채팅 애플리케이션의 접속 범위와 실행 권한

부분 검증(2026-10-16): AWS Organizations의 chat applications policy와 Amazon Q Developer in chat applications 권한 문서를 대조했다. 기존 절 전체의 검증일은 유지한다.

채팅 정책은 허용할 Slack workspace와 Microsoft Teams team, Slack 채널의 공개 여부, 사용할 IAM 역할 방식을 조직 수준에서 제한한다. 계정 수준 역할 설정과 channel guardrail보다 우선하며 기존 구성과 새 구성 모두에 적용된다. 정책을 연결한 계정의 최종 effective policy를 확인해야 한다.

- **접속 범위:** JSON의 최상위 키는 `chatbot`이다. Slack의 `workspaces`, `supported_channel_types`와 `supported_role_settings`로 허용 범위를 표현한다. `private`만 허용하는 것은 채널 공개 범위의 제한이며 AWS 명령을 읽기 전용으로 만드는 설정이 아니다.
- **역할 방식:** `channel_role`은 채널 구성원에게 공통 권한을 제공하고, `user_role`은 사용자가 자신의 역할을 선택하도록 한다. 채널 역할의 공유 범위를 Slack workspace 전체로 확대 해석하지 않는다.
- **실행 권한:** 실제 명령에는 IAM 역할 권한이 필요하며 channel guardrail이 그 권한을 추가로 제한한다. 채팅 정책에서 특정 역할 방식을 허용했다는 사실만으로 AWS 리소스 접근 권한이 생기지 않는다.

운영 점검 제안: 테스트 OU에서 허용한 비공개 채널, 금지한 공개 채널, 허용 목록 밖 workspace와 새 구성원의 역할 선택을 나누어 시험한다. 알림 전달과 명령 실행도 각각 확인한다. 이 절은 정책 문서 대조이며 실제 조직 설정이나 채팅 전송을 수행한 기록은 아니다.

## 적용 전 검증

1. 테스트 계정과 작은 OU에서 허용해야 할 업무와 차단할 작업을 함께 실행한다.
2. CloudTrail의 접근 거부와 기존 운영 경로 영향을 확인한다.
3. 영향 범위를 확인한 뒤 상위 OU로 확대한다. 조직 루트에 먼저 붙여 전체를 시험하지 않는다.

정책 이름이나 계정 분리 여부보다 실제 허용과 거부 결과를 증거로 남긴다.

## 시험 빈출 포인트

- 여러 계정 통합 결제: Organizations
- 멤버 계정 주체의 서비스 사용 제한: SCP
- 관리 계정의 주체에는 SCP가 적용되지 않음
- 여러 계정 CloudTrail 중앙 집계: 조직 추적의 수집 범위와 저장 설정 확인
- Firewall Manager, GuardDuty 등의 멀티 계정 연동: Organizations와 각 서비스의 활성화 설정 확인

## 관련 문서

- [[IAM]], [[CloudTrail-Config]], [[Shield-WAF-NetworkFirewall]], [[AWS-Control-Tower]], [[IAM-Best-Practices]], [[S3-Security-Cost]]

## 출처

- [AWS, Design principles for your multi-account strategy](https://docs.aws.amazon.com/whitepapers/latest/organizing-your-aws-environment/design-principles-for-your-multi-account-strategy.html)

- [AWS, Chat applications policies](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_chatbot.html)
- [AWS, Chat applications policy syntax and examples](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_chatbot_syntax.html)
- [AWS, Getting started with chat applications policies](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies-chatbot_getting-started.html)
- [AWS, Understanding Amazon Q Developer in chat applications permissions](https://docs.aws.amazon.com/chatbot/latest/adminguide/understanding-permissions.html)
- [AWS, RCP syntax](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_rcps_syntax.html)
- [AWS, Resource control policy examples](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_rcps_examples.html)
- [AWS IAM, AWS global condition context keys — aws:SecureTransport](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html#condition-keys-securetransport)
- [AWS, Tag policies](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_tag-policies.html)
- [Amazon EC2, Grant permission to tag Amazon EC2 resources during creation](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/supported-iam-actions-tagging.html)
- [Implement AWS resource tagging strategy using AWS Tag Policies and Service Control Policies (SCPs) — AWS](https://aws.amazon.com/blogs/mt/implement-aws-resource-tagging-strategy-using-aws-tag-policies-and-service-control-policies-scps/)
- [AWS, Backup policies](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_backup.html)
- [AWS, Backup policy syntax and examples](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_backup_syntax.html)
- [AWS, AWS Backup and AWS Organizations](https://docs.aws.amazon.com/organizations/latest/userguide/services-that-can-integrate-backup.html)
- [AWS, Managing AWS Backup resources across multiple AWS accounts](https://docs.aws.amazon.com/aws-backup/latest/devguide/manage-cross-account.html)
- AWS SAA C03 Udemy 강의 요약본 (Stephane Maarek, 로컬)
- [AWS, What is AWS Organizations?](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_introduction.html)
- [AWS, Service control policies](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html)
- [AWS, Resource control policies](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_rcps.html)
- [AWS, Authorization policies in AWS Organizations](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_authorization_policies.html)
- [AWS, Declarative policies in AWS Organizations](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_declarative_policies.html)
- [거버넌스 마스터플랜: 클라우드 카오스를 질서로 바꾸는 7가지 방법 — Amazon Web Services Korea](https://www.youtube.com/watch?v=ShOQ8WP51ho)
- [AWS, Amazon S3 policies](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_s3.html)
- [AWS, Amazon S3 policy syntax and examples](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_s3_syntax.html)
- [Amazon S3, Blocking public access to your Amazon S3 storage](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html)
- [Amazon S3 Block Public Access now supports organization-level enforcement — AWS](https://aws.amazon.com/about-aws/whats-new/2025/11/amazon-s3-block-public-access-organization-level-enforcement/)
- [AWS IAM, Centralize root access for member accounts](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_root-enable-root-access.html)
- [AWS IAM, Perform a privileged task on an AWS Organizations member account](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_root-user-privileged-task.html)
- [AWS IAM, AWS global condition context keys — aws:PrincipalArn](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html#condition-keys-principalarn)
- [AWS IAM, AWS global condition context keys — aws:AssumedRoot](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html#condition-keys-assumedroot)
- [AWS CloudTrail, Creating a trail for an organization](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/creating-trail-organization.html)
- [Amazon Bedrock, Route model inference requests across AWS Regions with cross-Region inference](https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html)
- [Amazon Bedrock, Geographic cross-Region inference](https://docs.aws.amazon.com/bedrock/latest/userguide/geographic-cross-region-inference.html)
- [Amazon Bedrock, Global cross-Region inference](https://docs.aws.amazon.com/bedrock/latest/userguide/global-cross-region-inference.html)
- [AWS Service Authorization Reference, Actions, resources, and condition keys for Amazon GuardDuty](https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonguardduty.html)
- [Amazon GuardDuty API Reference, DisassociateFromMasterAccount](https://docs.aws.amazon.com/guardduty/latest/APIReference/API_DisassociateFromMasterAccount.html)
- [Service control policy examples — AWS Samples](https://github.com/aws-samples/service-control-policy-examples)
- [Resource control policy examples — AWS Samples](https://github.com/aws-samples/resource-control-policy-examples)
- [Top 5 preventative controls for AWS Startups — Amazon Web Services](https://www.youtube.com/watch?v=cp6yRtNRazw)
