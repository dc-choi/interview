---
tags: [infrastructure, aws, ecr, container, registry, docker]
status: done
category: "Infrastructure - AWS"
aliases: ["ECR", "Amazon ECR", "Elastic Container Registry"]
---

# Amazon ECR (Elastic Container Registry)

AWS 내 **Docker 이미지 저장·관리** 레지스트리 서비스. ECS/EKS/Fargate가 컨테이너를 실행할 때 가져오는 이미지 출처.

## 핵심

- AWS 관리형 OCI/Docker 레지스트리
- **IAM** 통합 — 인증·권한이 AWS 자격증명으로 처리됨
- ECS·EKS·App Runner·Lambda 컨테이너 이미지 소스로 사용

## 저장 옵션

| 옵션 | 용도 |
|------|------|
| **Private repository** | 계정 단위 비공개 저장 |
| **Public Gallery** | 공개 저장 — ECR Public Gallery로 게시 |

## 부가 기능

- **이미지 취약점 스캐닝** (Basic / Enhanced — Inspector 통합)
- **버저닝 태그** (immutable tags 옵션)
- **수명 주기 정책** (Lifecycle Policy) — 오래된 이미지 자동 삭제

## Docker Repository 비교

| 레지스트리 | 종류 |
|-----------|------|
| Docker Hub | 퍼블릭 (private도 있음) |
| **Amazon ECR** | AWS 프라이빗 |
| **Amazon ECR Public Gallery** | AWS 퍼블릭 |

## 시험 빈출 포인트

- ECS/EKS의 이미지 소스 → ECR
- "도커 이미지 취약점 스캐닝" → ECR Basic/Enhanced Scanning
- "오래된 이미지 자동 정리" → ECR Lifecycle Policy

## 관련 문서

- [[ECS]] · [[EKS]] · [[AWS-Lambda]]

## 출처

- AWS SAA C03 Udemy 강의 요약본 (Stephane Maarek, 로컬)
