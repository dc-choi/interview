---
tags: [infrastructure, aws, s3, security, cost]
status: done
category: "Infrastructure - AWS"
aliases: ["S3 보안", "S3 비용", "S3 암호화"]
verified_at: 2026-09-30
---

# S3 보안과 비용, 운영 함정

## 보안

- **Block Public Access** — 계정, 버킷, 액세스 포인트 단위. 2023년 4월부터 새 버킷은 네 설정이 모두 기본 활성. 실수 공개를 막는 상한일 뿐 권한을 주지 않는다(아래 접근 거부 진단)
- **Bucket Policy** — JSON IAM 정책. 구성요소: `Principal`(사용자), `Action`, `Effect`(Allow/Deny), `Resource`(버킷/객체), `Condition`. 버킷 작업(`s3:ListBucket` 등)은 버킷 ARN `arn:aws:s3:::bucket`, 객체 작업(`s3:GetObject`, `s3:PutObject` 등)은 객체 ARN `arn:aws:s3:::bucket/*`에 준다. 버킷 ARN에만 준 권한은 객체 작업에 적용되지 않는다
- **ACL** — AWS 계정 단위로 READ, WRITE, FULL_CONTROL 부여. 권한 관리 한계로 **사용 권장 X**. 새 버킷 기본값인 Object Ownership Bucket owner enforced는 ACL을 끄고 버킷 소유자가 모든 객체를 소유하게 한다. 이 상태에서 `bucket-owner-full-control` 외의 ACL을 지정한 PUT은 400 `AccessControlListNotSupported`로 실패한다. ACL을 켠 버킷에서도 버킷 ACL과 객체 ACL은 별개라 버킷 ACL로 객체 GET 권한을 줄 수 없다
- **Pre-signed URL** — 임시 서명 URL로 인증 없는 사용자에게 GET, PUT 위임 (TTL 명시). 2026-10-14 AWS 문서 기준 만료 상한은 다음과 같다
  - 발급 도구: 콘솔(객체 작업 메뉴의 Share with a presigned URL)은 1분~12시간, AWS CLI의 `aws s3 presign <S3 URI> --expires-in <초>`(GET용 URL, 기본 3,600초)와 SDK는 최대 7일(604,800초)
  - 서명 자격 증명: URL은 서명한 자격 증명보다 오래 유효하지 않다. 7일은 IAM 사용자의 액세스 키로 SigV4 서명할 때의 상한이다. 역할 세션(AssumeRole 기본 1시간)이나 EC2 인스턴스 역할 자격 증명(주기적으로 교체되며 수명은 최대 약 6시간)으로 만든 URL은 더 긴 만료를 지정했어도 서명 시점에 그 세션이나 자격 증명에 남은 시간까지만 유효하다. 서명한 자격 증명을 폐기, 삭제하거나 비활성화하면 일반적으로 그때 함께 만료된다
- **VPC Gateway Endpoint** — VPC 내 S3 통신을 사설망으로 (NAT 비용↓, 보안↑)

### 암호화 (Data at rest / in transit)

| 구분 | 방식 | 키 관리 주체 | 비고 |
|------|------|-------------|------|
| **SSE-S3** | 서버측, AES-256 | S3 | 버킷 기본 암호화를 따로 정하지 않았을 때의 기본값. 2023-01-05부터 신규 업로드 암호화 자체는 끌 수 없음 |
| **SSE-KMS** | 서버측, 한 계층 KMS 암호화 | AWS managed `aws/s3` 또는 customer managed KMS key | key 유형에 따른 제어와 감사. KMS 요청 비용과 bucket key 적용 범위 확인 |
| **DSSE-KMS** | 서버측, 두 계층 KMS 암호화 | customer managed KMS key | 이중 계층 암호화 요구용. 지원 기능과 추가 KMS 비용 확인 |
| **SSE-C** | 서버측, 고객 제공 키 | 고객 (요청마다 전달) | S3가 키 저장 안 함. 2026년 4월부터 새 general purpose bucket과 SSE-C 객체가 없는 계정의 기존 버킷에서 SSE-C 쓰기가 기본 차단(403)되므로 필요하면 버킷 기본 암호화 설정에서 명시적으로 허용 |
| **Client-Side** | 전송 전 클라이언트 암호화 | 고객 (앱, KMS CMK) | S3는 암호문만 받음 |

