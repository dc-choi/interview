---
tags: [ci-cd, automation, deployment]
status: done
category: "CICD&배포(CICD&Delivery)"
aliases: ["CI Tool Selection", "CI 도구 선택"]
verified_at: 2026-10-12
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
- 2026-11-18 기준 public 저장소의 표준 GitHub-hosted runner와, 저장소 공개 여부와 관계없이 self-hosted runner 사용에는 Actions 사용 요금이 부과되지 않는다. 다만 larger runner는 public 저장소에서도 과금되고 부가 기능도 과금될 수 있으며 self-hosted 인프라 비용은 사용자가 부담한다.
- private 저장소의 포함 사용량과 스토리지는 플랜별이다. 2026-11-18 문서 기준 포함 사용량은 분이 아니라 금액으로 표시되며 GitHub Free는 월 12달러다. 표준 Linux runner의 분당 0.006달러로 환산하면 약 2,000분이지만 다른 runner의 단가는 따로 확인하고, 이 수치를 모든 private 저장소에 일반화하지 않는다.
- 유효한 결제 수단이 없는 계정은 포함량을 다 쓰면 사용이 차단된다. 이를 피하려고 private 저장소를 public으로 바꾸면 코드와 Actions 실행 기록, 로그가 누구에게나 공개되고 누구나 fork할 수 있다. 고객 코드나 내부 업무 도구의 저장소라면 공개 전환 대신 결제 수단 등록, self-hosted runner, 저장소를 직접 연결해 빌드하는 배포 플랫폼을 비교한다.
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

## 교체 범위를 층으로 나눈다

느리거나 불안정한 CI를 고칠 때 도구 전체를 바꿀지부터 묻지 않고, 어느 층을 바꿀지 먼저 정한다.

| 층 | 바꾸는 것 | 그대로 두는 것 | 효과와 한계 |
|---|---|---|---|
| 러너 | job을 실행하는 기계. GitHub Actions에서는 `runs-on` 라벨로 고르는 self-hosted runner나 외부 업체 runner | workflow YAML, 트리거, 권한과 필수 검사 | 기동 시간, CPU와 메모리, 캐시 위치와 비용이 바뀐다. self-hosted runner도 GitHub에 연결해 job을 배정받고, 라벨이 맞는 runner가 없으면 job은 대기열에 남는다. GitHub 쪽 스케줄링 장애는 러너를 바꿔도 그대로 받는다 |
| 오케스트레이션 플랫폼 | 이벤트 수신, job 스케줄링, 로그와 결과 보고 | 빌드와 테스트 명령 자체 | 장애 의존과 스케줄링 제어가 바뀐다. workflow를 새 문법으로 다시 쓰고, `uses:`로 가져다 쓴 액션, 자동 발급되는 `GITHUB_TOKEN`에 기댄 단계, 브랜치 보호의 필수 상태 검사 연결을 옮겨야 한다 |
| 빌드 엔진 | 단계, 의존 관계와 캐시를 코드로 정의해 실행한다(Bazel, Dagger 등) | 기존 CI의 한 단계에서 명령으로 실행할 수 있다 | 같은 파이프라인을 로컬과 CI에서 돌리고 증분 실행과 캐시로 작업량 자체를 줄인다. 학습과 이전 비용이 가장 크다 |

층의 경계는 고정돼 있지 않다. Dagger 문서는 스스로를 Jenkins와 GitHub Actions 다음의 3세대 CI로 소개하며 YAML 설정을 대신하겠다고 밝힌다. 엔진이 플랫폼 영역으로, 러너 업체가 오케스트레이션 영역으로 넓히는 움직임이 있으므로 제품 이름보다 바꾸려는 층을 기준으로 비교한다.

판단 순서는 다음을 제안한다.

1. 대기열 시간, 러너 기동, 의존성 설치와 캐시 복원, 빌드와 테스트 실행을 나눠 잰다. 병목이 실행 환경이면 러너, 장애 의존과 스케줄링 제어면 플랫폼, 작업량이면 빌드 엔진과 캐시를 본다.
2. 플랫폼 이전 비용은 YAML 줄 수보다 `uses:` 단계 수, `GITHUB_TOKEN` 권한에 기댄 단계와 필수 상태 검사 이름을 세어 추정한다.
3. 외부 업체 runner는 저장소 코드와 job에 주입되는 secret을 실행하는 곳이다. 격리 방식, 데이터 보관과 접근 통제를 self-hosted runner와 같은 기준으로 검토한다.

