---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
verified_at: 2026-10-01
aliases: ["libuv 파일시스템", "libuv 파일 감시"]
---

# libuv 파일시스템 작업과 감시

파일 작업은 `uv_fs_t` request와 별도 파일 FD를 사용한다. TCP stream의 read/write callback 계약과 혼동하지 않는다. 요청 정리는 FD close와 다른 작업이다.

## 동기, 비동기와 실행 backend

`uv_fs_*`는 callback NULL이면 동기로 실행하고 호출 스레드를 막는다. callback을 주면 비동기로 제출하며 완료 결과는 `req->result`로 받는다. 제출 즉시 음수 오류이면 callback은 오지 않는다. 동기 호출 반환값과 비동기 제출 성공의 0을 작업의 최종 결과와 구분한다.

기본 비동기 경로는 전역 thread pool이다. Linux에서 1.45.0부터 일부 작업에 io_uring을 사용했다가 1.49.0부터 기본값을 다시 pool로 바꿨다. 현재는 loop에 `UV_LOOP_USE_IO_URING_SQPOLL`을 명시적으로 설정해야 이 경로를 사용한다. 커널 기능이 없거나 부적합하면 pool로 fallback할 수 있다.

현재 온라인 API의 지원 여부는 사용하는 libuv/Node.js 배포와 다를 수 있다. backend를 바꿔도 파일/버퍼 수명과 callback의 결과 계약을 지켜야 한다.

## 요청 결과와 정리

| 작업 | 성공 결과 |
|---|---|
| open/mkstemp | `req->result`의 FD, mkstemp 경로는 `req->path` |
| read/write/sendfile | 실제 처리 바이트 수 |
| stat/fstat/lstat | `req->statbuf` |
| readlink/realpath | `req->ptr`의 문자열 |
| statfs | `req->ptr`의 `uv_statfs_t` |
| opendir | `req->ptr`의 별도 수명인 `uv_dir_t` |

완료 후 결과를 소비하거나 필요한 값을 복사한 다음 `uv_fs_req_cleanup()`을 호출한다. 동기 요청도 정리가 필요하다. cleanup은 libuv의 내부 할당을 해제하며 request 구조체, read/write 본문, 열린 FD를 대신 해제하지 않는다.

`uv_fs_get_system_error()`는 OS 고유 오류를 반환한다. 일반 제어 흐름은 이 값보다 portable한 `req->result`의 libuv 오류를 사용한다. `uv_stat_t`의 시각형 `uv_timespec_t`는 현재 v1.x에서 Y2038 안전하지 않은 형이며 v2의 변경 예정과 구분한다.

## 파일 I/O

`uv_fs_open(loop, req, path, flags, mode, cb)`으로 열고 `uv_fs_close()`로 FD를 닫는다. Windows 경로는 UTF-8이며 CreateFileW를 사용하고 파일은 binary mode로 열린다. O_BINARY/O_TEXT를 별도로 지정하는 방식은 지원하지 않는다.

`uv_fs_read/write()`는 buffer 배열과 offset을 받는다. offset -1은 현재 파일 위치를 사용하고 갱신한다. 명시적 offset은 작업 위치를 지정한다. 동시에 shared offset을 쓰는 작업은 순서를 따로 관리한다.

read의 `req->result == 0`은 파일 EOF다. stream의 `UV_EOF`와 다르다. 양수 read/write 결과는 처리한 바이트 수이므로 요청한 전체 길이가 처리됐는지 확인하고 남은 부분을 처리한다. request와 read/write 본문을 완료 전 재사용하지 않는다.

write 성공은 디스크에 영구 기록됐다는 뜻이 아니다. `uv_fs_fsync/fdatasync()`와 원자적 갱신 전략은 별도로 고려한다. [[File-System]]의 저장 내구성과 파일 교체 설명을 함께 본다.

### open flag를 목적별로 선택하기

| 목적 | flag와 주의점 |
|---|---|
| 읽기/쓰기 | `UV_FS_O_RDONLY/WRONLY/RDWR` |
| 생성 | `CREAT`, 기존 경로 배제는 `CREAT|EXCL` |
| 내용 제거 | `TRUNC`는 성공적으로 쓰기 모드 open한 기존 regular file 길이를 0으로 만듦 |
| append | 매 write 전 offset을 파일 끝으로 이동 |
| 디스크 동기화 | `DSYNC`는 data와 최소 metadata, `SYNC`는 data와 전체 metadata |
| 직접 I/O | `DIRECT`는 주소/크기의 sector 정렬 요구, macOS 미지원 |
| 경로 제한 | `DIRECTORY`, `NOFOLLOW`는 Windows 미지원 |
| 잠금 | `EXLOCK`은 macOS/Windows만 지원 |
| 힌트와 임시 파일 | `RANDOM/SEQUENTIAL/SHORT_LIVED/TEMPORARY`는 Windows 전용 |

`NOATIME/NOCTTY/NONBLOCK`도 Windows에서 지원하지 않는다. 일반 파일의 NONBLOCK flag만으로 비동기 disk I/O가 되는 것은 아니다. `SYMLINK`는 링크 자체를 연다. EXCL을 CREAT 없이 쓰는 동작은 일반적으로 정의되지 않는다.

Windows `FILEMAP`은 같은 파일의 동시 중복 open을 제한한다. 비 MSVC 빌드에서 memory-mapped read/write가 실패하면 fatal crash가 날 수 있다는 공식 경고가 있으므로 일반적인 성능 flag로 선택하지 않는다.

## 디렉토리 열거와 소유권

`uv_fs_scandir()` 완료 뒤 `uv_fs_scandir_next()`로 항목을 꺼내고 `UV_EOF`에서 끝낸다. `.`과 `..`은 제외된다. 디렉토리 entry type은 파일시스템에 따라 UNKNOWN일 수 있어 type을 무조건 신뢰하지 않는다.

