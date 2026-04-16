---
tags: [infrastructure, docker, container]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Docker", "도커"]
---

# Docker

애플리케이션을 컨테이너라는 격리된 환경에서 실행하기 위한 플랫폼이다. "내 로컬에서는 되는데"를 해결한다.

## 컨테이너 vs VM

| 구분 | 컨테이너 | VM |
|---|---|---|
| 격리 수준 | 프로세스 격리 (OS 커널 공유) | 하드웨어 수준 격리 (게스트 OS) |
| 시작 시간 | 초 단위 | 분 단위 |
| 리소스 | 가볍다 (MB 단위) | 무겁다 (GB 단위) |
| 이식성 | 이미지 기반으로 어디서든 동일 실행 | 하이퍼바이저 의존 |

## 핵심 개념

**이미지(Image):** 컨테이너를 만들기 위한 읽기 전용 템플릿. Dockerfile로 정의하며, 레이어(layer) 구조로 구성된다.

**컨테이너(Container):** 이미지의 실행 인스턴스. 격리된 파일 시스템, 네트워크, 프로세스 공간을 가진다.

**레이어(Layer):** Dockerfile의 각 명령어(FROM, RUN, COPY 등)가 하나의 레이어를 생성. 변경되지 않은 레이어는 캐시되어 빌드 속도를 높인다.

**레지스트리(Registry):** 이미지를 저장하고 배포하는 저장소. Docker Hub, AWS ECR, GitHub Container Registry 등이 있다.

## Dockerfile 기본 구조

주요 명령어:
- `FROM` — 베이스 이미지 지정 (예: `node:24-alpine`)
- `WORKDIR` — 작업 디렉토리 설정
- `COPY` — 호스트 파일을 이미지에 복사
- `RUN` — 빌드 시 명령 실행 (의존성 설치 등)
- `EXPOSE` — 컨테이너가 사용하는 포트 문서화
- `CMD` — 컨테이너 시작 시 실행할 명령

## 빌드 캐시 최적화

레이어 순서가 캐시 효율에 직접 영향을 미친다.

**좋은 순서:**
1. 베이스 이미지 (`FROM`)
2. 의존성 파일 복사 (`COPY package.json pnpm-lock.yaml`)
3. 의존성 설치 (`RUN pnpm install`)
4. 소스 코드 복사 (`COPY . .`)
5. 빌드 (`RUN pnpm build`)

변경 빈도가 낮은 레이어를 위에 배치하면, 소스 코드만 바뀌었을 때 의존성 설치 레이어가 캐시에서 재사용된다.

## Alpine 베이스 이미지

`node:24-alpine`처럼 Alpine Linux 기반 이미지를 사용하면 이미지 크기를 크게 줄일 수 있다.
- `node:24` — ~1GB
- `node:24-alpine` — ~150MB

단, Alpine은 musl libc를 사용하므로 glibc 의존 네이티브 모듈에서 호환성 문제가 발생할 수 있다.

## 면접 포인트

Q. Docker를 왜 사용하는가?
- 환경 일관성 보장 (개발/스테이징/프로덕션 동일)
- 가볍고 빠른 배포 (VM 대비)
- 이미지 기반 버전 관리와 롤백 용이

Q. 컨테이너와 VM의 차이는?
- 컨테이너는 호스트 OS 커널을 공유하여 가볍고 빠름
- VM은 게스트 OS를 포함하여 더 강한 격리를 제공하지만 무거움

## 출처
- [Tecoble — Docker 기본](https://tecoble.techcourse.co.kr/post/2022-09-20-docker-basic/)

## 관련 문서
- [[Docker-Compose|Docker Compose]]
- [[Multi-Stage-Build|Multi-stage build]]
- [[Image-Size-Optimization|Image size optimization]]
