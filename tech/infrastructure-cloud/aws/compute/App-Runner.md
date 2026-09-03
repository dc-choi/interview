---
tags: [infrastructure, aws, app-runner, container, serverless, paas]
status: done
verified_at: 2026-09-03
category: "Infrastructure - AWS"
aliases: ["App Runner", "Amazon App Runner"]
---

# Amazon App Runner

App Runner는 컨테이너 이미지나 소스 코드에서 웹 애플리케이션과 API를 빌드, 배포하는 완전 관리형 서비스다. 다만 신규 고객 온보딩이 종료돼 기존 고객만 새 리소스와 서비스를 만들 수 있고, AWS는 신규 기능을 추가하지 않는다. 신규 도입에는 Amazon ECS Express Mode를 우선 검토한다.

## 핵심

- 컨테이너, 웹앱 PaaS — 인프라 설정 없이 배포
- 소스 코드 또는 컨테이너 이미지(ECR)에서 자동 빌드, 배포
- HTTPS, 로드밸런싱, 오토스케일링 내장
- VPC 액세스, Custom 도메인 지원

## ECS Fargate와 비교

| 측면 | App Runner | ECS Fargate |
|------|-----------|-------------|
| 추상화 수준 | 더 높음 — 앱만 신경 | 컨테이너 운영 가시성 큼 |
| 사용처 | 단순 웹앱, API | 복잡한 마이크로서비스 |
| 통합 깊이 | 한정적 | AWS 통합 깊음 |

## 시험 빈출 포인트

- 시험 자료에서 "**가장 빠르게 컨테이너 웹앱 배포**"의 답이 App Runner일 수 있지만 현재 신규 고객은 사용할 수 없다
- 신규 실무 설계에서 ECS, EKS가 과하다면 Amazon ECS Express Mode를 검토한다
- 보다 복잡한 컨테이너 오케스트레이션 → ECS/EKS

## 관련 문서

- [[ECS]], [[EKS]], [[ECR]]

## 출처

- AWS SAA C03 Udemy 강의 요약본 (Stephane Maarek, 로컬)
- [AWS App Runner Developer Guide, Availability change](https://docs.aws.amazon.com/apprunner/latest/dg/apprunner-availability-change.html)
