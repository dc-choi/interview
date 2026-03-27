---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
aliases: ["libuv"]
---

### libuv
Node.js의 비동기 I/O를 담당하는 C 라이브러리. 이벤트 루프, 스레드 풀, OS 추상화를 구현한다.

## 역할
```
1. 이벤트 루프 구현 (Reactor 패턴)
2. 비동기 I/O API 추상화 (OS별 차이를 숨김)
3. 스레드 풀 관리 (블로킹 작업용)
4. 타이머, DNS, 파일시스템 등의 비동기 인터페이스 제공
```

## 역사
```
2009: Node.js 탄생. Google V8 + Marc Lehmann의 libev(Unix 전용) 조합으로 시작.
문제: libev는 Unix 전용이라 Windows를 지원할 수 없었다.
해결: Windows의 IOCP를 지원하는 새 라이브러리 libuv를 개발.
node-v0.9.0: libev 완전 제거, libuv로 대체.
이후: libuv는 Node.js에서 독립하여 범용 시스템 프로그래밍 라이브러리로 발전.
      Mozilla Rust, Julia, Luvit 등 다양한 언어/프로젝트에서 채택.
```

## 이벤트 디멀티플렉서
서로 다른 OS가 제공하는 비동기 I/O 알림 메커니즘을 하나의 인터페이스로 추상화한다.

| OS | API | 특징 |
|------|------|------|
| Linux | **epoll** | 커널 레벨 이벤트 통지. O(1) 성능 |
| macOS / BSD | **kqueue** | 범용 이벤트 통지. 파일, 소켓, 프로세스, 시그널 지원 |
| Windows | **IOCP** | I/O Completion Ports. Proactor 패턴 기반 |
| SunOS | **event ports** | Solaris의 이벤트 통지 메커니즘 |

```
libuv가 이 차이를 추상화하므로, Node.js 코드는 OS와 무관하게 동일한 비동기 API를 사용할 수 있다.
```

## 동기적 이벤트 디멀티플렉싱
```
핵심 개념: 여러 I/O 소스를 동시에 감시하되, 이벤트가 발생할 때까지 블로킹한다.
블로킹 I/O와의 차이점은 "여러 소스를 동시에" 감시한다는 것이다.

전통적 블로킹 I/O:     하나의 소켓 읽기에서 블로킹 → 다른 소켓 처리 불가
이벤트 디멀티플렉싱:   여러 소켓을 한꺼번에 감시 → 준비된 것만 논블로킹으로 처리
```

---

## 설계 개요 (Design Overview)

### 핵심 원칙
```
- 네트워크 I/O는 항상 싱글 스레드에서 수행된다.
- 이벤트 루프는 하나의 스레드에 고정되며, 루프 API는 스레드-안전하지 않다.
  (uv_async_send 등 일부 함수만 예외)
- 각 스레드는 별도의 이벤트 루프를 운영할 수 있다.
- 파일 I/O는 OS에 플랫폼 공통 논블로킹 API가 없어 스레드 풀에서 블로킹으로 처리한다.
```

### 이벤트 루프 반복 단계
```
하나의 루프 반복(iteration)은 다음 순서로 실행된다:

 1. 루프의 'now' 타임스탬프를 갱신한다.
 2. 만료된 타이머의 콜백을 실행한다 (UV_RUN_DEFAULT 모드).
 3. 루프의 alive 상태를 확인한다.
    → active/ref'd 핸들, active 요청, closing 핸들이 하나라도 있으면 alive.
    → alive가 아니면 루프를 즉시 종료한다.
 4. Pending 콜백을 실행한다.
    → 이전 반복에서 연기된 I/O 콜백을 여기서 처리한다.
 5. Idle 핸들 콜백을 실행한다.
    → 이름과 달리, 활성 idle 핸들은 매 반복마다 실행된다.
 6. Prepare 핸들 콜백을 실행한다.
    → I/O 폴링 직전에 호출된다.
 7. Poll 타임아웃을 계산한다.
 8. I/O를 위해 블로킹한다.
    → 계산된 타임아웃 동안 대기하며, 읽기/쓰기 준비된 FD의 콜백을 실행한다.
 9. Check 핸들 콜백을 실행한다.
    → I/O 폴링 직후에 호출된다. Prepare의 대칭.
10. Close 콜백을 실행한다.
    → uv_close()로 닫힌 핸들의 콜백.
11. 'now' 타임스탬프를 다시 갱신한다.
12. 만료된 타이머를 실행한다.
    → 주의: 'now'는 다음 반복까지 다시 갱신되지 않는다.
13. 반복 종료. UV_RUN_NOWAIT/UV_RUN_ONCE면 반환, UV_RUN_DEFAULT면 1단계로.
```

