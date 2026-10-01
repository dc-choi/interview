---
tags: [infrastructure, container, linux, namespace, cgroup, overlayfs, oci]
status: done
category: "Infrastructure - Container"
aliases: ["Linux Container Internals", "컨테이너 내부 구조"]
verified_at: 2026-09-30
---

# Linux 컨테이너 내부 구조

컨테이너는 작은 가상 머신이 아니라 Linux 커널이 격리된 실행 문맥에서 시작한 프로세스다. 이미지의 root filesystem, namespace, cgroup과 보안 통제를 조합해 별도 시스템처럼 보이게 하지만 host kernel은 공유한다.

## 실행 모델

```text
OCI image manifest/config/layers
  -> layer unpack과 rootfs 준비
  -> namespace, mount, cgroup, capability 설정
  -> 지정한 process를 rootfs 안에서 exec
  -> container의 main process가 종료되면 container도 종료
```

Docker는 이 과정을 빌드, 배포, 실행하기 쉽게 묶은 제품이다. Linux kernel 기능과 OCI 규격을 직접 사용하거나 다른 builder/runtime을 사용해도 컨테이너를 만들 수 있다. 다만 OCI 형식을 지원한다는 사실만으로 모든 제품과 옵션의 완전한 호환성이 보장되지는 않는다.

## namespace는 보이는 범위를 나눈다

namespace는 프로세스가 전역 자원의 어느 인스턴스를 보는지 정한다. 한 컨테이너가 아래 namespace를 모두 새로 가져야 하는 것은 아니며 runtime 설정에 따라 host namespace를 공유할 수도 있다.

| namespace | 주로 분리하는 것 | 확인 포인트 |
|---|---|---|
| mount | mount point와 filesystem view | bind mount, volume, rootfs |
| PID | process ID 공간 | 내부 PID 1과 host PID가 다름 |
| network | interface, address, route, port | container별 loopback과 veth |
| UTS | hostname과 domain name | container hostname |
| IPC | System V IPC, POSIX message queue | 공유 메모리 충돌 방지 |
| user | UID/GID와 capability mapping | 내부 root가 host root인지 여부 |
| cgroup | 보이는 cgroup root | 자원 계층 노출 범위 |
| time | 일부 clock offset | runtime과 kernel 지원 확인 |

namespace는 가시성과 이름 공간을 격리할 뿐 CPU나 memory 사용량을 제한하지 않는다. 반대로 cgroup은 자원을 통제하지만 filesystem이나 network view를 분리하지 않는다.

## cgroup은 자원 계층을 통제한다

cgroup v2는 process를 하나의 계층으로 조직하고 controller가 CPU, memory, I/O, PID 같은 자원의 분배와 한도를 적용한다.

- `cpu.weight`는 경쟁 중인 sibling 사이의 상대적 몫이다. 전용 core 보장이 아니다.
- `cpu.max`는 `$MAX $PERIOD` 형식으로 period마다 쓸 수 있는 CPU 시간을 제한하고 기본값은 `max 100000`(무제한)이다. `50000 100000`은 100ms마다 모든 CPU를 합쳐 50ms, 즉 CPU 0.5개분이고 quota가 period보다 큰 `200000 100000`은 CPU 2개분이다. 여러 thread가 period 초반에 quota를 다 쓰면 남은 구간 동안 throttling되어 지연이 튀므로 `cpu.stat`의 `nr_throttled`, `throttled_usec`를 본다([[K8s-Resource-Right-Sizing-Criteria]]).
- `memory.high`는 회수 압력을 주는 throttling 경계이고 `memory.max`는 hard limit이다.
- `pids.max`는 fork 폭주가 host 전체 PID를 고갈시키는 것을 막는다.
- 한도에 도달했을 때의 결과는 controller마다 다르다. CPU는 throttling되고 memory는 reclaim 후 cgroup OOM으로 이어질 수 있다.

namespace 격리만 하고 cgroup 한도를 생략하면 runaway process가 host 자원을 잠식할 수 있다. 한도만 너무 낮게 잡으면 정상 burst를 장애로 바꾸므로 실제 working set과 부하를 측정해 headroom을 둔다. 메모리 지표 해석은 [[Container-Memory-Metrics]].

같은 한도를 도구별로 이렇게 건다. 컨테이너가 아닌 일반 process도 `systemd-run --scope -p CPUQuota=50% -p MemoryMax=512M <명령>`으로 묶으면 sleep 없는 무한 루프도 한도 이상 CPU를 쓰지 못한다.

