---
tags: [infrastructure, docker, container]
status: done
category: "Infrastructure - Container"
aliases: ["Docker 기본", "도커 기본"]
verified_at: 2026-09-30
---

# Docker 기본

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

**컨테이너(Container):** image 위에 writable layer와 runtime configuration을 더해 실행한 격리 process. container 삭제 시 writable layer도 사라지므로 영속 데이터 저장소로 쓰지 않는다. image가 `VOLUME`으로 선언한 경로는 writable layer가 아니라 volume에 기록된다([[Docker-Core-Storage|Docker 데이터 영속성]]).

**레이어(Layer):** `RUN`, `COPY`, `ADD`처럼 filesystem을 바꾸는 build step이 image layer를 만든다. `ENV`, `CMD`, `ENTRYPOINT` 등은 image metadata를 바꾸고, `FROM`은 base image와 새 stage를 선택한다. 변경되지 않은 build 결과는 cache로 재사용할 수 있다.

**레지스트리(Registry):** image manifest와 blob을 저장하고 배포한다. tag는 다른 image를 가리키도록 바뀔 수 있지만 digest는 content를 고정한다. production release는 `latest`보다 immutable digest나 build ID tag로 추적한다.

## 구조: client, daemon, registry

| 구성 | 역할 |
|---|---|
| client (`docker`) | 사용자가 입력한 명령을 Docker API 요청으로 바꿔 daemon에 보낸다 |
| daemon (`dockerd`) | 요청을 받아 image, container, network, volume을 만들고 관리한다. build도 daemon 쪽 builder가 수행한다 |
| registry | image를 저장하고 배포한다. 따로 정하지 않으면 Docker Hub에서 찾는다 |

