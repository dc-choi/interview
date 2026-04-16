---
tags: [cicd, ci, cd, continuous-integration, continuous-delivery, continuous-deployment]
status: done
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["CICD Basics", "CI/CD 기초", "Continuous Integration", "Continuous Delivery", "Continuous Deployment"]
---

# CI/CD 기초

**CI(지속적 통합)** 과 **CD(지속적 제공/배포)** 는 소프트웨어 변경을 **작고 자주** 통합하고 배포하기 위한 자동화 프로세스. 버그 발견과 릴리즈 사이의 시간을 단축해 품질과 전달 속도를 동시에 높인다. 구체 도구 선택은 [[CICD-Tool-Selection]] 참조.

## 핵심 명제

- **CI**: 코드 변경을 **자주·작게** 머지하고 자동으로 **빌드·테스트**
- **CD**: CI 통과 후 **배포 가능 상태**로 저장(Delivery) 또는 **자동 배포**(Deployment)
- 자동화의 목적: **휴먼 에러 감소·조기 문제 발견·릴리즈 시간 단축**
- "작고 자주"가 핵심 — 큰 배치를 한 번에 하면 오류 원인 파악이 어려워지고 롤백 리스크 증가

## CI — Continuous Integration

### 목적

하루에 여러 번 코드를 공유 브랜치에 통합하고, **통합이 문제를 만들지 않는지** 자동으로 검증.

### 전형적 흐름

1. 개발자가 기능 브랜치에서 작업
2. PR 생성 → 메인 브랜치로 머지 시도
3. CI 파이프라인이 자동 트리거:
   - 의존성 설치
   - 빌드
   - Lint
   - 단위 테스트·통합 테스트
   - 커버리지 측정
   - 코드 품질 분석 (SonarQube 등)
4. 모든 단계 통과 → 머지 승인
5. 실패 → PR 작성자에게 피드백

### 자동화의 가치

- 매번 **같은 검증**을 보장 (수동 누락 방지)
- 버그 발견 시점이 **개발 초기**로 이동 → 수정 비용 급감
- 팀원이 서로의 변경을 **빠르게 감지** → 머지 컨플릭트 최소화

## CD — Continuous Delivery vs Continuous Deployment

두 용어가 혼용되지만 **배포 주체**가 다르다.

| 구분 | Delivery | Deployment |
|---|---|---|
| **마지막 단계** | 배포 가능한 아티팩트를 **저장소에 업로드** | **자동으로 프로덕션 배포** |
| **프로덕션 배포** | 수동 승인 | 자동 |
| **적합한 경우** | 규제 산업·중대 변경·수동 QA 필요 | Feature flag·점진 롤아웃이 잘 된 조직 |
| **단점** | 배포 시점이 사람에 의존 | 자동 배포를 신뢰할 수준의 테스트·관측 필요 |

**Delivery**는 "언제든 배포 가능한 상태", **Deployment**는 "실제로 자동 배포됨". Netflix·Amazon 같은 곳은 Deployment, 금융권은 Delivery가 일반적.

## 파이프라인 구성 요소

### 일반적인 단계

```
Source (Git push)
  ↓
Build (컴파일·패키징)
  ↓
Test (단위·통합·E2E)
  ↓
Security (SAST·의존성 취약점 스캔)
  ↓
Artifact (Docker 이미지·jar·war 업로드)
  ↓
Deploy to Staging
  ↓
Smoke Test · Acceptance Test
  ↓
Deploy to Production (manual or auto)
  ↓
Post-deploy Monitoring
```

### 빌드 산출물(Artifact) 형태

- **Docker 이미지** (가장 흔함): 컨테이너 레지스트리에 push
- **JAR/WAR**: Maven/Gradle 빌드 결과
- **npm 패키지**: 라이브러리 배포
- **실행 바이너리**: Go·Rust 같은 언어
- **정적 자산**: 프런트엔드 번들(S3/CDN)

## 트리거 방식

