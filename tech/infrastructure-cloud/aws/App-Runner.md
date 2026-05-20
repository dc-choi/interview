---
tags: [infrastructure, aws, app-runner, container, serverless, paas]
status: done
category: "Infrastructure - AWS"
aliases: ["App Runner", "Amazon App Runner"]
---

# Amazon App Runner

완전 관리형 서비스. **웹 애플리케이션·API 빌드/배포**를 컨테이너 이미지나 소스 코드로부터 한번에.

## 핵심

- 컨테이너·웹앱 PaaS — 인프라 설정 없이 배포
- 소스 코드 또는 컨테이너 이미지(ECR)에서 자동 빌드·배포
- HTTPS·로드밸런싱·오토스케일링 내장
- VPC 액세스·Custom 도메인 지원

## ECS Fargate와 비교

| 측면 | App Runner | ECS Fargate |
|------|-----------|-------------|
| 추상화 수준 | 더 높음 — 앱만 신경 | 컨테이너 운영 가시성 큼 |
| 사용처 | 단순 웹앱·API | 복잡한 마이크로서비스 |
| 통합 깊이 | 한정적 | AWS 통합 깊음 |

## 시험 빈출 포인트

- "**가장 빠르게 컨테이너 웹앱 배포**" → App Runner
- "ECS·EKS는 오버킬, 그냥 코드 푸시" → App Runner
- 보다 복잡한 컨테이너 오케스트레이션 → ECS/EKS

## 관련 문서

- [[ECS]] · [[EKS]] · [[ECR]]

## 출처

- AWS SAA C03 Udemy 강의 요약본 (Stephane Maarek, 로컬)
