---
tags: [infrastructure, aws, kms, encryption, security]
status: done
category: "Infrastructure - AWS"
aliases: ["KMS", "AWS KMS", "Key Management Service", "Key Management System"]
verified_at: 2026-07-21
---

# AWS KMS (Key Management Service)

데이터 암호화와 서명 등에 사용하는 **키를 생성, 관리, 사용**하는 AWS 관리형 서비스. EBS, S3, RDS, EFS, SNS 등 여러 AWS 서비스의 암호화 기능과 통합된다.

## 핵심 가치

- 표준 KMS 키는 AWS가 운영하는 HSM에서 키 머티리얼을 보호한다.
- 가져온 키 머티리얼과 사용자 지정 키 스토어를 사용하면 생성, 보관, 가용성의 책임 경계가 달라진다.
- IAM, 키 정책으로 **세분화된 권한 제어**
- CloudTrail로 키 사용 이력 **감사 추적**
- 여러 AWS 서비스와 **네이티브 통합** (`SSE-KMS`, EBS 볼륨 암호화 등)

## KMS Key (구 CMK, Customer Master Key)

- 데이터 키 생성, 암호화, 복호화, 서명 등에 사용하는 논리적 **KMS 키**. 과거에는 CMK라고 불렀다.
- AWS 서비스가 암호화를 시작할 때 KMS Key를 통해 데이터 키를 생성
- `AWS_KMS` 원본 키의 키 머티리얼은 KMS HSM 밖으로 평문 상태로 나가지 않는다. `EXTERNAL` 원본은 외부에서 생성해 가져오고 외부 사본을 사용자가 보관할 수 있으며, 사용자 지정 키 스토어는 CloudHSM 또는 외부 키 관리자에 키를 둔다.
- 키 소유권과 키 머티리얼 원본은 서로 다른 분류 축이다.

## 소유권에 따른 KMS Key 유형

| 유형 | 생성, 관리 주체 | 고객 제어 | 로테이션과 비용 경계 |
|------|----------------|-----------|----------------------|
| **AWS 소유 키** (AWS Owned) | AWS 서비스 | 고객이 키를 조회하거나 정책을 바꾸지 않음 | 서비스가 정책을 정하며 별도 KMS 키 저장 요금 없음 |
| **AWS 관리형 키** (AWS Managed) | AWS 서비스가 고객 계정에 생성 | 조회와 감사는 가능하지만 삭제, 정책 변경은 제한 | 키 머티리얼을 약 365일마다 자동 로테이션. 별도 키 저장 요금은 없지만 사용 요금은 서비스와 요청 유형에 따라 확인 |
| **고객 관리형 키** (Customer Managed) | 고객 | 정책, 활성화, 삭제 예약, 별칭 등을 제어 | 지원되는 키는 자동 또는 온디맨드 로테이션 가능. 키 저장과 API 사용 과금은 현재 리전별 요금 확인 |

### AWS 관리형 키

- AWS가 자동 생성, 관리 (`aws/s3`, `aws/ebs` 등 별칭)
- 사용자는 **사용만 가능**, 키 삭제, 정책 변경 불가
- AWS가 약 365일마다 키 머티리얼을 자동 로테이션한다.
- "암호화 활성화"만 한 채 키를 별도 지정하지 않았다면 → 이게 사용 중

### 고객 관리형 키 (CMK)

- 고객이 직접 생성, 관리 → **세밀한 제어** 가능
- 활성화, 비활성화, 삭제 예약(7~30일 대기), **키 정책, IAM**으로 접근 주체 지정
- 수동 로테이션 또는 자동 로테이션 선택. 지원되는 고객 관리형 키는 90~2560일 범위에서 주기를 지정할 수 있고 기본값은 365일이다.
- 비대칭 키, 다중 리전 키, 키 머티리얼 가져오기 등 요구에 맞는 키 사양과 원본을 선택할 수 있다. 기능 조합마다 제약이 있다.

### 사용자 지정 키 스토어

- **AWS CloudHSM 키 스토어**는 고객이 관리하는 CloudHSM 클러스터에서 키 머티리얼과 암호 연산을 처리한다.
- **외부 키 스토어(XKS)**는 AWS 외부의 키 관리 시스템에 외부 키를 두고 프록시를 통해 KMS와 연결한다.
- 사용자 지정 키 스토어는 표준 KMS 키보다 자동 로테이션, 다중 리전, 키 사양 등에 제약이 있고 가용성, 성능, 비용 책임이 고객 쪽으로 이동한다. 규제 요구가 있을 때만 해당 서비스의 현재 인증 범위와 운영 부담을 함께 검토한다.