2026-11 GeekNews 요약(원문 미확보)은 이 세 층을 CI 시장의 세 갈래로 보고, workflow YAML이 사실상 표준이 되고 러너가 범용 상품이 되면서 러너 교체 쪽 경쟁이 가장 치열하며 GitHub Actions는 속도, 디버깅과 2026년 안정성 문제로 우위가 약해지고 있다고 해석한다. 원문과 근거 자료를 확인하지 못한 시장 해석이므로 도구 선택의 근거로 쓰지 않는다.

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
- **로컬, 스테이징과 운영 화면이 똑같이 보임** → 엉뚱한 환경에서 입력하거나 검수를 마쳤다고 착각한다. 환경 이름과 색을 화면에 표시한다
- **로컬 예시 데이터의 식별자를 코드에 고정** → 로컬에서는 통과하고 스테이징에서만 서버 오류가 난다. 스테이징에서도 같은 검수 시나리오를 다시 돌린다
- **인증 없이 운영 주소부터 공개** → 누구나 접근하는 화면에 실제 고객 정보가 쌓일 수 있다. 인증과 권한을 붙이기 전에는 운영 환경에 실제 데이터를 넣지 않는다

## 면접 체크포인트

- GitHub Actions가 오늘날 기본값인 이유
- CI vs CD vs Continuous Deployment 구분
- Rolling, Blue-Green, Canary 배포 전략 선택 기준
- CI 파이프라인에서 캐싱의 중요성
- 느린 CI를 러너, 오케스트레이션 플랫폼, 빌드 엔진 가운데 어느 층에서 고칠지 정하는 기준
- GitOps(ArgoCD)의 핵심 아이디어 (Git = Source of Truth)

## 출처
- [velog @city7310 — 백엔드가 이정도는 해줘야 함 11. 배포 자동화](https://velog.io/@city7310/%EB%B0%B1%EC%97%94%EB%93%9C%EA%B0%80-%EC%9D%B4%EC%A0%95%EB%8F%84%EB%8A%94-%ED%95%B4%EC%A4%98%EC%95%BC-%ED%95%A8-11.-%EB%B0%B0%ED%8F%AC-%EC%9E%90%EB%8F%99%ED%99%94)
- [GitHub Actions 요금 및 사용 개념](https://docs.github.com/en/actions/concepts/billing-and-usage)
- [GitHub Actions 제품별 포함량](https://docs.github.com/en/billing/concepts/product-billing/github-actions) — 2026-11-18 확인, 금액으로 표시되는 포함 사용량, 무료로 남는 사용 범위와 결제 수단이 없을 때의 차단
- [GitHub 저장소 공개 범위 설정](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility) — 2026-10-12 확인, private에서 public으로 바꿀 때 공개되는 범위
- [GitHub Actions self-hosted runner 레퍼런스](https://docs.github.com/en/actions/reference/runners/self-hosted-runners) — 2026-11-18 확인, runner가 GitHub에 연결해 job을 배정받는 구조와 라벨 기반 대기
- [Dagger, Documentation](https://docs.dagger.io/) — 2026-11-18 확인, 3세대 CI라는 자기 소개와 로컬 또는 원격 엔진 실행
- [GitHub Actions Alternatives: Runners, Platforms, and Engines — Avrea](https://avrea.com/github-actions-alternatives) — 러너, 플랫폼, 엔진의 세 교체 방식과 이전 비용 항목(`uses:` 단계, `GITHUB_TOKEN`, 필수 검사), 러너 업체의 오케스트레이션 확장(자사 CI 엔진, closed beta). runner와 CI 엔진을 파는 업체의 글이며 제품 정보는 2026-08-20 확인 기준
- GeekNews, 2026-11-17 제공 요약: CI 시장은 세 갈래로 나뉘었다 (토픽 번호와 원문 미확인, 시장 해석은 원문 미대조)
- [YouTube, 양실장의 바이브코딩대학, 직장인 2시간 필수 투자) 평생 써먹는 바이브코딩 자동화 대시보드 설계부터 구축까지](https://www.youtube.com/watch?v=sozxBiyc3qQ) — 2026-08-20 공개 강의, 2:11:21~2:34:29의 스테이징과 운영 배포 시연. 환경 혼동, 하드코딩한 식별자와 인증 전 운영 배포 항목은 시연에서 드러난 문제를 일반화했다.

## 관련 문서
- [[Development-Workflow|개발 워크플로]]
- [[Dependency-Management|의존성 관리]]
- [[Docker|Docker]]
