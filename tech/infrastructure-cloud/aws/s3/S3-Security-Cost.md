---
tags: [infrastructure, aws, s3, security, cost]
status: done
category: "Infrastructure - AWS"
aliases: ["S3 보안", "S3 비용", "S3 암호화"]
verified_at: 2026-07-21
---

# S3 보안과 비용, 운영 함정

## 보안

- **Block Public Access** — 계정, 버킷 단위. 기본 ON 권장. 실수 공개 차단
- **Bucket Policy** — JSON IAM 정책. 구성요소: `Principal`(사용자), `Action`, `Effect`(Allow/Deny), `Resource`(버킷/객체), `Condition`. **버킷과 객체 권한은 독립** — 객체는 버킷 권한을 상속하지 않음
- **ACL** — AWS 계정 단위로 READ, WRITE, FULL_CONTROL 부여. 권한 관리 한계로 **사용 권장 X**, 가능한 비활성화 (Object Ownership: Bucket owner enforced)
- **Pre-signed URL** — 임시 서명 URL로 인증 없는 사용자에게 GET, PUT 위임 (TTL 명시)
- **VPC Gateway Endpoint** — VPC 내 S3 통신을 사설망으로 (NAT 비용↓, 보안↑)

### 암호화 (Data at rest / in transit)

| 구분 | 방식 | 키 관리 주체 | 비고 |
|------|------|-------------|------|
| **SSE-S3** | 서버측, AES-256 | S3 | 기본값, 별도 설정 불필요 |
| **SSE-KMS** | 서버측, 한 계층 KMS 암호화 | AWS managed `aws/s3` 또는 customer managed KMS key | key 유형에 따른 제어와 감사. KMS 요청 비용과 bucket key 적용 범위 확인 |
| **DSSE-KMS** | 서버측, 두 계층 KMS 암호화 | customer managed KMS key | 이중 계층 암호화 요구용. 지원 기능과 추가 KMS 비용 확인 |
| **SSE-C** | 서버측, 고객 제공 키 | 고객 (요청마다 전달) | S3가 키 저장 안 함 |
| **Client-Side** | 전송 전 클라이언트 암호화 | 고객 (앱, KMS CMK) | S3는 암호문만 받음 |

- **Data in transit**: TLS로 클라이언트와 S3 사이 전송 구간을 암호화하는 별도 축
- **Data at rest**: SSE-S3, SSE-KMS, DSSE-KMS, SSE-C 같은 server-side 방식 또는 업로드 전 client-side 암호화로 보호
- 규제와 위협 모델에 따라 key 통제, 이중 계층 또는 client-side 요구를 확인하고 SSE-KMS, DSSE-KMS와 client-side 방식을 선택

## 비용 구조

| 항목 | 과금 |
|------|------|
| 저장 | GB, 월 (클래스별 차등) |
| 요청 | PUT, GET, LIST 단위 |
| 데이터 전송 | 인터넷 송신, 리전 간 전송 등 경로에 따라 과금. 인터넷 수신은 일반적으로 별도 데이터 전송 요금이 없지만 NAT Gateway, 가용 영역 간 전송, 가속 기능과 요청 요금은 별도 확인 |
| Lifecycle 전환 | 객체당 요청 비용 |
| Replication | 복제본 저장 + 데이터 전송 |

흔한 비용 함정: 작은 파일 다수 — 요청 수, 메타데이터 비용 큼. **로그 작은 파일은 batch+gzip로 묶어 PUT**.

## 흔한 실수