### Poll 타임아웃 계산 규칙
```
I/O 블로킹 전에 대기 시간을 결정한다:
- UV_RUN_NOWAIT 플래그로 실행됨           → 타임아웃 0
- uv_stop()이 호출됨                      → 타임아웃 0
- 활성 핸들이나 요청이 없음                → 타임아웃 0
- 활성 idle 핸들이 있음                    → 타임아웃 0
- 닫기 대기 중인 핸들이 있음               → 타임아웃 0
- 위 조건에 해당 없음                      → 가장 가까운 타이머의 만료 시간, 또는 무한대
```

### 이벤트 루프 실행 모드 (`uv_run_mode`)

| 모드 | 동작 |
|------|------|
| `UV_RUN_DEFAULT` | 활성 핸들/요청이 없을 때까지 반복 실행 |
| `UV_RUN_ONCE` | I/O를 위해 블로킹하고, 한 번만 반복 실행 후 반환 |
| `UV_RUN_NOWAIT` | I/O 대기 없이 즉시 반환. 한 번만 반복 실행 |

---

## 핸들과 요청

### 개념
```
libuv의 두 가지 핵심 추상화:

Handle (핸들): 수명이 긴 객체. 활성 상태에서 매 루프 반복마다 콜백 가능.
  예: uv_tcp_t (TCP 소켓), uv_timer_t (타이머), uv_fs_event_t (파일 감시)

Request (요청): 일회성 작업. 작업 완료 시 콜백이 한 번 호출됨.
  예: uv_write_t (쓰기), uv_connect_t (연결), uv_fs_t (파일 작업)

활성 핸들이나 대기 중인 요청이 있는 한 이벤트 루프는 계속 동작한다.
```

### 생명주기 관리 규칙
```
1. uv_foo_init() 성공 시 반드시 uv_close()를 호출해야 한다.
2. Request는 닫을 필요 없다 (완료 시 자동 정리).
3. Handle 메모리는 uv_close_cb 콜백 내부 또는 그 이후에만 재활용/해제할 수 있다.
4. 대부분의 Handle은 init + start/stop 함수 쌍을 가진다.
5. Request는 완료되거나 uv_cancel()으로 취소 시 자동 종료된다.
6. uv_fs_t와 uv_getaddrinfo_t는 uv_fs_req_cleanup() / uv_freeaddrinfo() 추가 호출 필요.
```

### Handle 타입 전체 목록

| Handle | 용도 |
|--------|------|
| `uv_handle_t` | 모든 핸들의 기본 타입 (캐스팅용) |
| `uv_stream_t` | 스트림 추상 타입 (TCP/Pipe/TTY의 부모) |
| `uv_tcp_t` | TCP 소켓 (서버/클라이언트) |
| `uv_udp_t` | UDP 소켓 |
| `uv_pipe_t` | Unix 도메인 소켓 / Windows 명명 파이프 |
| `uv_tty_t` | 터미널 핸들 |
| `uv_poll_t` | 외부 FD 감시 (외부 라이브러리 통합용) |
| `uv_timer_t` | 타이머 |
| `uv_prepare_t` | I/O 폴링 직전 콜백 |
| `uv_check_t` | I/O 폴링 직후 콜백 |
| `uv_idle_t` | 매 루프 반복마다 콜백 (idle 핸들이 활성이면 poll 타임아웃 = 0) |
| `uv_async_t` | 스레드 간 이벤트 루프 깨우기 |
| `uv_process_t` | 자식 프로세스 관리 |
| `uv_fs_event_t` | 파일시스템 변경 감시 (OS 이벤트 기반) |
| `uv_fs_poll_t` | 파일 변경 감시 (stat 폴링 기반) |
| `uv_signal_t` | 시그널 핸들링 |

