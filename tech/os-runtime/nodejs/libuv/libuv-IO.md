---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
aliases: ["libuv IO", "libuv 네트워킹", "libuv 파일시스템", "libuv 프로세스"]
---

### libuv 네트워킹·파일시스템·프로세스
libuv가 제공하는 고수준 I/O API: TCP/UDP/DNS 네트워킹, 파일시스템 작업, 자식 프로세스 생성과 IPC를 다룬다.

## 네트워킹

### TCP (`uv_tcp_t`)

#### 서버 흐름
```
1. uv_tcp_init()       — TCP 핸들 초기화
2. uv_tcp_bind()       — 주소:포트에 바인딩
3. uv_listen()         — 연결 대기 시작, connection 콜백 설정
4. uv_accept()         — 콜백 내에서 연결 수락
5. uv_read_start()     — 클라이언트 데이터 읽기
6. uv_write()          — 응답 전송
```

#### 클라이언트 흐름
```
1. uv_tcp_init()       — TCP 핸들 초기화
2. uv_tcp_connect()    — 서버에 연결, connect 콜백 설정
3. connect 콜백에서 uv_read_start() / uv_write()로 통신
```

#### 주요 옵션
| 함수 | 설명 |
|------|------|
| `uv_tcp_nodelay()` | TCP_NODELAY (Nagle 알고리즘 비활성화) |
| `uv_tcp_keepalive()` | TCP 킵얼라이브 활성화 |
| `uv_tcp_simultaneous_accepts()` | 동시 accept 요청 수 제어 |
| `uv_tcp_close_reset()` | RST 패킷으로 연결 강제 종료 |

#### IP 주소 유틸리티
```
uv_ip4_addr(ip_string, port, &addr)  — "127.0.0.1" → struct sockaddr_in
uv_ip4_name(&addr, ip_string, size)  — struct sockaddr_in → "127.0.0.1"
IPv6는 uv_ip6_addr / uv_ip6_name 사용.
```

### UDP (`uv_udp_t`)
비연결형 비신뢰성 통신. `uv_udp_t`(수신)와 `uv_udp_send_t`(송신) 사용. 포트 0 지정 시 OS가 자동 할당. 브로드캐스트는 `uv_udp_set_broadcast()` 필수(미설정 시 EACCES), 멀티캐스트는 `uv_udp_set_membership()`으로 그룹 가입/탈퇴. 읽기 콜백에서 nread=0이면 읽을 데이터 없음, `UV_UDP_PARTIAL`은 버퍼 부족.

| 함수 | 설명 |
|------|------|
| `uv_udp_init()` / `uv_udp_bind()` | UDP 핸들 초기화 및 바인딩 |
| `uv_udp_send()` / `uv_udp_recv_start()` | 데이터 전송 및 수신 시작 |
| `uv_udp_set_membership()` | 멀티캐스트 그룹 설정 |
| `uv_udp_set_broadcast()` / `uv_udp_set_ttl()` | 브로드캐스트 허용 / TTL 설정 |

### DNS
```
uv_getaddrinfo()  — 비동기 DNS 조회 (호스트명 → IP 주소)
uv_getnameinfo()  — 비동기 역 DNS 조회 (IP → 호스트명)
uv_freeaddrinfo() — 결과 메모리 해제 (필수)

콜백을 NULL로 전달하면 동기 모드로 동작한다 (v1.3.0+). DNS 조회는 스레드 풀에서 실행된다.
```

## 파일시스템 (`uv_fs_t`)

### 핵심 개념
```
libuv의 파일시스템 작업은 스레드 풀에서 블로킹으로 실행된다.
이유: 플랫폼 공통의 논블로킹 파일 I/O API가 존재하지 않기 때문.

모든 함수는 두 가지 형태로 동작한다:
- 비동기: 콜백 전달 시 스레드 풀에서 실행, 완료 후 콜백 호출
- 동기: 콜백을 NULL로 전달하면 즉시 블로킹 실행 후 반환
```

### 주요 함수

| 분류 | 함수 | 설명 |
|------|------|------|
| 파일 I/O | `uv_fs_open()` / `uv_fs_close()` | 파일 열기/닫기 |
| | `uv_fs_read()` / `uv_fs_write()` | 파일 읽기/쓰기 |
| | `uv_fs_unlink()` / `uv_fs_rename()` / `uv_fs_copyfile()` | 삭제/이름변경/복사 |
| 디렉토리 | `uv_fs_mkdir()` / `uv_fs_rmdir()` / `uv_fs_scandir()` | 생성/삭제/스캔 |
| | `uv_fs_opendir()` / `uv_fs_readdir()` | 디렉토리 스트림 |
| 정보/권한 | `uv_fs_stat()` / `uv_fs_fstat()` | 파일 정보 조회 |
| | `uv_fs_chmod()` / `uv_fs_chown()` / `uv_fs_access()` | 권한·소유자 변경 / 접근 확인 |
| 링크 | `uv_fs_symlink()` / `uv_fs_readlink()` / `uv_fs_realpath()` | 심볼릭 링크 |
| 동기화 | `uv_fs_fsync()` | 디스크 동기화 (flush) |

