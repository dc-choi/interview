---
tags: [infrastructure, aws, ssm, parameter-store, configuration, security]
status: done
category: "Infrastructure - AWS"
aliases: ["SSM Parameter Store", "Parameter Store", "Systems Manager Parameter Store"]
verified_at: 2026-08-25
---

# AWS Systems Manager Parameter Store

환경 이름, 엔드포인트, AMI ID 같은 **정적 구성값**을 중앙에서 관리하는 스토리지. `SecureString`도 지원하지만 DB 자격 증명, API 키, 토큰처럼 교체가 필요한 비밀은 Secrets Manager가 우선이다.

## 핵심

- 구성, 보안 데이터를 AWS 계정 내에 **중앙 집중화**
- 확장성, 내구성 보유 (SDK 사용 용이)
- 평문 또는 KMS 암호화 저장

## 매개변수 티어

| 티어 | 계정, 리전당 최대 개수 | 값 크기 | 매개변수 정책 | 비용 경계 |
|------|------------------------|---------|-----------------|-----------|
| **Standard** | 10,000 | 4 KB | X | 저장은 추가 요금 없음. 높은 처리량은 별도 과금 |
| **Advanced** | 100,000 | 8 KB | O (만료 정책 포함) | 과금 |

## CloudFormation 통합

- CloudFormation이 Parameter Store의 매개변수를 **스택 입력 매개변수**로 활용 가능

## 작동 방식

1. 새로운 매개변수 생성
2. 매개변수 유형과 값 명시 (String / StringList / SecureString)
3. 코드/명령에서 매개변수 참조 (예: `{{resolve:ssm:/db/url}}`)

## Secrets Manager와 비교

| 측면 | Parameter Store | Secrets Manager |
|------|-----------------|-----------------|
| **비용** | Standard 저장은 추가 요금 없음. Advanced, 높은 처리량은 과금 | 비밀 수와 API 호출량에 따라 과금 |
| **자동 교체** | 기본 제공 X | O |
| **RDS 통합** | X | O |
| **사용처** | 일반 설정값, API 키, 환경 정보 | DB 자격 증명, 회전 필요 비밀 |

## 시험 빈출 포인트

- "**환경 변수, 설정값** 저장" → Parameter Store
- "회전 필요 없으면" → Parameter Store (저렴)
- "회전 필요" → Secrets Manager
- "CloudFormation 스택 매개변수 외부 관리" → Parameter Store

## 관련 문서

- [[Secrets-Manager]], [[KMS]], [[CloudFormation]]

## 출처

- [AWS Systems Manager, Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
- [AWS Systems Manager pricing](https://aws.amazon.com/systems-manager/pricing/)
- [AWS Secrets Manager, What is AWS Secrets Manager?](https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html)
- AWS SAA C03 Udemy 강의 요약본 (Stephane Maarek, 로컬)
