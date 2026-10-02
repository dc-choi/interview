---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
verified_at: 2026-10-01
aliases: ["libuv 프로세스", "libuv IPC", "libuv 시그널"]
---

# libuv 프로세스, IPC와 시그널

프로세스마다 루프를 두면 코어 간 격리와 메시지 기반 협업이 가능하다. 다만 프로세스 생성, 통신과 데이터 복사 비용을 포함해서 설계한다. 공유 메모리와 thread pool 작업은 [[libuv-Threading]]에서 다룬다.

## spawn과 종료 관찰

`uv_spawn(loop, process, options)`는 process handle 초기화와 자식 실행을 함께 수행한다. `uv_process_options_t`는 0으로 초기화한 뒤 필요한 필드를 지정한다.

| 필드 | 계약 |
|---|---|
| file | 실행할 프로그램 경로/이름, Unix에서는 PATH 검색 가능 |
| args | argv 배열, args[0]은 프로그램 경로, 마지막 NULL |
| env | `NAME=VALUE` 문자열 배열, 마지막 NULL, env NULL은 부모 환경 상속 |
| cwd | 자식 작업 디렉토리 |
| exit_cb | 종료 상태 `int64_t exit_status`, 종료 원인 `term_signal` 전달 |
| stdio_count/stdio | 자식 FD별 상속/생성 정책 |
| flags, uid, gid | 플랫폼별 실행 옵션 |

spawn은 성공 0, 실패 음수다. **성공과 실패 모두 process handle을 결국 close해야 한다.** 일반 init 실패의 정리 규칙과 다르다.

성공적으로 실행한 Unix 자식은 exit callback 이전에 process handle을 닫지 않는다. 먼저 닫으면 libuv가 나중에 reap할 수 없어 zombie가 될 수 있으며 호출자가 waitpid해야 한다. exit callback이 도착한 뒤 close로 watcher 수명을 끝내는 것이 기본 흐름이다. Windows에는 이 zombie 제약이 없다.

`uv_process_t.pid`는 exit 뒤에도 값을 유지하지만 PID는 살아 있는 동안만 유일하다. `uv_process_kill(handle, signum)`은 이미 죽은 자식의 PID를 재사용한 다른 프로세스를 죽이지 않도록 한다. 저장한 pid로 `uv_kill()`하면 재사용된 다른 프로세스를 대상으로 할 수 있으므로 구분한다.

`UV_PROCESS_DETACHED`는 자식을 분리 실행하지만 process handle은 여전히 부모 loop를 유지한다. 부모가 이를 기다리지 않으려면 ref 상태도 별도로 해제한다. detached/unref는 자식 종료, FD 닫기, 오류 처리와는 다른 결정이다.

### 플랫폼 flag

SETUID/SETGID는 Unix에서 해당 uid/gid와 함께 사용하고 권한 오류를 처리한다. Windows에서는 `UV_ENOTSUP`이다.

Windows는 args를 command line 문자열로 결합하므로 quoting 차이가 있다. VERBATIM_ARGUMENTS는 libuv의 quoting/escaping을 끄며 Unix에서는 무시된다. 사용자 입력을 shell command로 조합하지 말고 executable과 argument 계약에 맞게 전달한다.

WINDOWS_HIDE, HIDE_CONSOLE, HIDE_GUI는 각각 창 표시를 제어한다. FILE_PATH_EXACT_NAME(1.48.0+)은 file에 directory component가 있을 때 extension 변형보다 정확한 이름을 먼저 찾도록 한다. Unix에서는 이 Windows flag들이 무시된다.

`uv_disable_stdio_inheritance()`는 부모에게 받은 FD/handle이 손자 프로세스로 의도치 않게 상속되는 것을 최대한 차단한다. 가능한 초기, FD가 close/dup되기 전에 호출하는 것이 권장되지만 모든 FD를 발견한다는 보장은 없다.

## 자식 stdio의 방향

`stdio[i]`는 자식의 FD i에 대응한다. 0/1/2는 stdin/stdout/stderr다. 아래 기본 동작 네 가지는 서로 배타적이다.

| 동작 | 설정 |
|---|---|
| 무시 | `UV_IGNORE`: 0/1/2는 null device로 redirect, 다른 FD는 제공하지 않음 |
| 기존 FD 상속 | `UV_INHERIT_FD`와 data.fd |
| 기존 stream FD 상속 | `UV_INHERIT_STREAM`과 data.stream |
| 새 pipe 생성 | `UV_CREATE_PIPE`와 초기화됐으나 아직 open/connect되지 않은 `uv_pipe_t` |

CREATE_PIPE의 READABLE_PIPE/WRITABLE_PIPE는 **자식 관점**이다. READABLE은 자식이 읽는 pipe, WRITABLE은 자식이 쓰는 pipe이며 둘 다 지정하면 duplex다. NONBLOCK_PIPE는 자식 쪽도 nonblocking으로 열지만 자식이 EAGAIN을 처리하지 못하면 데이터 손실이 날 수 있다.

Windows에서 FD > 2를 상속받아 사용하려면 자식이 MSVCRT runtime을 이용해야 한다. 부모가 stdout/stderr pipe를 소비하지 않으면 자식의 출력이 막힐 수 있으므로 stream read와 역압을 함께 설계한다.

## 로컬 pipe와 이름

`uv_pipe_t`는 Unix의 domain socket/pipe/FIFO, Windows의 named pipe를 추상화한다. 이름으로 bind/listen하는 서버와 이름으로 connect하는 클라이언트는 연결 후 공통 stream API로 통신한다.

