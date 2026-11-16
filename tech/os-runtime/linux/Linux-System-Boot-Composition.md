---
tags: [linux, os, boot, kernel, systemd, container]
status: done
verified_at: 2026-11-16
category: "OS&런타임(OS&Runtime)"
aliases: ["Linux System Composition", "리눅스 시스템 구성", "Linux 부팅 구성 요소"]
---

# Linux 시스템의 구성과 부팅 경로

Linux는 엄밀히 커널 하나를 가리킨다. 사람들이 Linux 서버라고 부르는 것은 커널에 첫 프로세스, C 라이브러리와 기본 명령, 부트 로더, 서비스 관리자, 패키지 관리자를 더한 시스템이고, 이를 골라 맞춰 시험하고 갱신하는 단위가 배포판이다. 각 부품이 왜 필요한지는 커널만 부팅했을 때 무엇이 빠지는지로 보면 분명해진다.

## 부품별 역할

| 부품 | 하는 일 | 없으면 |
|---|---|---|
| 커널 | 하드웨어를 다루고 프로세스, 메모리, 파일시스템, 네트워크를 다른 프로그램에 나눠 줌 | 시작 자체가 안 됨 |
| init(PID 1) | 커널이 직접 시작하는 첫 프로세스. 나머지 프로그램을 띄움 | 커널이 실행할 것이 없어 멈춤 |
| 동적 로더와 C 라이브러리 | 프로그램을 공유 라이브러리와 연결하고 시스템 호출을 감싼 함수를 제공 | 동적 링크 프로그램이 실행되지 않음 |
| 기본 명령과 셸 | 명령을 읽고 다른 프로그램을 시작 | 사람이 시스템을 조작할 수 없음 |
| initramfs | 실제 루트 디스크를 붙이기 전에 메모리에서 도는 작은 시작 시스템 | 디스크 드라이버가 모듈이면 루트를 못 붙임 |
| 펌웨어와 부트 로더 | 커널과 initramfs를 메모리에 올리고 커널 명령줄을 넘김 | 실제 기기에서는 커널이 올라오지 않음 |
| 서비스 관리자 | 원격 접속, 로그, 시계 같은 서비스를 시작하고 관리 | 서버 역할을 하는 프로세스가 뜨지 않음 |
| 패키지와 패키지 관리자 | 부품을 버전 단위로 설치하고 갱신 | 부품 조합을 일관되게 유지하기 어려움 |

## 커널과 첫 프로세스

- 커널은 루트 파일시스템을 붙인 뒤 init 프로그램을 찾아 PID 1로 실행한다. 커널 명령줄의 `init=`으로 지정하지 않으면 빌드 설정의 기본 init과 `/sbin/init`, `/etc/init`, `/bin/init`, `/bin/sh`를 차례로 시도하고, 모두 실패하면 `No working init found.` 메시지와 함께 멈춘다. `init=`으로 지정한 프로그램이 실패하면 다른 패닉 메시지가 난다. 원인은 루트 파일시스템 마운트 실패, 루트에 init 바이너리 없음, 콘솔 장치 문제, 라이브러리 의존성 누락, 바이너리 로드 실패 순으로 확인한다.
- 호스트(초기 PID namespace)의 PID 1은 끝나면 안 되며, 종료되면 커널이 패닉한다. 컨테이너 안의 PID 1이 끝나면 패닉 대신 커널이 그 PID namespace의 나머지 프로세스를 SIGKILL로 끝내고 컨테이너가 끝난다([[Container-Entrypoint-Signals|컨테이너 엔트리포인트와 시그널]]).
- Unix 계열은 프로세스가 자신을 복제(fork)하고 복제본이 새 프로그램을 적재(exec)하는 방식으로 프로그램을 시작한다. 첫 프로세스는 복제할 부모가 없어 커널이 직접 만든다.

## 라이브러리와 로더

동적 링크된 프로그램은 실행 파일 안에 적힌 동적 로더(ELF interpreter)가 공유 라이브러리를 연결한 뒤 실행된다. 실행 파일이 지정한 로더가 없으면 파일이 있어도 `execve`가 `ENOENT`로 실패해 셸이 파일을 찾지 못했다고 보고할 수 있다. 로더는 있고 공유 라이브러리가 없으면 exec은 성공하고 이후 동적 로더가 실패한다(glibc 로더는 `error while loading shared libraries`를 출력). 다른 배포판의 바이너리를 옮길 때는 필요한 로더와 라이브러리를 먼저 본다. `ldd`는 대상 프로그램을 실행할 수 있으므로 신뢰하지 않는 실행 파일에는 쓰지 않고 `objdump -p`로 의존성을 읽는다(직접 의존성만 보인다). C 라이브러리는 프로그램이 커널에 일을 요청하는 시스템 호출을 함수로 감싸며, Ubuntu와 Debian 계열은 GNU의 glibc를 쓴다. 커널 외 사용자 공간을 GNU 프로젝트가 많이 제공해 GNU/Linux라는 이름도 함께 쓰인다.

