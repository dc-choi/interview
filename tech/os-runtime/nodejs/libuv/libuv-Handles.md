---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
aliases: ["libuv Handles", "libuv 핸들과 요청", "libuv 이벤트 루프 API"]
---

### libuv 핸들·요청·스트림
libuv의 두 가지 핵심 추상화(Handle/Request), 이벤트 루프 API, 참조 카운팅, 스트림, 그리고 보조 핸들(타이머·idle·prepare·check·poll)을 다룬다.

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
Handle, Request, Loop 모두 `void* data` 멤버를 가진다. 애플리케이션 데이터를 저장하고 콜백에서 캐스팅하여 사용할 수 있으며, 이것이 libuv 콜백에서 사용자 정의 상태를 전달하는 표준 방법이다.

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
이벤트 루프는 활성화되고 참조된(ref'd) 핸들이 있는 동안만 실행된다. 모든 핸들은 기본적으로 참조 상태이다.
uv_unref(): 핸들을 참조 해제 → 이 핸들만 남으면 루프 종료 가능.
uv_ref():   핸들을 다시 참조 → 루프가 이 핸들 때문에도 계속 실행.
활용: GC, 하트비트 타이머, 백그라운드 감시 등 프로그램 종료를 막지 않아야 하는 핸들에 uv_unref() 적용.
```

## 스트림 (`uv_stream_t`)
`uv_tcp_t`, `uv_pipe_t`, `uv_tty_t`의 추상 부모 타입. 양방향 통신 채널을 제공한다.

### 핵심 API

| 함수 | 설명 |
|------|------|
| `uv_listen()` | 수신 연결 대기 시작 |
| `uv_accept()` | 수신 연결 수락 |
| `uv_read_start()` / `uv_read_stop()` | 스트림 읽기 시작/중지 |
| `uv_write()` / `uv_write2()` | 스트림 쓰기 (write2는 IPC용 핸들 전송) |
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

## 보조 핸들

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

세 핸들 모두 동일한 API 패턴: `init → start(callback) → stop`. idle 핸들이 활성이면 루프가 I/O 대기를 건너뛴다 (타임아웃 0).

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

## 관련 문서
- [[libuv|libuv (TOC)]]
- [[libuv-Architecture|libuv 아키텍처]]
- [[libuv-IO|libuv 네트워킹·파일시스템·프로세스]]
- [[libuv-Threading|libuv 스레드 풀·스레딩·에러]]
- [[Event-Loop|이벤트 루프]]
- [[Stream|스트림]]