`uv_pipe_open()`은 기존 pipe FD/handle을 nonblocking으로 연결하지만 실제 타입 유효성은 검사하지 않는다. `uv_pipe()`(1.41.0+)는 read FD와 write FD 두 개를 만들며 Unix의 close-on-exec pipe에 대응한다.

기존 `uv_pipe_bind/connect`는 Unix의 sockaddr_un 경로 길이(보통 92~108바이트)에서 이름을 잘라 사용할 수 있다. 다른 경로에 잘못 연결되는 것을 막으려면 `bind2/connect2`(1.46.0+)의 `UV_PIPE_NO_TRUNCATE`로 길이 초과를 `UV_EINVAL`로 처리한다.

bind2/connect2는 Linux abstract namespace도 지원한다. namelen에는 선행 NUL을 포함하고 끝 NUL은 제외한다. 일반 문자열 길이 함수와 같다고 가정하지 않는다. 기존 `uv_pipe_connect()`는 void 반환으로 연결 결과가 callback에 오지만 connect2는 제출 오류를 int로 반환한다.

`pipe_getsockname/getpeername`은 사용자 buffer와 in/out 길이를 받는다. 현재 pipe 이름 결과 길이는 끝 NUL을 포함하지 않으며 buffer가 NUL 종료되지 않는 계약이므로 반환 길이를 이용한다. 필요한 문자열 처리 전에 여유 공간에 직접 종료 문자를 추가한다.

Windows의 `uv_pipe_pending_instances()`는 기다릴 pipe instance 수를 설정한다. `uv_pipe_chmod()`는 다른 사용자에게 읽기/쓰기 접근을 허용하는 blocking 호출이며 권한 노출 범위를 확인한다.

## IPC로 handle 전달

handle 전달은 일반 payload 전송과 별도 기능이다. 송신할 **연결된** pipe에 `ipc=1`을 설정하며 listen handle에는 설정하지 않는다. wire format이 달라질 수 있으므로 일반 pipe peer와 섞지 않는다.

1. 부모가 연결을 수락하고 대상 worker를 선택한다.
2. `uv_write2()`에 전달할 handle과 nonempty payload buffer를 넘긴다.
3. 수신 read callback에서 `uv_pipe_pending_count()`를 확인한다.
4. `uv_pipe_pending_type()`에 맞는 handle을 초기화한다.
5. `uv_accept(pipe, handle)`로 전달받은 handle을 가져와 처리한다.

현재 stream API는 Unix에서 TCP/Pipe/UDP, Windows에서 TCP handle 전달을 허용한다. listening/connected 상태여야 하며 bound socket/pipe는 server로 취급한다. User guide의 TCP/Pipe만 지원한다는 옛 설명을 현행 전체 제약으로 사용하지 않는다.

전송 request, payload와 전달 handle은 write 완료를 확인하기 전 해제하지 않는다. 부모/worker 각자의 handle close와 소켓 처리 책임도 따로 정한다. 전달 완료가 remote 애플리케이션의 처리 성공을 뜻하지 않는다.

`uv_try_write2()`는 queue하지 않는 즉시 전달 시도이며 Windows에서는 지원하지 않아 `UV_EAGAIN`이다. guide의 round-robin 서버는 교육용이며 queue 한도, worker 사망, close와 오류 정리를 추가로 설계해야 한다. worker 개수는 물리 CPU 목록보다 [[libuv-Utilities]]의 available parallelism을 참고한다.

## 시그널을 루프에서 받기

`uv_signal_init → uv_signal_start(callback, signum) → stop → close`로 관리한다. handle 하나는 한 시그널만 감시하고 다시 start하면 대상을 바꾼다. 여러 handle/loop가 같은 시그널을 감시하면 각각 callback을 받을 수 있다. `uv_signal_start_oneshot()`은 한 번 수신하면 감시를 해제한다.

Unix의 SIGKILL/SIGSTOP은 포착 불가능하다. SIGBUS/FPE/ILL/SEGV를 libuv로 처리하는 것은 undefined behavior이고 abort()로 발생한 SIGABRT도 포착되지 않는다. Linux NPTL의 signal 32/33에 watcher를 설치하는 것도 피한다.

Windows의 수신 지원은 SIGINT/SIGBREAK/SIGHUP/SIGWINCH의 에뮬레이션이다. raw mode에서는 Ctrl+C의 SIGINT가 발생하지 않는다. console close의 SIGHUP은 약 10초 뒤 OS가 강제 종료할 수 있다. SIGWINCH 탐지는 콘솔/TTY 조건 때문에 늦어질 수 있다.

Windows에서 다른 일부 시그널은 watcher 생성에 성공해도 실제로 수신되지 않는다. `raise/abort` 호출도 libuv watcher를 발생시키지 않는다. 시그널 **수신 지원**과 `uv_kill/uv_process_kill`의 종료 지원을 혼동하지 않는다. Windows에서 SIGTERM/SIGINT/SIGKILL 전송은 모두 프로세스 종료로 처리된다.

## 출처

- [Process](https://docs.libuv.org/en/v1.x/process.html), [Pipe](https://docs.libuv.org/en/v1.x/pipe.html)
- [Stream handle passing](https://docs.libuv.org/en/v1.x/stream.html), [Signal](https://docs.libuv.org/en/v1.x/signal.html)
- [Processes guide](https://docs.libuv.org/en/v1.x/guide/processes.html)

## 관련 문서

- [[libuv]], [[libuv-Handles]], [[libuv-Threading]], [[libuv-Utilities]]
