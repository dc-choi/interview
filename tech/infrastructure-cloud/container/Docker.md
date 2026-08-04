---
tags: [infrastructure, docker, container]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Docker", "도커"]
verified_at: 2026-08-04
---

# Docker

애플리케이션과 실행에 필요한 파일을 image로 묶고, 격리된 process인 container로 실행하는 platform이다. 환경 차이를 줄이지만 host kernel, CPU architecture, runtime configuration과 외부 dependency까지 같게 만드는 것은 아니다.

## 컨테이너 vs VM

| 구분 | 컨테이너 | VM |
|---|---|---|
| 격리 수준 | namespace/cgroup 기반 process 격리, host kernel 공유 | virtual hardware와 guest kernel |
| 배포 단위 | image와 runtime 설정 | disk image와 VM 설정 |
| 자원 비용 | guest kernel이 없어 보통 낮음 | guest OS 운영 비용 포함 |
| 보안 경계 | kernel을 공유하므로 별도 hardening 필요 | 더 강한 경계가 될 수 있으나 구성에 따라 다름 |

## 핵심 개념

**이미지(Image):** 컨테이너 root filesystem과 실행 metadata를 담은 immutable layer 집합. Dockerfile 외에도 여러 builder로 만들 수 있다.

**컨테이너(Container):** image 위에 writable layer와 runtime configuration을 더해 실행한 격리 process. container 삭제 시 writable layer도 사라지므로 영속 데이터 저장소로 쓰지 않는다.

**레이어(Layer):** Dockerfile의 각 명령어(FROM, RUN, COPY 등)가 하나의 레이어를 생성. 변경되지 않은 레이어는 캐시되어 빌드 속도를 높인다.

**레지스트리(Registry):** image manifest와 blob을 저장하고 배포한다. tag는 다른 image를 가리키도록 바뀔 수 있지만 digest는 content를 고정한다. production release는 `latest`보다 immutable digest나 build ID tag로 추적한다.

## 실행 수명주기와 CLI

- `docker run`: 필요하면 image pull, container create와 start를 한 번에 수행한다.
- `docker ps -a`: 중지된 container까지 조회한다.
- `docker logs --tail 100 -f NAME`: stdout/stderr log를 따라간다. log rotation은 driver 설정이 필요하다.
- `docker exec -it NAME sh`: 실행 중인 container에 새 process를 띄운다. image에 shell이 없을 수도 있다.
- `docker stop`: main process에 종료 signal을 보내 grace period 뒤 강제 종료한다. `kill`과 같은 의미가 아니다.

container는 독립된 작은 VM이 아니다. image의 main process가 끝나면 container도 stopped state가 된다. 종료된 container를 억지로 살려 접속하기보다 동일 image에 command를 override해 debug container를 만들거나 image, log와 inspect 정보를 조사한다.

## Port와 storage

`EXPOSE 3000`은 image가 사용하는 port를 문서화할 뿐 host에 공개하지 않는다. `docker run -p 8080:3000`이 host port 8080을 container port 3000으로 publish한다.

- **Named volume**: Docker가 lifecycle과 위치를 관리한다. database data처럼 container와 분리할 상태에 적합하다.
- **Bind mount**: host의 지정 path를 직접 mount한다. source code 공유와 host가 관리할 config에 유용하지만 host path와 OS에 결합된다.
- mount target에 image 파일이 이미 있으면 mount가 그 내용을 가린다. 초기화 파일이 사라진 것처럼 보일 수 있어 target path를 확인한다.

## Dockerfile 기본 구조

주요 명령어:
- `FROM` — 베이스 이미지 지정 (예: `node:24-alpine`)
- `WORKDIR` — 작업 디렉토리 설정
- `COPY` — 호스트 파일을 이미지에 복사
- `RUN` — 빌드 시 명령 실행 (의존성 설치 등)
- `EXPOSE` — 컨테이너가 사용하는 포트 문서화
- `ENTRYPOINT` — image의 고정 실행 프로그램
- `CMD` — 기본 command 또는 `ENTRYPOINT`의 기본 인자

`RUN`은 build 중 실행되어 새 layer 결과를 남기고, `ENTRYPOINT`/`CMD`는 container start 시 실행된다. signal 전달과 override 규칙은 [[Container-Entrypoint-Signals]].

## 빌드 캐시 최적화

레이어 순서가 캐시 효율에 직접 영향을 미친다.

**좋은 순서:**
1. 베이스 이미지 (`FROM`)
2. 의존성 파일 복사 (`COPY package.json pnpm-lock.yaml`)
3. lockfile 기반 의존성 설치 (`RUN pnpm install --frozen-lockfile`)
4. 소스 코드 복사 (`COPY . .`)
5. 빌드 (`RUN pnpm build`)

변경 빈도가 낮은 레이어를 위에 배치하면, 소스 코드만 바뀌었을 때 의존성 설치 레이어가 캐시에서 재사용된다.

base image는 작은 크기만으로 고르지 않는다. supported runtime version, architecture, libc compatibility, package/CVE update 경로와 debug 가능성을 함께 본다. [[Alpine-vs-Debian-Image]]

## 배포 안전선

- `.dockerignore`로 source control metadata, local dependency와 secret을 build context에서 제외한다.
- secret을 `ARG`, `ENV`나 image layer에 넣지 않는다. BuildKit secret mount와 runtime secret store를 사용한다.
- 가능하면 non-root user, read-only filesystem, 최소 Linux capability와 resource limit을 적용한다.
- image tag뿐 아니라 digest, SBOM과 vulnerability scan 결과를 release artifact에 연결한다.
- local CPU와 target CPU가 다르면 `--platform`과 multi-platform build를 명시하고 native dependency를 검증한다.

## 면접 포인트

Q. Docker를 왜 사용하는가?
- 환경 일관성 보장 (개발/스테이징/프로덕션 동일)
- 가볍고 빠른 배포 (VM 대비)
- 이미지 기반 버전 관리와 롤백 용이

Q. 컨테이너와 VM의 차이는?
- 컨테이너는 호스트 OS 커널을 공유하여 가볍고 빠름
- VM은 게스트 OS를 포함하여 더 강한 격리를 제공하지만 무거움

## 출처
- [Docker Docs — What is a container?](https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-a-container/)
- [Docker Docs — Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [Docker Docs — Volumes](https://docs.docker.com/engine/storage/volumes/)
- [비전공자도 이해할 수 있는 Docker 입문/실전 — Image와 Container, JSCODE 박재성 강사](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227888)
- [비전공자도 이해할 수 있는 Docker 입문/실전 — Volume, JSCODE 박재성 강사](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227904)
- [비전공자도 이해할 수 있는 Docker 입문/실전 — Dockerfile, JSCODE 박재성 강사](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227912)

## 관련 문서
- [[Container-Linux-Internals|Linux 컨테이너 내부 구조]]
- [[Docker-Bridge-Networking|Docker bridge networking]]
- [[Docker-Compose|Docker Compose]]
- [[Multi-Stage-Build|Multi-stage build]]
- [[Image-Size-Optimization|Image size optimization]]
