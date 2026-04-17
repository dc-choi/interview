---
tags: [infrastructure, docker]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Multi-stage Build", "멀티스테이지 빌드"]
---

# Multi-stage Build

하나의 Dockerfile에서 여러 단계(stage)를 정의하여, 빌드에 필요한 도구와 최종 실행에 필요한 파일을 분리하는 기법이다. 결과 이미지의 크기를 대폭 줄인다.

## 왜 필요한가

단일 스테이지로 빌드하면 최종 이미지에 불필요한 것이 포함된다:
- 빌드 도구 (TypeScript 컴파일러, 번들러 등)
- devDependencies (테스트 라이브러리, 린터 등)
- 소스 코드 원본 (`.ts` 파일)
- 빌드 캐시

이런 것들은 런타임에 필요 없으므로, 빌드 단계와 실행 단계를 분리한다.

## 2-Stage 패턴

**Stage 1: Builder**
- 전체 소스 코드와 모든 의존성을 설치
- 빌드 실행 (TypeScript 컴파일, 번들링 등)
- 이 스테이지의 결과물(빌드 산출물)만 다음 스테이지로 전달

**Stage 2: Runner**
- 깨끗한 베이스 이미지에서 시작
- 프로덕션 의존성만 설치 (`--prod`)
- Builder 스테이지에서 빌드 결과물만 복사 (`COPY --from=builder`)
- 최종 실행 이미지

## 모노레포에서의 Multi-stage

모노레포에서는 Turbo의 `--filter` 옵션으로 특정 패키지만 빌드한다.

Builder 단계:
- 전체 workspace 의존성 설치 (`pnpm install --frozen-lockfile`)
- 특정 앱만 빌드 (`pnpm turbo build --filter=@school/api`)

Runner 단계:
- 프로덕션 의존성만 설치
- Builder에서 각 패키지의 `dist/` 폴더만 복사
- Prisma client 생성 (`pnpm prisma generate`)

## 크기 비교 (예시)

| 방식 | 이미지 크기 |
|---|---|
| 단일 스테이지 (node:24) | ~1.5GB |
| 멀티 스테이지 (node:24-alpine + prod only) | ~200MB |

## 추가 최적화 팁

- 타임존 설정은 Runner 스테이지에서 (`apk add tzdata`)
- `NODE_ENV=production` 설정으로 런타임 최적화 활성화
- `.dockerignore`로 불필요한 파일(node_modules, .git 등) 제외

## 면접 포인트

Q. Multi-stage build의 목적은?
- 빌드 환경과 실행 환경을 분리하여 최종 이미지 크기 최소화
- 빌드 도구, devDependencies, 소스 원본이 프로덕션 이미지에 포함되지 않음

Q. COPY --from=builder는 무엇인가?
- 이전 스테이지(builder)에서 특정 파일만 현재 스테이지로 복사하는 명령
- 필요한 빌드 산출물만 가져와 이미지를 가볍게 유지

## 관련 문서
- [[Docker]]
- [[Image-Size-Optimization|Image size optimization]]
- [[Docker-Image-Pipeline|Docker image build pipeline]]
