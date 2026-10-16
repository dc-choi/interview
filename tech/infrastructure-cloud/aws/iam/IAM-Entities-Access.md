---
tags: [infrastructure, aws, iam, security, identity]
status: done
verified_at: 2026-09-03
category: "Infrastructure - AWS"
aliases: ["IAM 엔티티", "IAM User Group Role 액세스 타입", "EC2 인스턴스 프로파일", "Instance Profile"]
---

# IAM 엔티티와 액세스 타입

AWS 리소스에 대한 **인증, 인가**를 관리하는 글로벌 서비스. **누가(Principal), 무엇을(Action), 어디서(Resource), 어떤 조건에서(Condition)** 접근할 수 있는지를 JSON 정책으로 명시. **Region에 국한되지 않는 글로벌 서비스**.

주요 기능:
- AWS 계정에 대한 **공유 액세스** (다수의 사람, 서비스가 단일 계정 사용)
- 서비스, 리소스별 **세분화된 권한** 부여
- EC2, Lambda 등 AWS 서비스에서 실행되는 앱을 위한 **Role 기반** 리소스 접근
- **MFA (Multi-Factor Authentication)** 강제
- **자격 증명 연동 (Identity Federation)** — 외부 IdP 연계

## IAM 구성 요소: identity와 policy

| 구성 요소 | 의미 | 자격증명 |
|--------|------|---------|
| **User** | 사람, 서비스의 영구 ID | Access Key, Console 비밀번호 |
| **Group** | User 묶음 (정책 일괄 부여) | — |
| **Role** | 신뢰 정책과 호출자 권한이 허용한 principal이 AssumeRole해 사용 | **임시 자격증명** (STS) |
| **Policy** | 권한 정의 JSON | — |

AWS 용어에서 IAM identity는 User, Group, Role이다. 이 가운데 인증 주체로 직접 사용할 수 있는 IAM entity는 User와 Role이며, Group은 User의 모음이다. Policy는 권한을 정의해 identity나 리소스에 연결하는 IAM 리소스이지 identity나 entity가 아니다.

Role을 assume하려면 일반적으로 role의 trust policy가 principal을 신뢰하고 호출자 측 identity policy도 대상 role에 대한 `sts:AssumeRole`을 허용해야 한다. 같은 계정의 IAM user ARN을 trust policy의 `Principal`에 직접 넣는 경우처럼 resource-based grant만으로 허용되는 예외가 있다.

**Role 우선 원칙** — 영구 Access Key는 유출 위험. EC2, Lambda, ECS Task에는 **Role 부여**, 사람도 **IAM Identity Center(SSO) → Role AssumeRole**.

## User 액세스 타입

| 타입 | 자격증명 | 용도 |
|------|---------|------|
| **콘솔 액세스** | 비밀번호 + (MFA) | 웹 콘솔 로그인. 별도 로그인 링크(`https://<account>.signin.aws.amazon.com/console`) |
| **프로그래밍 액세스** | Access Key + Secret Access Key | CLI, SDK, API 호출 |

신규 유저 생성 시 기본 권한은 **없음**(빈 정책). **Access Key ID는 생성 후에도 조회할 수 있지만 Secret Access Key는 생성 시점에만 확인할 수 있다.** Secret을 분실하면 기존 키를 삭제하고 새 키를 만든다.

### 장기 키를 발급해야 할 때

2026-10-09 AWS 공식 문서 대조 기준, IAM 사용자당 Access Key는 최대 2개다. 발급 전에 IAM Role 같은 임시 자격증명으로 대체할 수 있는지 먼저 확인한다.

- 키 생성과 리소스 권한 부여는 별개다. 키를 만들었다는 사실만으로 S3 같은 서비스에 접근할 수 있는 것은 아니다.
- 다운로드한 자격증명 파일이나 Secret을 코드, 프로젝트 폴더와 저장소에 넣지 않는다. 보호된 저장 위치에서도 접근 범위를 제한한다.
- 키를 생성한 뒤에는 사용 기록을 감시하고 필요에 따라 갱신하거나 삭제한다. 실제 리소스 접근 검증에서는 필요한 작업의 성공과 허용하지 않은 작업의 거부를 함께 확인한다.

## EC2 인스턴스 프로파일 — 인스턴스에 역할 전달

