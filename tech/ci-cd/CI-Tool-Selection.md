---
tags: [ci-cd, automation, deployment]
status: done
category: "CICD&배포(CICD&Delivery)"
aliases: ["CI Tool Selection", "CI 도구 선택"]
verified_at: 2026-07-21
---

# CI/CD 도구 선택

빌드, 테스트, 배포를 자동화하는 도구 결정. GitHub에 코드를 두는 팀에는 **GitHub Actions**가 자연스러운 후보지만, 저장소 위치, 규제, 운영 역량, 실행 환경과 비용에 따라 Jenkins, GitLab CI/CD, CircleCI, CodeBuild, Argo 계열 등이 선택지가 된다.

## 도구 비교

| 도구 | 제공 방식 | 장점 | 약점 |
|---|---|---|---|
| **GitHub Actions** | SaaS, GitHub 통합 | 저장소와 권한 통합, 공개 저장소의 표준 GitHub-hosted runner 사용 무료, 마켓플레이스 | private 저장소는 플랜별 포함량과 과금, self-hosted는 러너 운영 부담 |
| **GitLab CI/CD** | SaaS 또는 self-managed | GitLab 저장소, 권한과 통합 | 라이선스, 실행 시간 및 self-managed 인프라 비용 확인 필요 |
| **Jenkins** | self-hosted | 완전한 제어, 플러그인 방대 | **운영 비용 큼**, UI 올드, 설정 분산 |
| **CircleCI** | SaaS | 빠른 빌드, 좋은 UX | 비용 (규모 커지면) |
| **Travis CI** | SaaS | 간단한 저장소 연동 | 현재 요금제, 실행 환경과 필요한 생태계를 별도 비교 |
| **AWS CodeBuild** | AWS 관리형 | IAM, S3, ECR 네이티브 통합, **사용량만큼 과금** | AWS 종속, UI 제한적 |
| **Argo CD / Argo Workflows** | Kubernetes 네이티브 | Argo CD는 GitOps 배포, Workflows는 작업 오케스트레이션에 특화 | Kubernetes 운영 역량 필요, 두 제품의 역할이 다름 |
| **Tekton** | K8s CRD 기반 | 재사용 가능한 파이프라인 | 러닝 커브 |

## 선택 기준

### 기본값: GitHub Actions
- GitHub 저장소, 권한, PR 이벤트와 바로 연결할 수 있어 초기 구성이 비교적 단순
- 2026-07-21 기준 public 저장소의 표준 GitHub-hosted runner와 self-hosted runner에는 Actions 사용 요금이 부과되지 않는다. 다만 larger runner와 부가 기능은 과금될 수 있고 self-hosted 인프라 비용은 사용자가 부담한다.
- private 저장소의 포함 실행 시간과 스토리지는 플랜별이다. 예를 들어 GitHub Free는 월 2,000분을 포함하지만 이 수치를 모든 private 저장소에 일반화하면 안 된다.
- 마켓플레이스 action을 재사용할 때도 공급망 위험을 줄이기 위해 신뢰할 수 있는 게시자인지 확인하고 commit SHA 고정을 고려
- 단, 대규모 self-hosted 러너가 필요하면 운영 부담 증가

### AWS 생태계 중심 조직
**AWS CodeBuild + CodePipeline**. IAM, S3, ECR, ECS와 네이티브 연결. 다만 UI, UX는 GitHub Actions 대비 떨어짐. 비용은 사용량 기반.

### GitLab 사용 조직
**GitLab CI/CD**. `.gitlab-ci.yml`을 중심으로 파이프라인을 정의하고 GitLab 저장소, 권한과 UI를 통합할 수 있다.

### 사내 엔터프라이즈, 규제 환경
**Jenkins self-hosted**. 실행 환경을 직접 통제하고 폭넓은 플러그인 생태계를 사용할 수 있다. 대신 controller, agent, 플러그인 호환성과 보안을 운영해야 한다.

### Kubernetes 중심
**ArgoCD**(배포) + **Tekton** 또는 **GitHub Actions**(빌드). GitOps 패러다임 — Git을 배포 상태의 Source of Truth.

## 파이프라인 구조 예시

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

이 예시에서는 **PR 단계가 1~6**, **머지 후가 7~11**이다. 프로젝트의 위험도와 배포 모델에 따라 단계와 실행 시점은 달라진다.

## 캐싱이 핵심

의존성 설치가 병목인 파이프라인은 캐싱으로 실행 시간을 크게 줄일 수 있다. 실제 비중과 효과는 프로젝트와 캐시 적중률로 측정한다.

