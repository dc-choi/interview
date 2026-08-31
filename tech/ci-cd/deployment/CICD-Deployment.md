---
tags: [cicd, deployment, zero-downtime, blue-green, automation]
status: index
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["CICD Deployment", "배포 전략과 실행"]
---

# 배포 전략과 실행

아티팩트를 사용자 앞에 무중단으로 내보내는 전략과 실행 자동화를 모은다.

- [[Zero-Downtime-Deployment|무중단 배포]]: 트래픽 전환, 종료, 시작, 데이터, 클라이언트 5계층
- [[Blue-Green|Blue-Green 배포]]: In-Place vs Blue-Green, LB 스위치, Expand-Contract 스키마
- [[Canary|Canary 배포]]: 점진적 트래픽 노출, 관측과 승급 기준
- [[Feature-Flag|Feature Flag]]: 배포와 노출 분리, 수명주기와 정리
- [[Rollback|롤백 전략]]: 되돌릴 대상, 중단 기준과 상태 호환
- [[DB-Migration|DB Migration 전략]]: Expand-Contract, 배포 순서와 검증
- [[Helm]]: Chart, values, release와 rollback
- [[Single-Host-SPA-API-Deployment|단일 서버 SPA/API 배포]]: Nginx, TLS, GitHub Actions, 환경 변수, CORS, rollback
- [[Deployment-Automation-ChatOps|배포 자동화, ChatOps]]: Slack Bot, 승인 플로우, 회고, 자동화 함정

## 함께 볼 문서

- [[CICD&배포(CICD&Delivery)|CI/CD&배포]]