- `docker run nginx`는 client가 요청을 보내고 daemon이 local image를 찾아 없으면 registry에서 pull한 뒤 container를 만들고 시작하는 흐름이다. 한 번 받은 image는 local에 남아 다음 실행은 내려받지 않는다.
- client와 daemon은 REST API로 통신한다. Linux 기본 endpoint는 Unix socket `/var/run/docker.sock`이고, `DOCKER_HOST`, `--host`나 docker context로 다른 daemon을 가리킬 수 있다.
- `Cannot connect to the Docker daemon`류 오류는 daemon이 꺼져 있거나(Docker Desktop 미실행 포함) client가 다른 daemon을 보고 있는 경우가 먼저다. `docker info`로 daemon 응답을 보고 `docker context ls`, `env | grep DOCKER_HOST`로 연결 대상을 확인한다.
- daemon을 제어할 수 있으면 host root와 같은 권한을 갖는다. host directory를 접근 제한 없이 container에 mount할 수 있기 때문이며, `docker` group 가입도 root 수준 권한 부여다. `docker.sock`을 container에 mount하면 그 container에 daemon 제어권을 넘기는 셈이다.
- build context도 builder로 전송된다. 범위와 `.dockerignore`는 [[Docker-Core-Dockerfile#Build context|Build context]].

## Docker Desktop의 Linux VM 경계

macOS와 Windows에는 Linux container를 돌릴 Linux kernel이 없으므로 Docker Desktop은 경량 Linux VM 안에서 Engine을 실행한다. host에서 직접 도는 것처럼 보여도 경계가 하나 더 있다.

- `docker info`의 `OSType`은 macOS에서도 `linux`다. `Architecture`는 `uname -m` 형식이라 Apple Silicon은 `aarch64`, Intel은 `x86_64`로 나오고 image platform 표기(`arm64`, `amd64`)와 이름이 다르다.
- image, container, volume과 build cache는 VM disk image 파일 하나에 들어 있다. macOS는 sparse file인 `Docker.raw`, Windows WSL 2 backend는 `docker_data.vhdx`다. 그래서 host 탐색기에서 보이지 않고 `docker volume inspect`의 `Mountpoint`도 VM 안 경로다.
- host disk에 여유가 있어도 VM disk 한도에서 `no space left on device`가 날 수 있다. `docker system df -v`로 내부 사용량을 보고 [[Image-Size-Optimization#측정과 안전한 정리|정리 정책]]을 적용한다. macOS FAQ 기준 공간은 image를 지울 때 회수되며 실행 중 container 안에서 파일을 지우는 것만으로는 줄지 않고, host 파일 크기가 그대로면 `docker run --privileged --pid=host docker/desktop-reclaim-space`로 회수를 요청한다.
- 설정의 Resources, Advanced에서 Disk image location으로 위치를 옮기고, Mac, Linux, Windows Hyper-V backend에서는 Disk usage limit으로 engine이 쓸 최대 용량을 정한다. WSL 2 backend의 memory, CPU 한도는 WSL 2 utility VM 설정을 따른다.

local Desktop에서 되던 구성이 Linux 서버에서 실패할 때 먼저 볼 차이다.

| 차이 | Docker Desktop | Linux 서버 |
|---|---|---|
| host network mode | VM의 network다. 4.34 이상에서 설정을 켜야 host의 TCP, UDP에 닿는다([[Docker-Bridge-Networking#기본 network와 driver|기본 network]]) | container가 host network stack을 그대로 쓴다 |
| bind mount 권한 | VM 경계를 넘는 file sharing(VirtioFS 등)을 거친다. 소유권 mapping은 공식 문서에 명시가 없다(2026-09-30 확인) | host 파일의 numeric UID, GID로 판정해 `permission denied`가 날 수 있다([[Docker-Core-Storage#Bind mount 문법과 함정|bind mount 권한]]) |
| CPU architecture | Apple Silicon은 arm64. 다른 architecture image도 내장 QEMU emulation으로 돈다 | emulation을 등록하지 않으면 다른 architecture image가 실행되지 않는다([[#CPU architecture 불일치|아래]]) |

## 실행 수명주기와 CLI

`docker run`은 필요하면 image를 pull하고 container create와 start를 한 번에 수행한다. 매번 새 container를 만들므로 같은 image로 독립 container를 여러 개 띄울 수 있고, 일회성 실행을 반복하면 `Exited` container가 쌓인다.

| 동작 | process와 memory | writable layer, 이름, log | volume |
|---|---|---|---|
| `docker stop` | 종료 signal(기본 SIGTERM, image `STOPSIGNAL`로 변경 가능)을 보내고 grace period(Linux 기본 10초) 뒤 SIGKILL. memory 상태는 사라진다 | 남는다. `docker start`로 같은 파일 상태에서 다시 시작한다 | 남는다 |
| `docker kill` | 기본 SIGKILL로 즉시 끝낸다. `--signal`로 다른 signal을 주면 종료되지 않을 수 있다 | 남는다 | 남는다 |
| `docker pause` | Linux는 freezer cgroup으로 모든 process를 멈춘다. SIGSTOP과 달리 process가 알거나 가로챌 수 없고 memory는 계속 점유한다. `unpause`로 재개 | 남는다 | 남는다 |
| `docker rm` | 실행 중이면 거부한다 | 지워지고 복구할 수 없다 | anonymous volume은 `-v`일 때만 지운다. named volume은 남는다 |
| `docker rm -f` | SIGKILL로 끝낸 뒤 삭제한다 | 지워진다 | `docker rm`과 같다 |
| `docker run --rm` | 종료되면 자동으로 삭제한다 | 지워진다 | anonymous volume도 지우고 named volume은 남긴다 |

- `docker kill`과 `docker rm -f`는 SIGTERM과 grace period를 거치지 않는다. SIGKILL은 process가 포착할 수 없어 SIGTERM handler, in-flight 요청 drain과 connection 정리가 실행되지 않고, DB는 정상 종료 절차를 건너뛰어 다음 기동 때 복구 과정을 거칠 수 있다(엔진별 확인). 요청을 처리하는 서버와 data를 가진 DB는 `docker stop` 뒤 `docker rm`으로 정리하고, kill과 `rm -f`는 stop이 듣지 않거나 버려도 되는 container에 쓴다([[Graceful-Shutdown]], [[Container-Entrypoint-Signals]]).
- `docker ps`는 실행 중인 container만, `docker ps -a`는 중지된 것까지 조회한다. `STATUS`의 `Exited (0)`은 정상 종료이고 137 해석은 [[Container-Entrypoint-Signals#검증 방법|검증 방법]]을 본다.
- `--name`은 고유해야 하고 종료된 container도 이름을 점유한다. 반복 실행하는 script와 CI는 기존 container를 정리하거나 일회성이면 `--rm`을 쓴다. 이름을 주지 않으면 Docker가 임의 이름을 붙인다.
- 중지된 container는 `docker container prune` 또는 `docker rm $(docker ps --filter status=exited -q)`로 한 번에 지운다. `docker stop $(docker ps -q)`와 prune을 묶으면 실행 중이던 것까지 모두 사라지므로 실습 환경 초기화에만 쓴다.
- `docker logs --tail 100 -f NAME`: stdout/stderr log를 따라간다. 중지된 container에서도 조회되며 `-t`는 시각, `--since`는 그 시점 이후만 보여 준다. container를 지우면 `docker logs`로 볼 수 없으므로 사후 분석이 필요한 실행은 `--rm`을 피하거나 log를 외부로 수집한다. log rotation은 driver 설정이 필요하다.
- `docker exec -it NAME sh`: 실행 중인 container에 새 process를 띄운다. paused container에는 쓸 수 없고 image에 shell이 없을 수도 있다.
- `docker rmi`는 container가 참조하는 image를 지우지 못한다. Engine 구현상 실행 중인 container의 참조는 `-f`로도 넘지 못하는 conflict라 tag만 떨어지고 image는 남는다. 중지된 container의 참조는 `-f`로 넘길 수 있지만 기본 순서는 `docker rm` 뒤 `docker rmi`다. `Untagged`와 `Deleted`의 구분은 [[Image-Size-Optimization#측정과 안전한 정리|image 정리]].

container는 독립된 작은 VM이 아니다. image의 main process가 끝나면 container도 stopped state가 된다. 종료된 container를 억지로 살려 접속하기보다 동일 image에 command를 override해 debug container를 만들거나 image, log와 inspect 정보를 조사한다.

## Image tag와 pull 정책

- tag를 생략하면 `latest`가 붙는다. `latest`는 Engine이 쓰는 기본 tag 이름일 뿐 최신 release를 가리킨다는 보장은 없고 publisher의 관례에 달려 있다. 2026-09-30 docker-library 기준 `mysql:latest`는 innovation release를 가리키고 LTS는 `lts` tag로 따로 있다. 실습 재현과 운영에는 version tag를 고정한다.
- `docker run`의 `--pull` 기본값 `missing`은 local image cache에 없을 때만 pull한다. 예전에 받은 `nginx:latest`가 있으면 registry의 `latest`가 새 image로 바뀌어도 그대로 실행된다. 갱신하려면 `docker pull`을 다시 하거나 `--pull always`를 준다. Compose의 `pull_policy: missing`은 `latest` tag를 예외로 항상 pull하므로 이름이 같아도 동작이 다르다([[Docker-Compose#코드와 image 변경 반영|Compose pull_policy]]).
- `docker image ls`의 CREATED는 내려받은 시각이 아니라 image에 기록된 생성 시각이다. 방금 pull한 image도 오래전에 build된 것일 수 있고, 재현성을 위해 생성 시각을 고정하는 builder의 image는 1970년으로 보이기도 한다([[Jib-Java-Container|Jib]]의 기본 `creationTime`).
- 재현과 rollback은 digest로 고정한다. 단 digest pin은 보안 update가 들어간 새 image를 자동으로 받지 않으므로 base image 갱신 주기를 따로 둔다.

## Port와 storage

`EXPOSE 3000`은 image가 사용하는 port를 문서화할 뿐 host에 공개하지 않는다. `docker run -p 8080:3000`이 host port 8080을 container port 3000으로 publish한다. 예외로 `docker run -P`는 `EXPOSE`된 port 전부를 host의 임의 port에 publish한다.

- **Named volume**: Docker가 lifecycle과 위치를 관리한다. database data처럼 container와 분리할 상태에 적합하다.
- **Bind mount**: host의 지정 path를 직접 mount한다. source code 공유와 host가 관리할 config에 유용하지만 host path와 OS에 결합된다.
- 비어 있지 않은 volume과 모든 bind mount는 mount target에 있던 image 파일을 가린다. bind mount는 host 쪽이 비어 있어도 image 내용을 복사하지 않는다. 반면 빈 named volume이나 anonymous volume을 처음 mount하면 image의 해당 경로 파일이 volume으로 복사된다. 이 복사를 막으려면 `--mount`의 `volume-nocopy` 옵션을 사용한다.

image `VOLUME`과 anonymous volume의 수명, named volume 수명주기, `-v`와 `--mount` 문법, 공식 DB image의 초기화 계약은 [[Docker-Core-Storage|Docker 데이터 영속성]]에서 다룬다.

## Dockerfile 기본 구조

주요 명령어, build context와 `COPY`, `WORKDIR`의 경로 규칙, `COPY`와 `ADD`의 차이, 빌드 캐시가 무효화되는 순서는 [[Docker-Core-Dockerfile|Dockerfile과 build context]]로 분리했다. `RUN`은 build 중 실행되어 layer를 남기고 `ENTRYPOINT`/`CMD`는 container start 시 실행되며, signal 전달과 override 규칙은 [[Container-Entrypoint-Signals]]에 있다.

base image는 작은 크기만으로 고르지 않는다. supported runtime version, architecture, libc compatibility, package/CVE update 경로와 debug 가능성을 함께 본다. [[Alpine-vs-Debian-Image]]

## 배포 안전선

- `.dockerignore`로 source control metadata, local dependency와 secret을 build context에서 제외한다.
- secret을 `ARG`, `ENV`나 image layer에 넣지 않는다. BuildKit secret mount와 runtime secret store를 사용한다.
- 가능하면 non-root user, read-only filesystem, 최소 Linux capability와 resource limit을 적용한다.
- image tag뿐 아니라 digest, SBOM과 vulnerability scan 결과를 release artifact에 연결한다.
- local CPU와 target CPU가 다르면 `--platform`과 multi-platform build를 명시하고 native dependency를 검증한다.

### CPU architecture 불일치

build platform을 지정하지 않으면 image는 build를 수행한 BuildKit daemon의 platform으로 만들어진다. Apple Silicon 장비에서 build해 registry에 올린 image는 기본이 `linux/arm64`라 x86 EC2 같은 `linux/amd64` 서버와 맞지 않는다. Docker Desktop은 내장 QEMU로 다른 architecture image를 돌려 local에서는 문제가 늦게 드러나지만, emulation을 등록하지 않은 Linux 서버에서는 main process가 `exec format error`로 실패한다([[Linux-File-System]]).

- 배포 target이 x86 하나면 `docker build --platform linux/amd64`로 target에 맞춰 build하는 것이 맞는 해결이다.
- target을 arm64(Graviton 등) 인스턴스로 맞추거나, 두 architecture를 모두 지원해야 하면 Buildx multi-platform manifest를 만들고 architecture별로 native dependency를 test한다([[Docker-Image-Pipeline]]).
- `docker image inspect --format '{{.Os}}/{{.Architecture}}' IMAGE`로 image platform을 확인하고 실행 host의 architecture와 대조한다.
- `failed to unpack image on snapshotter overlayfs: mismatched image rootfs and manifest layers`는 architecture 불일치로 단정하지 않는다. 공개 issue에서는 containerd image store가 지원하지 않는 layer media type이나 plugin content를 받을 때 이 문구가 보고됐다. image를 지우고 다시 pull해 local store 문제를 먼저 배제한다.

## 면접 포인트

Q. Docker를 왜 사용하는가?
- image로 애플리케이션 실행 환경의 차이를 줄임
- 가볍고 빠른 배포 (VM 대비)
- 이미지 기반 버전 관리와 롤백 용이

Q. 컨테이너와 VM의 차이는?
- 컨테이너는 호스트 OS 커널을 공유하여 가볍고 빠름
- VM은 게스트 OS를 포함하여 더 강한 격리를 제공하지만 무거움

Q. `docker stop`, `docker kill`, `docker rm -f`는 무엇이 다른가?
- stop은 SIGTERM 뒤 grace period를 주고, kill과 `rm -f`는 SIGKILL로 즉시 끝내 graceful shutdown을 건너뛴다. `rm -f`는 writable layer까지 지운다

## 출처
- [Docker Docs — What is a container?](https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-a-container/)
- [Docker Docs — Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [Docker Docs — Volumes](https://docs.docker.com/engine/storage/volumes/)
- [Docker Docs — Docker overview, Docker architecture](https://docs.docker.com/get-started/docker-overview/)
- [Docker Docs — Docker Engine security, daemon attack surface](https://docs.docker.com/engine/security/)
- [Docker Docs — Linux post-installation steps](https://docs.docker.com/engine/install/linux-postinstall/)
- [Docker Docs — Troubleshooting the Docker daemon](https://docs.docker.com/engine/daemon/troubleshoot/)
- [Docker Docs — Docker contexts](https://docs.docker.com/engine/manage-resources/contexts/)
- [Docker Docs — Docker Desktop settings](https://docs.docker.com/desktop/settings-and-maintenance/settings/)
- [Docker Docs — FAQs for Docker Desktop for Mac](https://docs.docker.com/desktop/troubleshoot-and-support/faqs/macfaqs/)
- [Docker Docs — Back up and restore Docker Desktop data](https://docs.docker.com/desktop/settings-and-maintenance/backup-and-restore/)
- [Docker Docs — docker container run](https://docs.docker.com/reference/cli/docker/container/run/)
- [Docker Docs — docker container stop](https://docs.docker.com/reference/cli/docker/container/stop/)
- [Docker Docs — docker container kill](https://docs.docker.com/reference/cli/docker/container/kill/)
- [Docker Docs — docker container pause](https://docs.docker.com/reference/cli/docker/container/pause/)
- [Docker Docs — docker container rm](https://docs.docker.com/reference/cli/docker/container/rm/)
- [Docker Docs — docker container exec](https://docs.docker.com/reference/cli/docker/container/exec/)
- [Docker Docs — docker image rm](https://docs.docker.com/reference/cli/docker/image/rm/)
- [Docker Docs — docker image pull](https://docs.docker.com/reference/cli/docker/image/pull/)
- [Docker Docs — Multi-platform builds](https://docs.docker.com/build/building/multi-platform/)
- [Docker Docs — docker buildx build](https://docs.docker.com/reference/cli/docker/buildx/build/)
- [Docker Docs — Docker Engine API reference](https://docs.docker.com/reference/api/engine/)
- [image delete conflict 규칙 — moby/moby](https://github.com/moby/moby/blob/master/daemon/containerd/image_delete.go)
- [mysql 공식 image tag 정의 — docker-library/official-images](https://github.com/docker-library/official-images/blob/master/library/mysql)
- [mismatched image rootfs and manifest layers 보고 — docker/cli issue 5011](https://github.com/docker/cli/issues/5011)
- [plugin pull 시 같은 오류 문구 보고 — moby/moby issue 50818](https://github.com/moby/moby/issues/50818)
- [비전공자도 이해할 수 있는 Docker 입문/실전 — Image와 Container, JSCODE 박재성 강사](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227888)
- [비전공자도 이해할 수 있는 Docker 입문/실전 — Volume, JSCODE 박재성 강사](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227904)
- [비전공자도 이해할 수 있는 Docker 입문/실전 — Dockerfile, JSCODE 박재성 강사](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227912)
- [비전공자도 이해할 수 있는 Docker 입문/실전 — 이미지 다운로드, JSCODE 박재성 강사](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227893)
- [비전공자도 이해할 수 있는 Docker 입문/실전 — 이미지 조회와 삭제, JSCODE 박재성 강사](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227894)
- [비전공자도 이해할 수 있는 Docker 입문/실전 — 컨테이너 생성과 실행, JSCODE 박재성 강사](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227895)
- [비전공자도 이해할 수 있는 Docker 입문/실전 — 컨테이너 조회, 중지와 삭제, JSCODE 박재성 강사](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227897)
- [비전공자도 이해할 수 있는 Docker 입문/실전 — Docker 전체 흐름 다시 느껴보기, JSCODE 박재성 강사](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227900)
- [비전공자도 이해할 수 있는 Docker 입문/실전 — AWS EC2에 Spring Boot 배포하기, JSCODE 박재성 강사](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227949)
- [금융 인프라를 운영하는 Toss 개발자의 Docker — 탄생 배경, 아키텍처와 macOS 동작 방식, Hong 강사](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=414202)
- [금융 인프라를 운영하는 Toss 개발자의 Docker — 기본 명령어 맛보기, Hong 강사](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=414203)
- [금융 인프라를 운영하는 Toss 개발자의 Docker — Image, Container, Layer, Hong 강사](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=414204)
- [금융 인프라를 운영하는 Toss 개발자의 Docker — Image 기본 명령어, Hong 강사](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=414205)
- [금융 인프라를 운영하는 Toss 개발자의 Docker — Container 생성과 실행, Hong 강사](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=414208)
- [금융 인프라를 운영하는 Toss 개발자의 Docker — Container 생명 주기와 로그, Hong 강사](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=414209)
- [금융 인프라를 운영하는 Toss 개발자의 Docker — GHCR를 활용한 Private Registry, Hong 강사](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=416392)
- [Docker가 쉬워지는 운영체제 이야기 — 컨테이너 라이프 사이클과 주요 명령어, 널널한 개발자 강사](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=477005)
- [Docker가 쉬워지는 운영체제 이야기 — Windows 11에 도커 설치하기, 널널한 개발자 강사](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=477004)
- [Docker가 쉬워지는 운영체제 이야기 — 도커 이미지 생성(Next.js frontend), 널널한 개발자 강사](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=477028)

## 관련 문서
- [[Container-Linux-Internals|Linux 컨테이너 내부 구조]]
- [[Docker-Core-Storage|Docker 데이터 영속성]]
- [[Docker-Core-Dockerfile|Dockerfile과 build context]]
- [[Docker-Bridge-Networking|Docker bridge networking]]
- [[Docker-Compose|Docker Compose]]
- [[Multi-Stage-Build|Multi-stage build]]
- [[Image-Size-Optimization|Image size optimization]]