```yaml
# GitHub Actions 예시
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

**lock 파일 해시**를 키로 쓰면 같은 의존성 집합의 npm 다운로드 캐시를 복원할 수 있다. `actions/cache`만으로 설치 단계가 생략되는 것은 아니며, 별도 조건을 두지 않으면 `npm ci` 같은 설치 명령은 매번 실행되되 네트워크 다운로드가 줄어든다.

## 배포 자동화 전략

### Continuous Integration (CI)
- PR 단계에서 **빌드, 테스트만** 자동. 배포는 별도.

### Continuous Delivery (CD)
- main 머지 시 **스테이징까지 자동**. 프로덕션은 수동 승인.

### Continuous Deployment
- main 머지 시 **프로덕션까지 자동**. 피처 플래그 + 모니터링 + 자동 롤백이 전제.

세 방식은 자동화 범위와 위험 허용 수준이 다르다. Continuous Deployment가 모든 조직의 최종 성숙 단계인 것은 아니며 규제와 승인 정책에 따라 Delivery가 적절한 최종 형태일 수 있다.

## 배포 전략 (Deploy Patterns)

| 전략 | 동작 | 롤백 |
|---|---|---|
| **Rolling** | 구 버전을 점진적으로 새 버전으로 교체 | reverse rollout 또는 수정 버전 roll-forward. 구 버전 pod가 남았다고 자동 복구되는 것은 아님 |
| **Blue-Green** | 별도 환경을 띄우고 트래픽 전환 | 이전 환경과 호환성을 유지한 동안 빠르게 트래픽 복귀 가능 |
| **Canary** | 일부 트래픽만 새 버전에 보내고 점진 확대 | 관측 기준에 따라 확대 중단과 트래픽 복귀. 이미 생긴 부작용은 별도 복구 |

Blue-Green은 이전 환경을 유지하는 동안 빠르게 트래픽을 되돌릴 수 있지만 환경 중복 비용이 든다. 데이터베이스 변경이나 외부 부작용까지 자동으로 되돌리는 것은 아니다. Canary는 일부 트래픽부터 노출해 초기 블라스트 반경을 줄이지만 정확한 관측과 중단 기준이 필요하다.

## 비밀, 시크릿 관리

- 저장소와 워크플로 파일에 시크릿 평문 저장 금지. **GitHub Secrets, AWS Secrets Manager, Vault** 등에서 실행 시 주입
- 파이프라인 로그에 시크릿이 찍히지 않게 하고 자동 마스킹만 신뢰하지 말 것. 인코딩하거나 변형한 값은 마스킹되지 않을 수 있음
- 최소 권한 — 각 파이프라인이 필요한 리소스에만 접근

## 흔한 실수

- **테스트 없이 자동 배포** → 장애 자동화
- **모든 커밋에 prod 배포** → 롤백 지옥
- **측정 없이 캐시 미활용** → 의존성 설치나 빌드가 반복되는 파이프라인의 실행 시간 증가
- **저장소나 workflow에 secret literal을 하드코딩** → Git과 로그를 통한 유출 위험. 신뢰할 수 있는 secret store에서 환경 변수나 파일로 주입하는 방식 자체는 가능
- **수동 배포가 기본** → 배포 빈도 저하 → 큰 배포 → 장애 리스크

## 면접 체크포인트

- GitHub Actions가 오늘날 기본값인 이유
- CI vs CD vs Continuous Deployment 구분
- Rolling, Blue-Green, Canary 배포 전략 선택 기준
- CI 파이프라인에서 캐싱의 중요성
- GitOps(ArgoCD)의 핵심 아이디어 (Git = Source of Truth)

## 출처
- [velog @city7310 — 백엔드가 이정도는 해줘야 함 11. 배포 자동화](https://velog.io/@city7310/%EB%B0%B1%EC%97%94%EB%93%9C%EA%B0%80-%EC%9D%B4%EC%A0%95%EB%8F%84%EB%8A%94-%ED%95%B4%EC%A4%98%EC%95%BC-%ED%95%A8-11.-%EB%B0%B0%ED%8F%AC-%EC%9E%90%EB%8F%99%ED%99%94)
- [GitHub Actions 요금 및 사용 개념](https://docs.github.com/en/actions/concepts/billing-and-usage)
- [GitHub Actions 제품별 포함량](https://docs.github.com/en/billing/concepts/product-billing/github-actions)

## 관련 문서
- [[Development-Workflow|개발 워크플로]]
- [[Dependency-Management|의존성 관리]]
- [[Docker|Docker]]
