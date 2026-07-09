---
tags: [infrastructure, aws, s3, security, cost]
status: done
category: "Infrastructure - AWS"
aliases: ["S3 보안", "S3 비용", "S3 암호화"]
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
| **SSE-KMS** | 서버측, KMS CMK | 고객 (KMS) | 키 회전, 감사 로그 가능. KMS 요청 비용 발생 |
| **SSE-C** | 서버측, 고객 제공 키 | 고객 (요청마다 전달) | S3가 키 저장 안 함 |
| **Client-Side** | 전송 전 클라이언트 암호화 | 고객 (앱, KMS CMK) | S3는 암호문만 받음 |

- **Data in transit**: TLS로 전송 구간 암호화 — Client-Side 영역
- **Data at rest**: S3 저장 시점 암호화 — Server-Side 영역
- 컴플라이언스(금융, 의료) 환경은 **SSE-KMS** 또는 Client-Side 권장

## 비용 구조

| 항목 | 과금 |
|------|------|
| 저장 | GB, 월 (클래스별 차등) |
| 요청 | PUT, GET, LIST 단위 |
| 데이터 전송 | **OUT만 과금**, IN, 같은 리전 AWS 내 무료 |
| Lifecycle 전환 | 객체당 요청 비용 |
| Replication | 복제본 저장 + 데이터 전송 |

흔한 비용 함정: 작은 파일 다수 — 요청 수, 메타데이터 비용 큼. **로그 작은 파일은 batch+gzip로 묶어 PUT**.

## 흔한 실수

- **Lifecycle 미완료 Multipart abort 누락** — part 데이터가 영구 누적
- **버킷명 글로벌 충돌** — 리전 내가 아니라 글로벌 유니크
- **prefix 한 곳에 몰림** — throttle. hash, 날짜 역순 prefix
- **public ACL 실수** — Block Public Access 강제로 방어
- **Versioning + 삭제 정책 부재** — old version 누적, 비용 폭증. Lifecycle로 noncurrent version expire
- **Glacier에 자주 접근** — 검색 비용 폭증. 클래스 선택 잘못
- **클라이언트가 S3에 직접 GET 폭주** — CloudFront 앞단으로 캐싱
- **Pre-signed URL TTL 길게** — 유출 시 노출 윈도우 김. 짧게 + 사용 후 회전

## 시험, 면접 체크포인트

- 11 9s 내구성과 다중 AZ 자동 복제, 가용성 99.99%
- Strong Consistency (2020.12)와 그 이전 eventual 모델
- 스토리지 클래스 선택 기준 — 접근 빈도, 최소 보관(IA 30, Glacier 90, Deep 180), 검색 시간
- IA, Glacier → Standard로 **자동 승격 불가** (수동 copy)
- Multipart Upload — 5MB-5GB part, **최대 10,000 part**, 5TB 객체, 미완료 abort
- prefix throttle (3.5K PUT, 5.5K GET)과 hash prefix 분산
- Bucket Policy 5요소(Principal, Action, Effect, Resource, Condition), 객체는 버킷 권한 비상속
- 암호화 4가지 (SSE-S3, SSE-KMS, SSE-C, Client-Side)와 in transit vs at rest
- CRR/SRR — Versioning 필수, 비동기, 사슬 불가, 기존 객체는 Batch Replication
- Event Notification 타겟 4개(SNS, SQS, Lambda, EventBridge)와 EventBridge 선택 이유
- S3 Select는 신규 고객에게 제공되지 않는 레거시 기능. 새 설계는 Athena나 S3 Object Lambda 우선 검토
- Pre-signed URL의 보안, TTL 설계
- Block Public Access, VPC Endpoint, Object Lock의 보안 계층

## 관련 문서
- [[S3|S3 (인덱스)]]
- [[S3-Security-Patterns|S3 보안 설계 패턴]] — 사용 사례별 아키텍처 (CloudFront, WAF, 계정 분리)
- [[S3-Storage-Performance|S3 스토리지 모델과 성능]]
- [[S3-Features-Management|S3 기능과 데이터 관리]]
- [[IAM|IAM (Bucket Policy, Pre-signed)]]
- [[VPC|VPC Gateway Endpoint]]