## 데이터 키 (Data Key)

- 실제 데이터를 암호화하는 대칭 데이터 키. `GenerateDataKey`는 AES-128 또는 AES-256 키를 생성할 수 있다
- KMS Key가 데이터 키를 생성하고 암호화된 사본과 평문 사본을 반환한다
- AWS KMS는 데이터 키로 실제 데이터를 암호화하지 않는다. 애플리케이션이 OpenSSL이나 AWS Encryption SDK 같은 암호화 라이브러리로 평문 데이터 키를 사용한다
- 작은 데이터는 KMS `Encrypt` API로 직접 암호화할 수 있지만, 대칭 KMS 키 기준 평문 크기는 최대 4,096바이트다. 큰 데이터는 봉투 암호화를 사용한다

## Envelope Encryption (봉투 암호화)

KMS의 핵심 동작 방식. **데이터 키로 데이터를 암호화하고, 그 데이터 키를 다시 KMS Key로 암호화**하는 2단계 구조.

### 암호화 흐름

1. 서비스가 KMS에 **데이터 키 생성 요청** (`GenerateDataKey`)
2. KMS Key가 데이터 키 1쌍을 생성 → **평문 데이터 키 + 암호화된 데이터 키**를 서비스에 함께 전달
3. 서비스가 **평문 데이터 키로 실제 데이터를 암호화**
4. 메모리에서 **평문 데이터 키를 즉시 폐기**
5. 암호화된 데이터와 **암호화된 데이터 키를 같이 저장** (= 봉투 암호화)

### 복호화 흐름

1. 서비스가 저장된 **암호화된 데이터 키를 KMS에 전달** (`Decrypt`)
2. KMS Key가 데이터 키를 복호화 → 평문 데이터 키를 서비스에 반환
3. 서비스가 평문 데이터 키로 **데이터 복호화** 후 즉시 폐기

### 왜 봉투 암호화인가

- 큰 데이터를 KMS API로 직접 암호화하는 방식은 지원 크기와 API 호출 비용에 제약이 있다. 대칭 암호화 KMS 키의 직접 `Encrypt` 평문은 최대 4,096바이트이고 비대칭 키는 key spec과 알고리즘별 한도가 더 작다
- 데이터 키로 로컬 암호화 → KMS는 작은 데이터 키만 다룸 → **성능, 비용 최적화**
- 평문 데이터 키는 메모리에만 잠깐 존재 → **유출 위험 최소화**

## Key Rotation (키 로테이션)

| 항목 | AWS 관리형 키 | 고객 관리형 키 |
|------|---------------|----------------|
| 자동 로테이션 | 약 365일마다 수행, 사용자가 설정 변경 불가 | `AWS_KMS` 원본의 지원되는 대칭 암호화 키에서 90~2560일 주기로 선택 가능, 기본 365일 |
| 온디맨드 로테이션 | 사용자가 수행 불가 | 지원되는 대칭 암호화 키에서 사용 가능. `EXTERNAL` 원본은 새 key material을 먼저 가져와야 함 |
| 과거 데이터 | 같은 logical key ID 안의 과거 key material을 KMS가 선택해 복호화 | 자동 또는 온디맨드 회전은 같은 logical key ID를 유지하므로 KMS가 해당 material을 선택해 복호화 |

- 자동과 온디맨드 로테이션은 **키 ID는 그대로**, 내부 key material만 추가, 교체하므로 애플리케이션의 key reference를 바꿀 필요가 없다
- 비대칭 키, HMAC 키, 사용자 지정 키 스토어 키는 자동 또는 온디맨드 로테이션 지원 범위가 다르다. 가져온 대칭 키 머티리얼은 자동 로테이션은 지원하지 않지만 요건을 충족하면 온디맨드 로테이션을 사용할 수 있다.

### Manual rotation은 새 key ID

자동 또는 온디맨드 회전을 지원하지 않는 키는 새 KMS key를 만들고 alias를 새 key로 전환하는 수동 절차를 사용한다. 이는 새 logical key ID이므로 과거 ciphertext가 자동으로 새 key에 귀속되는 것이 아니다.

- 기존 key를 enabled 상태로 보존하고 과거 데이터 복호화 권한을 유지한다
- symmetric KMS ciphertext는 metadata에 원래 key ID가 들어 있어 `Decrypt`에 `KeyId`를 생략하면 KMS가 원래 key로 라우팅할 수 있다. 새 alias를 `KeyId`로 강제하면 과거 ciphertext 복호화가 실패할 수 있다
- 기존 key를 폐기하려면 데이터를 새 key로 재암호화하고 검증한 뒤 보존, 삭제 정책을 적용한다