- **Data in transit**: TLS로 클라이언트와 S3 사이 전송 구간을 암호화하는 별도 축
- **Data at rest**: SSE-S3, SSE-KMS, DSSE-KMS, SSE-C 같은 server-side 방식 또는 업로드 전 client-side 암호화로 보호
- 규제와 위협 모델에 따라 key 통제, 이중 계층 또는 client-side 요구를 확인하고 SSE-KMS, DSSE-KMS와 client-side 방식을 선택

### 업로드 암호화를 정책으로 강제하기

2023-01-05부터 모든 신규 업로드는 헤더가 없어도 버킷 기본 암호화(따로 정하지 않으면 SSE-S3)로 암호화되고 이 암호화는 끌 수 없다. 이미 있던 비암호화 객체는 자동으로 바뀌지 않으므로 `CopyObject`나 S3 Batch Operations Copy로 다시 쓴다. 그래서 정책으로 강제할 대상은 암호화 여부가 아니라 SSE-KMS 같은 특정 방식이나 특정 키다.

```json
{
  "Sid": "DenyPutWithoutSSEKMS",
  "Effect": "Deny",
  "Principal": "*",
  "Action": "s3:PutObject",
  "Resource": "arn:aws:s3:::my-bucket/*",
  "Condition": {
    "StringNotEquals": { "s3:x-amz-server-side-encryption": "aws:kms" }
  }
}
```

- **강제는 명시적 Deny로 한다.** Allow에 조건을 붙이면 그 statement의 허용 범위만 좁아질 뿐이라, 같은 주체에게 조건 없는 `s3:PutObject` Allow가 다른 identity 정책이나 버킷 정책에 있으면 합집합으로 허용된다. 명시적 Deny는 다른 Allow보다 우선한다([[IAM-Policy]]).
- **키가 없으면 부정 연산자는 참이다.** 조건 키가 요청에 없으면 `StringEquals` 같은 일반 연산자는 false지만 `StringNotEquals`, `StringNotLike` 같은 부정 연산자는 true가 된다(`...IfExists`와 `Null` 제외). 위 Deny 한 문장만으로도 헤더를 뺀 업로드가 거부되고, `"Null": {"s3:x-amz-server-side-encryption": "true"}` 문장은 헤더 부재 거부를 명시적으로 드러내는 보강이다.
- **조건 키는 요청 헤더를 본다.** S3 조건 키는 같은 이름의 요청 헤더에 대응하므로 버킷 기본 암호화가 SSE-KMS여도 헤더를 보내지 않는 호출자(기본 암호화에 기대는 SDK 업로드, 암호화를 지정하지 않은 콘솔 업로드 등)는 이 Deny에 걸린다. 버킷 기본 SSE-KMS는 암호화를 지정하지 않은 요청의 기본값이며, 호출자가 `AES256`을 지정하면 SSE-S3로 덮어쓸 수 있다. 모든 신규 객체에 SSE-KMS를 강제하려면 다른 방식을 거부하는 정책이 필요하다. 위 정책은 모든 클라이언트에 SSE-KMS 헤더를 요구하며, S3 Bucket Key는 별도로 선택하는 KMS 요청 비용 절감 기능이다. 특정 키 강제는 `s3:x-amz-server-side-encryption-aws-kms-key-id` 조건에 `arn:aws:kms:region:account:key/key-id` 형식 ARN으로 쓰며, IAM은 그 키가 실제로 있는지 검증하지 않는다.
- **Resource는 객체 ARN이어야 한다.** `s3:PutObject`는 객체 작업이라 Resource를 버킷 ARN(`arn:aws:s3:::my-bucket`)만 쓰면 적용될 리소스가 없어 정책 저장이 `Action does not apply to any resource(s) in statement` 오류로 거부될 수 있다. `arn:aws:s3:::my-bucket/*`로 쓴다.
- 적용 뒤 암호화를 지정하지 않거나 `AES256`을 지정한 업로드가 403, SSE-KMS와 대상 키를 지정한 업로드가 성공하는지 확인한다. SSE-KMS 객체를 읽고 쓰려면 S3 권한과 별도로 KMS 키 권한이 필요하다([[KMS]]).
- 서버 액세스 로그의 대상 버킷은 SSE-S3여야 한다. 대상 버킷의 기본 암호화가 SSE-KMS면 로그가 접근할 수 없는 키로 암호화될 수 있다.