| 목적 | cgroup v2 | Docker | systemd |
|---|---|---|---|
| CPU 사용량 상한 | `cpu.max` | `--cpus=0.5`(`--cpu-period=100000 --cpu-quota=50000`과 같음) | `CPUQuota=50%`(100%가 CPU 1개) |
| 실행할 CPU 지정 | `cpuset.cpus` | `--cpuset-cpus` | `AllowedCPUs=` |
| 메모리 hard limit | `memory.max` | `--memory` | `MemoryMax=` |

CPU affinity(`taskset`, `cpuset.cpus`)는 어느 CPU에서 도는지를 정할 뿐 사용량 상한이 아니므로 quota와 다른 레버다.

## OverlayFS와 writable layer

OverlayFS는 여러 directory tree를 하나의 merged view로 보여준다.

```text
lowerdir: read-only image layers
upperdir: container 변경분
workdir: OverlayFS 내부 작업 공간
merged: process가 보는 통합 rootfs
```

- lower의 파일을 처음 수정하면 upper로 copy-up한 뒤 upper 사본을 바꾼다.
- 삭제는 lower 데이터를 지우는 대신 upper의 whiteout이나 opaque directory로 가린다.
- container 삭제 시 writable layer도 함께 없어질 수 있으므로 database data는 volume에 둔다.
- bind mount나 volume을 경로에 붙이면 그 아래 image 내용이 가려진다.
- copy-up과 directory merge에는 비용이 있다. write-heavy workload의 성능을 일반 filesystem과 같다고 가정하지 않는다.
- copy-up은 block이 아니라 파일 단위다. 큰 파일의 일부만 바꿔도 처음 쓸 때 파일 전체를 upper로 복사해 쓰기 지연과 디스크 중복이 생기고, 이후 쓰기는 그 사본에 적용된다. 커널의 metacopy 기능은 chown, chmod 같은 메타데이터 변경의 데이터 복사만 미루며 활성 여부는 커널 설정과 마운트 옵션에 따라 다르다.
- 같은 lower 파일을 읽는 여러 container는 page cache entry 하나를 공유해 메모리 효율이 좋다. layer가 많으면 파일을 찾는 비용이 늘 수 있다.
- 쓰기가 잦은 큰 파일은 image에 굽지 않고 storage driver를 거치지 않는 volume에 둔다. 삭제한 파일도 lower layer에 남아 image가 줄지 않으므로 설치와 정리는 같은 `RUN`에서 한다([[Image-Size-Optimization]]).
- upperdir가 RAM이어야 하는 것은 아니다. storage driver와 host filesystem 구성이 실제 배치와 성능을 결정한다.

읽기 전용 원본을 공유하다 쓸 때 복사하는 발상은 fork의 Copy-on-Write([[Process-Lifecycle]])와 같지만 단위가 다르다.

| 가상 메모리 CoW | OverlayFS |
|---|---|
| 여러 process가 공유하는 read-only page | 여러 container가 공유하는 lower layer |
| 쓰기 시 그 page만 복사 | 첫 쓰기 시 파일 전체 copy-up |
| process 종료 시 private page 해제 | container 삭제 시 upper 폐기 |

원본은 바뀌지 않으므로 upper만 버리면 image 상태로 돌아가 실패한 변경을 싸게 되돌린다.

## OCI가 나누는 두 계약

| 규격 | 다루는 것 | 대표 구성 |
|---|---|---|
| Image Specification | 저장과 배포 가능한 image | manifest, config, content-addressed layer descriptor |
| Runtime Specification | unpack된 bundle을 실행하는 방법 | `config.json`, rootfs, process, mount, namespace, cgroup |

image는 kernel을 포함한 완전한 OS disk가 아니다. user-space executable, library와 filesystem data를 담고 실행 시 host kernel의 ABI를 사용한다. 그래서 Linux image를 임의의 다른 kernel 계열에서 그대로 실행할 수 있다고 일반화하면 안 된다.

## 직접 만들기 실습의 경계

`unshare`, mount namespace와 별도 rootfs만으로도 격리 원리를 관찰할 수 있다. 직접 조립하면 image가 무엇을 담아야 process가 실행되는지 드러난다.

