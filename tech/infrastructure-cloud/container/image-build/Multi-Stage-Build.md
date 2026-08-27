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
- 특정 앱만 빌드 (`pnpm turbo build --filter=@workspace/api`)

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
- production dependency 설치 옵션을 사용하고, 애플리케이션이나 라이브러리가 `NODE_ENV`를 해석할 때만 `NODE_ENV=production`을 명시. Node.js 자체가 이 값만으로 최적화되는 것은 아님
- `.dockerignore`로 불필요한 파일(node_modules, .git 등) 제외

## 본인이 직접 수행한 경험을 공개 가능한 범위로 일반화한 사례

- **상황**: 단일 스테이지 이미지에 빌드 전용 파일과 의존성이 남아 이미지 전송과 배포 대기 시간이 길어졌다.
- **조치**: `.dockerignore`로 불필요한 파일을 빌드 컨텍스트에서 제외하고, Dockerfile을 Builder와 Runner로 나눠 실행 이미지에는 빌드 산출물과 런타임 의존성만 남겼다.
- **판단**: Alpine과 distroless도 검토했지만 네이티브 모듈과 운영 도구의 호환성을 추가 검증해야 했다. 멀티 스테이지만으로 목표를 충족해 베이스 이미지 교체는 보류했다.
- **결과와 한계**: 실제 파이프라인에서 이미지 크기와 배포 대기 시간이 모두 줄었다. 다만 build cache, 네트워크, runner와 배포 방식에 따라 효과가 달라지므로 변경 전후 같은 CI/CD 조건에서 다시 측정한다.

## 면접 포인트

Q. Multi-stage build의 목적은?
- 빌드 환경과 실행 환경을 분리하여 최종 이미지 크기 최소화
- 빌드 도구, devDependencies, 소스 원본이 프로덕션 이미지에 포함되지 않음

Q. COPY --from=builder는 무엇인가?
- 이전 스테이지(builder)에서 특정 파일만 현재 스테이지로 복사하는 명령
- 필요한 빌드 산출물만 가져와 이미지를 가볍게 유지

## 출처
- 본인 블로그: [Docker Image Size를 줄여 성능 개선](https://dc-choi.tistory.com/94)

## 관련 문서
- [[Docker]]
- [[Image-Size-Optimization|Image size optimization]]
- [[Docker-Image-Pipeline|Docker image build pipeline]]
