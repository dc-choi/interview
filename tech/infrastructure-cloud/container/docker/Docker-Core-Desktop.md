---
tags: [infrastructure, docker, container, docker-desktop, virtualization]
status: done
category: "Infrastructure - Container"
aliases: ["Docker Desktop VM 경계", "Docker Desktop Linux VM", "Docker Desktop 호환 엔진", "OrbStack", "Colima", "Kiri"]
verified_at: 2026-09-30
---

# Docker Desktop의 Linux VM 경계와 호환 엔진

macOS와 Windows에서 Docker를 쓰면 container는 host가 아니라 경량 Linux VM 안에서 돈다. 이 경계가 disk 사용량, host network, bind mount 권한과 CPU architecture 동작을 Linux 서버와 다르게 만든다. image, container와 client, daemon 구조는 [[Docker-Core|Docker 기본]]에서 다룬다.

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
| CPU architecture | Apple Silicon은 arm64. 다른 architecture image도 내장 QEMU emulation으로 돈다 | emulation을 등록하지 않으면 다른 architecture image가 실행되지 않는다([[Docker-Core#CPU architecture 불일치|CPU architecture 불일치]]) |

## Docker Desktop 대신 쓰는 호환 엔진

OrbStack(macOS), Colima(macOS와 Linux), Kiri(macOS, WSL 2를 쓰는 Windows, Linux)처럼 `docker` CLI, Compose와 buildx를 그대로 쓰게 해 주는 엔진도 macOS와 Windows에서는 Linux VM 안에서 container를 돌린다(2026-11-21 각 프로젝트 문서 확인). 그래서 Linux VM 경계 자체는 남지만, 위에서 본 disk image 위치, host networking 설정과 file sharing 같은 Desktop 전용 설정과 동작은 엔진마다 다르다. `docker context`로 엔진을 고르면 명령은 바뀌지 않고, 차이는 VM과 runtime 구현에서 난다. 예컨대 Kiri(2026-11-19 릴리스 0.2.2의 README 기준 Apache-2.0, 문서 사이트의 FAQ는 MIT와 Apache-2.0 중 고르는 이중 라이선스로 적는다)는 자체 daemon이 VM을 소유하고 vsock으로 guest의 PID 1 agent에 요청하며, agent는 runc, shim과 dockerd 없이 `clone3` 한 번으로 container를 namespace와 cgroup 안에서 시작한다고 설명한다. `clone3`는 새 namespace를 만들 수 있지만 cgroup은 만들지 않고, `CLONE_INTO_CGROUP`으로 이미 있는 cgroup v2 디렉터리의 fd를 넘겨 그 안에 자식을 둔다(clone(2)). Kiri는 60초 동안 쓰지 않으면 VM을 재우고, 실행 중에는 balloon으로 쓰지 않는 memory를 host에 돌려준다. 이와 별개로 공개 port 트래픽은 user space에서 중계하므로 대용량 전송은 Docker Engine보다 느리다고 스스로 밝힌다(Linux 측정에서 10.3Gbit/s 대 100.7Gbit/s). 시작 속도 비교는 제작자 측정이므로 바꾸기 전에 자기 장비에서 bind mount 입출력, 공개 port 처리량과 build 시간을 잰다.

라이선스와 비용도 기준이다. Docker Desktop은 직원 250명 미만이면서 연 매출 1,000만 달러 미만인 소기업, 개인, 교육과 비상업 오픈소스에 무료이고, 그 밖의 상업적 사용에는 유료 구독이 필요하다(Docker 문서 2026-11-21 확인). Kiri는 README 비교표에서 업무용 사용도 무료라고 적고, 사이트는 Mac, Windows와 Linux에서 무료이며 베타라고 적는다(2026-11-21 확인). 내장 공유 기능인 Kiri Share는 계정과 플랜별 한도를 따로 두며, 그 조건은 [[Loopback-And-Localhost#로컬 서비스를 외부에 공유하는 터널|로컬 서비스를 외부에 공유하는 터널]]에 있다.

## 출처
- [Docker Docs — Docker Desktop settings](https://docs.docker.com/desktop/settings-and-maintenance/settings/)
- [Docker Docs — FAQs for Docker Desktop for Mac](https://docs.docker.com/desktop/troubleshoot-and-support/faqs/macfaqs/)
- [Docker Docs — Back up and restore Docker Desktop data](https://docs.docker.com/desktop/settings-and-maintenance/backup-and-restore/)
- [Docker Docs — Multi-platform builds](https://docs.docker.com/build/building/multi-platform/)
- [Docker Docs — Docker Desktop license agreement](https://docs.docker.com/subscription/desktop-license/) — 무료 사용 범위, 2026-11-21 확인
- [Kiri README — GitHub, libracoder/kiri](https://github.com/libracoder/kiri) — 최신 릴리스 v0.2.2(2026-11-19)의 구조, 지원 OS, 유휴 동작과 벤치마크(제작자 측정), 2026-11-21 확인. 같은 날 Apache-2.0 라이선스와 비교표의 업무용 무료 표기 확인
- [Kiri Docs, Questions](https://docs.runkiri.com/faq/) — MIT와 Apache-2.0 이중 라이선스 표기, Linux에서 VM 없이 도는 엔진, 2026-11-21 확인
- [Kiri, runkiri.com 소개 페이지](https://runkiri.com/) — 무료와 베타 상태를 함께 적은 문구, 2026-11-21 확인
- [Linux man-pages, clone(2)](https://man7.org/linux/man-pages/man2/clone.2.html) — `CLONE_INTO_CGROUP`이 기존 cgroup v2 fd로 자식을 넣는다는 설명, 2026-11-21 확인
- [OrbStack Docs, FAQ](https://docs.orbstack.dev/faq) — 네이티브 macOS 앱, 2026-11-21 확인
- [OrbStack Docs, Architecture](https://docs.orbstack.dev/architecture) — 경량 Linux VM 안의 Docker engine, 2026-11-21 확인
- [Colima README — GitHub, abiosoft/colima](https://github.com/abiosoft/colima) — macOS와 Linux용 container runtime, 2026-11-21 확인
- [Colima Docs, Configuration](https://colima.run/docs/configuration/) — VM 자원과 VM 유형 설정, 2026-11-21 확인
- GeekNews, 2026-11-20 제공 요약: Kiri - 무료 ngrok 대안을 내장한 경량 Docker Desktop 대체재 (토픽 번호 미확인, 원문 식별에 사용)
- [금융 인프라를 운영하는 Toss 개발자의 Docker — 탄생 배경, 아키텍처와 macOS 동작 방식, Hong 강사](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=414202)

## 관련 문서
- [[Docker-Core|Docker 기본]]
- [[Docker-Core-Storage|Docker 데이터 영속성]] — Desktop의 volume `Mountpoint`와 bind mount 권한
- [[Docker-Bridge-Networking|Docker bridge networking]]
- [[Image-Size-Optimization|Image size optimization]] — VM disk 안의 사용량 정리
- [[Loopback-And-Localhost|Loopback, Localhost 동작 원리]] — Kiri Share 같은 로컬 공유 터널
- [[Virtual-Machines-and-Hypervisors|가상 머신과 하이퍼바이저]]