### 접근 거부(403) 진단

같은 AWS Organization 안의 요청이면 403 메시지가 거부한 정책 종류를 알려 주고, 명시적 Deny면 그 정책의 ARN까지 포함한다.

- **Block Public Access는 권한을 주지 않는다.** 공개를 막는 상한일 뿐이라 해제해도 Allow가 없으면 익명 요청은 기본 거부(403)다. 공개 읽기에는 `Principal: "*"`에 대한 `s3:GetObject` Allow가 `bucket/*` 리소스로 있어야 한다. 반대로 설정이 켜져 있으면 공개 정책 저장이 거부되고(`BlockPublicPolicy`), 공개 ACL로만 받은 권한은 무시되며(`IgnorePublicAcls`), 공개 정책이 있는 버킷은 같은 계정 사용자와 AWS 서비스 주체만 접근한다(`RestrictPublicBuckets`).
- **ACL은 기본적으로 평가되지 않는다.** Bucket owner enforced에서는 ACL이 권한 평가에서 빠지므로 객체마다 공개 ACL을 주는 방식은 ACL을 다시 켠 버킷에서만 동작한다. AWS 권장은 ACL을 끈 채 버킷 정책으로 관리하는 것이다.
- **Pre-signed URL의 실패는 응답 코드와 메시지로 원인을 가른다.** 2026-10-14 AWS 문서 기준, 코드 `AccessDenied`(403)에 메시지 `Request has expired`가 오면 URL에 지정한 만료 시각이 지난 것이다. 응답의 만료 시각(`Expires`)과 서버 시각(`ServerTime`)을 비교해 확인하고, 만료된 URL은 다시 쓸 수 없으므로 위의 상한 안에서 새 URL을 발급한다. 서명에 쓴 임시 자격 증명이 먼저 만료되면 400 `ExpiredToken`(The provided token has expired)이 오며, 자격 증명을 갱신한 뒤 새 URL을 만든다. 만료 전인데 다른 메시지의 `AccessDenied`면 URL을 만든 주체의 작업 권한(`s3:GetObject` 등), 버킷 정책의 명시적 Deny와 `s3:signatureAge` 같은 조건을 아래 진단 순서 중 주로 2, 4, 5단계에서 확인한다([[S3-File-Upload-Direct-Transfer#설정한 만료보다 일찍 실패하는 경우|설정한 만료보다 일찍 실패하는 경우]]).
- 진단 순서
  1. 계정, 버킷, 액세스 포인트의 Block Public Access
  2. 버킷 정책과 IAM 정책의 명시적 Deny, Action과 Resource ARN(버킷 ARN과 `bucket/*` 구분)
  3. Object Ownership과 ACL 상태
  4. SSE-KMS 객체면 요청자의 `kms:Decrypt`와 키 정책. SSE-KMS 객체의 GET과 PUT은 TLS와 서명된 요청이 필요해 익명으로 읽을 수 없다
  5. SCP, RCP와 VPC endpoint 정책
- 공개가 목적이면 버킷을 직접 열지 않고 CloudFront와 OAC로 전달한다([[S3-Security-Patterns]]).

## 비용 구조

| 항목 | 과금 |
|------|------|
| 저장 | GB, 월 (클래스별 차등) |
| 요청 | PUT, GET, LIST 단위 |
| 데이터 전송 | 인터넷 송신, 리전 간 전송 등 경로에 따라 과금. 인터넷 수신은 일반적으로 별도 데이터 전송 요금이 없지만 NAT Gateway, 가용 영역 간 전송, 가속 기능과 요청 요금은 별도 확인 |
| Lifecycle 전환 | 객체당 요청 비용 |
| Replication | 복제본 저장 + 데이터 전송 |

흔한 비용 함정: 작은 파일 다수 — 요청 수, 메타데이터 비용 큼. **로그 작은 파일은 batch+gzip로 묶어 PUT**.

### 작은 객체의 클래스 전환 비용

부분 검증(2026-10-14): 이 절은 S3 가격표와 Lifecycle 전환 문서를 대조했다. 기존 보안 절 전체의 검증일은 갱신하지 않는다.

총용량이 같아도 객체 수가 많으면 객체별 Lifecycle 전환 요청 비용이 커진다. 저장 단가만 비교하지 말고 다음 과금 조건을 함께 계산한다.

| 조건 | 비용에 미치는 영향 |
|---|---|
| Glacier Instant Retrieval | 최소 과금 객체 크기는 128 KB, 최소 과금 보관 기간은 90일이다. 즉시 조회할 수 있어도 요청과 데이터 retrieval 요금은 별도다 |
| Glacier Flexible Retrieval과 Deep Archive | 객체마다 메타데이터 40 KB가 추가 과금된다. 8 KB는 Standard, 32 KB는 해당 Glacier 클래스 요금이다. 최소 보관 기간은 각각 90일과 180일이다 |
| 최소 보관 기간 전 삭제, 덮어쓰기나 다른 클래스로 전환 | 사용한 기간의 저장 비용 외에 남은 최소 기간에 대한 비례 요금이 발생한다. 조기 삭제 자체를 금지하는 조건은 아니다 |

2024년 9월부터 새로 만들거나 수정한 Lifecycle 구성은 기본적으로 **128 KB 미만 객체를 어느 클래스로도 전환하지 않는다.** 그 전에 만든 구성은 수정 전까지 이전 기본 동작을 유지한다. 작은 객체를 옮겨야 하면 크기 필터로 기본값을 재정의할 수 있지만, 전환 가능 여부와 비용 절감 여부는 별도로 판단한다. 이는 [[Storage-Tiering#Intelligent-Tiering 동작과 적용 조건|Intelligent-Tiering의 자동 티어링 대상 크기]]와는 다른 규칙이다.

운영 적용 제안: 객체 크기별로 예상 보관 기간의 저장 절감액을 계산하고, 전환 요청, 메타데이터, 조회와 복원 및 조기 삭제 비용 증가분과 비교한다. 필요한 복원 시간을 만족하면서 순절감이 남는 크기 구간에 전환 규칙을 적용한다. 작은 파일을 묶는 방법도 개별 조회와 삭제 요구를 충족할 때 선택한다. 특정 사례의 손익분기 개월 수를 다른 리전이나 데이터 분포에 그대로 적용하지 않는다. 과금 조건은 [S3 가격표](https://aws.amazon.com/s3/pricing/), 전환 기본값은 [Lifecycle 전환 문서](https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html)를 기준으로 확인한다.

## 흔한 실수

- **Lifecycle 미완료 Multipart abort 누락** — part 데이터가 영구 누적
- **버킷명 글로벌 충돌** — 리전 내가 아니라 글로벌 유니크
- **매우 높은 요청률을 한 prefix에 갑자기 집중** — S3는 prefix당 최소 초당 3,500 write, 5,500 read를 지원하고 자동 확장하지만 확장 중 일시적 503이 날 수 있다. 이를 넘는 부하는 여러 prefix, 점진적 ramp-up, retry와 지수 backoff를 함께 검토하며 일반 워크로드에 무조건 hash prefix를 요구하지 않음
- **public ACL 실수** — Block Public Access 강제로 방어
- **익명 쓰기를 여는 튜토리얼 버킷 정책** — `Principal: "*"`의 PutObject 허용은 덮어쓰기와 비용 남용을 연다. 서버 업로드에는 공개 쓰기가 필요 없다([[S3-File-Upload-Operations]])
- **Versioning + 삭제 정책 부재** — old version 누적, 비용 폭증. Lifecycle로 noncurrent version expire
- **Glacier에 자주 접근** — 검색 비용 폭증. 클래스 선택 잘못
- **클라이언트가 S3에 직접 GET 폭주** — CloudFront 앞단으로 캐싱
- **Pre-signed URL TTL 길게** — 만료 전에는 bearer token처럼 재사용될 수 있으며 URL 자체를 사용 후 개별 회전해 폐기하는 API는 없다. 짧은 만료, 임시 credential, `s3:signatureAge`와 network 조건, credential 비활성화 같은 guardrail을 적용

## 시험, 면접 체크포인트

- S3 Standard의 설계 내구성, 가용성과 다중 AZ 모델. One Zone 계열을 포함해 storage class별 가용성 SLA와 복원력을 구분
- Strong Consistency (2020.12)와 그 이전 eventual 모델
- 스토리지 클래스 선택 기준 — 접근 빈도, 최소 보관(IA 30, Glacier 90, Deep 180), 검색 시간
- IA, Glacier → Standard로 **자동 승격 불가** (수동 copy)
- Multipart Upload — 2026-09-03 AWS 문서 기준 5MB-5GB part, **최대 10,000 part**, 모든 리전에서 최대 50 TB 객체(48.8 TiB), 미완료 abort
- prefix당 최소 3.5K write, 5.5K read 요청률과 이를 넘는 high-rate workload의 다중 prefix, 점진적 확장, 503 retry
- Bucket Policy 5요소(Principal, Action, Effect, Resource, Condition)와 버킷 ARN, 객체 ARN(`bucket/*`)의 구분
- at-rest 암호화(SSE-S3, SSE-KMS, DSSE-KMS, SSE-C, Client-Side)와 TLS in-transit 구분
- 업로드 암호화 강제는 명시적 Deny와 부정 연산자의 키 부재 평가로 하는 이유, 2023-01-05 기본 SSE-S3와의 관계
- Block Public Access 해제가 권한을 주지 않는 이유와 403 진단 순서
- CRR/SRR — Versioning 필수, 비동기, 사슬 불가, 기존 객체는 Batch Replication
- Event Notification 타겟 4개(SNS, SQS, Lambda, EventBridge)와 EventBridge 선택 이유
- S3 Select는 신규 고객에게 제공되지 않는다. S3 Object Lambda도 2025-11-07부터 기존 사용 고객과 일부 APN 파트너만 사용할 수 있으므로 새 설계에서는 Athena, 직접 Lambda 호출, API Gateway, Lambda Function URL이나 CloudFront 기반 변환을 요구사항에 맞게 비교
- Pre-signed URL의 보안, TTL 설계, 발급 도구와 서명 자격 증명별 만료 상한, `Request has expired`(403)와 `ExpiredToken`(400)의 구분
- Block Public Access, VPC Endpoint, Object Lock의 보안 계층

## 관련 문서
- [[S3|S3 (인덱스)]]
- [[S3-Security-Patterns|S3 보안 설계 패턴]] — 사용 사례별 아키텍처 (CloudFront, WAF, 계정 분리)
- [[S3-File-Upload-Direct-Transfer|S3 클라이언트 직접 전송]] — presigned URL 발급과 설정한 만료보다 일찍 실패하는 경우
- [[S3-Storage-Performance|S3 스토리지 모델과 성능]]
- [[S3-Features-Management|S3 기능과 데이터 관리]]
- [[IAM|IAM (Bucket Policy, Pre-signed)]]
- [[KMS|KMS (SSE-KMS 키 권한)]]
- [[VPC|VPC Gateway Endpoint]]

## 출처
- [Amazon S3 pricing](https://aws.amazon.com/s3/pricing/)
- [Amazon S3 Lifecycle 전환 조건](https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html)
- [AWS, 기본 SSE-KMS와 요청별 암호화 재정의](https://repost.aws/knowledge-center/s3-aws-kms-default-encryption)
- [AWS What's New — Amazon S3 increases maximum object size to 50 TB](https://aws.amazon.com/about-aws/whats-new/2025/12/amazon-s3-maximum-object-size-50-tb/)
- [Amazon S3 User Guide — What's new](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WhatsNew.html)
- [Amazon S3 Object Lambda availability change](https://docs.aws.amazon.com/AmazonS3/latest/userguide/amazons3-ol-change.html)
- [Amazon S3 Select 사용 가능 범위](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-select.html)
- [Amazon S3 데이터 보호와 암호화 옵션](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingEncryption.html)
- [Amazon S3 성능 최적화](https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance.html)
- [S3 presigned URL](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
- [Amazon S3 presigned URL로 객체 공유(콘솔, CLI, SDK)](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html)
- [AWS CLI s3 presign 명령 레퍼런스](https://docs.aws.amazon.com/cli/latest/reference/s3/presign.html)
- [Amazon S3 API 오류 코드(AccessDenied, ExpiredToken)](https://docs.aws.amazon.com/AmazonS3/latest/API/API_Error.html)
- [How do I troubleshoot the error "Request has expired" when I try to access an S3 object? — AWS re:Post](https://repost.aws/knowledge-center/request-has-expired-s3-object)
- [How do I troubleshoot the error "Request has expired" when I try to access an S3 object? — Amazon Web Services](https://www.youtube.com/watch?v=uvso01dZxeo)
- [Amazon S3 기본 암호화 FAQ](https://docs.aws.amazon.com/AmazonS3/latest/userguide/default-encryption-faq.html)
- [Amazon S3 버킷 기본 암호화 설정](https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-encryption.html)
- [Amazon S3 SSE-KMS와 암호화 강제 정책](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html)
- [Amazon S3 SSE-C 차단과 허용](https://docs.aws.amazon.com/AmazonS3/latest/userguide/blocking-unblocking-s3-c-encryption-gpb.html)
- [Amazon S3 조건 키 버킷 정책 예시](https://docs.aws.amazon.com/AmazonS3/latest/userguide/amazon-s3-policy-keys.html)
- [Amazon S3와 IAM 연동(버킷 ARN과 객체 ARN)](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security_iam_service-with-iam.html)
- [Amazon S3 Object Ownership과 ACL 비활성화](https://docs.aws.amazon.com/AmazonS3/latest/userguide/about-object-ownership.html)
- [Amazon S3 접근 거부(403) 문제 해결](https://docs.aws.amazon.com/AmazonS3/latest/userguide/troubleshoot-403-errors.html)
- [AWS IAM 조건 연산자](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html)
- [인프런, Sungmin Kim, S3 버켓 생성시 알아야 할 것들](https://www.inflearn.com/courses/lecture?courseId=325381&unitId=43744)
- [인프런, Sungmin Kim, S3 암호화](https://www.inflearn.com/courses/lecture?courseId=325381&unitId=43745)
- [인프런, Sungmin Kim, S3 실습 1부](https://www.inflearn.com/courses/lecture?courseId=325381&unitId=45759)
- [인프런, Sungmin Kim, S3 실습 2부](https://www.inflearn.com/courses/lecture?courseId=325381&unitId=47163)
- [인프런, Sungmin Kim, CloudFront 실습](https://www.inflearn.com/courses/lecture?courseId=325381&unitId=57536)
- [인프런, Sungmin Kim, S3 암호화 실습](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=69313)
