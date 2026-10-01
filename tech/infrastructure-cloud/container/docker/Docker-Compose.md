---
tags: [infrastructure, docker]
status: done
category: "Infrastructure - Container"
aliases: ["Docker Compose", "도커 컴포즈"]
verified_at: 2026-09-30
---

# Docker Compose

여러 컨테이너를 하나의 YAML 파일로 정의하고 함께 관리하는 도구이다. 단일 호스트에서 멀티 컨테이너 애플리케이션을 쉽게 실행한다.

## 핵심 개념

**서비스(Service):** 독립적으로 scale하거나 교체할 수 있는 계산 자원의 정의이고, 같은 설정으로 만든 컨테이너 집합이 실행한다. 컨테이너 하나와 같은 말이 아니다. 이미지, 포트, 환경변수, 볼륨 등을 정의한다.
**네트워크:** 별도 설정이 없으면 project default network에 연결되고 service name으로 DNS 조회한다.
**볼륨(Volume):** Docker가 관리하는 storage를 container lifecycle과 분리한다. bind mount와 같은 말이 아니다.

## 주요 설정 항목

- `image` — 사용할 Docker 이미지 (변수 치환 가능: `${DOCKERHUB_USERNAME}/school-api:${TAG:-latest}`)
- `restart: unless-stopped` — 수동 정지 외에는 항상 재시작
- `env_file` — 환경변수 파일 로드 (`.env.production`)
- `ports` — 호스트:컨테이너 포트 매핑
- `volumes` — named volume(`db-data:/var/lib/mysql`, 최상위 `volumes`에 선언)이나 bind mount(`./logs:/app/logs`) 마운트
- `healthcheck` — 컨테이너 상태 확인

### docker run 옵션과의 대응

긴 `docker run` 명령을 매번 치지 않고 파일에 선언하는 것이 Compose의 출발점이다. CLI로 쓸 수 있는 설정은 대부분 Compose 항목으로 옮길 수 있고, 변환 도구를 쓰면 결과를 Compose Specification과 대조한다.

| docker run | Compose |
|---|---|
| image 인자 | `image:` |
| `docker build` 뒤 run | `build: .` |
| `--name web` | `container_name: web` (아래 제약) |
| `-p 8080:80` | `ports: ["8080:80"]` |
| `-e KEY=VALUE` | `environment:` (list `- KEY=VALUE` 또는 map `KEY: VALUE`) |
| `-v <host>:<container>` | `volumes:` |
| `-d` | 파일 항목이 아니라 `docker compose up -d` |
| `docker ps` | `docker compose ps` (현재 project만, 기본은 실행 중, `--all`로 중지 포함) |
| `docker logs` | `docker compose logs` (service 컨테이너 로그를 이름별로 합쳐 표시) |
| `docker rm -f`로 정리 | `docker compose down` (컨테이너와 network 삭제. named, anonymous volume은 `-v`, image는 `--rmi`일 때만) |

- `container_name`을 지정하면 그 service는 컨테이너 하나를 넘어 scale할 수 없고 시도하면 오류다. 같은 이름의 컨테이너가 이미 있으면 생성도 실패하므로 꼭 필요할 때만 쓴다.
- `volumes`의 상대 host 경로는 compose 파일이 있는 폴더 기준이고 named volume과 구분되도록 `.`이나 `..`로 시작해야 하며, 로컬 container runtime에서만 지원된다.
- service가 쓰는 named volume은 최상위 `volumes`에 선언해야 하고, 빠지면 `refers to undefined volume` 오류로 project가 거부된다. 이 선언을 여러 service가 함께 쓰며, Compose 밖에서 만든 volume은 `external: true`로 참조해 Compose가 만들지 않게 한다(없으면 오류). anonymous volume과 DB data 경로의 수명은 [[Docker-Core-Storage|Docker 데이터 영속성]].
- CLI v1은 Python으로 된 `docker-compose`, v2(2020 발표)는 Go로 된 `docker compose`다. v2부터 top-level `version:`을 무시하고 Compose Specification으로 해석한다. 현재 지원 CLI는 v2와 2025년에 나온 v5(v2와 기능 동일)이므로 `docker-compose` 표기는 `docker compose`로 읽는다.