| 트리거 | 전형 용도 |
|---|---|
| **Git push** | 기본 CI 실행 (PR·브랜치 push) |
| **PR 생성/변경** | 머지 전 검증 |
| **Tag push** | 릴리즈 빌드 (`v1.0.0`) |
| **Schedule (cron)** | 야간 빌드·보안 스캔 |
| **Manual (수동)** | 프로덕션 배포 (Delivery) |
| **API/Webhook** | 외부 시스템과 연동 |

## 실무 도구

| 도구 | 특징 |
|---|---|
| **Jenkins** | 셀프 호스팅·플러그인 생태계 풍부·운영 부담 |
| **GitHub Actions** | GitHub 통합·YAML 기반·관리형 |
| **GitLab CI** | GitLab 통합·Pipeline as Code |
| **CircleCI** | 관리형·빠른 빌드·가격 경쟁력 |
| **Travis** | 오픈소스 친화·GitHub 통합 (인기 감소) |
| **AWS CodePipeline/CodeBuild** | AWS 통합·IAM |
| **ArgoCD/FluxCD** | K8s GitOps 전용 CD |

도구 선택 기준은 [[CICD-Tool-Selection]].

## 자주 헷갈리는 포인트

- **CI = 단순 빌드 자동화** 오해 — 통합·테스트·품질 검증을 포함
- **CD Delivery = Deployment** 혼동 — 자동 배포 여부가 결정적 차이
- **"자동화하면 품질 OK"** — 자동화는 일관성·속도 확보, 품질은 테스트·리뷰가 결정
- **파이프라인이 너무 길어지면 CI 가치 하락** — 10분 넘으면 개발자 대기로 생산성 저하. 병렬화·캐싱 중요
- **빅뱅 파이프라인** — 모든 테스트를 일괄 실행하기보다, 빠른 피드백(lint·unit) 먼저 → 느린 단계 뒤로
- **CI 실패를 방치** — 실패한 빌드가 며칠 쌓이면 문화가 무너짐. 빨간 불은 즉시 대응

## 실무 가치 — 무엇이 달라지는가

| 항목 | 없을 때 | 있을 때 |
|---|---|---|
| **버그 발견 시점** | QA·배포 후 | 커밋 직후 |
| **릴리즈 빈도** | 월/분기 단위 | 일/시간 단위 |
| **롤백 난이도** | 큰 범위 변경이라 복잡 | 작은 단위라 쉬움 |
| **팀 속도 편차** | 개인 숙련도에 의존 | 자동 검증으로 일관 |
| **긴급 패치 대응** | 전체 프로세스 재수행 | 파이프라인이 감당 |

## 성숙도 단계 — 팀 CI/CD가 어디 있나

1. **Level 0** — 수동 빌드·배포, 테스트 없음
2. **Level 1** — 빌드 자동화, 수동 테스트
3. **Level 2** — 단위 테스트 자동화, 수동 배포
4. **Level 3** — 통합 테스트 + Delivery (배포 클릭 한 번)
5. **Level 4** — 완전 Deployment + 관측성·feature flag
6. **Level 5** — 점진적 배포(Canary·Blue/Green), 자동 롤백

## 면접 체크포인트

- **CI vs CD(Delivery) vs Deployment** 의 정확한 차이
- **파이프라인의 표준 단계** (Source·Build·Test·Security·Artifact·Deploy)
- CI가 **버그 발견 시점**을 앞당기는 원리
- 트리거 방식(push·PR·tag·cron) 각각의 용도
- **파이프라인 속도**가 왜 중요한가 (10분 한계·병렬·캐싱)
- 조직 규제(금융 등)에 따른 **Delivery 선택** 이유
- 성숙도 단계(0~5)로 자신의 팀 현재 위치 설명

## 출처
- [테코블 — CI/CD란?](https://tecoble.techcourse.co.kr/post/2021-08-14-ci-cd/)

## 관련 문서
- [[CICD-Tool-Selection|CI/CD 툴 선택 평가 기준]]
- [[GitHub-Actions|GitHub Actions]]
- [[Docker-Image-Pipeline|Docker 이미지 빌드 파이프라인]]