큰 디렉토리의 stream 방식은 `opendir → readdir 반복 → closedir`다.

1. opendir 성공의 `req->ptr`를 `uv_dir_t*`로 저장한다. cleanup은 이 디렉토리를 free하지 않지만 req->ptr를 NULL로 만든다.
2. dir의 `dirents`에 사용자 배열을, `nentries`에 배열 용량을 지정한다.
3. readdir의 result >= 0은 이번에 읽은 항목 수다. 0이면 종료다. 동일 directory의 readdir는 스레드 안전하지 않다.
4. 받은 항목을 사용한 뒤 request cleanup을 수행한다. readdir cleanup은 closedir보다 먼저 한다.
5. closedir가 dir 메모리를 해제한다. closedir가 취소되면 여전히 열린 상태이므로 취소 request cleanup 뒤 다시 closedir한다.

directory stream `readdir`는 1.28.0+다. 0.10 이행 문서에서 `readdir`가 scandir로 개명됐다는 내용은 옛 API 설명이며 현재 stream API를 삭제하라는 뜻이 아니다.

## 복사, 링크와 metadata

`copyfile` 기본값은 destination 덮어쓰기다. `UV_FS_COPYFILE_EXCL`은 destination 존재 시 `UV_EEXIST`, `FICLONE`은 copy-on-write reflink를 시도하고 실패하면 copy fallback, `FICLONE_FORCE`는 fallback하지 않고 오류를 반환한다.

복사 중 실패하면 생성한 destination을 지우지만 close와 삭제 사이 다른 프로세스가 접근할 짧은 구간이 있다. atomic publish나 접근 격리가 필요하면 별도 파일 교체 설계를 적용한다. `sendfile`은 플랫폼 공통의 제한된 sendfile 기능이다.

`stat`은 경로 대상, `lstat`은 링크 자체, `fstat`은 열린 FD를 조회한다. `statfs`의 OS 미지원 필드는 0이다. access 검사 성공 뒤 open도 성공한다고 보장할 수 없으므로 실제 open 오류를 처리한다.

mkdir/rmdir, unlink/rename, truncate, hardlink/symlink, chmod/chown, utime 계열은 각각 POSIX 동작에 대응하지만 지원 범위는 다르다. Windows mkdir mode와 chown 계열은 지원하지 않는다. Windows symlink는 DIR/JUNCTION flag를 구분한다. timestamp의 NOW/OMIT는 현재 시각/기존 유지이며 lutime는 링크 자체를 대상으로 한다.

`readlink/realpath` 결과는 cleanup 전 사용한다. macOS/BSD의 realpath는 32개 초과 symlink에서 `UV_ELOOP`가 가능하다. Windows에서는 Volume Manager를 우회한 ramdisk, drive casing, subst drive에 caveat가 있다. resolved path를 모든 플랫폼에서 동일하게 해석하지 않는다.

`uv_get_osfhandle(fd)` 결과는 C runtime이 소유하므로 별도로 close하면 안 된다. 반대로 `uv_open_osfhandle(os_fd)`는 OS handle을 소비하므로 이후 반환 FD 기준으로 수명을 관리한다.

## 파일 변경 감시의 한계

`uv_fs_event_t`는 OS 이벤트, `uv_fs_poll_t`는 주기적 stat 비교를 사용한다. 감시 이벤트는 완전한 변경 이력이나 파일 내용의 안정된 snapshot이 아니다. notification 뒤 현재 상태를 다시 읽어야 한다.

fs event callback의 events는 `UV_RENAME|UV_CHANGE` bitmask다. directory 감시의 filename은 상대 경로이며 NULL일 수 있다. event status 음수를 확인한다. macOS에서는 watcher start 직전 OS가 수집한 이벤트도 전달될 수 있다.

현재 공식 API에서 `UV_FS_EVENT_RECURSIVE`는 macOS/Windows만 지원한다. WATCH_ENTRY와 STAT flag는 어느 backend에도 구현되지 않았다. NFS 등의 감시 문제에서 STAT flag만 주면 자동 polling fallback된다고 가정하지 않는다.

AIX는 ahafs 추가 패키지와 process 단위 제약이 있고 directory 감시만으로 파일 write 이벤트를 못 받을 수 있다. z/OS는 directory 내 생성/삭제 notification을 제공하지 않는다. OS별 제약에 맞춰 fs_poll 또는 상위 재스캔 전략을 택한다.

fs_poll은 interval 밀리초로 stat을 검사하고 변경 시 prev/curr를 전달한다. 두 stat 포인터는 callback 동안만 유효하다. path 부재/권한 문제는 음수 status로 알리지만 watcher를 중지하지 않고, 오류 이유나 상태가 바뀔 때 다시 호출한다. 이동성 확보를 위해 여러 초 간격이 권장되며 subsecond로 모든 변경을 탐지할 수 없다.

event/poll의 `getpath`는 사용자 buffer와 in/out size를 받는다. 현재 성공 결과는 NUL 종료 문자열이고 size는 본문 길이, `UV_ENOBUFS`의 size는 NUL을 포함한 필요 용량이다.

## 출처

- [File system API](https://docs.libuv.org/en/v1.x/fs.html), [Loop options](https://docs.libuv.org/en/v1.x/loop.html)
- [FS event](https://docs.libuv.org/en/v1.x/fs_event.html), [FS poll](https://docs.libuv.org/en/v1.x/fs_poll.html)
- [Filesystem guide](https://docs.libuv.org/en/v1.x/guide/filesystem.html)

## 관련 문서

- [[libuv]], [[libuv-Handles]], [[libuv-Threading]], [[File-System]]
