---
tags: [linux, os, filesystem, fhs, directory-structure]
status: done
verified_at: 2026-09-30
category: "OS&런타임(OS&Runtime)"
aliases: ["Linux File System", "Linux 디렉토리 구조", "FHS"]
---

# Linux 파일 시스템, 디렉토리 구조

Linux는 **최상위 루트(`/`)에서 뻗어나가는 단일 트리**로 구성된다. 파일, 장치, 프로세스, 네트워크 소켓이 모두 "파일"로 추상화되며(*everything is a file*), 경로마다 용도가 표준화되어 있어 어떤 배포판을 쓰더라도 대략적인 구조가 같다. 이 규약을 **FHS(Filesystem Hierarchy Standard)** 라고 한다.

## 핵심 명제

- **하나의 루트 `/` 아래 모두 존재** — 드라이브 문자(C:, D:)가 없고, 다른 저장장치는 `mount`로 트리에 붙인다
- **용도별 디렉토리 분리** — 실행 파일, 설정, 로그, 사용자 데이터가 각각 정해진 위치에 있다
- **모든 것이 파일** — 디스크 파티션(`/dev/sda`), 터미널(`/dev/tty`), 프로세스 정보(`/proc/<pid>`)도 파일로 접근
- **권한과 소유자** — `root`(UID 0)와 일반 사용자를 분리, 파일별 rwx 권한

## 주요 디렉토리

| 경로 | 의미 | 담는 것 |
|---|---|---|
| **`/`** | 루트 | 모든 디렉토리의 조상 |
| **`/bin`** | Binaries | 기본 실행 파일(`ls`, `cp`, `mv`). 단일 사용자 모드에서도 필요 |
| **`/sbin`** | System Binaries | 관리자 명령(`fsck`, `reboot`, `ifconfig`) |
| **`/boot`** | 부트로더 | 커널 이미지(`vmlinuz`), initramfs, GRUB 설정 |
| **`/etc`** | Editable Text Config | 시스템, 애플리케이션 **설정 파일**(Nginx, SSH, cron, systemd) |
| **`/home`** | 사용자 홈 | `/home/alice`, `/home/bob` 각 사용자별 작업 공간 |
| **`/root`** | root 홈 | root 계정 전용. `/home/root` 아님 |
| **`/var`** | Variable Data | 로그(`/var/log`), 캐시(`/var/cache`), 메일, DB 등 자주 변하는 데이터 |
| **`/tmp`** | 임시 | 재부팅 시 지워짐(또는 tmpfs). 누구나 쓰기 가능 |
| **`/usr`** | User(원래), 공용 프로그램 | `usr/bin`, `/usr/lib`, `/usr/share`. 배포판이 제공하는 프로그램 |
| **`/usr/local`** | 로컬 설치 | 관리자가 수동 설치한 소프트웨어(패키지 매니저와 분리) |
| **`/opt`** | Optional | 제3자 독립 패키지(예: `/opt/oracle`) |
| **`/dev`** | Devices | 장치 파일(`/dev/sda`, `/dev/null`, `/dev/random`) |
| **`/proc`** | Process info | 커널, 프로세스 정보 가상 FS(`/proc/cpuinfo`, `/proc/<pid>/status`) |
| **`/sys`** | Kernel objects | 커널 내부 상태, 장치 속성(`/sys/class/net/eth0`) |
| **`/mnt`** | Mount(관례) | 임시 수동 마운트 포인트 |
| **`/media`** | 자동 마운트 | USB, CD 등 자동 마운트 |
| **`/lib`, `/lib64`** | Libraries | `/bin`, `/sbin`이 필요한 공유 라이브러리 |
| **`/srv`** | Service data | 시스템이 제공하는 서비스의 데이터(웹, FTP 등) |

## `/etc`, `/var`, `/usr` 세 분리의 의미

이 세 디렉토리를 구분하는 관습이 **배포, 관리, 백업 전략**의 기반이다.

- **`/etc`** — 설정. 버전 관리 대상. 백업, 머신 간 동기화의 1순위
- **`/var`** — 상태, 로그, DB. **머신마다 달라지는 데이터**. 용량 관리 필요, 보통 별도 파티션
- **`/usr`** — 패키지 매니저가 설치한 바이너리. 복원은 패키지 재설치로 가능 → 백업 우선순위 낮음

## 파일 vs 디렉토리 vs 특수 파일

`ls -l`의 첫 글자가 타입.

| 기호 | 타입 |
|---|---|
| `-` | 일반 파일 |
| `d` | 디렉토리 |
| `l` | 심볼릭 링크 |
| `c` | 캐릭터 디바이스(터미널 등) |
| `b` | 블록 디바이스(디스크) |
| `s` | Unix 소켓 |
| `p` | 명명 파이프(FIFO) |

