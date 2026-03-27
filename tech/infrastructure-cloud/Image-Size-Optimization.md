---
tags: [infrastructure, docker]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Image Size Optimization", "이미지 최적화"]
---

# Image Size Optimization

Docker 이미지 크기를 줄이면 pull 속도, 배포 시간, 저장 비용, 보안 공격 표면이 모두 줄어든다.

## 최적화 기법

### 1. Alpine 베이스 이미지
`node:24` (~1GB) 대신 `node:24-alpine` (~150MB)을 사용한다. Alpine Linux는 musl libc 기반의 경량 배포판이다.

주의: 네이티브 모듈(bcrypt, sharp 등)이 musl과 호환되지 않을 수 있다. 이 경우 `node:24-slim`(~250MB)을 대안으로 고려한다.

### 2. Multi-stage Build
빌드 도구와 devDependencies를 최종 이미지에서 제거한다. Builder 스테이지에서 빌드하고, Runner 스테이지에서 결과물만 복사한다.

### 3. 프로덕션 의존성만 설치
Runner 스테이지에서 `pnpm install --prod --frozen-lockfile`로 devDependencies를 제외한다.

### 4. 레이어 캐시 활용
변경 빈도가 낮은 레이어(의존성)를 먼저 배치한다. 소스 코드만 변경되면 의존성 레이어는 캐시에서 재사용된다.

### 5. .dockerignore 활용
빌드 컨텍스트에서 불필요한 파일을 제외한다:
- `node_modules/` (이미지 내에서 새로 설치)
- `.git/`
- `*.md`, `docs/`
- `.env*` (보안)

### 6. 불필요한 패키지 제거
Alpine에서 빌드 시 필요한 패키지(`python3`, `make`, `gcc`)는 같은 `RUN` 명령에서 설치하고 삭제한다. 레이어 수를 줄여 이미지 크기를 최적화한다.

## 크기 측정

`docker images` 또는 `docker image inspect`로 이미지 크기를 확인한다. `dive` 도구를 사용하면 레이어별 크기와 낭비 공간을 시각적으로 분석할 수 있다.

## 면접 포인트

Q. Docker 이미지 최적화 경험이 있는가?
- Alpine 베이스 + Multi-stage build + 프로덕션 의존성만 설치 조합
- ~1.5GB → ~200MB로 약 87% 크기 절감
- pull 시간 단축으로 배포 속도 향상

## 관련 문서
- [[Docker]]
- [[Multi-Stage-Build|Multi-stage build]]
