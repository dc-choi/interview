---
tags: [infrastructure, aws, secrets-manager, security, encryption]
status: done
category: "Infrastructure - AWS"
aliases: ["Secrets Manager", "AWS Secrets Manager"]
---

# AWS Secrets Manager

암호를 저장하고 **수명 주기 동안 강제(자동)로 암호를 교체**해주는 암호 관리 서비스.

## 핵심

- **Lambda 함수**를 사용하여 교체할 암호를 강제 생성·자동 회전
- KMS로 암호화
- **RDS와 통합**: DB 자격 증명 자동 회전 가능
- 그 외 여러 AWS 서비스·DB에도 즉시 통합

## 다중 리전 암호

- 여러 AWS 리전에 암호 복제 → 기본 암호와 동기화된 **읽기 전용 복제본** 유지
- 글로벌 애플리케이션·DR 시나리오

## Parameter Store와 비교

| 측면 | Secrets Manager | SSM Parameter Store |
|------|-----------------|---------------------|
| **자동 회전** | O (Lambda 통합) | X |
| **비용** | 비밀당 $0.40/월 + API 호출 비용 | 무료 (Standard) |
| **RDS 통합** | O | X |
| **암호화** | KMS 강제 | KMS 선택 |
| **사용처** | 회전 필요한 자격 증명 | 일반 설정값, API 키 (회전 X) |

## 시험 빈출 포인트

- "**DB 자격 증명 자동 회전**" → Secrets Manager
- "회전 필요 없는 설정값" → SSM Parameter Store (저렴)
- "Lambda로 자동 회전" → Secrets Manager
- "KMS 강제 암호화" → Secrets Manager

## 관련 문서

- [[SSM-Parameter-Store]] · [[KMS]] · [[RDS-Security-Group]]

## 출처

- AWS SAA C03 Udemy 강의 요약본 (Stephane Maarek, 로컬)
