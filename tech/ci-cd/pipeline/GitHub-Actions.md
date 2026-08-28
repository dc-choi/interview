---
tags: [cicd, github-actions]
status: done
verified_at: 2026-08-28
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["GitHub Actions", "깃헙 액션"]
---

# GitHub Actions

GitHub에서 제공하는 CI/CD 플랫폼. 레포지토리의 이벤트(push, PR, schedule 등)에 반응하여 워크플로우를 자동 실행한다.

## 핵심 개념

**Workflow** — `.github/workflows/` 안의 YAML 파일. 트리거 조건과 실행할 작업을 정의한다.
**Job** — 워크플로우 안의 실행 단위. 기본적으로 병렬 실행되며, `needs`로 의존 관계를 설정하면 순차 실행된다.
**Step** — Job 안의 개별 명령. 셸 커맨드(`run`) 또는 재사용 액션(`uses`)을 실행한다.
**Runner** — 워크플로우를 실행하는 서버. GitHub-hosted(`ubuntu-latest` 등)와 self-hosted가 있다.

## CI 워크플로우 — 품질 게이트

PR이 올라올 때 코드 품질을 자동 검증하는 파이프라인이다.

**트리거 설정:**
- `on.pull_request`로 PR 이벤트에 반응
- `paths` 필터로 변경된 파일이 특정 경로(`apps/**`, `packages/**`, `pnpm-lock.yaml`)에 해당할 때만 실행
- 불필요한 빌드를 줄여 비용과 시간을 절약

**품질 파이프라인 순서:**
1. 의존성 설치 (`pnpm install --frozen-lockfile`)
2. 린트 검사 (`pnpm lint`)
3. 포맷 검사 (`pnpm prettier`)
4. 타입 체크 (`pnpm typecheck`)
5. 빌드 (`pnpm build`)
6. 테스트 (`pnpm test`)

**`--frozen-lockfile`의 의미:** lock 파일과 `package.json`이 일치하지 않으면 설치를 중단한다. CI 환경에서 의존성 일관성을 보장하는 핵심 옵션이다.

### 보안 경계

- workflow의 `permissions`로 `GITHUB_TOKEN`을 job에 필요한 최소 권한만 부여한다.
- third-party action은 검토한 full-length commit SHA로 고정하고 Dependabot 같은 갱신 경로를 둔다.
- fork PR처럼 신뢰하지 않는 코드에 write token이나 secret을 넘기지 않는다. 특히 `pull_request_target`에서 PR 코드를 checkout해 실행하지 않는다.
- cloud 배포는 장기 access key보다 OIDC와 짧은 수명의 자격 증명을 우선하고, production environment에는 승인과 branch 제한을 둔다.

## CD 워크플로우 — 자동 배포

main 브랜치에 push될 때 변경 감지 후 자동 배포한다.

**변경 감지 (Change Detection):**
- `dorny/paths-filter` 액션으로 API/Web 중 어떤 부분이 변경되었는지 판별
- 변경된 앱만 선택적으로 배포하여 불필요한 배포를 방지

**API 배포 (Docker 기반):**
1. Docker 이미지 빌드 (multi-stage)
2. registry에 push하고 `build-push-action`의 `steps.push.outputs.digest`를 배포 기록으로 보관
3. SSH로 서버 접속 → Compose manifest에서 `image@sha256:...`를 사용해 `docker compose pull && docker compose up -d`

**Web 배포 (정적 파일):**
1. `pnpm turbo build --filter=@workspace/web`으로 빌드
2. SCP로 빌드 결과물을 서버에 전송

**Job 의존성 관리:**
- `needs: [changes, deploy-api]`로 API 배포 완료 후 Web 배포 진행
- `if: needs.changes.outputs.api == 'true'`로 조건부 실행

## 모노레포에서의 전략

**경로 기반 필터링:** 모노레포에서 각 앱/패키지의 변경을 독립적으로 감지하여 해당 부분만 CI/CD 실행

