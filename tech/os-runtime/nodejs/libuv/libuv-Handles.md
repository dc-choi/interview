---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
verified_at: 2026-10-01
aliases: ["libuv Handles", "libuv 핸들과 요청", "libuv 이벤트 루프 API"]
---

# libuv 핸들, 요청과 스트림

Handle은 소켓, 타이머와 감시자처럼 수명이 긴 객체다. Request는 connect, write, 파일 작업처럼 완료를 기다리는 개별 작업이다. `uv_stream_t`는 TCP/Pipe/TTY의 추상 공통 타입이다.

## 메모리와 생명주기

핸들 구조체는 이동할 수 없다. 초기화와 등록에 사용한 주소를 close callback까지 유지해야 한다. stack 할당이라면 함수가 먼저 반환하지 않도록 한다. `uv_handle_t/uv_req_t`로의 공통 캐스팅은 가능하지만 내부 필드 layout에 의존하지 않는다.

| 대상 | 시작 | 종료와 해제 |
|---|---|---|
| 일반 Handle | `uv_*_init` 성공 후 start/listen/read | `uv_close`, close callback 내부 또는 이후 메모리 해제 |
| Process | `uv_spawn`이 초기화와 실행을 함께 수행 | spawn 성공/실패 모두 결국 close 필요 |
| Request | 비동기 API로 작업 제출 | 완료 callback까지 메모리와 관련 버퍼 유지 |
| File request | `uv_fs_*` | 완료 후 `uv_fs_req_cleanup`, 파일 FD는 별도 close |
| DNS 결과 | `uv_getaddrinfo` | 결과에 `uv_freeaddrinfo`, request 메모리는 사용자 관리 |

일반 init이 실패하면 close가 필요 없지만 `uv_spawn`은 예외다. request가 자동으로 완료된다는 표현은 사용자가 할당한 구조체와 버퍼를 libuv가 free한다는 뜻이 아니다.

`uv_close()`는 비동기로 close callback을 전달한다. FD를 감싼 핸들은 FD를 즉시 닫아도 callback은 뒤로 미뤄진다. 진행 중 connect/write 등의 callback은 취소 상태로 나중에 호출될 수 있으므로 연관 메모리를 먼저 해제하지 않는다.

`uv_is_closing()`은 init 이후부터 close callback 도착 전 사이에만 사용한다. close callback을 NULL로 둘 수 있지만 그 경우에도 마지막 사용 이전에 메모리를 재활용할 수는 없다.

Loop, Handle, Request의 `void* data`는 사용자 context 저장소다. libuv가 내용을 관리하거나 스레드 간 접근을 동기화하지 않는다. `*_get_data/set_data`, type/loop getter는 FFI에서 layout 의존을 줄인다. `uv_handle_size/uv_req_size/uv_loop_size`도 이 목적이다.

## 활성 상태와 참조

active는 타입마다 다르다. timer/idle/check/prepare는 start 이후 active이고, I/O 핸들은 read/write/connect/listen 등 작업 중일 때 active다. async는 init 즉시 active이며 close 외에 stop하는 API가 없다.

`uv_ref/uv_unref`는 카운터 증가/감소가 아니라 referenced 상태를 설정하는 멱등 연산이다. `uv_has_ref()`로 상태를 확인한다. 루프를 유지하는 조건에는 active+referenced 핸들뿐 아니라 active request와 closing handle도 들어간다.

