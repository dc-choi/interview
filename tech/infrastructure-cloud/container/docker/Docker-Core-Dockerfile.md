---
tags: [infrastructure, docker, dockerfile, build]
status: done
category: "Infrastructure - Container"
aliases: ["Dockerfile 기본", "Dockerfile과 build context", "Dockerfile 경로 규칙"]
verified_at: 2026-09-30
---

# Dockerfile과 build context

Dockerfile 명령은 build context에서 파일을 가져와 layer를 쌓는다. 경로가 무엇을 기준으로 해석되는지와 cache가 어디서 끊기는지를 알면 `COPY` 실패, 엉뚱한 위치에 쌓인 파일과 매번 다시 도는 의존성 설치를 미리 막을 수 있다. image, layer와 container의 기본 개념은 [[Docker-Core|Docker 기본]]에 있다.

## 주요 명령어

- `FROM` — 베이스 이미지 지정 (예: `node:24-alpine`). build stage를 시작한다
- `WORKDIR` — 이후 명령의 작업 디렉토리 설정
- `COPY` — build context의 파일을 이미지에 복사
- `ADD` — `COPY`에 remote URL, Git source와 local tar 자동 해제를 더한 복사
- `RUN` — 빌드 시 명령 실행 (의존성 설치 등)
- `EXPOSE` — 컨테이너가 사용하는 포트 문서화. publish와 `-P` 예외는 [[Docker-Core#Port와 storage|Port와 storage]]
- `ENTRYPOINT` — image의 고정 실행 프로그램
- `CMD` — 기본 command 또는 `ENTRYPOINT`의 기본 인자

`RUN`은 build 중 실행되어 새 layer 결과를 남기고, `ENTRYPOINT`/`CMD`는 container start 시 실행된다. signal 전달과 override 규칙은 [[Container-Entrypoint-Signals]].

## Build context

`docker build -t my-api .`의 마지막 `.`은 Dockerfile 위치가 아니라 build context, 즉 build가 접근할 수 있는 파일 집합이다. Dockerfile은 기본으로 context 루트의 `Dockerfile`을 쓰고 다른 이름이나 위치는 `-f`로 준다. build는 daemon 쪽 builder가 수행하므로 context가 builder로 전송된다. tag를 생략하면 `latest`가 붙고 `-t my-api:beta`처럼 지정할 수 있다.

- `COPY`, `ADD`의 source는 context 루트 기준 상대 경로다. source 앞의 `/`도 context 루트를 뜻하고 `../`는 제거되므로 context 밖 파일은 가져올 수 없다.
- `.dockerignore`에 맞는 파일은 builder로 보내기 전에 context에서 빠지므로 `COPY . .`에도 들어가지 않는다. VCS metadata, local dependency와 secret을 막는 첫 경계다([[Docker-Core#배포 안전선|배포 안전선]]).

## COPY 경로 규칙

| 규칙 | 예 | 결과 |
|---|---|---|
| destination이 `/`로 시작하지 않으면 `WORKDIR` 기준 | `WORKDIR /app` 뒤 `COPY app.txt .` | `/app/app.txt` |
| destination 끝의 `/`는 의미가 있다 | `COPY test.txt /abs`, `COPY test.txt /abs/` | 파일 `/abs`, 파일 `/abs/test.txt` |
| source가 디렉터리면 그 내용만 복사한다 | `COPY myapp /opt/` | `/opt/` 아래 myapp의 내용. `/opt/myapp`이 필요하면 destination에 이름을 쓴다 |
| source가 여러 개이거나 wildcard면 destination은 `/`로 끝나야 한다 | `COPY *.txt /data/` | `/data/` 아래 각 파일 |
| destination이 없으면 만든다 | `COPY a.txt /x/y/` | 빠진 상위 디렉터리까지 생성 |

폴더를 복사하려면 끝 `/`가 필수라는 식으로 외우면 틀린다. 끝 `/`가 꼭 필요한 것은 다중 source와 wildcard이고, 단일 파일은 끝 `/` 유무로 파일과 디렉터리 해석이 갈린다.

### Spring Boot 실행 JAR glob 함정

Spring Boot Gradle plugin은 `bootJar`를 구성하면 `jar` task에도 `plain` classifier를 붙여 실행 JAR과 `-plain.jar`를 함께 만든다. `COPY build/libs/*.jar app.jar`처럼 두 파일에 맞는 glob은 다중 source 규칙에 걸려 build가 실패한다. 실행 JAR 하나만 맞도록 이름을 좁히거나 `tasks.named("jar") { enabled = false }`로 plain JAR을 끈다. native image를 만들 때는 `jar` task를 끄지 말라는 공식 주의가 있다. host에서 만든 JAR을 `COPY`하는 구조 자체가 host build 순서에 의존하므로 [[Multi-Stage-Build|multi-stage build]]도 함께 검토한다. Java base image 선택은 [[Jib-Java-Container#Base Image 선택|Base Image 선택]]을 본다.

## WORKDIR

- `RUN`, `CMD`, `ENTRYPOINT`, `COPY`, `ADD`의 작업 경로가 되고 없으면 만든다. 상대 경로로 여러 번 쓰면 이전 `WORKDIR` 기준으로 이어진다.
- 기본값은 `/`지만 base image가 이미 바꿨을 수 있으므로 절대 경로로 명시한다. `RUN cd ... && ...`를 반복하는 대신 쓴다.
- `WORKDIR` 없이 `COPY . /`를 하면 복사한 파일이 root의 기존 파일과 섞여 무엇을 넣었는지 찾기 어렵다. `COPY . /`처럼 절대 destination을 주면 `WORKDIR`과 무관하게 root에 쌓이므로 정리 효과는 `COPY . .` 같은 상대 destination에서 나온다.
- image의 작업 경로는 container의 기본 작업 경로가 되어 `docker exec`도 이 경로에서 시작한다. 다른 경로가 필요하면 `docker exec -w`를 쓴다.

## COPY와 ADD

둘 다 파일을 image에 넣는다. `ADD`는 remote HTTP(S) URL과 Git repository source, local tar archive 자동 해제(gzip, bzip2, xz, zstd, 비압축)를 더한다. remote URL로 받은 tar는 기본적으로 풀지 않는다(Dockerfile 1.17 이상은 `--unpack`으로 제어). 동작이 예측 가능한 `COPY`를 기본으로 쓰고, `ADD`는 local tar 해제나 `--checksum`으로 검증하는 remote artifact 다운로드처럼 그 기능이 필요할 때만 쓴다.

## 빌드 캐시

Docker는 명령마다 이전 build의 cache를 재사용할 수 있는지 확인하고, 한 layer가 바뀌면 그 뒤의 모든 layer를 다시 build한다. 그래서 `COPY . .` 다음에 의존성 설치가 오면 소스 한 줄만 바뀌어도 설치가 매번 다시 돈다. 레이어 순서가 캐시 효율에 직접 영향을 미친다.

**좋은 순서:**
1. 베이스 이미지 (`FROM`)
2. 의존성 파일 복사 (`COPY package.json pnpm-lock.yaml`)
3. lockfile 기반 의존성 설치 (`RUN pnpm install --frozen-lockfile`)
4. 소스 코드 복사 (`COPY . .`)
5. 빌드 (`RUN pnpm build`)

변경 빈도가 낮은 레이어를 위에 배치하면, 소스 코드만 바뀌었을 때 의존성 설치 레이어가 캐시에서 재사용된다. Python의 `requirements.txt`도 같은 원리로 소스보다 먼저 복사해 `pip install`한다. 크기를 줄이는 기법은 [[Image-Size-Optimization]].

## 면접 포인트

Q. 소스 한 줄만 바꿨는데 의존성 설치가 매번 다시 도는 이유는?
- 한 layer가 바뀌면 그 뒤 layer가 모두 다시 build된다. 의존성 manifest와 lockfile만 먼저 복사해 설치한 뒤 소스를 복사한다

Q. `COPY build/libs/*.jar app.jar`가 실패하는 이유는?
- glob이 실행 JAR과 plain JAR 두 개에 맞아 다중 source가 되었고, 다중 source의 destination은 `/`로 끝나는 디렉터리여야 한다

## 출처

- [Docker Docs, Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [Docker Docs, Build context](https://docs.docker.com/build/concepts/context/)
- [Docker Docs, Docker build cache](https://docs.docker.com/build/cache/)
- [Docker Docs, Building best practices](https://docs.docker.com/build/building/best-practices/)
- [Docker Docs, docker container exec](https://docs.docker.com/reference/cli/docker/container/exec/)
- [Spring Boot Gradle Plugin, Packaging Executable Archives](https://docs.spring.io/spring-boot/gradle-plugin/packaging.html)
- [pnpm, pnpm install](https://pnpm.io/cli/install)
- [인프런, JSCODE 박재성, Dockerfile이란?](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227912)
- [인프런, JSCODE 박재성, 실습: FROM : 베이스 이미지 생성](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227914)
- [인프런, JSCODE 박재성, COPY : 파일 복사(이동)](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227916)
- [인프런, JSCODE 박재성, 백엔드 프로젝트(Spring Boot) 프로젝트를 Docker로 실행시키기](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227918)
- [인프런, JSCODE 박재성, WORKDIR : 작업 디렉토리를 지정](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227920)
- [인프런, JSCODE 박재성, 백엔드 프로젝트(Nest.js)를 Docker로 실행시키기](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227922)
- [인프런, Hong, 나만의 이미지 작성을 위한 Dockerfile 기초부터 뜯어보기](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=416103)
- [인프런, Hong, Dockerfile 최적화를 위한 빌드 캐싱 및 멀티 스테이지 빌드 패턴](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=416104)

## 관련 문서

- [[Docker-Core|Docker 기본]]
- [[Container-Entrypoint-Signals|Entrypoint와 시그널]]
- [[Multi-Stage-Build|Multi-stage build]]
- [[Image-Size-Optimization|Image size optimization]]
- [[Jib-Java-Container|Jib]]
