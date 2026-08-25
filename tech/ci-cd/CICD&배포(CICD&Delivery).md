---
tags: [cicd]
status: index
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["CI/CD&배포(CI/CD&Delivery)", "CI/CD & Delivery", "CI/CD&배포"]
---

# CI/CD&배포(CI/CD&Delivery)

## 현장사례
- [[TS-Backend-Meetup-3#모노레포와인프라자동화|아임웹 배포 자동화]] — 모노레포+테라폼+ArgoCD, 1주일->20분 배포, 2주->1일 기능 릴리즈

## Checklist

### 버전 관리

- [x] [[version-control|버전 관리 폴더 인덱스 (Git 도구, 개발 워크플로, Git 멘탈 모델/머지 전략/복구)]]
- [ ] Git Flow / Trunk-Based (작성 예정: `Git-Flow`) — 기존 보강: [[Version-Control-Tooling#Branch 전략은 배포 모델의 결과다|GitHub Flow, Git Flow, Trunk-Based 개요]]

### 기초와 도구 선택

- [x] [[CICD-Foundations|기초와 도구 선택 폴더 인덱스 (CI/CD 개념 구분, 툴 선택 기준, CI 도구 비교, DevSecOps)]]

### 파이프라인

- [x] [[CICD-Pipeline|파이프라인 폴더 인덱스 (GitHub Actions, 모노레포, Docker 이미지, 의존성 관리)]]
- [x] [[GitHub-Actions#속도 최적화 — CI 시간을 수 분 → 수십 초로|Build cache (의존성, Docker layer, GHA cache)]] / [[Monorepo-CICD#캐시 — 가장 조용한 성능 킬러|Turborepo 캐시와 무효화 전파]]

### 배포

- [x] [[CICD-Deployment|배포 폴더 인덱스 (무중단 5계층, Blue-Green, 단일 서버 배포, ChatOps)]]
- [ ] Helm (작성 예정: `Helm`)
- [ ] ArgoCD (GitOps) (작성 예정: `ArgoCD`) — 기존 보강: [[CICD-Tool-Selection#CD 도구 비교 (GitOps 중심)|ArgoCD와 FluxCD 선택 기준]]
- [ ] Canary (작성 예정: `Canary`) — 기존 보강: [[Blue-Green#관련 무중단 배포 전략|Blue-Green과 Canary 개념 비교]]
- [ ] Feature flag 시스템 (작성 예정: `Feature-Flag`) — 기존 보강: [[One-Way-vs-Two-Way-Door#Two-Way Door 확장 기법|가역적 배포 수단으로서 Feature Flag]]
- [ ] Rollback 전략 (작성 예정: `Rollback`) — 기존 보강: [[Blue-Green|Blue-Green 트래픽 롤백]], [[GitHub-Actions#면접 포인트|SHA 이미지 롤백]]
- [ ] DB migration 전략 (작성 예정: `DB-Migration`) — 기존 보강: [[Blue-Green#DB 스키마, 공유 상태의 난제|Expand-Contract 개요]], [[Schema-Migration-Large-Table|대용량 테이블 Online DDL]], [[Schema-Versioning|스키마 버전 관리]]
