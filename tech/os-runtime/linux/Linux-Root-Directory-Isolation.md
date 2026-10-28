---
tags: [linux, openbsd, sandbox, chroot, filesystem, security]
status: done
verified_at: 2026-10-27
category: "OS&런타임(OS&Runtime)"
aliases: ["Root Directory Isolation", "루트 디렉터리 격리", "fchroot", "failfs", "unveil"]
---

# 루트 디렉터리 격리: chroot, fchroot, failfs와 unveil

프로세스가 볼 수 있는 파일 경로를 줄이는 일은 샌드박스의 기본 재료다. 다만 루트 디렉터리를 바꾸는 것만으로는 보안 경계가 되지 않고, 경로 이름으로 대상을 고르는 방식은 확인과 사용 사이에 대상이 바뀌는 경쟁 조건을 남긴다. Linux 7.3의 `fchroot()`와 failfs는 이 문제를 파일 디스크립터 기준으로 다루고, OpenBSD의 `unveil()`은 보이는 경로를 허용 목록으로 좁힌다.

## chroot의 범위와 한계

`chroot()`는 호출한 프로세스의 루트 디렉터리, 즉 절대 경로 탐색의 시작점을 바꾼다. Linux man page 기준 동작은 다음과 같다.

- 현재 작업 디렉터리를 바꾸지 않으므로 `.`이 새 루트 밖에 남을 수 있다.
- 이미 열린 파일 디스크립터를 닫지 않는다.
- `fork(2)`로 만든 자식은 부모의 루트를 물려받고, `execve(2)`는 루트를 바꾸지 않는다.
- 호출에는 user namespace 안의 `CAP_SYS_CHROOT`가 필요하다.

man page는 chroot가 어떤 보안 목적으로도 의도되지 않았다고 명시하며, 특권 사용자가 빠져나오는 예도 든다. 컨테이너 런타임이 mount namespace, capability 축소와 seccomp를 함께 쓰는 이유는 [[Container-Linux-Internals|컨테이너 Linux 내부 구조]]에서 다룬다.

## fchroot와 failfs (Linux 7.3)

2026-10-18 출시된 Linux 7.3은 두 기능을 더했다. 아래 동작은 v7.3 태그의 커널 문서(`Documentation/filesystems/failfs.rst`)와 `fs/open.c` 기준이다.

- **`fchroot(2)`**: 경로 대신 파일 디스크립터로 새 루트를 지정하는 chroot의 짝이다. 디스크립터가 가리키는 위치를 그대로 쓰고 경로를 다시 해석하지 않으므로, 대상을 확인한 시점과 루트를 바꾸는 시점 사이에 경로가 다른 곳을 가리키게 되는 TOCTOU 창이 없다. `flags`는 0이어야 하고, 일반 디렉터리 디스크립터로 루트를 바꿀 때는 chroot처럼 `CAP_SYS_CHROOT`가 필요하다.
- **failfs**: 도달하는 모든 연산을 `EOPNOTSUPP`로 실패시키는 커널 내부 파일시스템이다. 영원히 비어 있는 nullfs가 여기에 아무것도 없다는 뜻이라면 failfs는 여기서는 아무것도 지원하지 않는다는 뜻이다. 사용자 공간에서 mount할 수 없고, 들어가는 길은 `fchdir(2)`와 `fchroot(2)`가 이해하는 `FD_FAILFS_ROOT` 디스크립터 하나뿐이다.

루트가 failfs에 있는 프로세스는 절대 경로 탐색, 절대 경로 symlink와 동적 링크 바이너리의 interpreter 탐색이 모두 실패하므로 exec도 실패한다. 작업 디렉터리가 failfs에 있으면 `AT_FDCWD` 기준 탐색도 실패하고, 명시한 디렉터리 디스크립터 기준 탐색만 동작한다. 커널 문서는 이를 `fs_struct` 수준의 `RESOLVE_BENEATH`에 비유한다. 필요한 디렉터리를 먼저 열어 두고 루트를 failfs로 옮기면 이후 코드는 넘겨받은 디스크립터 아래만 다룰 수 있다는 구조로 읽을 수 있다. 다만 커널 문서는 샌드박스 용도를 명시하지 않으므로 이는 설계 해석이다.