### Request 타입 전체 목록

| Request | 용도 |
|---------|------|
| `uv_req_t` | 모든 요청의 기본 타입 |
| `uv_connect_t` | TCP 연결 |
| `uv_write_t` | 스트림 쓰기 |
| `uv_shutdown_t` | 스트림 종료 |
| `uv_udp_send_t` | UDP 전송 |
| `uv_fs_t` | 파일시스템 작업 |
| `uv_work_t` | 스레드 풀 작업 |
| `uv_getaddrinfo_t` | DNS 조회 |
| `uv_getnameinfo_t` | 역 DNS 조회 |
| `uv_random_t` | 암호학적 난수 생성 |

### Context 저장
```
Handle, Request, Loop 모두 void* data 멤버를 가진다.
여기에 애플리케이션 데이터를 저장하고 콜백에서 캐스팅하여 사용할 수 있다.
이것이 libuv 콜백에서 사용자 정의 상태를 전달하는 표준 방법이다.
```

---

## 이벤트 루프 API (`uv_loop_t`)

### 핵심 함수

| 함수 | 설명 |
|------|------|
| `uv_loop_init()` | 루프 구조체 초기화 |
| `uv_loop_close()` | 루프 리소스 해제 |
| `uv_default_loop()` | 기본 루프 반환 (스레드 안전하지 않음) |
| `uv_run()` | 지정된 모드로 이벤트 루프 실행 |
| `uv_loop_alive()` | 활성 핸들/요청 존재 여부 확인 |
| `uv_stop()` | 루프 중지 신호 전송 |
| `uv_now()` | 현재 루프 타임스탬프 반환 (밀리초) |
| `uv_update_time()` | 루프 시간 강제 갱신 |
| `uv_walk()` | 루프의 모든 핸들을 순회 |
| `uv_loop_fork()` | fork() 후 커널 상태 재초기화 (v1.12.0+, 실험적) |

### 기본 사용 패턴
```c
#include <uv.h>

int main() {
    uv_loop_t *loop = uv_default_loop();

    // 핸들 초기화, 작업 등록 ...

    uv_run(loop, UV_RUN_DEFAULT);   // 작업이 없을 때까지 실행
    uv_loop_close(loop);            // 리소스 정리
    return 0;
}
```

### 참조 카운팅 (`uv_ref` / `uv_unref`)
```
이벤트 루프는 활성화되고 참조된(ref'd) 핸들이 있는 동안만 실행된다.
모든 핸들은 기본적으로 참조 상태이다.

uv_unref(): 핸들을 참조 해제 → 이 핸들만 남으면 루프 종료 가능.
uv_ref():   핸들을 다시 참조 → 루프가 이 핸들 때문에도 계속 실행.

활용 사례: 가비지 컬렉터, 하트비트 타이머, 백그라운드 감시 등
          프로그램 종료를 막지 않아야 하는 핸들에 uv_unref() 적용.
```

---

## 스트림 (`uv_stream_t`)
`uv_tcp_t`, `uv_pipe_t`, `uv_tty_t`의 추상 부모 타입. 양방향 통신 채널을 제공한다.

### 핵심 API

| 함수 | 설명 |
|------|------|
| `uv_listen()` | 수신 연결 대기 시작 |
| `uv_accept()` | 수신 연결 수락 |
| `uv_read_start()` | 스트림에서 데이터 읽기 시작 |
| `uv_read_stop()` | 읽기 중지 |
| `uv_write()` | 스트림에 데이터 쓰기 |
| `uv_write2()` | 파이프를 통한 핸들 전송 (IPC) |
| `uv_try_write()` | 논블로킹 즉시 쓰기 시도 (큐 미사용) |
| `uv_shutdown()` | 스트림의 쓰기 측면 종료 |
| `uv_is_readable()` / `uv_is_writable()` | 읽기/쓰기 가능 여부 확인 |

### 버퍼 (`uv_buf_t`)
```
uv_buf_t는 포인터(base)와 길이(len)를 포함하는 구조체.
값으로 전달되며, 메모리 할당/해제는 애플리케이션의 책임이다.

읽기 시 할당 콜백(uv_alloc_cb)이 호출되어 버퍼를 준비하고,
읽기 콜백(uv_read_cb)에서 데이터를 처리한 후 직접 해제해야 한다.
```

