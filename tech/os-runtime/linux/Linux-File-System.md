---
tags: [linux, os, filesystem, fhs, directory-structure]
status: done
category: "OS&런타임(OS&Runtime)"
aliases: ["Linux File System", "Linux 디렉토리 구조", "FHS"]
---

# Linux 파일 시스템 · 디렉토리 구조

Linux는 **최상위 루트(`/`)에서 뻗어나가는 단일 트리**로 구성된다. 파일·장치·프로세스·네트워크 소켓이 모두 "파일"로 추상화되며(*everything is a file*), 경로마다 용도가 표준화되어 있어 어떤 배포판을 쓰더라도 대략적인 구조가 같다. 이 규약을 **FHS(Filesystem Hierarchy Standard)** 라고 한다.

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
| **`/etc`** | Editable Text Config | 시스템·애플리케이션 **설정 파일**(Nginx, SSH, cron, systemd) |
| **`/home`** | 사용자 홈 | `/home/alice`, `/home/bob` 각 사용자별 작업 공간 |
| **`/root`** | root 홈 | root 계정 전용. `/home/root` 아님 |
| **`/var`** | Variable Data | 로그(`/var/log`), 캐시(`/var/cache`), 메일, DB 등 자주 변하는 데이터 |
| **`/tmp`** | 임시 | 재부팅 시 지워짐(또는 tmpfs). 누구나 쓰기 가능 |
| **`/usr`** | User(원래), 공용 프로그램 | `usr/bin`, `/usr/lib`, `/usr/share`. 배포판이 제공하는 프로그램 |
| **`/usr/local`** | 로컬 설치 | 관리자가 수동 설치한 소프트웨어(패키지 매니저와 분리) |
| **`/opt`** | Optional | 제3자 독립 패키지(예: `/opt/oracle`) |
| **`/dev`** | Devices | 장치 파일(`/dev/sda`, `/dev/null`, `/dev/random`) |
| **`/proc`** | Process info | 커널·프로세스 정보 가상 FS(`/proc/cpuinfo`, `/proc/<pid>/status`) |
| **`/sys`** | Kernel objects | 커널 내부 상태·장치 속성(`/sys/class/net/eth0`) |
| **`/mnt`** | Mount(관례) | 임시 수동 마운트 포인트 |
| **`/media`** | 자동 마운트 | USB·CD 등 자동 마운트 |
| **`/lib`, `/lib64`** | Libraries | `/bin`·`/sbin`이 필요한 공유 라이브러리 |
| **`/srv`** | Service data | 시스템이 제공하는 서비스의 데이터(웹·FTP 등) |

## `/etc` · `/var` · `/usr` 세 분리의 의미

이 세 디렉토리를 구분하는 관습이 **배포·관리·백업 전략**의 기반이다.

- **`/etc`** — 설정. 버전 관리 대상. 백업·머신 간 동기화의 1순위
- **`/var`** — 상태·로그·DB. **머신마다 달라지는 데이터**. 용량 관리 필요, 보통 별도 파티션
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

각 파일은 `rwxrwxrwx` 9비트 권한을 가지며 소유자(user)·그룹(group)·기타(others) 3그룹.

- **`r`(4)** read, **`w`(2)** write, **`x`(1)** execute
- 디렉토리에서 `x`는 "들어갈 수 있음", `r`은 "목록 조회", `w`는 "파일 생성·삭제"
- 특수 비트: **setuid**(실행 시 파일 소유자 권한), **setgid**, **sticky**(`/tmp`에서 다른 사용자 파일 삭제 금지)

## 마운트와 파티션

- `/`를 단일 파티션에 두는 단순 구성부터, `/`·`/home`·`/var`·`/boot`를 분리하는 고급 구성까지
- **별도 파티션의 이점**: `/var`가 로그로 가득 차도 `/`가 멎지 않음, `/home`만 암호화, SSD/HDD 혼용
- LVM·ZFS·Btrfs를 얹어 동적 확장·스냅샷 관리

## Everything is a file

- **파이프**: `ls | grep foo` — 익명 파이프
- **소켓**: `/var/run/docker.sock` — Unix 도메인 소켓도 파일 경로
- **가상 FS**: `/proc`·`/sys`는 물리적 저장소가 없는 커널 인터페이스
- **디바이스**: `cat > /dev/null`, `dd if=/dev/zero of=...`

이 추상화 덕에 쉘·스크립트가 리소스 종류에 관계없이 동일 API(`read`/`write`)를 쓴다.

## 백엔드 운영 관점 주요 위치

- **애플리케이션 로그**: `/var/log/<app>/`, systemd 저널(`journalctl`)
- **systemd 서비스 정의**: `/etc/systemd/system/<name>.service`
- **cron 작업**: `/etc/cron.d/`, `/var/spool/cron/`
- **SSL 인증서**: `/etc/ssl/certs/`, Let's Encrypt는 `/etc/letsencrypt/`
- **Nginx 설정**: `/etc/nginx/nginx.conf`, `/etc/nginx/conf.d/*.conf`
- **호스트명·DNS**: `/etc/hostname`, `/etc/resolv.conf`, `/etc/hosts`
- **마운트 영구 설정**: `/etc/fstab`
- **사용자·그룹**: `/etc/passwd`, `/etc/shadow`, `/etc/group`

## 흔한 실수

- **`/etc`를 Git에 통째로 커밋** → 시크릿(`/etc/shadow`, API 키) 유출. 필요한 설정만 선별
- **`/var` 모니터링 누락** → 로그가 쌓여 파티션 가득 → 서비스 중단. `logrotate` 설정 필수
- **`/tmp`에 영구 데이터 저장** → 재부팅 시 소실
- **패키지 매니저와 `/usr/local` 혼용** → 버전 충돌. 수동 설치는 `/opt` 또는 컨테이너화
- **`sudo rm -rf /` 또는 `/.`** → 시스템 파괴. 기본 쉘의 방어(`--preserve-root`)에 의존하지 말고 명령 앞에 `echo` 붙여 확인

## 면접 체크포인트

- `/etc`·`/var`·`/usr` 분리가 의미하는 관리 전략
- `/proc`·`/sys`가 "가상 파일 시스템"인 이유
- "Everything is a file"이 실무 API 설계에 주는 영향
- 권한 `rwx`가 디렉토리에서는 다르게 해석되는 지점
- 백엔드 장애 시 가장 먼저 살펴볼 경로 3곳(`/var/log`, `/etc/<app>/`, `/proc/<pid>`)

## 출처
- [Tecoble — Linux 파일 디렉토리 시스템](https://tecoble.techcourse.co.kr/post/2021-10-18-linux-file-directory-system/)

## 관련 문서
- [[Storage-and-FileSystem|기억장치와 파일시스템]]
- [[Process-Lifecycle|Process lifecycle]]
- [[Context-Switching|Context switching · CPU 스케줄링]]