**Turbo 활용:** `--filter` 옵션으로 특정 패키지만 빌드. Turbo의 캐시 시스템이 변경되지 않은 패키지의 빌드를 건너뛴다.

**태그 전략:**
- `latest` — 사람이 찾기 쉬운 mutable reference
- `${{ github.sha }}` — 커밋 해시로 특정 빌드를 추적, 롤백 시 유용
- 태그는 mutable reference이므로 배포 식별자로 사용하지 않는다. `image@sha256:...`를 배포 기록과 Compose manifest에 남긴다

## 속도 최적화 — 병목을 측정하고 줄이기

CI 시간이 길면 피드백이 늦어진다. 아래 기법의 효과는 설치, build, test와 runner 대기 중 어디가 병목인지에 따라 달라지므로 job과 step 시간을 먼저 측정한다. 출처의 공개 사례 수치는 해당 저장소와 시점의 결과이며 현재 workflow의 예상치로 사용하지 않는다.

### 의존성 캐싱

반복 설치에서 가장 큰 시간을 먹는 부분.

- **`actions/setup-node` cache 옵션**: `cache: 'npm'` / `'yarn'` / `'pnpm'`은 package manager의 global data를 캐시한다. `node_modules`를 캐시하지 않으므로 이후 설치 명령은 여전히 실행한다
- **`actions/cache` 직접 사용**: setup action이 다루지 않는 경로만 검토한다. OS, runtime, package manager와 lock file을 key에 반영하고, `node_modules` 직접 캐시는 native module과 install script의 재현성까지 확인한 뒤 선택한다
- **Gradle/Maven**: `actions/setup-java`의 `cache` 옵션 또는 `~/.gradle/caches` 직접 캐시

### Docker Layer 캐싱

Dockerfile 빌드가 매번 처음부터면 시간이 늘 수 있다. GitHub Actions cache backend는 선택지 중 하나이며 repository cache quota, eviction과 API throttling을 함께 본다.

- 검토한 full commit SHA로 고정한 `docker/build-push-action`의 `cache-from: type=gha`, `cache-to: type=gha,mode=max`. 여러 image가 같은 기본 scope를 덮어쓰지 않도록 image별 scope를 분리한다
- **Dockerfile 계층 순서 최적화**: 자주 변하는 파일(소스 코드, 커밋 SHA)을 **뒤쪽 레이어**에 배치해 앞쪽 캐시 무효화 방지
- **Git commit SHA 인자를 마지막에** — 매 커밋마다 앞 계층의 `assets:precompile` 같은 무거운 단계가 무효화되지 않도록

### 병렬 Job 실행

`needs`로 연결하지 말고 **독립된 Job을 병렬로** 실행하면 실패 피드백이 빨라진다.

- lint, test, build, typecheck를 각각 별도 Job으로 분리
- 각 Job에서 package manager cache를 이용해 설치하거나, 전송 비용보다 재생성 비용이 큰 build artifact만 측정 후 공유한다. `node_modules` artifact 공유를 기본값으로 두지 않는다
- Matrix 빌드로 여러 Node, OS 버전 병렬 검증

### Changed Files만 테스트

전체 테스트를 매번 돌리지 않는다.

- **Jest `--changedSince=origin/main`**: base ref와 필요한 Git history를 checkout한 경우 변경 파일에 연관된 테스트만 실행한다. 전역 설정, 환경과 동적 의존성 누락을 보완하도록 merge gate나 주기 실행에는 전체 suite를 둔다
- **ESLint + `git diff`**: 변경된 파일만 린트
- **Nx / Turbo**: 영향받은 패키지만 리빌드, 리테스트 (의존 그래프가 큰 모노레포의 후보)
- 작은 PR에서 테스트 단계가 **2분+** 절감된 사례

### Base Image, Gradle 최적화

- **Base Image 비교**: image 크기뿐 아니라 지원 기간, 취약점, native library와 운영 도구 호환성을 같은 build에서 측정한다
- **Gradle `--parallel` 플래그**: 독립적으로 실행 가능한 멀티 모듈 task와 충분한 runner resource가 있을 때 검증한다. 병목과 shared resource에 따라 더 느려질 수도 있다