---

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
```
비연결형 비신뢰성 통신. uv_udp_t(수신)와 uv_udp_send_t(송신) 사용.

주요 특징:
- 포트 0 지정 시 OS가 자동 할당
- 브로드캐스트: uv_udp_set_broadcast() 필수 (미설정 시 EACCES)
- 멀티캐스트: uv_udp_set_membership()으로 그룹 가입/탈퇴
- 읽기 콜백에서 nread=0이면 읽을 데이터 없음, UV_UDP_PARTIAL은 버퍼 부족
```

| 함수 | 설명 |
|------|------|
| `uv_udp_init()` | UDP 핸들 초기화 |
| `uv_udp_bind()` | 주소:포트에 바인딩 |
| `uv_udp_send()` | 데이터 전송 |
| `uv_udp_recv_start()` | 데이터 수신 시작 |
| `uv_udp_set_membership()` | 멀티캐스트 그룹 설정 |
| `uv_udp_set_broadcast()` | 브로드캐스트 허용 |
| `uv_udp_set_ttl()` | TTL 설정 |

### DNS
```
uv_getaddrinfo()  — 비동기 DNS 조회 (호스트명 → IP 주소)
uv_getnameinfo()  — 비동기 역 DNS 조회 (IP → 호스트명)
uv_freeaddrinfo() — 결과 메모리 해제 (필수)

콜백을 NULL로 전달하면 동기 모드로 동작한다 (v1.3.0+).
DNS 조회는 스레드 풀에서 실행된다.
```

---

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
| 파일 I/O | `uv_fs_open()` | 파일 열기 (FD 획득) |
| | `uv_fs_close()` | 파일 닫기 |
| | `uv_fs_read()` | 파일 읽기 |
| | `uv_fs_write()` | 파일 쓰기 |
| | `uv_fs_unlink()` | 파일 삭제 |
| | `uv_fs_rename()` | 파일명 변경 |
| | `uv_fs_copyfile()` | 파일 복사 |
| 디렉토리 | `uv_fs_mkdir()` | 디렉토리 생성 |
| | `uv_fs_rmdir()` | 디렉토리 삭제 |
| | `uv_fs_scandir()` | 디렉토리 스캔 |
| | `uv_fs_opendir()` / `uv_fs_readdir()` | 디렉토리 스트림 |
| 정보/권한 | `uv_fs_stat()` / `uv_fs_fstat()` | 파일 정보 조회 |
| | `uv_fs_chmod()` / `uv_fs_chown()` | 권한/소유자 변경 |
| | `uv_fs_access()` | 접근 권한 확인 |
| 링크 | `uv_fs_symlink()` | 심볼릭 링크 생성 |
| | `uv_fs_readlink()` / `uv_fs_realpath()` | 링크 읽기/절대경로 |
| 동기화 | `uv_fs_fsync()` | 디스크 동기화 (flush) |

### 파일 열기 플래그
```
UV_FS_O_RDONLY   — 읽기 전용
UV_FS_O_WRONLY   — 쓰기 전용
UV_FS_O_RDWR     — 읽기/쓰기
UV_FS_O_CREAT    — 파일 생성
UV_FS_O_TRUNC    — 기존 내용 삭제
UV_FS_O_APPEND   — 파일 끝에 추가
```

### 필수 정리
```
모든 파일시스템 요청 후 uv_fs_req_cleanup()을 호출하여
libuv가 내부적으로 할당한 메모리를 해제해야 한다.
```

### 파일 변경 감시

| 방식 | Handle | 특징 |
|------|--------|------|
| OS 이벤트 | `uv_fs_event_t` | inotify/kqueue/ReadDirectoryChangesW 사용. 빠르지만 플랫폼별 차이 |
| stat 폴링 | `uv_fs_poll_t` | 주기적 stat() 호출. 느리지만 호환성 높음 |

```
uv_fs_event 콜백은 UV_RENAME 또는 UV_CHANGE 이벤트를 전달한다.
UV_FS_EVENT_RECURSIVE 플래그로 하위 디렉토리까지 감시 가능 (macOS/Windows만).
```

---

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
uv_signal_start_oneshot(): 시그널 수신 후 자동으로 핸들러 리셋 (v1.12.0+).