## 장치 파일과 커널 모듈

- 장치는 `/dev`의 장치 파일로 노출돼 프로그램이 일반 파일처럼 읽고 쓴다. 커널은 부팅 초기에 메모리 파일시스템 devtmpfs를 만들고, major/minor 번호가 있는 등록 장치마다 기본 이름과 권한으로 장치 노드를 유지한다(부팅 뒤 연결된 장치 포함). 이를 `/dev`에 마운트하면 보이고, 보통 udev(systemd)가 그 위에서 권한을 조정하고 의미 있는 심볼릭 링크를 더한다. 디스크에 `mknod`로 만든 정적 노드도 쓸 수 있다. 네트워크 카드처럼 `/dev`에 파일이 없는 장치도 있으므로 모든 것이 파일이라는 표현은 설계 원칙이지 규칙이 아니다.
- `/proc`와 `/sys`는 커널이 자기 상태를 파일로 보여 주는 가상 파일시스템이다. `/proc/<PID>/`에 프로세스별 정보가, `/sys`에 장치, 드라이버와 설정이 있다.
- Linux는 드라이버를 포함한 커널 전체가 한 주소 공간에서 도는 모놀리식 커널이다. 다만 많은 드라이버를 별도 파일의 모듈로 두고 필요할 때 실행 중인 커널에 적재한다. 마이크로커널은 핵심만 커널에 두고 나머지를 메시지를 주고받는 별도 프로그램으로 돌린다.

## initramfs와 부트 로더

루트 디스크의 드라이버가 모듈이면 그 모듈 파일은 아직 읽을 수 없는 디스크 위에 있다. initramfs가 이 순환을 끊는다.

1. 펌웨어가 부트 로더(Ubuntu는 GRUB)를 시작하고, 부트 로더가 커널, initramfs와 커널 명령줄을 메모리에 올린다. Ubuntu에서 Secure Boot를 켜면 펌웨어가 Microsoft가 서명한 shim을 확인하고, shim이 Canonical이 서명한 GRUB과 커널을 확인한다. initramfs 이미지는 검증 대상이 아니다.
2. 커널은 initramfs(cpio 아카이브)를 rootfs에 풀고, 그 안에 `init`이 있으면 PID 1로 실행한다.
3. initramfs의 init이 필요한 모듈을 적재하고 실제 루트 장치를 찾아 붙인다.
4. init은 커널로 돌아가지 않고 루트를 실제 디스크로 바꾼 뒤 실제 시스템의 init을 exec한다. PID는 그대로 1이다. 루트 전환은 오래 `switch_root`(새 루트를 덮어 마운트)로 했고, 7.0 커널 문서는(6.19 문서에는 없음) nullfs를 진짜 루트로 둬 initramfs에서도 `pivot_root`가 정상 동작한다고 적는다. 이전 커널은 rootfs를 pivot하거나 해제할 수 없다.

initramfs의 `/init` 대신 셸을 띄우려면 `rdinit=/bin/sh`, 실제 루트 파일시스템의 init 대신 셸을 띄우려면 `init=/bin/sh`를 쓴다. 24.04까지 Ubuntu 기본인 initramfs-tools는 `init=`을 initramfs 스크립트가 끝난 뒤 실행을 넘길 루트의 프로그램으로 해석한다. 26.04부터 Ubuntu는 initramfs 기본 도구를 Dracut으로 바꿔 initramfs의 PID 1도 systemd이며, initramfs-tools는 계속 지원한다.

## 서비스 관리자와 배포판

