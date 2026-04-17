---
tags: [cicd, github-actions]
status: done
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

## CD 워크플로우 — 자동 배포

main 브랜치에 push될 때 변경 감지 후 자동 배포한다.

**변경 감지 (Change Detection):**
- `dorny/paths-filter` 액션으로 API/Web 중 어떤 부분이 변경되었는지 판별
- 변경된 앱만 선택적으로 배포하여 불필요한 배포를 방지

**API 배포 (Docker 기반):**
1. Docker 이미지 빌드 (multi-stage)
2. Docker Hub에 push (latest + commit SHA 태그)
3. SSH로 서버 접속 → `docker compose pull && docker compose up -d`

**Web 배포 (정적 파일):**
1. `pnpm turbo build --filter=@school/web`으로 빌드
2. SCP로 빌드 결과물을 서버에 전송

**Job 의존성 관리:**
- `needs: [changes, deploy-api]`로 API 배포 완료 후 Web 배포 진행
- `if: needs.changes.outputs.api == 'true'`로 조건부 실행

## 모노레포에서의 전략

**경로 기반 필터링:** 모노레포에서 각 앱/패키지의 변경을 독립적으로 감지하여 해당 부분만 CI/CD 실행

**Turbo 활용:** `--filter` 옵션으로 특정 패키지만 빌드. Turbo의 캐시 시스템이 변경되지 않은 패키지의 빌드를 건너뛴다.

**태그 전략:**
- `latest` — 항상 최신 배포 버전을 가리킴
- `${{ github.sha }}` — 커밋 해시로 특정 빌드를 추적, 롤백 시 유용

## 속도 최적화 — CI 시간을 수 분 → 수십 초로

CI 시간이 길면 개발자의 컨텍스트 스위칭·PR 리뷰 속도·배포 주기 모두 악화된다. 실제 사례에서 9분 → 5분, 수 분 → 40초, 15분 → 2분까지 단축한 공통 기법 모음.

### 의존성 캐싱

반복 설치에서 가장 큰 시간을 먹는 부분.

- **`actions/cache`**: `package-lock.json`·`yarn.lock`·`pnpm-lock.yaml` 해시를 cache key로. 같은 lock이면 `node_modules` 재사용 → 1분+ → 20초
- **`actions/setup-node` cache 옵션**: Node.js 생태계는 `cache: 'npm'` / `'yarn'` / `'pnpm'` 내장 지원 — 별도 `actions/cache` 없이 한 줄로 해결
- **Gradle/Maven**: `actions/setup-java`의 `cache` 옵션 또는 `~/.gradle/caches` 직접 캐시

### Docker Layer 캐싱

Dockerfile 빌드가 매번 처음부터면 수 분 낭비. GitHub Actions Cache를 스토리지로 쓰는 패턴이 표준.

- `docker/build-push-action@v5`의 `cache-from: type=gha`·`cache-to: type=gha,mode=max`
- 모노레포·쿨백엔드에서 빌드 시간을 **8분+** 단축한 사례 다수
- **Dockerfile 계층 순서 최적화**: 자주 변하는 파일(소스 코드·커밋 SHA)을 **뒤쪽 레이어**에 배치해 앞쪽 캐시 무효화 방지
- **Git commit SHA 인자를 마지막에** — 매 커밋마다 앞 계층의 `assets:precompile` 같은 무거운 단계가 무효화되지 않도록

### 병렬 Job 실행

`needs`로 연결하지 말고 **독립된 Job을 병렬로** 실행하면 실패 피드백이 빨라진다.

- lint·test·build·typecheck를 각각 별도 Job으로 분리
- 의존성 설치를 setup job에서 한 번 하고, `actions/upload-artifact`·`download-artifact`로 다음 Job에 전달
- Matrix 빌드로 여러 Node·OS 버전 병렬 검증

### Changed Files만 테스트

전체 테스트를 매번 돌리지 않는다.

- **Jest `--changedSince=origin/main`**: 변경된 파일에 의존하는 테스트만
- **ESLint + `git diff`**: 변경된 파일만 린트
- **Nx / Turbo**: 영향받은 패키지만 리빌드·리테스트 (모노레포 필수)
- 작은 PR에서 테스트 단계가 **2분+** 절감된 사례

### Base Image·Gradle 최적화

- **Base Image 경량화**: `openjdk:11`(250MB) → `amazoncorretto:11`(200MB) → 수 초 단축
- **Gradle `--parallel` 플래그**: 멀티 모듈 빌드를 병렬로 → 4분 → 2분 45초

### Self-Hosted Runner

GitHub-hosted Runner의 한계(비용·캐시 초기화)를 넘어설 때 선택.

- EC2 Auto Scaling Group + Spot으로 운영하면 비용 70~90% 절감
- EFS/S3로 캐시 영속화 — Runner 재시작에도 이미지·의존성 유지
- 장점: 리소스 여유·네트워크 대역폭·캐시 유지
- 단점: 직접 운영·보안 (GitHub-hosted가 기본)

### 비용 관점

CI 시간 단축은 유료 Minute도 절약한다. GitHub Team 플랜·Public 유료 Minute에서 연 수백만 원 차이가 나는 경우도 있음. **빌드 시간을 GB-Minute 비용으로 환산**해 최적화 우선순위를 정하면 설득력이 좋음.

## 면접 포인트

Q. CI/CD 파이프라인을 어떻게 설계했는가?
- PR 단계: lint → format → typecheck → build → test 순서로 품질 게이트 적용
- 배포 단계: 변경 감지 → Docker 이미지 빌드/푸시 → SSH 배포
- 모노레포에서 paths-filter로 변경된 앱만 선택적 배포

Q. 배포 중 문제 발생 시 롤백은?
- Docker Hub에 commit SHA 태그로 이미지가 보관되므로, 이전 SHA 태그의 이미지로 `docker compose up` 재실행

Q. CI 시간을 단축하기 위해 어떤 전략을 쓰는가?
- `actions/cache`로 lock 파일 기반 의존성 캐시
- Docker Layer 캐시(`type=gha`), Dockerfile 계층 순서 최적화
- lint·test·build를 별도 Job으로 병렬화
- Jest `--changedSince`로 영향받는 테스트만 실행
- 모노레포면 Nx·Turbo로 affected 패키지만 리빌드

## 출처
- [당근 — CircleCI에서 GitHub Actions로 이전하며 배포 속도 개선하기 (15분 → 2분)](https://medium.com/daangn/circleci에서-github-actions로-이전하며-배포-속도-개선하기-39fc41617993)
- [뱅크샐러드 — GitHub Action npm cache로 CI 40초 달성](https://blog.banksalad.com/tech/github-action-npm-cache/)
- [studynote — GitHub Actions CI/CD 트러블슈팅 (9분 → 5분)](https://studynote.oopy.io/trouble-shooting/cicd)

## 관련 문서
- [[Docker-Image-Pipeline|Docker image build pipeline]]
- [[Docker|Docker]]
- [[Multi-Stage-Build|Multi-stage build]]
- [[AWS-Cost-Optimization|AWS 비용 최적화 (Self-hosted Runner Spot)]]