제약:
- Windows: SIGINT, SIGBREAK, SIGHUP, SIGWINCH만 지원
- Unix: SIGKILL, SIGSTOP은 캡처 불가
```

### 프로세스에 시그널 전송
```
uv_kill(pid, signum)          — PID로 시그널 전송
uv_process_kill(handle, signum) — 핸들로 시그널 전송

Windows에서 SIGTERM, SIGINT, SIGKILL은 모두 프로세스 종료를 유발한다.
```

---

## 스레드 풀 (`uv_threadpool`)
```
기본 크기: 4개 스레드 (UV_THREADPOOL_SIZE 환경변수로 최대 1024까지 확장 가능)

스레드 풀에 위임되는 작업:
- 파일 시스템 작업 (fs.readFile, fs.writeFile 등)
- DNS 조회 (dns.lookup — getaddrinfo 기반)
- CPU 집약적 작업 (crypto.pbkdf2, crypto.randomBytes, zlib 압축)
- 사용자 정의 C++ 애드온의 비동기 작업

스레드 풀에 위임되지 않는 작업 (커널에 직접 위임):
- TCP/UDP 소켓 (네트워크 I/O)
- 파이프
- DNS resolve (c-ares 라이브러리 사용)
```

### 스레드 풀과 이벤트 루프의 관계
```
1. JS에서 비동기 작업 요청 (예: fs.readFile)
2. libuv가 스레드 풀의 워커 스레드에 작업 할당
3. 워커 스레드가 블로킹 I/O를 수행
4. 완료 시 결과를 이벤트 큐에 등록
5. 이벤트 루프(메인 스레드)가 Poll 페이즈에서 콜백을 꺼내 실행
```

**주의**: libuv 스레드 풀 ≠ Worker Threads. 상세 비교는 [[Worker-Threads|워커 스레드]] 참조.

### `uv_queue_work` — 사용자 작업 큐잉
```c
// 블로킹 작업을 스레드 풀로 오프로드하는 핵심 함수
int uv_queue_work(uv_loop_t* loop,
                  uv_work_t* req,
                  uv_work_cb work_cb,        // 스레드 풀에서 실행
                  uv_after_work_cb after_cb); // 메인 루프에서 실행

// 복잡한 데이터 전달: baton 패턴
typedef struct {
    uv_work_t req;        // 첫 멤버로 배치하면 캐스팅이 편리
    char* host;
    int port;
    // ... 기타 데이터
} my_baton_t;

my_baton_t *baton = malloc(sizeof(my_baton_t));
baton->req.data = (void*)baton;  // data 멤버에 자신을 저장
uv_queue_work(loop, &baton->req, work_fn, after_fn);
```

### `uv_cancel` — 작업 취소
```
아직 시작되지 않은 fs/dns/work 요청만 취소 가능.
취소 성공 시 콜백은 UV_ECANCELED 상태로 호출된다.
이미 실행 중인 작업은 취소할 수 없다.
```

---

## 스레딩

### 스레드 생성/관리

| 함수 | 설명 |
|------|------|
| `uv_thread_create()` | 새 스레드 생성 |
| `uv_thread_create_ex()` | 옵션(스택 크기 등) 지정하여 생성 |
| `uv_thread_join()` | 스레드 종료 대기 |
| `uv_thread_detach()` | 스레드 분리 |
| `uv_thread_self()` | 현재 스레드 ID |
| `uv_thread_equal()` | 두 스레드 비교 |
| `uv_thread_setaffinity()` / `getaffinity()` | CPU 친화성 설정/조회 |
| `uv_thread_setpriority()` / `getpriority()` | 우선순위 설정/조회 |

### 동기화 프리미티브

| 프리미티브 | 주요 함수 | 특징 |
|-----------|----------|------|
| **뮤텍스** | `uv_mutex_init/lock/trylock/unlock/destroy` | pthread_mutex 직접 매핑. BSD는 재귀 불가, Windows는 항상 재귀 |
| **읽기-쓰기 락** | `uv_rwlock_rdlock/wrlock/...` | 다수 읽기 동시 허용, 쓰기 시 배타적 |
| **세마포어** | `uv_sem_init/post/wait/trywait` | 카운팅 기반 동기화 |
| **조건 변수** | `uv_cond_wait/timedwait/signal/broadcast` | 뮤텍스와 함께 사용 |
| **배리어** | `uv_barrier_init/wait/destroy` | N개 스레드 동기 지점 |

### 일회성 초기화 / TLS
```
uv_once(guard, callback)  — 여러 스레드가 호출해도 함수가 딱 한 번만 실행됨.
uv_key_create/get/set     — 스레드-로컬 스토리지 (TLS). 각 스레드가 독립 값 보유.
```

### 스레드 간 통신 (`uv_async_t`)
```
uv_async_send()는 다른 스레드에서 이벤트 루프를 깨워 콜백을 실행시킨다.