### Self-Hosted Runner

GitHub-hosted Runner의 한계(비용, 캐시 초기화)를 넘어설 때 선택.

- EC2 Auto Scaling Group + Spot은 비용 후보지만 절감률은 instance type, region과 수요에 따라 달라진다. interruption을 견디는 ephemeral runner와 fallback을 함께 설계한다
- EFS/S3로 캐시 영속화 — Runner 재시작에도 이미지, 의존성 유지
- 장점: 리소스 여유, 네트워크 대역폭, 캐시 유지
- 단점: 직접 운영, 보안 (GitHub-hosted가 기본)

### 비용 관점

CI 시간 단축은 private repository의 포함 quota와 초과 사용, larger runner 비용을 줄일 수 있다. public repository의 표준 GitHub-hosted runner는 현행 정책상 무료이고, artifact와 cache storage는 실행 시간과 별도 과금 축이다. self-hosted runner는 GitHub 실행 minute 대신 실제 cloud, 운영과 보안 비용을 계산한다. 플랜과 과금 정책은 바뀔 수 있으므로 최적화 시점의 billing 문서를 다시 확인한다.

## 면접 포인트

Q. CI/CD 파이프라인을 어떻게 설계했는가?
- PR 단계: lint → format → typecheck → build → test 순서로 품질 게이트 적용
- 배포 단계: 변경 감지 → Docker 이미지 빌드/푸시 → SSH 배포
- 모노레포에서 paths-filter로 변경된 앱만 선택적 배포

Q. 배포 중 문제 발생 시 롤백은?
- 이전에 승인, 검증한 image digest를 Compose manifest에 다시 지정하고 `docker compose up` 재실행. commit SHA 태그는 후보를 찾는 용도로만 사용

Q. CI 시간을 단축하기 위해 어떤 전략을 쓰는가?
- `actions/cache`로 lock 파일 기반 의존성 캐시
- Docker Layer 캐시(`type=gha`), Dockerfile 계층 순서 최적화
- lint, test, build를 별도 Job으로 병렬화
- Jest `--changedSince`로 영향받는 테스트만 실행
- 모노레포면 Nx, Turbo로 affected 패키지만 리빌드

## 출처
- [GitHub Docs, Understanding GitHub Actions](https://docs.github.com/en/actions/get-started/understand-github-actions)
- [GitHub Docs, Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)
- [GitHub Docs, OpenID Connect](https://docs.github.com/en/actions/concepts/security/openid-connect)
- [GitHub Docs, Publishing Docker images](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images)
- [GitHub Docs, GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [actions/setup-node, Caching global packages data](https://github.com/actions/setup-node#caching-global-packages-data)
- [actions/checkout, Fetch only a single commit by default](https://github.com/actions/checkout)
- [docker/build-push-action — GitHub](https://github.com/docker/build-push-action)
- [Docker Docs, GitHub Actions cache backend](https://docs.docker.com/build/cache/backends/gha/)
- [AWS, Best practices for EC2 Spot](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-best-practices.html)
- [당근 — CircleCI에서 GitHub Actions로 이전하며 배포 속도 개선하기 (15분 → 2분)](https://medium.com/daangn/circleci에서-github-actions로-이전하며-배포-속도-개선하기-39fc41617993)
- [뱅크샐러드 — GitHub Action npm cache로 CI 40초 달성](https://blog.banksalad.com/tech/github-action-npm-cache/)
- [studynote — GitHub Actions CI/CD 트러블슈팅 (9분 → 5분)](https://studynote.oopy.io/trouble-shooting/cicd)

## 관련 문서
- [[Single-Host-SPA-API-Deployment|단일 서버 SPA/API 배포]]
- [[Docker-Image-Pipeline|Docker image build pipeline]]
- [[Docker|Docker]]
- [[Multi-Stage-Build|Multi-stage build]]
- [[AWS-Cost-Optimization|AWS 비용 최적화 (Self-hosted Runner Spot)]]