## Multi-Region Key

- 여러 리전에 **동일한 키 ID, 키 머티리얼**을 갖는 키
- 한 리전의 기본 키(Primary)를 다른 리전에 복제 키(Replica)로 생성
- 한 리전에서 암호화한 데이터를 **다른 리전에서 복호화 가능** → 글로벌 앱, DR 시나리오에 유리
- DynamoDB Global Tables, Global Aurora, S3 Cross-Region Replication과 잘 맞음

## 암호화 종류

| 분류 | 의미 | 예 |
|------|------|-----|
| **서버 측 암호화** (SSE, At Rest) | 저장 시 서비스가 암호화 | S3 SSE-KMS, EBS 볼륨 암호화 |
| **클라이언트 측 암호화** | 업로드 전에 클라이언트가 암호화 | S3 클라이언트 측, AWS Encryption SDK |
| **전송 중 암호화** (In Transit) | TLS, SSL로 전송 채널 암호화 | HTTPS, EFS 전송 암호화 |

### S3 암호화 옵션 정리

- **SSE-S3** — S3가 관리하는 키 (AES-256), KMS 무관
- **SSE-KMS** — KMS Key로 암호화, 키 사용 감사 추적 가능
- **SSE-C** — 고객이 키 직접 제공 (S3는 키 저장 안 함)
- **DSSE-KMS** — 이중 계층 KMS 암호화 (정부, 규제 등)

## 시험 체크포인트

- **EBS, S3, RDS 암호화 키워드**면 → 백엔드는 **KMS**
- `AWS_KMS` 원본 키의 키 머티리얼은 KMS HSM 밖으로 평문 유출되지 않음. 가져온 키와 사용자 지정 키 스토어는 책임 경계가 다름
- **봉투 암호화** 흐름은 단골 — `GenerateDataKey` → 평문 데이터 키로 암호화 → 평문 폐기 → 암호화된 데이터 키 동봉 저장
- **자동 로테이션 주기** — AWS 관리형은 강제 1년, 고객 관리형은 옵션이며 90~2560일 범위에서 지정 가능
- 자동, 온디맨드 회전은 key ID를 유지해 과거 데이터를 투명하게 복호화한다. 새 key ID와 alias 전환을 쓰는 manual rotation은 기존 key 보존 또는 데이터 재암호화가 필요
- **CloudHSM 또는 AWS 외부 키 관리자에서 KMS 키의 암호 연산**이 필요하면 → 사용자 지정 키 스토어의 제약과 책임 검토
- **여러 리전에서 동일 키로 암복호화**가 필요하면 → **Multi-Region Key**
- **고객이 직접 키 활성화, 비활성화, 삭제 제어**가 필요하면 → 고객 관리형 키 (CMK)
- 대칭 KMS 키의 `Encrypt` API는 최대 4,096바이트를 직접 암호화할 수 있다. 큰 데이터에는 봉투 암호화를 사용한다
- 모든 KMS Key에는 key policy가 필요하다. 같은 계정에서는 key policy만으로 권한을 부여할 수 있고, IAM policy로 허용하려면 key policy가 IAM 사용을 활성화해야 한다. 교차 계정 사용은 key policy와 외부 계정 IAM policy 양쪽 허용이 필요하다

## 출처

- AWS SAA C03 학습 자료 (로컬)
- [Enable automatic key rotation — AWS KMS 공식 문서](https://docs.aws.amazon.com/kms/latest/developerguide/example_kms_EnableKeyRotation_section.html)
- [GenerateDataKey — AWS KMS API](https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKey.html)
- [Encrypt — AWS KMS API](https://docs.aws.amazon.com/kms/latest/APIReference/API_Encrypt.html)
- [Data keys — AWS KMS 공식 문서](https://docs.aws.amazon.com/kms/latest/developerguide/data-keys.html)
- [IAM policies with AWS KMS — AWS 공식 문서](https://docs.aws.amazon.com/kms/latest/developerguide/iam-policies.html)
- [Allowing users in other accounts to use a KMS key — AWS 공식 문서](https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-modifying-external-accounts.html)
- [AWS KMS pricing](https://aws.amazon.com/kms/pricing/)
- [AWS KMS 키 스토어](https://docs.aws.amazon.com/kms/latest/developerguide/key-store-overview.html)
- [AWS KMS 키 로테이션](https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html)
- [AWS KMS 수동 로테이션](https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys-manually.html)

## 관련 문서

- [[EBS]]
- [[S3]]
- [[RDS-Aurora]]
- [[IAM]]
- [[Public-Key-Cryptography]]
- [[보안(Security)|보안]]