- Ubuntu 서버의 PID 1은 서비스 관리자 systemd다. `/proc/1/comm`으로 현재 PID 1의 이름을 확인한다. systemd도 커널의 일부가 아니라 디스크에 있는 프로그램이다.
- 배포판은 커널, C 라이브러리, 셸, 기본 명령, 부트 로더, 서비스 관리자처럼 서로 다른 프로젝트의 부품을 함께 동작하는 버전으로 고르고 패키지로 묶어 갱신한다. `/etc/os-release`가 배포판 이름과 버전을 알려 주고, Ubuntu의 패키지 관리자는 APT다. Ubuntu는 Debian에서 파생돼 os-release에 `ID_LIKE=debian`이 있다.
- Ubuntu는 6개월마다 새 버전을 내고 2년마다 LTS를 낸다. LTS는 5년의 표준 보안 유지보수를 받는다. 26.04 LTS는 2026-04 출시됐고 표준 유지보수가 2031-05까지다(2026-11-16 Ubuntu 릴리스 주기 페이지 기준). 사용자 공간 부품의 구성은 배포판과 버전마다 다르므로 기본 명령의 구현까지 같다고 가정하지 않는다([[BSD-System-Composition|운영체제 구성과 패키지 출처 정책]]).

## 커널 릴리스와 배포판 커널

- mainline 커널은 약 2주의 merge window에 새 기능을 받고, 이후 주 1회 정도 rc를 내며 보통 rc6에서 rc9 사이를 거쳐 출시한다. 새 주 버전은 2~3개월마다 나온다. 일반 안정 커널은 출시 뒤 한 개발 주기를 조금 넘는 기간 수정을 받고, 일부 longterm 커널은 더 오래 받는다.
- Ubuntu의 GA 커널처럼 배포판은 한 커널 버전을 골라 그 릴리스의 지원 기간 동안 자체 수정을 얹어 유지한다. 그래서 배포판의 커널 버전 숫자가 mainline 최신보다 낮아도 보안 수정이 빠졌다는 뜻이 아니다. 다만 Ubuntu LTS에도 더 새 커널을 올리는 HWE가 있고, 대부분의 Ubuntu 클라우드 이미지는 기본값이 rolling 커널이다([[Linux-Kernel-CVE-Patching|리눅스 커널 보안 업데이트]]).
- 커널 개발의 첫째 규칙은 회귀를 만들지 않는 것이다. 비슷한 설정으로 빌드한 새 커널에서 예전에 되던 사용 사례가 나빠지거나 안 되면 회귀이며, 이 규칙은 커널이 사용자 공간에 제공하는 인터페이스에 적용되고 드물게 보안 수정 예외가 있다. 그래서 커널 내부가 계속 바뀌어도 프로그램이 쓰는 시스템 호출은 유지되고, 배포판의 사용자 공간이 다른 회사가 만든 커널 위에서도 대체로 돈다. 다만 필요한 기능이 그 커널의 설정에 있어야 한다.

## 같은 Ubuntu를 실행하는 세 가지 방식

| 방식 | 커널 | PID 1 | 빠진 부품 |
|---|---|---|---|
| 가상 머신 | 배포판 자체 커널 | systemd | 없음. 펌웨어부터 전체 시스템 |
| 컨테이너 | Linux의 Docker Engine은 호스트 커널. Docker Desktop은 macOS, Windows, Linux 모두 자체 Linux VM의 커널(WSL 2 backend는 WSL 2 커널) | 이미지가 정한 첫 프로그램(예: bash) | 펌웨어, 부트 로더, 자체 커널, 이미지에 따라 서비스 관리자 |
| WSL 2 | Microsoft가 kernel.org 안정 브랜치로 빌드한 커널. WSL 패키지에 들어 있고 Store 또는 `wsl --update`로 갱신. 경량 유틸리티 VM에서 실행 | `/etc/wsl.conf`에서 systemd를 켜면 systemd(현재 Ubuntu 기본값), 아니면 WSL init | 펌웨어, 부트 로더, 배포판 자체 커널과 initramfs(WSL 서비스가 WSL 커널과 initramfs로 VM을 띄움) |

세 환경에서 `uname -r`(실행 중 커널), `cat /etc/os-release`(배포판), `cat /proc/1/comm`(첫 프로세스)을 비교하면 같은 배포판 이름 아래 커널 제작자와 PID 1이 다르다는 것이 드러난다. 서비스, 디스크와 로그를 다루는 실습은 서비스 관리자와 자체 디스크가 있는 VM이나 systemd를 켠 WSL 2가 맞고([[Docker-Core|Docker 기본]]의 Docker Desktop VM 경계 참조), 명령 연습은 컨테이너로 충분하다.

## 체크포인트

- 커널만 부팅하면 왜 멈추는지, PID 1이 끝나면 무엇이 일어나는지
- 실행 파일이 있는데 not found가 나는 경우(로더 누락)와 라이브러리 누락의 오류 차이
- initramfs가 필요한 이유와 실제 루트로 넘어가는 순서
- 컨테이너와 VM의 차이를 커널과 PID 1 기준으로 설명하기
- 배포판 커널 버전이 mainline보다 낮은 이유와 회귀 금지 규칙의 의미