- **Lifecycle 미완료 Multipart abort 누락** — part 데이터가 영구 누적
- **버킷명 글로벌 충돌** — 리전 내가 아니라 글로벌 유니크
- **매우 높은 요청률을 한 prefix에 갑자기 집중** — S3는 prefix당 최소 초당 3,500 write, 5,500 read를 지원하고 자동 확장하지만 확장 중 일시적 503이 날 수 있다. 이를 넘는 부하는 여러 prefix, 점진적 ramp-up, retry와 지수 backoff를 함께 검토하며 일반 워크로드에 무조건 hash prefix를 요구하지 않음
- **public ACL 실수** — Block Public Access 강제로 방어
- **Versioning + 삭제 정책 부재** — old version 누적, 비용 폭증. Lifecycle로 noncurrent version expire
- **Glacier에 자주 접근** — 검색 비용 폭증. 클래스 선택 잘못
- **클라이언트가 S3에 직접 GET 폭주** — CloudFront 앞단으로 캐싱
- **Pre-signed URL TTL 길게** — 만료 전에는 bearer token처럼 재사용될 수 있으며 URL 자체를 사용 후 개별 회전해 폐기하는 API는 없다. 짧은 만료, 임시 credential, `s3:signatureAge`와 network 조건, credential 비활성화 같은 guardrail을 적용

## 시험, 면접 체크포인트

- S3 Standard의 설계 내구성, 가용성과 다중 AZ 모델. One Zone 계열을 포함해 storage class별 가용성 SLA와 복원력을 구분
- Strong Consistency (2020.12)와 그 이전 eventual 모델
- 스토리지 클래스 선택 기준 — 접근 빈도, 최소 보관(IA 30, Glacier 90, Deep 180), 검색 시간
- IA, Glacier → Standard로 **자동 승격 불가** (수동 copy)
- Multipart Upload — 5MB-5GB part, **최대 10,000 part**, 일반 Regions 50 TB 객체, GovCloud (US) 5 TB, 미완료 abort
- prefix당 최소 3.5K write, 5.5K read 요청률과 이를 넘는 high-rate workload의 다중 prefix, 점진적 확장, 503 retry
- Bucket Policy 5요소(Principal, Action, Effect, Resource, Condition), 객체는 버킷 권한 비상속
- at-rest 암호화(SSE-S3, SSE-KMS, DSSE-KMS, SSE-C, Client-Side)와 TLS in-transit 구분
- CRR/SRR — Versioning 필수, 비동기, 사슬 불가, 기존 객체는 Batch Replication
- Event Notification 타겟 4개(SNS, SQS, Lambda, EventBridge)와 EventBridge 선택 이유
- S3 Select는 신규 고객에게 제공되지 않는다. S3 Object Lambda도 2025-11-07부터 기존 사용 고객과 일부 APN 파트너만 사용할 수 있으므로 새 설계에서는 Athena, 직접 Lambda 호출, API Gateway, Lambda Function URL이나 CloudFront 기반 변환을 요구사항에 맞게 비교
- Pre-signed URL의 보안, TTL 설계
- Block Public Access, VPC Endpoint, Object Lock의 보안 계층

## 관련 문서
- [[S3|S3 (인덱스)]]
- [[S3-Security-Patterns|S3 보안 설계 패턴]] — 사용 사례별 아키텍처 (CloudFront, WAF, 계정 분리)
- [[S3-Storage-Performance|S3 스토리지 모델과 성능]]
- [[S3-Features-Management|S3 기능과 데이터 관리]]
- [[IAM|IAM (Bucket Policy, Pre-signed)]]
- [[VPC|VPC Gateway Endpoint]]

## 출처
- [AWS What's New — Amazon S3 increases maximum object size to 50 TB](https://aws.amazon.com/about-aws/whats-new/2025/12/amazon-s3-maximum-object-size-50-tb/)
- [Amazon S3 User Guide — What's new](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WhatsNew.html)
- [Amazon S3 Object Lambda availability change](https://docs.aws.amazon.com/AmazonS3/latest/userguide/amazons3-ol-change.html)
- [Amazon S3 Select 사용 가능 범위](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-select.html)
- [Amazon S3 데이터 보호와 암호화 옵션](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingEncryption.html)
- [Amazon S3 성능 최적화](https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance.html)
- [S3 presigned URL](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
