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

## 면접 포인트

Q. CI/CD 파이프라인을 어떻게 설계했는가?
- PR 단계: lint → format → typecheck → build → test 순서로 품질 게이트 적용
- 배포 단계: 변경 감지 → Docker 이미지 빌드/푸시 → SSH 배포
- 모노레포에서 paths-filter로 변경된 앱만 선택적 배포

Q. 배포 중 문제 발생 시 롤백은?
- Docker Hub에 commit SHA 태그로 이미지가 보관되므로, 이전 SHA 태그의 이미지로 `docker compose up` 재실행

## 관련 문서
- [[Docker-Image-Pipeline|Docker image build pipeline]]
- [[Docker|Docker]]
- [[Multi-Stage-Build|Multi-stage build]]
