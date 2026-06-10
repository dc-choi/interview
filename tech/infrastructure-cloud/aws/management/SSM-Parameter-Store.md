---
tags: [infrastructure, aws, ssm, parameter-store, configuration, security]
status: done
category: "Infrastructure - AWS"
aliases: ["SSM Parameter Store", "Parameter Store", "Systems Manager Parameter Store"]
---

# AWS Systems Manager Parameter Store

**구성·암호**를 위한 보안 스토리지. 암호·DB 문자열·AMI ID·라이선스 코드 같은 데이터를 파라미터로 저장.

## 핵심

- 구성·보안 데이터를 AWS 계정 내에 **중앙 집중화**
- 확장성·내구성 보유 (SDK 사용 용이)
- 평문 또는 KMS 암호화 저장

## 매개변수 티어

| 티어 | 매개변수 정책 | 매개변수 값 크기 | TTL |
|------|--------------|------------------|-----|
| **Standard** | X | 4 KB | X |
| **Advanced** | O | 8 KB | TTL 할당 가능 (만료 정책) |

## CloudFormation 통합

- CloudFormation이 Parameter Store의 매개변수를 **스택 입력 매개변수**로 활용 가능

## 작동 방식

1. 새로운 매개변수 생성
2. 매개변수 유형과 값 명시 (String / StringList / SecureString)
3. 코드/명령에서 매개변수 참조 (예: `{{resolve:ssm:/db/url}}`)

## Secrets Manager와 비교

| 측면 | Parameter Store | Secrets Manager |
|------|-----------------|-----------------|
| **비용** | Standard 무료 | $0.40/월/비밀 |
| **자동 회전** | X (Lambda 직접 작성 시 가능) | O |
| **RDS 통합** | X | O |
| **사용처** | 일반 설정값, API 키, 환경 정보 | DB 자격 증명, 회전 필요 비밀 |

## 시험 빈출 포인트

- "**환경 변수·설정값** 저장" → Parameter Store
- "회전 필요 없으면" → Parameter Store (저렴)
- "회전 필요" → Secrets Manager
- "CloudFormation 스택 매개변수 외부 관리" → Parameter Store

## 관련 문서

- [[Secrets-Manager]] · [[KMS]] · [[CloudFormation]]

## 출처

- AWS SAA C03 Udemy 강의 요약본 (Stephane Maarek, 로컬)