### 파일 열기 플래그 및 필수 정리
```
UV_FS_O_RDONLY/WRONLY/RDWR  — 읽기/쓰기 모드
UV_FS_O_CREAT               — 파일 생성
UV_FS_O_TRUNC               — 기존 내용 삭제
UV_FS_O_APPEND              — 파일 끝에 추가

모든 파일시스템 요청 후 uv_fs_req_cleanup()을 호출하여 libuv가 내부적으로 할당한 메모리를 해제해야 한다.
```

### 파일 변경 감시

| 방식 | Handle | 특징 |
|------|--------|------|
| OS 이벤트 | `uv_fs_event_t` | inotify/kqueue/ReadDirectoryChangesW 사용. 빠르지만 플랫폼별 차이 |
| stat 폴링 | `uv_fs_poll_t` | 주기적 stat() 호출. 느리지만 호환성 높음 |

`uv_fs_event` 콜백은 `UV_RENAME` 또는 `UV_CHANGE` 이벤트를 전달한다. `UV_FS_EVENT_RECURSIVE` 플래그로 하위 디렉토리까지 감시 가능 (macOS/Windows만).

## 프로세스 (`uv_process_t`)

### 자식 프로세스 생성 (`uv_spawn`)
```
uv_process_options_t 구조체로 실행 환경을 제어한다:
- file:  실행할 프로그램 (PATH에서 자동 검색, execvp 사용)
- args:  인자 배열 (마지막 요소는 NULL)
- env:   환경 변수 배열 (NULL이면 부모 환경 상속)
- cwd:   작업 디렉토리
- flags: 동작 제어 플래그

프로세스 종료 시 exit 콜백이 호출되며, 콜백 이전에 uv_close()를 호출하면 안 된다.
Unix에서 uv_close() 없이 방치하면 좀비 프로세스가 발생한다.
```

### 프로세스 플래그

| 플래그 | 설명 |
|--------|------|
| `UV_PROCESS_SETUID` / `UV_PROCESS_SETGID` | 자식의 UID/GID 변경 (Unix만) |
| `UV_PROCESS_DETACHED` | 부모 종료 후에도 자식이 계속 실행 (데몬 생성) |
| `UV_PROCESS_WINDOWS_HIDE` | Windows에서 창 숨김 |

### stdio 설정 (`uv_stdio_container_t`)
```
자식 프로세스의 stdin/stdout/stderr를 제어한다:
UV_IGNORE:         FD를 제공하지 않음 (stdin/stdout/stderr는 /dev/null로 리다이렉트)
UV_CREATE_PIPE:    부모-자식 간 새 파이프 생성
UV_INHERIT_FD:     부모의 파일 디스크립터를 복제
UV_INHERIT_STREAM: 부모의 스트림 FD를 복제
UV_READABLE_PIPE / UV_WRITABLE_PIPE: 파이프 방향 설정 (자식 관점)
```

### IPC: 파이프를 통한 소켓 전달
```
멀티프로세스 서버의 핵심 메커니즘:
1. 마스터 프로세스가 TCP 서버를 생성하고 연결을 수락
2. uv_write2()로 클라이언트 소켓 핸들을 워커에게 전송 (빈 버퍼도 필수)
3. 워커는 uv_pipe_pending_count()로 대기 핸들을 확인하고
4. uv_accept()로 소켓을 꺼내 직접 처리

전송 가능한 핸들: TCP 소켓, 파이프만 가능.
파이프 초기화 시 ipc=1 필수: uv_pipe_init(loop, &pipe, 1)
```

### 시그널 처리 (`uv_signal_t`)
```
uv_signal_init() → uv_signal_start(handle, callback, signum) → uv_signal_stop()
여러 핸들이 같은 시그널을 감시하면 모두 호출된다.
uv_signal_start_oneshot(): 시그널 수신 후 자동 리셋 (v1.12.0+).

제약:
- Windows: SIGINT, SIGBREAK, SIGHUP, SIGWINCH만 지원
- Unix: SIGKILL, SIGSTOP은 캡처 불가

uv_kill(pid, signum)            — PID로 시그널 전송
uv_process_kill(handle, signum) — 핸들로 시그널 전송
Windows에서 SIGTERM, SIGINT, SIGKILL은 모두 프로세스 종료를 유발한다.
```

## 관련 문서
- [[libuv|libuv (TOC)]]
- [[libuv-Architecture|libuv 아키텍처]]
- [[libuv-Handles|libuv 핸들·요청·스트림]]
- [[libuv-Threading|libuv 스레드 풀·스레딩·에러]]
- [[File-System|파일 시스템]]
- [[HTTP-Networking|HTTP·네트워킹]]