2026-10-14 AWS 공식 문서 대조 기준이다. EC2에서 실행하는 애플리케이션에는 access key를 저장하지 않고 IAM 역할을 붙인다. EC2는 역할을 인스턴스 프로파일이라는 컨테이너에 담아 인스턴스에 전달한다.

| 항목 | 동작 |
|---|---|
| 생성 | IAM 콘솔에서 EC2를 신뢰할 엔터티로 골라 역할을 만들면 같은 이름의 인스턴스 프로파일이 자동으로 생긴다. CLI, API, SDK에서는 역할과 인스턴스 프로파일을 따로 만들고(`create-instance-profile`, `add-role-to-instance-profile`) 이름이 다를 수 있으므로, 인스턴스에 연결할 때 인스턴스 프로파일의 이름이나 ARN을 지정한다 |
| 개수 | 인스턴스 프로파일 하나에는 역할 하나만 들어가고 이 한도는 늘릴 수 없다. 인스턴스에도 역할은 하나만 붙으며, 같은 역할은 여러 인스턴스에 붙일 수 있다 |
| 연결 | 시작할 때 지정하거나 실행 중 또는 중지된 인스턴스에 붙인다. 콘솔에서는 Instances에서 인스턴스를 고른 뒤 Actions, Security, Modify IAM role 순으로 선택한다. 이때 나오는 역할 목록은 실제로 인스턴스 프로파일 이름 목록이다 |
| 교체 | 이미 역할이 붙은 인스턴스는 교체(`replace-iam-instance-profile-association`)로 바꾸며, 교체는 실행 중인 인스턴스에서만 된다. 인스턴스 프로파일에서 역할을 빼는 방식은 반영까지 최대 1시간이 걸릴 수 있어 권장되지 않는다. 역할을 수정하면 그 변경은 역할을 쓰는 모든 인스턴스에 전파된다 |
| 작업자 권한 | 역할을 지정해 시작하거나 연결, 교체, 분리하는 주체에게는 `iam:PassRole`과 필요한 EC2 작업(`ec2:AssociateIamInstanceProfile`, `ec2:ReplaceIamInstanceProfileAssociation`, `ec2:DisassociateIamInstanceProfile`)이 있어야 하고, 콘솔에서는 `iam:ListInstanceProfiles`도 필요하다. `iam:PassRole`의 `Resource`는 전달할 역할 ARN으로 좁힌다([[IAM-Policy|IAM 정책]]의 PassRole 절) |

인스턴스의 코드는 IMDS의 `iam/security-credentials/<역할 이름>`에서 임시 자격 증명을 받는다. AWS가 이 자격 증명을 자동으로 교체하며, 새 자격 증명은 기존 것이 만료되기 최소 5분 전부터 제공된다. AWS SDK와 CLI는 이 값을 스스로 가져와 쓰므로 코드에서 따로 조회하거나 이미 붙은 역할을 다시 `sts:AssumeRole`할 필요가 없다. 세션 태그나 세션 정책을 넘기려고 같은 역할을 다시 위임받는다면 그 역할의 trust policy가 자기 자신의 위임을 명시적으로 허용해야 하며, 없으면 `AccessDenied`가 난다. EC2 역할 자격 증명에는 역할에 설정한 최대 세션 시간이 적용되지 않는다. IMDSv2와 컨테이너의 hop limit은 [[EC2-Network-Access|EC2 네트워크와 접근]]에서 다룬다.

### 자격 증명 선택 순서

AWS CLI는 명령줄 옵션, 환경 변수, 역할 위임 설정, web identity 역할 위임, IAM Identity Center, `credentials` 파일, 외부 프로세스, `config` 파일, 컨테이너 자격 증명을 차례로 확인하고 EC2 인스턴스 프로파일 자격 증명을 마지막에 쓴다. 따라서 인스턴스에 `AWS_ACCESS_KEY_ID` 같은 환경 변수나 `aws configure`로 저장한 키가 남아 있으면 역할을 붙여도 그 자격 증명으로 호출한다. SDK도 공급자 체인을 순서대로 확인하다가 처음 찾은 유효한 자격 증명에서 멈추지만, 순서는 SDK마다 다르므로 사용하는 SDK의 체인을 확인한다. 프로파일 선택의 세부 규칙은 [[IAM-Best-Practices|IAM 모범 사례]]에 있다.

### EC2에서 S3 접근을 점검하는 순서

점검은 누가 호출하는가, 그 주체에게 권한이 있는가, 요청이 S3까지 가는가의 세 질문으로 나뉜다.

