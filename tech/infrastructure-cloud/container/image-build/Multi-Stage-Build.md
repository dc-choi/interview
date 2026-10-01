---
tags: [infrastructure, docker]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Multi-stage Build", "멀티스테이지 빌드"]
verified_at: 2026-09-30
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

| 방식 | 이미지 크기 | 근거 |
|---|---|---|
| 단일 스테이지 (node:24) | ~1.5GB | 본인 블로그 측정 |
| 멀티 스테이지 (node:24-alpine + prod only) | ~200MB | 본인 블로그 측정 |
| Go 단일 스테이지 (Go 컴파일러 image에서 빌드 결과를 그대로 실행) | 약 1.25GB | 강의 실습 |
| Go 멀티 스테이지 (Alpine runner에 binary만 복사) | 약 14MB | 강의 실습 |

감소 폭은 runner에 무엇이 남아야 하는지가 정한다. Node는 runtime과 production dependency가 runner에 남지만, 컴파일 결과가 단일 binary인 Go는 toolchain을 모두 버리고 binary만 남길 수 있어 99%에 가깝게 줄어든다. Docker 공식 예시도 같은 원리로 Go binary만 `scratch` 위에 올린다.

- native build에서 C compiler를 찾으면 cgo가 기본으로 켜지고, compiler가 없거나 cross-compile이면 꺼진다(`cmd/cgo` 문서). cgo로 glibc에 동적 link된 binary는 musl 기반 Alpine이나 libc가 없는 `scratch`에서 실행되지 않을 수 있으므로 `CGO_ENABLED=0`으로 정적 binary를 만들거나 runner를 builder와 같은 libc 계열로 맞춘다.
- `golang` Official Image의 Alpine 변형은 Docker Hub 설명상 Go project가 공식 지원하지 않는 실험적 변형이고 musl을 쓴다.
- `scratch`에는 shell, CA 인증서와 timezone 데이터가 없다. 외부 HTTPS 호출이나 지역 시간 계산이 필요하면 따로 넣고, 운영 중 진단 방법도 미리 정한다([[Jib-Java-Container#Base Image 선택|distroless 논의]]).

## 출력 추적으로 런타임 파일만 옮기기

production dependency만 설치하는 runner보다 더 줄이려면 빌드 도구가 추적한 실행 필요 파일만 runner로 옮긴다. Next.js는 `next build` 때 `@vercel/nft`로 `import`, `require`와 `fs` 사용을 정적 분석해 각 route가 읽을 파일을 추적한다(Next.js 12부터). `next.config.js`에 `output: 'standalone'`을 두면 `.next/standalone`에 필요한 `node_modules` 일부와 최소 `server.js`를 모아 `node_modules` 설치 없이 실행할 수 있게 한다.

```dockerfile
# builder: 의존성 설치 뒤 next build (next.config.js의 output: 'standalone')
FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
CMD ["node", "server.js"]
```

- `public`과 `.next/static`은 CDN이 맡는 것을 전제로 standalone에 기본 복사되지 않는다. container 하나로 서빙하려면 두 폴더를 직접 복사해야 하고, 빠뜨리면 페이지는 떠도 정적 자원이 404가 된다.
- Docker는 Linux container에 `HOSTNAME` 환경 변수를 container hostname으로 넣고 `server.js`는 이 값을 listen 주소로 쓴다. 공식 Docker 예시처럼 `HOSTNAME=0.0.0.0`을 명시한다.
- 정적 분석이 놓치는 파일(동적 `require`, 실행 중 경로를 조합해 읽는 파일, native binary)은 `outputFileTracingIncludes`로 넣는다. monorepo에서 앱 폴더 밖 파일을 쓰면 `outputFileTracingRoot`를 workspace root로 둔다. 추적 결과는 runner image를 띄워 주요 route와 정적 자원 응답을 확인하는 smoke test로 검증한다.
- 강의 실습은 Node Alpine base에서 시작했고 공식 예시는 `node:24-slim`을 쓴다. base의 호환성 비용은 [[Alpine-vs-Debian-Image]], Dockerfile 명령과 build context 규칙은 [[Docker-Core-Dockerfile]]에 있다.
- NestJS API처럼 프레임워크 출력 추적이 없는 Node 서버는 pnpm workspace에서 `pnpm --filter <app> --prod deploy <dir>`로 대상 package와 production dependency만 격리된 `node_modules`에 모은 이식 가능한 디렉터리를 만들어 runner로 복사할 수 있다(pnpm 공식 Docker 예시). 단일 파일 bundling은 native module과 동적 `require`를 따로 검증해야 한다.

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

Q. 같은 multi-stage인데 Go와 Node의 감소 폭이 다른 이유는?
- 실행에 runtime과 dependency tree가 필요한지가 다르다. Go 정적 binary는 binary만 남길 수 있고 Node는 runtime과 production dependency가 남는다

## 출처
- 본인 블로그: [Docker Image Size를 줄여 성능 개선](https://dc-choi.tistory.com/94)
- [Docker Docs, Multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
- [Docker Docs, Running containers](https://docs.docker.com/engine/containers/run/)
- [Go Docs, cmd/cgo](https://pkg.go.dev/cmd/cgo)
- [Docker Hub, golang Official Image](https://hub.docker.com/_/golang)
- [Next.js Docs, output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [with-docker 예시 Dockerfile — vercel/next.js](https://github.com/vercel/next.js/tree/canary/examples/with-docker)
- [pnpm, pnpm deploy](https://pnpm.io/cli/deploy)
- [인프런, Hong, Dockerfile 최적화를 위한 빌드 캐싱 및 멀티 스테이지 빌드 패턴](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=416104)
- [인프런, 널널한 개발자, 도커 이미지 생성 (Next.js frontend)](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=477028)

## 관련 문서
- [[Docker]]
- [[Image-Size-Optimization|Image size optimization]]
- [[Docker-Image-Pipeline|Docker image build pipeline]]
- [[Docker-Core-Dockerfile|Dockerfile과 build context]]
- [[Alpine-vs-Debian-Image|Alpine vs Debian 베이스 이미지]]