## 권한 모델

각 파일은 `rwxrwxrwx` 9비트 권한을 가지며 소유자(user), 그룹(group), 기타(others) 3그룹.

- **`r`(4)** read, **`w`(2)** write, **`x`(1)** execute
- 디렉토리에서 `x`는 "들어갈 수 있음", `r`은 "목록 조회", `w`는 "파일 생성, 삭제"
- 특수 비트: **setuid**(실행 시 파일 소유자 권한), **setgid**, **sticky**(`/tmp`에서 다른 사용자 파일 삭제 금지)

## 실행 여부와 파일 형식은 확장자가 정하지 않는다

Windows는 파일 이름의 대소문자를 구분하지 않고 `.exe` 같은 확장자로 실행 파일과 연결 프로그램을 정한다. Linux의 확장자는 사람과 애플리케이션을 위한 관례일 뿐이다.

- **이름 규칙**: 일반적인 Linux 파일 시스템은 이름의 대소문자를 구분해 `a.dat`와 `A.dat`가 다른 파일이다(ext4는 casefold를 켠 디렉터리에서만 대소문자를 무시한다). 대소문자를 무시하는 개발 PC에서 되던 경로가 Linux 컨테이너에서 파일을 못 찾는 원인이 된다. 이름이 `.`으로 시작하면 `ls`가 기본으로 보여 주지 않는 숨김 파일이다. 숨김은 별도 속성이 아니라 이름 관례다.
- **실행 가능 여부**: 실행 권한 비트(`x`)와 파일 내용으로 정한다. `execve(2)`는 실행 권한이 없으면 `EACCES`로 실패한다.
- **형식 판별**: 커널은 파일 앞부분으로 형식을 본다. ELF 바이너리는 `0x7F 'E' 'L' 'F'` 4바이트로 시작하고, script는 첫 줄의 `#!interpreter [optional-arg]`(shebang)로 interpreter를 지정한다. 그 밖의 형식은 binfmt_misc에 magic 바이트나 확장자 규칙으로 interpreter를 등록해야 실행된다. `file` 명령도 확장자가 아니라 이런 파일 시그니처로 형식을 추정한다. 코드 품질에서 말하는 매직 넘버(의미 없는 하드코딩 숫자, [[Avoid-Hard-Coding]])와는 다른 뜻이다.

컨테이너 entrypoint가 실행되지 않을 때 오류 메시지를 이 규칙으로 가른다.

| 증상 | 원인 | 확인 |
|---|---|---|
| `permission denied` | 실행 비트가 없거나 대상이 regular file이 아님 | `ls -l`, image build의 `chmod +x` |
| `exec format error` | 다른 CPU architecture용 ELF, 또는 `#!` 없는 script를 exec form으로 직접 실행 | `file`, image platform, 첫 줄 shebang |
| 파일이 있는데 `no such file or directory` | shebang의 interpreter나 ELF의 동적 링커가 없음. Windows에서 편집한 CRLF가 shebang 줄에 붙으면 `/bin/sh\r`을 찾는다 | shebang 경로, 줄 끝 문자, base image의 libc |