1. **호출 주체:** 인스턴스에서 `aws sts get-caller-identity`를 실행한다. EC2 역할로 호출하면 `UserId`가 `<역할 ID>:<인스턴스 ID>` 형태이고 `Arn`은 그 역할의 `assumed-role` 세션이다. IAM 사용자 같은 다른 주체가 나오면 위 순서에서 다른 자격 증명이 먼저 선택된 것이다. 같은 계정이나 같은 Organization 안의 요청이면 대부분의 S3 403 메시지도 요청자 ARN과 거부한 정책 유형을 알려 준다.
2. **역할 권한:** 필요한 작업과 리소스만 허용한다. 객체 목록 조회(`s3:ListBucket`)는 버킷 ARN, 객체 작업은 `bucket/*` ARN에 준다. AWS 관리형 정책 `AmazonS3ReadOnlyAccess`(`s3:Get*`, `s3:List*`, `s3:Describe*` 등)와 `AmazonS3FullAccess`는 특정 버킷으로 좁혀지지 않아 모든 버킷에 적용되므로 그 범위가 실제로 필요할 때만 쓴다.
3. **버킷 정책:** 이 역할에 걸리는 `Effect: Deny` 문을 찾는다. 같은 계정의 버킷은 버킷 정책에 Allow가 없어도 역할 정책의 Allow로 접근할 수 있지만, 다른 계정의 버킷은 역할 정책과 버킷 정책 양쪽에 Allow가 있어야 한다. 특정 엔드포인트나 VPC가 아니면 거부하는 정책(`aws:SourceVpce`, `aws:SourceVpc`)은 그 경로 밖의 요청을 모두 막으며 콘솔 접근도 막는다.
4. **네트워크 경로:** 공인 IP가 있고 라우팅 테이블에 인터넷 게이트웨이로 가는 기본 경로가 있는 인스턴스, NAT 게이트웨이로 가는 기본 경로가 있는 프라이빗 인스턴스, S3 게이트웨이 엔드포인트로 연결된 프라이빗 인스턴스 중 하나여야 한다. 경로가 없으면 요청이 S3에 닿지 않으므로 403이 아니라 연결 실패로 나타난다.
5. **게이트웨이 엔드포인트:** 엔드포인트는 만든 리전에서만 쓸 수 있으므로 버킷과 같은 리전인지, 인스턴스 서브넷의 라우팅 테이블이 엔드포인트에 연결됐는지 본다. CLI나 SDK의 리전 설정이 버킷 리전과 다르면 서브넷 라우팅에 따라 timeout이 나거나 인터넷 경로로 나갈 수 있다. Amazon DNS를 쓰면 VPC의 DNS hostnames와 DNS resolution을 모두 켜고, 자체 DNS 서버면 S3 이름이 AWS가 관리하는 IP로 해석되는지 확인한다. 보안 그룹의 아웃바운드를 기본 규칙보다 좁혔다면 S3 prefix list ID를 대상으로 허용한다. 네트워크 ACL은 기본으로 모든 트래픽을 허용하지만, 제한했다면 prefix list를 참조할 수 없으므로 S3 IP 범위로 HTTPS와 응답용 임시 포트(1024-65535)를 허용한다. 엔드포인트 정책의 기본값은 전체 허용이다. 사용자 지정 정책이면 대상 버킷과 작업을 허용하는지, 드라이버나 에이전트 다운로드, 로그 버킷처럼 AWS 서비스가 쓰는 버킷의 `s3:GetObject`도 허용하는지 확인한다. 정책 변경은 반영까지 몇 분 걸릴 수 있다.
6. **엔드포인트 전환 뒤 조건:** 게이트웨이 엔드포인트를 거치면 S3가 받는 출발지 주소가 공인 주소에서 VPC의 사설 주소로 바뀐다. 이 경로의 요청에는 identity policy나 버킷 정책의 `aws:SourceIp` 조건을 쓸 수 없고 `aws:VpcSourceIp`를 쓴다. 엔드포인트를 만들거나 바꾸면 열려 있던 TCP 연결이 끊기고 이어지지 않으므로 중요한 작업 중에는 피하거나 애플리케이션의 재연결을 확인한다.
7. **조직 정책과 암호화:** AWS Organizations 정책(SCP, RCP)은 기본으로 S3 요청을 막지 않지만 설정에 따라 거부할 수 있다. 고객 관리형 KMS 키로 암호화한 SSE-KMS 객체는 IAM 역할과 키 정책이 다운로드와 멀티파트 업로드에 `kms:Decrypt`, 업로드에 `kms:GenerateDataKey`를 허용해야 한다.
8. **동작 확인:** `aws s3 ls s3://<버킷 이름>`은 객체 목록 조회라 `s3:ListBucket` 권한과 경로를 확인할 뿐이다. 버킷 이름 없이 실행한 `aws s3 ls`는 소유한 버킷 목록 조회라 `s3:ListAllMyBuckets`가 필요하므로, 특정 버킷으로 좁힌 역할의 점검에는 버킷 이름을 붙인다. 객체 읽기와 쓰기는 애플리케이션이 실제로 쓰는 작업으로 따로 확인하고, 허용하지 않은 작업이 거부되는지도 본다.

