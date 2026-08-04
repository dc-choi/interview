---
tags: [infrastructure, aws, ecr, container, registry, docker]
status: done
category: "Infrastructure - AWS"
aliases: ["ECR", "Amazon ECR", "Elastic Container Registry"]
verified_at: 2026-08-04
---

# Amazon ECR (Elastic Container Registry)

AWS 내 **Docker 이미지 저장, 관리** 레지스트리 서비스. ECS/EKS/Fargate가 컨테이너를 실행할 때 가져오는 이미지 출처.

## 핵심

- AWS 관리형 OCI/Docker 레지스트리
- **IAM** 통합 — 인증, 권한이 AWS 자격증명으로 처리됨
- ECS, EKS, App Runner, Lambda 컨테이너 이미지 소스로 사용
- account마다 region별 private registry가 있으며 repository policy와 IAM policy를 함께 적용할 수 있음
- Docker client는 ECR authorization token으로 인증한다. 장기 access key를 image나 EC2 파일에 넣지 않고 workload role을 사용한다

## 저장 옵션

| 옵션 | 용도 |
|------|------|
| **Private repository** | 계정 단위 비공개 저장 |
| **Public Gallery** | 공개 저장 — ECR Public Gallery로 게시 |

## 부가 기능

- **이미지 취약점 스캐닝** (Basic / Enhanced — Inspector 통합)
- **tag immutability와 exclusion filter** — release tag 덮어쓰기를 막을 수 있음
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

- [[ECS]], [[EKS]], [[AWS-Lambda]]

## 출처

- [Amazon ECR 공식 문서 — 서비스 개요와 기능](https://docs.aws.amazon.com/AmazonECR/latest/userguide/what-is-ecr.html)
- [Amazon ECR 공식 문서 — Private registry](https://docs.aws.amazon.com/AmazonECR/latest/userguide/Registries.html)
- [Amazon ECR 공식 문서 — Tag immutability](https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-tag-mutability.html)
- [비전공자도 이해할 수 있는 Docker 입문/실전 — AWS ECR, JSCODE 박재성 강사](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227947)
