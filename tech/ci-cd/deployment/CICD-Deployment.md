---
tags: [cicd, deployment, zero-downtime, blue-green, automation]
status: index
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["CICD Deployment", "배포 전략과 실행"]
---

# 배포 전략과 실행

아티팩트를 사용자 앞에 무중단으로 내보내는 전략과 실행 자동화를 모은다.

- [[Zero-Downtime-Deployment|무중단 배포]]: 5계층 점검, 복제본 간 데이터 공유와 교체 후 보존
- [[Safe-Deployment-Pipeline|안전한 자동 배포 파이프라인]]: 사전 검증 단계, one-box와 wave, bake time, 알람 롤백과 배포 시간 제한, ECS 도구 대응
- [[Blue-Green|Blue-Green 배포]]: In-Place vs Blue-Green, LB 스위치, ECS 기본과 CodeDeploy blue/green, Expand-Contract 스키마
- [[Canary|Canary 배포]]: 점진적 트래픽 노출, 관측과 승급 기준
- [[Feature-Flag|Feature Flag]]: 배포와 노출 분리, 수명주기와 정리
- [[Rollback|롤백 전략]]: 되돌릴 대상, 중단 기준과 상태 호환
- [[DB-Migration|DB Migration 전략]]: Expand-Contract, 배포 순서와 검증
- [[Prisma-Preview-Deployments|Prisma 프리뷰 배포]]: 브랜치별 환경과 DB 격리, 배포 생략 상태, 에이전트와 workflow 권한
- [[Helm]]: Chart, values, release와 rollback
- [[Single-Host-SPA-API-Deployment|단일 서버 SPA/API 배포]]: Nginx, TLS, 서버 기준선, SPA 서빙 위치, 환경 변수, CORS, rollback
  - [[Single-Host-SPA-API-Deployment-SSH-Workflow|SSH 배포 workflow]]: 권한 경계, runner 노출면과 host key, 원격 셸 PATH, 종료 코드와 health gate
- [[Deployment-Automation-ChatOps|배포 자동화, ChatOps]]: Slack Bot, 승인 플로우, 회고, 자동화 함정

## 함께 볼 문서

- [[CICD&배포(CICD&Delivery)|CI/CD&배포]]