핵심 특성:
- 어떤 스레드에서든 호출 가능 (async-signal-safe)
- 시그널 핸들러 내에서도 안전하게 사용 가능
- libuv가 여러 호출을 병합(coalesce)할 수 있음
  → send를 5번 호출해도 콜백은 1번만 실행될 수 있다
- 콜백은 최소 1회 실행이 보장됨 (send 호출 이후)
- 루프를 가진 스레드만 수신자가 될 수 있음

주의: uv_async_init()은 다른 핸들과 달리 초기화 즉시 핸들을 시작(start)한다.

활용: 데이터 접근은 뮤텍스/락으로 보호하고, uv_async_send()는 깨우기만 담당.
```

---

## Reactor vs Proactor 패턴

### Reactor 패턴 (Node.js가 사용)
```
동기적 이벤트 디멀티플렉싱 + 논블로킹 I/O

1. I/O 준비 상태를 감지 (readable/writable)
2. 애플리케이션이 직접 I/O 수행
3. 완료 후 콜백 실행

장점: 구현이 단순하고 직관적
단점: 다중 스레드 환경에서는 커스텀 스케줄링 필요
예시: Node.js 이벤트 루프, Linux epoll
```

### Proactor 패턴
```
비동기 I/O + 완료 통지

1. 완료 핸들러를 등록
2. OS가 비동기적으로 I/O를 수행
3. 완료 시 OS가 콜백으로 통지

장점: 더 나은 확장성, 애플리케이션이 이벤트를 제어
단점: 디버깅이 어려움, 비동기 오버헤드
예시: Windows IOCP, C++ Boost.Asio
```

### Node.js의 하이브리드 접근
```
Node.js(libuv)는 기본적으로 Reactor 패턴이지만,
Windows에서는 IOCP(Proactor)를 사용하여 내부적으로 Reactor 인터페이스에 맞게 변환한다.
이 추상화 덕분에 Node.js 코드는 OS와 무관하게 동일하게 동작한다.
```

---

## 유틸리티

### 타이머 (`uv_timer_t`)
```
uv_timer_init(loop, &timer)
uv_timer_start(&timer, callback, timeout_ms, repeat_ms)
  - timeout: 첫 실행까지의 지연 시간 (0이면 다음 반복에서 즉시 실행)
  - repeat: 반복 간격 (0이면 일회성)
uv_timer_stop(&timer)              — 중단
uv_timer_again(&timer)             — repeat 값으로 재시작
uv_timer_set_repeat(&timer, ms)    — 반복 간격 변경
uv_timer_get_due_in(&timer)        — 만료까지 남은 시간 (v1.40.0+)
```

### Idle / Prepare / Check

| 핸들 | 실행 시점 | 용도 |
|------|----------|------|
| `uv_idle_t` | 매 루프 반복, Prepare 직전 | 낮은 우선순위 작업. 활성 시 poll 타임아웃 = 0 |
| `uv_prepare_t` | I/O 폴링 직전 | I/O 전 준비 작업 |
| `uv_check_t` | I/O 폴링 직후 | I/O 후 후처리 |

```
세 핸들 모두 동일한 API 패턴: init → start(callback) → stop
주의: idle 핸들이 활성이면 루프가 I/O 대기를 건너뛴다 (타임아웃 0).
```

### Poll (`uv_poll_t`)
```
외부 라이브러리(libcurl, c-ares, libssh2)의 소켓을 libuv 이벤트 루프에 통합할 때 사용.
libuv 자체의 TCP/UDP에는 사용하지 않는다.