- **권한**: `fchroot(FD_FAILFS_ROOT, 0)`는 호출자 user namespace의 `CAP_SYS_CHROOT`가 필요하다. 권한 없는 호출자도 `no_new_privs`를 켰고, 이미 chroot되지 않았고, `fs_struct`를 공유하지 않으면 들어갈 수 있다.
- **빠져나오기**: failfs에 들어간 프로세스는 chroot된 것으로 취급돼 user namespace를 만들어 `CAP_SYS_CHROOT`를 되찾을 수 없다. `chroot(2)`나 `fchroot(2)`로 되돌아가려면 `CAP_SYS_CHROOT`가 필요하고, 남은 길인 mount namespace 디스크립터로의 `setns(2)`는 대상 namespace의 `CAP_SYS_ADMIN`과 호출자 user namespace의 `CAP_SYS_CHROOT`, `CAP_SYS_ADMIN`을 요구한다. 그런 디스크립터가 없고 seccomp로 chdir, chroot, setns 계열 호출을 막은 프로세스는 현재 빠져나올 수 없다. 커널 문서는 이 어려움이 보장된 인터페이스가 아니라 현재 구현의 성질이며 나중에 완화될 수 있다고 적는다.

같은 릴리스는 PID 1에 별도 `fs_struct`를 주고 커널 스레드를 별도 nullfs mount에 격리했다. 전에는 PID 1과 커널 스레드가 파일시스템 상태를 공유해 `pivot_root()`가 모든 커널 스레드의 시야를 바꿀 수 있었다.

## OpenBSD unveil

OpenBSD의 `unveil()`은 허용 목록 방식이다. 처음 호출하면 나머지 파일시스템이 보이지 않게 되고, 이후에는 `unveil()`로 연 경로만 지정한 권한(`r` 읽기, `w` 쓰기, `x` 실행, `c` 생성과 삭제)으로 접근할 수 있다. 설정을 마치면 `unveil(NULL, NULL)` 또는 `unveil` 약속을 뺀 `pledge()`로 추가 호출을 막는 것이 강하게 권장된다. `execve()`로 실행한 새 프로그램은 unveil 없이 시작한다. `pledge()`는 POSIX 기능을 30여 개 하위 시스템으로 나눠 프로그램이 쓸 것만 선언하게 하고, 선언하지 않은 하위 시스템을 쓰면 대부분 잡을 수 없는 `SIGABRT`로 종료시킨다.

| 방식 | 시야를 좁히는 기준 | 권한 표현 |
|---|---|---|
| `chroot` | 하나의 루트 경로 | 기존 파일 권한 그대로 |
| `fchroot`와 failfs | 미리 연 디렉터리 디스크립터 | 디스크립터를 연 방식과 기존 파일 권한 |
| `unveil` | 허용한 경로 목록 | 경로별 `r`, `w`, `x`, `c` |

## 확인 질문

- chroot만으로 보안 경계가 되지 않는 이유는 무엇인가
- 경로 기반 루트 변경의 TOCTOU 창은 어디에 있고 fchroot는 무엇을 없애는가
- failfs 루트에서 exec가 실패하는 이유와, 디렉터리 디스크립터로 작업하는 구조는 무엇인가
- unveil의 허용 목록과 failfs의 디스크립터 기준은 시야를 좁히는 방향이 어떻게 다른가

## 출처

- [Linux manual, chroot(2)](https://man7.org/linux/man-pages/man2/chroot.2.html)
- [Linux kernel v7.3, Documentation/filesystems/failfs.rst](https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/tree/Documentation/filesystems/failfs.rst?h=v7.3) — 2026-10-27 진입과 탈출 조건, 경로 탐색 동작 대조
- [fs/open.c v7.3 — Linux kernel source](https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/tree/fs/open.c?h=v7.3) — `fchroot`의 flags와 권한 검사
- [Linux 7.3 — Kernelnewbies](https://kernelnewbies.org/Linux_7.3)
- [The 7.3 kernel has been released — LWN.net](https://lwn.net/Articles/1101143/)
- [OpenBSD manual pages, unveil(2)](https://man.openbsd.org/unveil)
- [OpenBSD manual pages, pledge(2)](https://man.openbsd.org/pledge)
- [Linux 7.3 출시 - 스케줄링 개선과 새로운 파일 접근 격리 기능 — GeekNews](https://news.hada.io/topic?id=35635)

## 관련 문서

- [[Container-Linux-Internals|컨테이너 Linux 내부 구조]]
- [[Linux-File-System|Linux 파일 시스템]]
- [[Deno-Runtime-Permissions|Deno 권한 모델]]
- [[OpenBSD-Platform|OpenBSD 플랫폼]]
- [[Context-Switching-Scheduling-Algorithms#정책을 교체할 수 있게 만든 Linux sched_ext|Linux 7.3의 sched_ext sub-scheduler]]
