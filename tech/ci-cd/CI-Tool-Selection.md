---
tags: [ci-cd, automation, deployment]
status: done
category: "CICD&배포(CICD&Delivery)"
aliases: ["CI Tool Selection", "CI 도구 선택"]
---

# CI/CD 도구 선택

빌드·테스트·배포를 자동화하는 도구 결정. 오늘날 **GitHub Actions**가 사실상 기본값이지만, 조직 상황에 따라 Jenkins·GitLab CI·CircleCI·CodeBuild·Argo 등이 선택지.

## 도구 비교

| 도구 | 제공 방식 | 장점 | 약점 |
|---|---|---|---|
| **GitHub Actions** | SaaS, GitHub 통합 | 설정 간단, 공개 리포 무료, 마켓플레이스 풍부 | 대규모 self-hosted는 러너 관리 부담 |
| **GitLab CI/CD** | SaaS 또는 self-hosted | GitLab 통합, 무료 self-hosted | GitLab 종속 |
| **Jenkins** | self-hosted | 완전한 제어, 플러그인 방대 | **운영 비용 큼**, UI 올드, 설정 분산 |
| **CircleCI** | SaaS | 빠른 빌드, 좋은 UX | 비용 (규모 커지면) |
| **Travis CI** | SaaS | 간단, OSS 친화적(과거) | 2020 이후 쇠퇴 |
| **AWS CodeBuild** | AWS 관리형 | IAM·S3·ECR 네이티브 통합, **사용량만큼 과금** | AWS 종속, UI 제한적 |
| **ArgoCD / Argo Workflows** | Kubernetes 네이티브 | GitOps 선두, K8s 배포 특화 | K8s 환경에 한정 |
| **Tekton** | K8s CRD 기반 | 재사용 가능한 파이프라인 | 러닝 커브 |

## 선택 기준

### 기본값: GitHub Actions
- GitHub에 코드가 있으면 **설정 1분**으로 시작
- 무료 티어(public repo 무제한, private repo 월 2000분) 충분
- 마켓플레이스에 actions 수천 개 — 대부분 작업은 기존 action 조합
- 단, 대규모 self-hosted 러너가 필요하면 운영 부담 증가

### AWS 생태계 중심 조직
**AWS CodeBuild + CodePipeline**. IAM·S3·ECR·ECS와 네이티브 연결. 다만 UI·UX는 GitHub Actions 대비 떨어짐. 비용은 사용량 기반.

### GitLab 사용 조직
**GitLab CI/CD**. `.gitlab-ci.yml` 하나로 파이프라인 완성, 통합된 UX.

### 사내 엔터프라이즈·규제 환경
**Jenkins self-hosted**. 완전한 제어권, 모든 플러그인 가능. 대신 운영 인력 상시 필요.

### Kubernetes 중심
**ArgoCD**(배포) + **Tekton** 또는 **GitHub Actions**(빌드). GitOps 패러다임 — Git을 배포 상태의 Source of Truth.

## 파이프라인 구조 (표준)

```
Push to branch
  ↓
1. Install dependencies (캐시 활용)
2. Lint / Format check
3. Build (compile, bundle)
4. Unit tests
5. Integration tests (Testcontainers 등)
6. Security scan (Dependabot, Trivy)
  ↓
PR ↔ main merge
  ↓
7. Build artifact (Docker image)
8. Push to registry (ECR, GHCR, Docker Hub)
9. Deploy to staging
10. Smoke test
11. Deploy to production (수동 승인 or 자동)
```

**PR 단계는 1~6**, **머지 후 7~11**. 속도와 안전의 균형.

## 캐싱이 핵심

CI 시간의 절반은 보통 "의존성 설치". 캐싱으로 크게 단축.

```yaml
# GitHub Actions 예시
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

**lock 파일 해시**를 키로 쓰면 의존성 변경 시에만 재설치.

## 배포 자동화 전략

### Continuous Integration (CI)
- PR 단계에서 **빌드·테스트만** 자동. 배포는 별도.

### Continuous Delivery (CD)
- main 머지 시 **스테이징까지 자동**. 프로덕션은 수동 승인.

### Continuous Deployment
- main 머지 시 **프로덕션까지 자동**. 피처 플래그 + 모니터링 + 자동 롤백이 전제.

성숙도에 따라 CI → CD → Continuous Deployment 순으로 진화.

## 배포 전략 (Deploy Patterns)

| 전략 | 동작 | 롤백 |
|---|---|---|
| **Rolling** | 구 버전을 점진적으로 새 버전으로 교체 | 남은 구 버전을 유지·확대 |
| **Blue-Green** | 완전히 새로운 환경 띄우고 트래픽 전환 | 즉시 이전 환경으로 복귀 |
| **Canary** | 소수(예: 5%)만 새 버전, 점진 확대 | 소수에서 감지되면 즉시 중단 |

Blue-Green은 **즉시 롤백**이 가능하지만 **자원 2배** 필요. Canary는 **작은 블라스트 반경**.

## 비밀·시크릿 관리

- 환경 변수 평문 저장 금지 — **GitHub Secrets·AWS Secrets Manager·Vault**
- 파이프라인 로그에 **시크릿이 찍히지 않게** (자동 마스킹 확인)
- 최소 권한 — 각 파이프라인이 필요한 리소스에만 접근

## 흔한 실수

- **테스트 없이 자동 배포** → 장애 자동화
- **모든 커밋에 prod 배포** → 롤백 지옥
- **캐시 미활용** → CI 시간 5~10배
- **시크릿을 ENV로 하드코딩** → Git 유출 사고
- **수동 배포가 기본** → 배포 빈도 저하 → 큰 배포 → 장애 리스크

## 면접 체크포인트

- GitHub Actions가 오늘날 기본값인 이유
- CI vs CD vs Continuous Deployment 구분
- Rolling·Blue-Green·Canary 배포 전략 선택 기준
- CI 파이프라인에서 캐싱의 중요성
- GitOps(ArgoCD)의 핵심 아이디어 (Git = Source of Truth)

## 출처
- [velog @city7310 — 백엔드가 이정도는 해줘야 함 11. 배포 자동화](https://velog.io/@city7310/%EB%B0%B1%EC%97%94%EB%93%9C%EA%B0%80-%EC%9D%B4%EC%A0%95%EB%8F%84%EB%8A%94-%ED%95%B4%EC%A4%98%EC%95%BC-%ED%95%A8-11.-%EB%B0%B0%ED%8F%AC-%EC%9E%90%EB%8F%99%ED%99%94)

## 관련 문서
- [[Development-Workflow|개발 워크플로]]
- [[Dependency-Management|의존성 관리]]
- [[Docker|Docker]]
