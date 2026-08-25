---
tags: [infrastructure, aws, secrets-manager, security, encryption]
status: done
category: "Infrastructure - AWS"
aliases: ["Secrets Manager", "AWS Secrets Manager"]
verified_at: 2026-08-25
---

# AWS Secrets Manager

자격 증명, API 키 같은 비밀을 저장하고 검색, 복제, 교체하는 수명 주기 관리 서비스.

## 핵심

- 자동 교체 일정을 구성할 수 있다. 지원 서비스의 **관리형 교체**를 쓰거나, 그 외 비밀은 **Lambda 교체 함수**를 사용한다.
- KMS로 암호화
- **RDS와 통합**: DB 자격 증명 자동 회전 가능
- 그 외 여러 AWS 서비스, DB에도 즉시 통합

## 다중 리전 암호

- 여러 AWS 리전에 암호 복제 → 기본 암호와 동기화된 **읽기 전용 복제본** 유지
- 글로벌 애플리케이션, DR 시나리오

## Parameter Store와 비교

| 측면 | Secrets Manager | SSM Parameter Store |
|------|-----------------|---------------------|
| **자동 교체** | O (관리형 또는 Lambda 교체) | 기본 제공 X |
| **비용** | 비밀당 월 $0.40 + API 호출 비용 | Standard 저장은 추가 요금 없음. Advanced, 높은 처리량은 과금 |
| **RDS 통합** | O | X |
| **암호화** | KMS 강제 | KMS 선택 |
| **사용처** | 회전 필요한 자격 증명 | 일반 설정값, API 키 (회전 X) |

## 시험 빈출 포인트

- "**DB 자격 증명 자동 회전**" → Secrets Manager
- "회전 필요 없는 설정값" → SSM Parameter Store (저렴)
- "자동 교체" → Secrets Manager. 관리형 교체가 아닌 경우 Lambda 교체 함수 사용
- "KMS 강제 암호화" → Secrets Manager

## 관련 문서

- [[SSM-Parameter-Store]], [[KMS]], [[RDS-Security-Group]]

## 출처

- [AWS Secrets Manager, What is AWS Secrets Manager?](https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html)
- [AWS Secrets Manager pricing](https://aws.amazon.com/secrets-manager/pricing/)
- [AWS Systems Manager, Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
- AWS SAA C03 Udemy 강의 요약본 (Stephane Maarek, 로컬)
