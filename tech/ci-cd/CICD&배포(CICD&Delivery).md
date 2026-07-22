---
tags: [cicd]
status: index
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["CI/CD&배포(CI/CD&Delivery)", "CI/CD & Delivery"]
---

# CI/CD&배포(CI/CD&Delivery)

## 현장사례
- [[TS-Backend-Meetup-3#모노레포와인프라자동화|아임웹 배포 자동화]] — 모노레포+테라폼+ArgoCD, 1주일->20분 배포, 2주->1일 기능 릴리즈

## Checklist
- [x] [[CICD-Basics|CI/CD 기초 (CI/Delivery/Deployment, 파이프라인 단계, 트리거, 성숙도 0~5)]]
- [x] [[CICD-Tool-Selection|CI/CD 툴 선택 평가 기준 (러닝 커브, 운영 효율성, 비용, GitHub Actions, ArgoCD, FluxCD 비교)]]
- [x] [[CI-Tool-Selection|CI 도구 비교 (GitHub Actions, Jenkins, GitLab, CodeBuild, Argo, 파이프라인 구조, 배포 전략)]]
- [x] [[Version-Control-Tooling|버전 관리 도구 (Git, GitHub, GUI, 브랜치 전략, master 안정성)]]
- [x] [[Development-Workflow|개발 워크플로 (Issue → Branch → PR → Merge, Conventional Commits)]]
- [x] [[Dependency-Management|의존성 관리 (Lock 파일, Poetry, pnpm, Gradle, Semver, 취약점 스캔)]]
- [ ] Git Flow / Trunk-Based (작성 예정: `Git-Flow`) — 기존 보강: [[Version-Control-Tooling#브랜치 전략 간단 요약|GitHub Flow, Git Flow, Trunk-Based 개요]]
- [x] [[Git-Merge-Strategies|Git 머지 전략 (Merge commit/Squash/Rebase, 공유 브랜치 rebase 금지, Interactive Rebase)]]
- [x] [[GitHub-Actions]]
- [x] [[Deployment-Automation-ChatOps|배포 자동화, ChatOps (Slack Bot, 승인 플로우, 회고, 자동화 함정)]]
- [x] [[Monorepo-CICD|모노레포 CI/CD (아티팩트 기준 3파이프라인 독립, pnpm workspace, Turborepo 캐시 무효화 전파, fan-in/out, 순환 의존 Tarjan SCC)]]
- [x] [[GitHub-Actions#속도 최적화 — CI 시간을 수 분 → 수십 초로|Build cache (의존성, Docker layer, GHA cache)]] / [[Monorepo-CICD#캐시 — 가장 조용한 성능 킬러|Turborepo 캐시와 무효화 전파]]
- [x] [[Docker-Image-Pipeline|Docker image build pipeline]]
- [ ] Helm (작성 예정: `Helm`)
- [ ] ArgoCD (GitOps) (작성 예정: `ArgoCD`) — 기존 보강: [[CICD-Tool-Selection#CD 도구 비교 (GitOps 중심)|ArgoCD와 FluxCD 선택 기준]]
- [x] [[Blue-Green|Blue/Green (In-Place vs Blue-Green, LB 스위치, Expand-Contract 스키마)]]
- [x] [[DevOps-vs-DevSecOps|DevOps vs DevSecOps (Shift Left, SAST/DAST/SCA, Policy as Code)]]
- [ ] Canary (작성 예정: `Canary`) — 기존 보강: [[Blue-Green#관련 무중단 배포 전략|Blue-Green과 Canary 개념 비교]]
- [ ] Feature flag 시스템 (작성 예정: `Feature-Flag`) — 기존 보강: [[One-Way-vs-Two-Way-Door#Two-Way Door 확장 기법|가역적 배포 수단으로서 Feature Flag]]
- [ ] Rollback 전략 (작성 예정: `Rollback`) — 기존 보강: [[Blue-Green|Blue-Green 트래픽 롤백]], [[GitHub-Actions#면접 포인트|SHA 이미지 롤백]]
- [ ] Zero-downtime deployment (작성 예정: `Zero-Downtime-Deployment`) — 기존 보강: [[Blue-Green|애플리케이션 Blue-Green]], [[RDS-Zero-Downtime-Migration|RDS near-zero 마이그레이션]]
- [ ] DB migration 전략 (작성 예정: `DB-Migration`) — 기존 보강: [[Blue-Green#DB 스키마, 공유 상태의 난제|Expand-Contract 개요]], [[Schema-Migration-Large-Table|대용량 테이블 Online DDL]]
