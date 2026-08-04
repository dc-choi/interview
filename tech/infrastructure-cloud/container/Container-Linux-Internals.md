---
tags: [infrastructure, container, linux, namespace, cgroup, overlayfs, oci]
status: done
category: "Infrastructure - Container"
aliases: ["Linux Container Internals", "컨테이너 내부 구조"]
verified_at: 2026-08-04
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
- `cpu.max`는 period 동안 사용할 CPU 시간을 제한한다.
- `memory.high`는 회수 압력을 주는 throttling 경계이고 `memory.max`는 hard limit이다.
- `pids.max`는 fork 폭주가 host 전체 PID를 고갈시키는 것을 막는다.
- 한도에 도달했을 때의 결과는 controller마다 다르다. CPU는 throttling되고 memory는 reclaim 후 cgroup OOM으로 이어질 수 있다.

namespace 격리만 하고 cgroup 한도를 생략하면 runaway process가 host 자원을 잠식할 수 있다. 한도만 너무 낮게 잡으면 정상 burst를 장애로 바꾸므로 실제 working set과 부하를 측정해 headroom을 둔다. 메모리 지표 해석은 [[Container-Memory-Metrics]].

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
- upperdir가 RAM이어야 하는 것은 아니다. storage driver와 host filesystem 구성이 실제 배치와 성능을 결정한다.

## OCI가 나누는 두 계약

| 규격 | 다루는 것 | 대표 구성 |
|---|---|---|
| Image Specification | 저장과 배포 가능한 image | manifest, config, content-addressed layer descriptor |
| Runtime Specification | unpack된 bundle을 실행하는 방법 | `config.json`, rootfs, process, mount, namespace, cgroup |

image는 kernel을 포함한 완전한 OS disk가 아니다. user-space executable, library와 filesystem data를 담고 실행 시 host kernel의 ABI를 사용한다. 그래서 Linux image를 임의의 다른 kernel 계열에서 그대로 실행할 수 있다고 일반화하면 안 된다.

## 직접 만들기 실습의 경계

`unshare`, mount namespace와 별도 rootfs만으로도 격리 원리를 관찰할 수 있다. 그러나 `chroot`나 namespace 하나는 보안 경계가 아니다. production runtime은 user mapping, capability 축소, device 접근, seccomp/LSM, read-only mount와 자원 한도를 함께 다룬다. 직접 조립한 container를 신뢰할 수 없는 workload의 sandbox로 사용하지 않는다.

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
- [Docker가 쉬워지는 운영체제 이야기, Overlay 파일 시스템 구조](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476557)
- [Docker가 쉬워지는 운영체제 이야기, Linux namespace와 cgroup](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476558)
- [Docker가 쉬워지는 운영체제 이야기, 자원 사용을 통제하기 위한 cgroup](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476559)
- [Docker가 쉬워지는 운영체제 이야기, 컨테이너와 OCI image](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476561)
- [Docker가 쉬워지는 운영체제 이야기, Docker 없이 컨테이너 실행하기](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476562)

## 관련 문서

- [[Docker|Docker]]
- [[Docker-Bridge-Networking|Docker bridge networking]]
- [[Virtual-Memory|Virtual Memory]]
- [[Container-Entrypoint-Signals|Container entrypoint와 signal]]