## Health check와 기동 순서

기본 `depends_on`은 dependency가 running 상태가 될 때까지만 기다리므로 DB가 query를 받을 준비가 됐는지는 `condition: service_healthy`와 dependency 쪽 healthcheck로 따로 확인한다. `healthcheck` 파라미터와 unhealthy의 의미, MySQL과 Redis 같은 의존 서비스의 healthcheck 예시와 한계는 [[Docker-Compose-Startup|Compose 기동 순서와 healthcheck]]로 분리했다.

## Container 간 통신

`api` container 안의 `localhost`는 api 자신이다. 같은 Compose network의 DB에는 `db:3306`처럼 service name과 **container port**로 접속한다. host에서 접속할 때만 published host port를 사용한다.

container가 update되면 IP는 바뀔 수 있으므로 IP를 고정 저장하지 말고 service name을 다시 resolve한다.

순서를 맞춘 뒤에도 app이 기동 직후 DB 연결에 실패하면 [[Docker-Compose-Startup#기동 직후 연결 실패 진단|기동 직후 연결 실패 진단]]의 순서로 순서 문제와 주소 문제를 가른다.

## 환경변수 관리

- `env_file`은 값을 repository 밖으로 분리할 뿐 secret 보호 기능은 아니다. process environment와 inspect 권한에서 보일 수 있다.
- 이미지 태그 등에 `${TAG:-latest}` 형태의 변수 치환 사용
- `${TAG:-latest}`의 `:-`는 변수가 없거나 빈 값일 때 기본값을 쓴다. 변수가 설정되지 않았을 때만 기본값을 쓰려면 콜론 없는 `${TAG-latest}`를 사용한다
- password와 private key는 Compose `secrets`로 필요한 service에만 file mount하고, production에서는 외부 secret manager와 rotation을 연결한다.

## 코드와 image 변경 반영

`build: .`는 compose 파일 기준 경로의 Dockerfile로 image를 만든다. `up`은 설정이나 image가 바뀐 service만 멈추고 다시 만들며 mount된 volume은 보존한다. 그러나 이미 만든 image가 있으면 `up`만으로는 다시 build하지 않으므로 코드 변경이 반영되지 않는다.

- 코드를 바꿨으면 `docker compose up -d --build`, 또는 `docker compose build web` 뒤 `docker compose up --no-deps -d web`으로 그 service만 다시 만든다. `--no-deps`는 의존 service를 다시 만들지 않는다.
- Dockerfile이 host에서 만든 JAR이나 `dist`를 `COPY`하면 `--build`는 현재 산출물로 image를 다시 만들 뿐이다. host build를 빠뜨리면 image는 새로 build돼도 이전 코드가 들어간다. builder stage에서 build하는 [[Multi-Stage-Build|multi-stage build]]로 바꾸면 이 순서 의존이 사라진다.
- `pull_policy` 기본값 `missing`은 로컬 cache에 image가 없을 때만 pull한다(`latest` tag는 예외로 항상 pull). 같은 tag의 새 image를 받으려면 배포 패턴처럼 `pull` 뒤 `up -d`를 하거나 `up --pull always`를 쓴다. `image`와 `build`를 함께 쓰고 `pull_policy`가 없으면 먼저 pull을 시도하고 registry나 cache에 없을 때 build한다.
- 운영 서버에서 build하지 않고 CI가 만든 digest를 pull해 교체하는 흐름은 [[Docker-Image-Pipeline]]과 구분한다.

## 배포 패턴

단일 서버 배포 시:
1. `docker compose pull` — 레지스트리에서 지정 image 다운로드
2. `docker compose up -d` — 백그라운드 실행 (변경된 서비스만 재생성)
3. health/log 확인 뒤 이전 digest를 보존해 rollback 가능하게 함

`down -v`는 Compose가 만든 volume까지 삭제할 수 있으므로 database가 있는 환경에서 cleanup 명령으로 습관적으로 쓰지 않는다. `docker image prune`도 rollback에 필요한 image와 보존 정책을 확인한 뒤 실행한다.

## 면접 포인트

Q. Docker Compose를 왜 사용하는가?
- 멀티 컨테이너 환경을 선언적으로 관리
- 한 명령으로 전체 스택 시작/중지
- 개발과 배포에 같은 선언을 재사용하되 host, architecture와 runtime 차이는 별도 검증

Q. 코드를 바꿨는데 `docker compose up`에 반영되지 않는 이유는?
- 기존 image가 있으면 다시 build하지 않으므로 `--build`나 `build` 뒤 재생성이 필요하고, host 산출물을 COPY하는 구조면 host build 순서까지 확인

## 관련 문서
- [[Docker]]
- [[Multi-Stage-Build|Multi-stage build]]
- [[Docker-Image-Pipeline|Docker image build pipeline]]
- [[Docker-Compose-Startup|Compose 기동 순서와 healthcheck]]
- [[Docker-Core-Storage|Docker 데이터 영속성]]

## 출처

- [Docker Docs — Compose networking](https://docs.docker.com/compose/how-tos/networking/)
- [Docker Docs — Control startup order](https://docs.docker.com/compose/how-tos/startup-order/)
- [Docker Docs — Use secrets in Compose](https://docs.docker.com/compose/how-tos/use-secrets/)
- [Docker Docs — Restart policies](https://docs.docker.com/engine/containers/start-containers-automatically/)
- [Docker Docs — Compose interpolation](https://docs.docker.com/reference/compose-file/interpolation/)
- [Docker Docs — Compose file services reference](https://docs.docker.com/reference/compose-file/services/)
- [Docker Docs — Compose Build Specification](https://docs.docker.com/reference/compose-file/build/)
- [Docker Docs — Use Compose in production](https://docs.docker.com/compose/how-tos/production/)
- [Docker Docs — docker compose up](https://docs.docker.com/reference/cli/docker/compose/up/)
- [Docker Docs — docker compose down](https://docs.docker.com/reference/cli/docker/compose/down/)
- [Docker Docs — docker compose ps](https://docs.docker.com/reference/cli/docker/compose/ps/)
- [Docker Docs — History and development of Docker Compose](https://docs.docker.com/compose/intro/history/)
- [Docker Docs — Compose file volumes reference](https://docs.docker.com/reference/compose-file/volumes/)
- [undefined volume 검증 — compose-spec/compose-go](https://github.com/compose-spec/compose-go/blob/main/loader/validate.go)
- [비전공자도 이해할 수 있는 Docker 입문/실전 — Compose, JSCODE 박재성 강사](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227926)
- [비전공자도 이해할 수 있는 Docker 입문/실전 — Container 간 통신, JSCODE 박재성 강사](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227941)
- [비전공자도 이해할 수 있는 Docker 입문/실전 — Docker 설치, JSCODE 박재성 강사](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227889)
- [비전공자도 이해할 수 있는 Docker 입문/실전 — Compose 전체 흐름(Nginx), JSCODE 박재성 강사](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227927)
- [비전공자도 이해할 수 있는 Docker 입문/실전 — 자주 사용하는 Compose CLI 명령어, JSCODE 박재성 강사](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227928)
- [비전공자도 이해할 수 있는 Docker 입문/실전 — Compose로 Redis 실행, JSCODE 박재성 강사](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227930)
- [비전공자도 이해할 수 있는 Docker 입문/실전 — Compose로 MySQL 실행, JSCODE 박재성 강사](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227932)
- [비전공자도 이해할 수 있는 Docker 입문/실전 — Compose로 Spring Boot 실행, JSCODE 박재성 강사](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227933)
- [비전공자도 이해할 수 있는 Docker 입문/실전 — Compose로 NestJS 실행, JSCODE 박재성 강사](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227934)
- [비전공자도 이해할 수 있는 Docker 입문/실전 — Compose로 Next.js 실행, JSCODE 박재성 강사](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227935)
- [비전공자도 이해할 수 있는 Docker 입문/실전 — Compose로 HTML, CSS, Nginx 실행, JSCODE 박재성 강사](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227936)
- [비전공자도 이해할 수 있는 Docker 입문/실전 — Docker CLI와 Compose 변환, JSCODE 박재성 강사](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227937)
- [금융 인프라를 운영하는 Toss 개발자의 Docker — 선언적 관리를 위한 Docker Compose, Hong 강사](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=416526)