이벤트: UV_READABLE, UV_WRITABLE, UV_DISCONNECT, UV_PRIORITIZED

제약:
- 같은 소켓에 여러 poll 핸들 금지
- 감시 중인 FD를 외부에서 닫지 않기
- Windows에서는 소켓만 감시 가능
```

### 동적 라이브러리 로딩
```
uv_dlopen(path, &lib)    — 공유 라이브러리(.so/.dll) 로드
uv_dlsym(&lib, name, &ptr) — 심볼(함수/변수) 검색
uv_dlclose(&lib)          — 라이브러리 언로드
uv_dlerror(&lib)          — 에러 메시지 조회

플러그인 시스템 구현에 활용.
```

### TTY (`uv_tty_t`)
```
터미널 입출력 핸들. uv_stream_t의 하위 타입.

uv_tty_init(loop, &tty, fd, readable)  — 초기화 (0=stdin, 1=stdout, 2=stderr)
uv_tty_set_mode(&tty, mode)            — 터미널 모드 설정
  UV_TTY_MODE_NORMAL: 표준 모드
  UV_TTY_MODE_RAW:    raw 입력 (키 입력 즉시 전달)
uv_tty_get_winsize(&tty, &width, &height) — 터미널 크기 조회
uv_tty_reset_mode()                     — 프로그램 종료 시 터미널 복원 (필수)
uv_guess_handle(fd)                     — FD가 TTY인지, 파이프인지, 파일인지 판별
```

### 시스템 정보 유틸리티

| 함수 | 설명 |
|------|------|
| `uv_cpu_info()` | CPU 정보 조회 (모델, 속도, 코어 수) |
| `uv_get_free_memory()` / `uv_get_total_memory()` | 메모리 정보 |
| `uv_interface_addresses()` | 네트워크 인터페이스 목록 |
| `uv_os_uname()` | OS 이름, 릴리즈, 버전 |
| `uv_os_gethostname()` | 호스트명 |
| `uv_hrtime()` | 고해상도 타임스탬프 (나노초) |
| `uv_exepath()` | 실행 파일 경로 |
| `uv_cwd()` / `uv_chdir()` | 작업 디렉토리 조회/변경 |
| `uv_os_homedir()` / `uv_os_tmpdir()` | 홈/임시 디렉토리 |
| `uv_os_getenv()` / `uv_os_setenv()` | 환경 변수 조회/설정 |
| `uv_random()` | 암호학적으로 안전한 난수 생성 |

---

## 에러 처리
```
libuv의 에러는 음수 상수로 표현된다.
초기화/동기 함수가 음수를 반환하면 에러.
비동기 함수가 에러를 반환하면 콜백은 절대 호출되지 않는다.
```

### 에러 변환 함수

| 함수 | 설명 |
|------|------|
| `uv_strerror(err)` | 에러 코드 → 설명 문자열 |
| `uv_err_name(err)` | 에러 코드 → 이름 문자열 |
| `uv_translate_sys_error(sys_errno)` | OS 에러 → libuv 에러 (v1.10.0+) |

### 주요 에러 코드

| 에러 | 의미 |
|------|------|
| `UV_EADDRINUSE` | 주소 이미 사용 중 |
| `UV_ECONNREFUSED` | 연결 거부됨 |
| `UV_ECONNRESET` | 연결이 피어에 의해 리셋 |
| `UV_ETIMEDOUT` | 연결 시간 초과 |
| `UV_ENOENT` | 파일/디렉토리 없음 |
| `UV_EACCES` | 권한 부족 |
| `UV_ENOMEM` | 메모리 부족 |
| `UV_EMFILE` | 열린 파일 디스크립터 한도 초과 |
| `UV_ENOSPC` | 디스크 공간 부족 |
| `UV_ECANCELED` | 작업이 취소됨 |
| `UV_EOF` | 파일 끝 (스트림 종료) |
| `UV_EINVAL` | 잘못된 인자 |
| `UV_EIO` | I/O 에러 |

---

## 관련 문서
- [[Event-Loop|이벤트 루프]]
- [[V8|V8 엔진]]
- [[Worker-Threads|워커 스레드]]
- [[Node.js]]
- [[Stream|스트림]]
- [[Async-Internals|비동기 내부 구조]]