unref한 heartbeat나 GC timer는 다른 작업이 끝났을 때 프로세스 종료를 막지 않는다. unref는 타이머 stop이나 handle close의 대체가 아니다. Node.js 리소스의 ref/unref와 종료 진단은 [[Event-Loop-Microtask#루프를 붙잡는 리소스와 해제]]를 본다.

## 핸들과 요청의 종류

| 핸들 | 역할 |
|---|---|
| `uv_tcp_t`, `uv_udp_t` | TCP 스트림/서버, UDP 데이터그램 |
| `uv_pipe_t`, `uv_tty_t` | 로컬 IPC/파이프, 터미널 스트림 |
| `uv_timer_t` | 일회성 또는 반복 타이머 |
| `uv_idle_t`, `uv_prepare_t`, `uv_check_t` | 반복 단계에 연결된 callback |
| `uv_async_t` | 다른 스레드에서 루프 깨우기 |
| `uv_poll_t` | 외부 라이브러리 FD 준비 상태 감시 |
| `uv_process_t`, `uv_signal_t` | 자식 프로세스, 시그널 감시 |
| `uv_fs_event_t`, `uv_fs_poll_t` | OS 파일 이벤트, stat 기반 감시 |

Request에는 `uv_connect_t`, `uv_write_t`, `uv_shutdown_t`, `uv_udp_send_t`, `uv_fs_t`, `uv_work_t`, `uv_getaddrinfo_t`, `uv_getnameinfo_t`, `uv_random_t`가 있다. 요청에는 handle용 `uv_close()`를 호출하지 않는다.

## 취소는 완료를 기다리는 작업

`uv_cancel()`은 현재 온라인 API에서 write/fs/getaddrinfo/getnameinfo/random/work request를 지원한다. 일반적으로 실행 중이거나 실행이 끝난 요청은 취소할 수 없다. 반환값 0도 메모리를 즉시 해제해도 된다는 뜻은 아니다. 취소 callback이 나중에 오므로 그때까지 유지한다.

fs의 취소 결과는 `req->result == UV_ECANCELED`, 나머지는 callback status로 받는다. 이미 시작한 worker를 강제 종료하는 기능은 없으며 장기 작업은 별도 동기화된 종료 플래그를 확인하게 설계한다.

write에는 현재 문서의 추가 계약이 있다. 진행 중인 write 중단을 시도하고 이미 완료된 write 취소는 성공 no-op이다. 커널 처리와 경합하면 다른 성공/실패가 보고될 수 있다. 완전히 취소된 write callback은 같은 스트림의 다른 write와 순서가 달라질 수 있다.

`uv_write_nwritten()`은 1.53.0+이며 write callback 안에서만 유효하다. 취소 전에 실제로 쓰인 바이트를 확인하므로 취소됐다는 이유만으로 전체 payload를 재전송하면 중복 전송될 수 있다. 설치된 libuv가 이 계약을 지원하는지 확인한다.

## 스트림과 버퍼 소유권

`uv_buf_t`는 base 포인터와 길이 값이며 본문 메모리를 소유하지 않는다. 플랫폼별 멤버 순서가 다를 수 있으므로 `uv_buf_init()`을 사용한다. 버퍼 길이는 바이트다.

### 수신

`uv_read_start(stream, alloc_cb, read_cb)`는 여러 번 callback을 호출한다. `uv_alloc_cb`는 제공된 `uv_buf_t*`를 채운다. suggested size는 pending 데이터 크기가 아니라 참고값이므로 pool/slab 크기를 사용할 수 있다.

- base NULL 또는 길이 0은 read/recv callback의 `UV_ENOBUFS`를 유발한다.
- alloc callback 안에서 read stop, recv stop, handle close를 호출하는 것은 지원되지 않는다. read/recv callback에서 처리한다.
- stream의 `nread > 0`은 데이터, `nread == 0`은 EAGAIN에 해당하며 EOF가 아니다.
- `nread == UV_EOF`는 끝, 다른 음수는 오류다. 오류 뒤 read stop 또는 close가 필요하다. 오류 후 계속 읽는 동작은 정의되지 않는다.
- 오류 callback에는 NULL 버퍼가 올 수 있다. 받은 버퍼는 애플리케이션이 해제한다.

`uv_read_start()` 중복 호출은 현재 API에서 `UV_EALREADY`, closing stream은 `UV_EINVAL`이다(1.38.0부터 플랫폼 일관성 보장). `uv_read_stop()`은 멱등이며 성공한다. Windows TTY의 nonzero 반환은 후속 입력 때 자원 해제를 마칠 수 있다는 의미로 실패 판정하지 않는다.

### 송신과 역압

`uv_write(req, stream, bufs, nbufs, cb)`는 buffer 순서를 유지해 쓰기를 queue한다. request와 buffer의 본문 메모리는 callback까지 유효해야 한다. 대기 중 request를 재사용하면 정의되지 않은 동작이다. read에서 받은 버퍼를 여러 출력으로 전달한다면 복사하거나 참조 수를 관리해 마지막 write 완료 뒤 해제한다.

`write_queue_size`와 `uv_stream_get_write_queue_size()`는 대기 바이트 수다. queue가 커질 때 read를 일시 중단하는 등 생산량을 제한해야 메모리 증가를 막는다. Node.js의 상위 역압 API는 [[Stream]]에서 다룬다.

`uv_try_write()`는 queue하지 않고 즉시 가능한 만큼만 쓴다. 양수 결과가 전체 길이보다 작을 수 있고, 지금 전혀 쓸 수 없으면 `UV_EAGAIN`이다. 미전송 부분의 offset을 유지해 다음 쓰기로 넘긴다.

`uv_shutdown()`은 pending write가 완료된 뒤 outgoing 측만 종료한다. stream handle 자체를 닫지는 않는다. graceful shutdown과 TCP RST 종료는 [[libuv-IO]]에서 구분한다.

`uv_stream_set_blocking()`은 write를 동기 완료시켜도 callback은 비동기로 유지한다. Unix는 stream 전반, Windows는 pipe만 지원한다. 이미 제출한 write 이후 모드를 바꾸면 순서 보장이 없으므로 초기 open 직후 설정한다. 루프 지연을 만드는 선택이므로 일반적인 역압 해법으로 쓰지 않는다.

## 연결 수락

`uv_listen(stream, backlog, connection_cb)`의 backlog는 커널 연결 대기 queue다. connection callback 성공 뒤 초기화된 client handle에 `uv_accept()`를 호출한다. server와 client는 같은 loop여야 한다. 첫 accept는 성공이 보장되지만 같은 callback에서 반복 accept는 실패할 수 있으므로 한 번 수락하는 방식이 권장된다.

connection callback status, init/accept 반환값, read 시작 결과를 각각 확인한다. guide의 echo 예제는 메모리 누수와 close 누락을 인정하는 교육용 코드이므로 그대로 운영 코드로 사용하지 않는다.

## 타이머와 반복 단계 핸들

`uv_timer_start(handle, cb, timeout, repeat)`의 시간은 밀리초다. timeout 0은 다음 반복, repeat 0은 일회성이다. active timer에 start하면 스케줄을 갱신한다. start 자체는 cached now를 갱신하지 않는다.

반복 타이머는 루프의 now를 기준으로 재설정되며 지연된 횟수를 전부 보상 실행하지 않는다. 예를 들어 간격 50ms에 callback이 17ms 걸리면 다음 실행까지 약 33ms가 남지만 다른 작업이 지연시키면 가능한 시점에 실행된다.

`uv_timer_again()`은 repeat 값을 timeout으로 사용하여 재시작하며 한 번도 start하지 않았다면 `UV_EINVAL`이다. callback 안에서 repeat를 바꿔도 이미 계산한 다음 timeout에는 이전 값이 쓰인다. 일회성 timer를 반복으로 전환하려면 다시 start한다. `uv_timer_get_due_in()`은 cached now 기준 남은 시간이며 만료하면 0이다.

idle은 prepare 직전, prepare는 poll 직전, check는 poll 직후에 한 반복당 한 번 호출된다. init/start/stop 패턴을 사용하며 start callback NULL은 `UV_EINVAL`이다. idle 활성 시 timeout 0이므로 CPU 사용을 고려한다.

## 외부 FD와 poll

`uv_poll_t`는 libcurl, c-ares, libssh2 등의 외부 소켓을 통합할 때 사용한다. libuv TCP/UDP 대신 사용하는 것은 권장되지 않는다. 외부 라이브러리가 blocking API만 제공하면 [[libuv-Threading]]의 work queue로 분리한다.

poll init은 FD를 nonblocking으로 바꾼다. `UV_READABLE/WRITABLE`, 선택적인 `UV_DISCONNECT`, OOB/sysfs용 `UV_PRIORITIZED`를 감시한다. 준비 알림이 와도 실제 read/write에서 EAGAIN이 날 수 있다. level triggered이므로 소비하지 않은 상태는 다시 callback을 유발한다.

- 같은 소켓에 active poll handle을 여러 개 두지 않는다.
- active poll 중 FD를 외부에서 닫지 않는다. stop/close 뒤에는 FD를 닫을 수 있다.
- `uv_poll_stop()`은 이미 pending인 callback도 즉시 취소한다. poll close가 외부 소켓의 close를 대신하지 않는다.
- `UV_EBADF`이면 polling이 중단되므로 handle을 close한다.
- Windows는 소켓만, Unix는 poll 가능한 FD를 지원한다. AIX는 disconnect 알림을 지원하지 않는다.

libcurl multi처럼 socket callback으로 감시 mask를 갱신하고, timer callback으로 timeout 진행도 보장하는 방식이 일반적이다. writable 감시를 계속 유지하면 불필요한 반복이 발생할 수 있다.

`uv_fileno()`는 TCP/Pipe/TTY/UDP/Poll의 OS FD를 얻는다. FD 부재나 close 뒤에는 `UV_EBADF`, 다른 handle 타입은 `UV_EINVAL`이다. libuv가 제어하는 FD를 임의 변경하거나 닫으면 오동작할 수 있다. socket send/recv buffer getter/setter는 Linux에서 설정값의 두 배를 반환할 수 있다.

## 출처

- [Base handle](https://docs.libuv.org/en/v1.x/handle.html), [Base request와 취소](https://docs.libuv.org/en/v1.x/request.html)
- [Stream](https://docs.libuv.org/en/v1.x/stream.html), [Timer](https://docs.libuv.org/en/v1.x/timer.html)
- [Idle](https://docs.libuv.org/en/v1.x/idle.html), [Prepare](https://docs.libuv.org/en/v1.x/prepare.html), [Check](https://docs.libuv.org/en/v1.x/check.html)
- [Poll](https://docs.libuv.org/en/v1.x/poll.html), [Utilities guide](https://docs.libuv.org/en/v1.x/guide/utilities.html)

## 관련 문서

- [[libuv]], [[libuv-Architecture]], [[libuv-IO]], [[libuv-Threading]], [[Stream]]