403 메시지의 정책 유형별 진단은 [[S3-Security-Cost|S3 보안과 비용]]의 접근 거부 진단을, 게이트웨이 엔드포인트의 라우팅과 요금은 [[VPC-Connectivity|VPC 연결]]을 따른다.

## 출처

- [AWS 공식 문서, Manage access keys for IAM users](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html)
- [AWS IAM API, ListAccessKeys](https://docs.aws.amazon.com/IAM/latest/APIReference/API_ListAccessKeys.html)
- [AWS 공식 문서, IAM identities](https://docs.aws.amazon.com/IAM/latest/UserGuide/id.html)
- [AWS 공식 문서, IAM roles and trust policies](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html#id_roles_terms-and-concepts)
- [AWS STS API, AssumeRole permissions](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html)
- [AWS 공식 문서, Use instance profiles](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2_instance-profiles.html)
- [AWS 공식 문서, IAM roles for Amazon EC2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/iam-roles-for-amazon-ec2.html)
- [AWS 공식 문서, Attach an IAM role to an instance](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/attach-iam-role.html)
- [AWS 공식 문서, Grant permissions to attach an IAM role to an instance](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/permission-to-pass-iam-roles.html)
- [AWS 공식 문서, Retrieve security credentials from instance metadata](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-metadata-security-credentials.html)
- [AWS 공식 문서, Authentication and access credentials for the AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-authentication.html)
- [AWS 공식 문서, AWS SDKs and Tools standardized credential providers](https://docs.aws.amazon.com/sdkref/latest/guide/standardized-credentials.html)
- [AWS 공식 문서, IAM policy variables (Principal key values)](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_variables.html#principaltable)
- [AWS STS API, GetCallerIdentity](https://docs.aws.amazon.com/STS/latest/APIReference/API_GetCallerIdentity.html)
- [AWS 관리형 정책 레퍼런스, AmazonS3ReadOnlyAccess](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonS3ReadOnlyAccess.html)
- [AWS 공식 문서, Troubleshoot access denied (403 Forbidden) errors in Amazon S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/troubleshoot-403-errors.html)
- [AWS 공식 문서, Required permissions for Amazon S3 API operations](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-policy-actions.html)
- [AWS CLI Command Reference, s3 ls](https://docs.aws.amazon.com/cli/latest/reference/s3/ls.html)
- [AWS 공식 문서, Gateway endpoints for Amazon S3](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html)
- [How do I grant my Amazon EC2 instance access to an Amazon S3 bucket? — AWS re:Post Knowledge Center](https://repost.aws/knowledge-center/ec2-instance-access-s3-bucket)
- [How do I troubleshoot connectivity issues with my gateway Amazon VPC endpoints? — AWS re:Post Knowledge Center](https://repost.aws/knowledge-center/connect-s3-vpc-endpoint)
- [How can I grant my Amazon EC2 instance access to an Amazon S3 bucket? — Amazon Web Services](https://www.youtube.com/watch?v=0t3su5kggrw)

## 관련 문서
- [[IAM|IAM (인덱스)]]
- [[IAM-Policy|IAM 정책]]
- [[IAM-Role-Federation|AssumeRole과 Federation]]
- [[IAM-Best-Practices|IAM 모범 사례]] — CLI 프로파일과 실제 호출 주체
- [[EC2-Network-Access|EC2 네트워크와 접근]] — IMDSv2와 hop limit
- [[S3-Security-Cost|S3 보안과 비용]] — 접근 거부(403) 진단
- [[VPC-Connectivity|VPC 연결]] — 게이트웨이 엔드포인트