## 출처

- [Linux Explained: What a Linux System Is Made Of — YouTube, Anton Putra](https://www.youtube.com/watch?v=hCjM4vqf_q8)
- [Linux kernel documentation, Explaining the No working init found boot hang message](https://docs.kernel.org/admin-guide/init.html)
- [Linux kernel documentation, The kernel's command-line parameters](https://docs.kernel.org/admin-guide/kernel-parameters.html)
- [Linux kernel documentation, Ramfs, rootfs and initramfs](https://docs.kernel.org/filesystems/ramfs-rootfs-initramfs.html)
- [Linux kernel documentation, Linux allocated devices](https://docs.kernel.org/admin-guide/devices.html)
- [Linux kernel documentation, How the development process works](https://docs.kernel.org/process/2.Process.html)
- [Linux kernel documentation, Handling regressions](https://docs.kernel.org/process/handling-regressions.html)
- [Linux kernel documentation, Reporting regressions](https://docs.kernel.org/admin-guide/reporting-regressions.html)
- [init/main.c — Linux kernel source](https://github.com/torvalds/linux/blob/master/init/main.c)
- [kernel/exit.c — Linux kernel source](https://github.com/torvalds/linux/blob/master/kernel/exit.c)
- [drivers/base/Kconfig (DEVTMPFS) — Linux kernel source](https://github.com/torvalds/linux/blob/master/drivers/base/Kconfig)
- [Documentation/filesystems/ramfs-rootfs-initramfs.rst v7.0 — Linux kernel source](https://github.com/torvalds/linux/blob/v7.0/Documentation/filesystems/ramfs-rootfs-initramfs.rst)
- [Linux manual, execve(2)](https://man7.org/linux/man-pages/man2/execve.2.html)
- [Linux manual, ld.so(8)](https://man7.org/linux/man-pages/man8/ld.so.8.html)
- [Linux manual, ldd(1)](https://man7.org/linux/man-pages/man1/ldd.1.html)
- [Linux manual, pid_namespaces(7)](https://man7.org/linux/man-pages/man7/pid_namespaces.7.html)
- [systemd, os-release](https://www.freedesktop.org/software/systemd/man/latest/os-release.html)
- [Ubuntu, Ubuntu release cycle](https://ubuntu.com/about/release-cycle)
- [Ubuntu, Ubuntu 26.04 release notes, Summary for LTS users](https://documentation.ubuntu.com/release-notes/26.04/summary-for-lts-users/)
- [Ubuntu, Ubuntu kernel lifecycle and enablement stack](https://ubuntu.com/kernel/lifecycle)
- [Ubuntu Public Cloud, Kernels on the cloud](https://ubuntu.com/cloud/public-cloud/docs/all-clouds-explanation/kernels-on-the-cloud/)
- [Ubuntu Security documentation, Secure Boot](https://documentation.ubuntu.com/security/security-features/platform-protections/secure-boot/)
- [Ubuntu manpages, initramfs-tools(7)](https://manpages.ubuntu.com/manpages/noble/man7/initramfs-tools.7.html)
- [Microsoft Learn, Comparing WSL Versions](https://learn.microsoft.com/en-us/windows/wsl/compare-versions)
- [Microsoft Learn, Use systemd to manage Linux services with WSL](https://learn.microsoft.com/en-us/windows/wsl/systemd)
- [WSL documentation, Boot process](https://wsl.dev/technical-documentation/boot-process/)
- [Docker Docs, Docker Desktop for Linux FAQs](https://docs.docker.com/desktop/troubleshoot-and-support/faqs/linuxfaqs/)
- [Docker Docs, Docker Desktop WSL 2 backend](https://docs.docker.com/desktop/features/wsl/)

## 관련 문서

- [[Linux-File-System|Linux 파일 시스템]]
- [[Container-Linux-Internals|컨테이너의 Linux 기반]]
- [[Container-Entrypoint-Signals|컨테이너 엔트리포인트와 시그널]]
- [[Linux-Kernel-CVE-Patching|리눅스 커널 보안 업데이트]]
- [[Linux-on-Apple-Silicon|Apple Silicon Mac에서 Linux 실행]]
- [[BSD-System-Composition|운영체제 구성과 패키지 출처 정책]]
- [[Docker-Core|Docker 기본]]