exec form과 PID 1 동작은 [[Container-Entrypoint-Signals]], 계층별 장애 분해는 [[Container-Linux-Internals#장애를 계층으로 분해한다|컨테이너 장애 분해]]를 본다. 다른 architecture image를 QEMU로 돌리는 에뮬레이션도 binfmt_misc 등록을 이용하며, 컴파일이나 압축처럼 CPU를 많이 쓰는 작업은 네이티브보다 크게 느릴 수 있다.

## 마운트와 파티션

- `/`를 단일 파티션에 두는 단순 구성부터, `/`, `/home`, `/var`, `/boot`를 분리하는 고급 구성까지
- **별도 파티션의 이점**: `/var`가 로그로 가득 차도 `/`가 멎지 않음, `/home`만 암호화, SSD/HDD 혼용
- LVM, ZFS, Btrfs를 얹어 동적 확장, 스냅샷 관리

## Everything is a file

- **파이프**: `ls | grep foo` — 익명 파이프
- **소켓**: `/var/run/docker.sock` — Unix 도메인 소켓도 파일 경로
- **가상 FS**: `/proc`, `/sys`는 물리적 저장소가 없는 커널 인터페이스
- **디바이스**: `cat > /dev/null`, `dd if=/dev/zero of=...`

이 추상화 덕에 쉘, 스크립트가 리소스 종류에 관계없이 동일 API(`read`/`write`)를 쓴다.

## 백엔드 운영 관점 주요 위치

- **애플리케이션 로그**: `/var/log/<app>/`, systemd 저널(`journalctl`)
- **systemd 서비스 정의**: `/etc/systemd/system/<name>.service`
- **cron 작업**: `/etc/cron.d/`, `/var/spool/cron/`
- **SSL 인증서**: `/etc/ssl/certs/`, Let's Encrypt는 `/etc/letsencrypt/`
- **Nginx 설정**: `/etc/nginx/nginx.conf`, `/etc/nginx/conf.d/*.conf`
- **호스트명, DNS**: `/etc/hostname`, `/etc/resolv.conf`, `/etc/hosts`
- **마운트 영구 설정**: `/etc/fstab`
- **사용자, 그룹**: `/etc/passwd`, `/etc/shadow`, `/etc/group`

## 운영 진단 명령: 로그, 디스크, 마운트

GUI가 없는 서버와 컨테이너에서는 CLI로 원인을 좁힌다. 옵션을 모두 외우기보다 목적별 명령을 알고 세부는 `man`으로 확인한다.

| 목적 | 명령 예 | 읽는 법 |
|---|---|---|
| systemd 서비스 로그 | `journalctl -u app.service --since "1 hour ago" -p err` | unit, 시간, 우선순위로 좁힌다. `-p err`는 err와 더 심각한 수준을 보여 주고, `-f`는 새 로그를 계속 따라간다 |
| 파일 로그의 오류 줄 | `grep -n -C 5 'ERROR' app.log`, `tail -f app.log` | 오류 줄을 찾은 뒤 앞뒤 맥락을 함께 봐야 근본 원인에 닿는다 |
| 파일 시스템 여유 | `df -h` | 파일 시스템 단위의 전체와 남은 공간 |
| 디렉터리 사용량 | `du -sh /var/log/*` | 경로를 따라가며 파일이 실제로 쓰는 양 |
| 디스크와 파티션 구조 | `lsblk` | 블록 장치, 파티션과 마운트 위치 |
| 마운트 확인 | `findmnt /var` | 경로가 어느 장치와 파일 시스템에 붙었는지 |
| 지웠지만 열린 파일 | `lsof +L1` | link count가 0인데 아직 열려 있는 파일 |

- `df`와 `du` 값이 크게 다르면 지웠지만 열려 있는 파일을 먼저 의심한다. 마지막 링크를 지워도 파일을 연 프로세스가 있으면 마지막 file descriptor가 닫힐 때까지 파일이 남아 공간이 반환되지 않는다. 로그를 `rm`으로 지웠는데 프로세스가 계속 쓰는 경우가 대표적이라, 로그 파일을 다시 열게 하거나 프로세스를 재시작한다.
- 마운트 지점 아래에 원래 있던 파일은 마운트된 동안 보이지 않는다. `du`로는 잡히지 않지만 아래 파일 시스템의 공간은 계속 차지한다.
- `rm`은 휴지통을 거치지 않는다. 복구는 백업과 스냅샷에 기대야 하므로 삭제 대상을 먼저 확인한다.
- 로그가 쌓이는 경로의 용량 관리는 아래 `/var` 모니터링과 logrotate, 컨테이너에서는 [[Container-Memory-Metrics]]의 파일 로그 page cache 문제와 함께 본다.

## 파일 작업: 생성, 덮어쓰기와 삭제를 구분한다

아래는 GNU coreutils 매뉴얼을 2026-10-06 대조한 범위다. 연습은 원본과 분리한 복사본에서 하고, 실행 전에 현재 위치와 원본, 목적지를 함께 확인한다.

| 명령 | 대상 상태에 따른 의미 | 확인할 것 |
|---|---|---|
| `touch notes.txt` | 파일이 없으면 빈 파일을 만들고, 있으면 접근 시각과 수정 시각을 갱신한다 | 기존 내용을 비우는 명령이 아니다 |
| `cp source.txt copy.txt` | 원본을 남기고 복사하지만 기존 목적지 파일을 덮어쓸 수 있다 | 원본뿐 아니라 목적지 존재 여부도 확인한다. `-i`는 덮어쓰기 전에 묻는다 |
| `cp a.txt b.txt backup/` | 여러 원본을 목적지 디렉터리에 복사한다 | 마지막 인자는 목적지 디렉터리여야 한다 |
| `rm -i copy.txt` | 해당 파일을 지우기 전에 확인을 묻는다 | 거부는 그 삭제를 건너뛰는 것이며, 이미 끝난 삭제를 되돌리는 기능은 아니다 |
| `rm -r copies/` | 디렉터리와 그 안의 항목을 재귀적으로 제거한다 | `-r` 자체는 확인 질문을 켜지 않는다 |

목적지 목록을 확인한 것만으로 복사 내용까지 검증한 것은 아니다. 중요한 원본을 정리하기 전에는 복사본의 내용과 복구 가능성도 따로 확인한다.

## 흔한 실수

- **`/etc`를 Git에 통째로 커밋** → 시크릿(`/etc/shadow`, API 키) 유출. 필요한 설정만 선별
- **`/var` 모니터링 누락** → 로그가 쌓여 파티션 가득 → 서비스 중단. `logrotate` 설정 필수
- **`/tmp`에 영구 데이터 저장** → 재부팅 시 소실
- **패키지 매니저와 `/usr/local` 혼용** → 버전 충돌. 수동 설치는 `/opt` 또는 컨테이너화
- **`sudo rm -rf /` 또는 `/.`** → 시스템 파괴. GNU coreutils `rm`은 기본적으로 `--preserve-root`를 적용하지만 이는 쉘 기능이 아니고 다른 `rm` 구현에서는 보장되지 않는다. 이 방어에 의존하지 말고 명령 앞에 `echo`를 붙여 확인

## 면접 체크포인트

- `/etc`, `/var`, `/usr` 분리가 의미하는 관리 전략
- `/proc`, `/sys`가 "가상 파일 시스템"인 이유
- "Everything is a file"이 실무 API 설계에 주는 영향
- 권한 `rwx`가 디렉토리에서는 다르게 해석되는 지점
- 백엔드 장애 시 가장 먼저 살펴볼 경로 3곳(`/var/log`, `/etc/<app>/`, `/proc/<pid>`)
- 확장자가 아니라 실행 비트와 파일 시그니처(ELF, shebang)로 실행 여부가 정해지는 방식과 `exec format error`의 원인
- `df`와 `du` 값이 다를 때 먼저 의심할 원인(지웠지만 열린 파일, 마운트에 가려진 데이터)

## 출처
- [GNU coreutils, cp(1)](https://man7.org/linux/man-pages/man1/cp.1.html), [touch(1)](https://man7.org/linux/man-pages/man1/touch.1.html), [rm(1)](https://man7.org/linux/man-pages/man1/rm.1.html) (파일 작업의 대상 상태와 확인 옵션, 2026-10-06 부분 검증)
- [Tecoble — Linux 파일 디렉토리 시스템](https://tecoble.techcourse.co.kr/post/2021-10-18-linux-file-directory-system/)
- [GNU coreutils, `rm` source](https://git.savannah.gnu.org/cgit/coreutils.git/plain/src/rm.c)
- [Linux man-pages, execve(2)](https://man7.org/linux/man-pages/man2/execve.2.html) (shebang, `EACCES`, `ENOEXEC`, `ENOENT`)
- [Linux man-pages, elf(5)](https://man7.org/linux/man-pages/man5/elf.5.html) (ELF magic)
- [Linux Kernel Docs, binfmt_misc](https://docs.kernel.org/admin-guide/binfmt-misc.html)
- [Linux Kernel Docs, ext4 Directory Entries](https://docs.kernel.org/filesystems/ext4/directory.html) (casefold 디렉터리)
- [Docker Docs, Multi-platform builds](https://docs.docker.com/build/building/multi-platform/) (QEMU와 binfmt_misc)
- [systemd, journalctl(1)](https://man7.org/linux/man-pages/man1/journalctl.1.html), [systemd.time(7)](https://man7.org/linux/man-pages/man7/systemd.time.7.html)
- [Linux man-pages, unlink(2)](https://man7.org/linux/man-pages/man2/unlink.2.html) (열린 파일은 마지막 descriptor가 닫힐 때까지 유지)
- [lsof(8)](https://man7.org/linux/man-pages/man8/lsof.8.html) (`+L1`)
- [util-linux, mount(8)](https://man7.org/linux/man-pages/man8/mount.8.html), [lsblk(8)](https://man7.org/linux/man-pages/man8/lsblk.8.html), [findmnt(8)](https://man7.org/linux/man-pages/man8/findmnt.8.html)
- [GNU coreutils, df(1)](https://man7.org/linux/man-pages/man1/df.1.html), [du(1)](https://man7.org/linux/man-pages/man1/du.1.html)
- [인프런, 널널한 개발자, 정보단위와 디렉토리](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476543)
- [인프런, 널널한 개발자, Windows, Linux OS별 주요 디렉토리 비교](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476547)
- [인프런, 널널한 개발자, Linux 파일관리 명령 소개](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476549)

## 관련 문서
- [[Storage-and-FileSystem|기억장치와 파일시스템]]
- [[Process-Lifecycle|Process lifecycle]]
- [[Context-Switching|Context switching, CPU 스케줄링]]