- **동적 라이브러리**: 동적 링크 실행 파일은 실행 시점에 공유 라이브러리를 로드하므로 `ldd`가 보여 주는 라이브러리를 rootfs의 같은 경로에 복사한다. 목록의 ELF interpreter(`ld-linux`)가 빠지면 실행 파일이 있어도 `No such file or directory`(ENOENT)로 실패한다. 정적 링크 바이너리가 `scratch`에서 도는 이유이고, glibc용 바이너리가 musl 기반 Alpine에서 실패하는 원인도 같은 계층이다([[Alpine-vs-Debian-Image]]).
- **장치 노드**: 프로그램이 여는 최소 장치를 `mknod`로 만든다. `null`은 `c 1 3`, `zero`는 `c 1 5`, `random`은 `c 1 8`, `urandom`은 `c 1 9`이고 보통 권한 666을 준다.
- **namespace 옵션**: `unshare --pid`는 호출한 process를 옮기지 않고 이후 만드는 첫 자식이 새 namespace의 PID 1이 되므로 `--fork`가 필요하다. `ps`가 새 PID 공간을 보려면 `--mount-proc`로 `/proc`를 다시 마운트한다. `--uts`로 hostname, `--ipc`로 IPC, `--net`으로 network를 나누며 새 network namespace에는 loopback만 있다.
- **image의 정체**: 설치는 대부분 정해진 경로로 파일을 복사하는 일이다. image는 실행 파일, 의존 라이브러리와 설정 파일을 tar layer로 묶고 실행 명령, 환경 변수, 작업 디렉터리와 사용자를 JSON config에 담은 filesystem snapshot이다.

그러나 `chroot`나 namespace 하나는 보안 경계가 아니다. production runtime은 user mapping, capability 축소, device 접근, seccomp/LSM, read-only mount와 자원 한도를 함께 다룬다. 직접 조립한 container를 신뢰할 수 없는 workload의 sandbox로 사용하지 않는다.

## 장애를 계층으로 분해한다

| 증상 | 먼저 볼 계층 |
|---|---|
| host에서는 보이지만 container에서는 파일이 없음 | mount namespace, rootfs, volume이 기존 경로를 가렸는지 |
| CPU가 느리고 주기적으로 멈춤 | `cpu.max`, throttling 지표, host contention |
| memory는 남았는데 process가 죽음 | `memory.max`, `memory.events`, OOM log |
| 내부에서는 root인데 host 파일 접근이 거부됨 | user namespace mapping, capability, LSM |
| 변경 파일이 예상보다 느림 | copy-up, upperdir filesystem, write pattern |
| image는 pull되지만 실행되지 않음 | CPU architecture, kernel ABI, runtime config와 entrypoint |

## 출처

- [Linux manual, namespaces overview](https://man7.org/linux/man-pages/man7/namespaces.7.html)
- [Linux kernel documentation, cgroup v2](https://docs.kernel.org/admin-guide/cgroup-v2.html)
- [Linux kernel documentation, OverlayFS](https://docs.kernel.org/filesystems/overlayfs.html)
- [OCI Image Specification](https://github.com/opencontainers/image-spec)
- [OCI Runtime Specification](https://github.com/opencontainers/runtime-spec)
- [Linux manual, unshare(1)](https://man7.org/linux/man-pages/man1/unshare.1.html)
- [Linux manual, pid_namespaces(7)](https://man7.org/linux/man-pages/man7/pid_namespaces.7.html)
- [Linux manual, execve(2)](https://man7.org/linux/man-pages/man2/execve.2.html)
- [Linux kernel documentation, Linux allocated devices](https://docs.kernel.org/admin-guide/devices.html)
- [Docker Docs, OverlayFS storage driver](https://docs.docker.com/engine/storage/drivers/overlayfs-driver/)
- [Docker Docs, Resource constraints](https://docs.docker.com/engine/containers/resource_constraints/)
- [Linux manual, systemd.resource-control(5)](https://man7.org/linux/man-pages/man5/systemd.resource-control.5.html)
- [Linux manual, systemd-run(1)](https://man7.org/linux/man-pages/man1/systemd-run.1.html)
- [Docker가 쉬워지는 운영체제 이야기, Overlay 파일 시스템 구조](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476557)
- [Docker가 쉬워지는 운영체제 이야기, Linux namespace와 cgroup](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476558)
- [Docker가 쉬워지는 운영체제 이야기, 자원 사용을 통제하기 위한 cgroup](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476559)
- [Docker가 쉬워지는 운영체제 이야기, 컨테이너와 OCI image](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476561)
- [Docker가 쉬워지는 운영체제 이야기, Docker 없이 컨테이너 실행하기](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476562)
- [Docker가 쉬워지는 운영체제 이야기, 프로그램 설치에 관하여](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476548)
- [Docker가 쉬워지는 운영체제 이야기, PC방 HDD 복구 원리](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476556)
- [Docker가 쉬워지는 운영체제 이야기, Docker 이미지와 컨테이너](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=477003)
- [Docker가 쉬워지는 운영체제 이야기, Docker 컨테이너 라이프 사이클과 주요 명령어](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=477005)

## 관련 문서

- [[Docker|Docker]]
- [[Docker-Bridge-Networking|Docker bridge networking]]
- [[Virtual-Memory|Virtual Memory]]
- [[Container-Entrypoint-Signals|Container entrypoint와 signal]]
