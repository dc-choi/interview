---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
aliases: ["libuv Threading", "libuv 스레드 풀", "libuv 스레딩", "libuv 에러"]
---

### libuv 스레드 풀·스레딩·에러
libuv의 스레드 풀, 스레딩 프리미티브, 스레드 간 통신(`uv_async`), 동적 라이브러리 로딩, TTY, 시스템 정보 유틸리티, 그리고 에러 처리 규약을 다룬다.

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
int uv_queue_work(uv_loop_t* loop, uv_work_t* req,
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
아직 시작되지 않은 fs/dns/work 요청만 취소 가능. 취소 성공 시 콜백은 `UV_ECANCELED` 상태로 호출된다. 이미 실행 중인 작업은 취소할 수 없다.

## 스레딩

### 스레드 생성/관리

| 함수 | 설명 |
|------|------|
| `uv_thread_create()` / `uv_thread_create_ex()` | 새 스레드 생성 (옵션 지정 가능) |
| `uv_thread_join()` / `uv_thread_detach()` | 스레드 종료 대기 / 분리 |
| `uv_thread_self()` / `uv_thread_equal()` | 현재 스레드 ID / 비교 |
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
- libuv가 여러 호출을 병합(coalesce)할 수 있음 → send를 5번 호출해도 콜백은 1번만 실행될 수 있다
- 콜백은 최소 1회 실행이 보장됨 (send 호출 이후)
- 루프를 가진 스레드만 수신자가 될 수 있음

주의: uv_async_init()은 다른 핸들과 달리 초기화 즉시 핸들을 시작(start)한다.
활용: 데이터 접근은 뮤텍스/락으로 보호하고, uv_async_send()는 깨우기만 담당.
```

## 유틸리티

### 동적 라이브러리 로딩
```
uv_dlopen(path, &lib)       — 공유 라이브러리(.so/.dll) 로드
uv_dlsym(&lib, name, &ptr)  — 심볼(함수/변수) 검색
uv_dlclose(&lib)            — 라이브러리 언로드
uv_dlerror(&lib)            — 에러 메시지 조회. 플러그인 시스템 구현에 활용.
```

### TTY (`uv_tty_t`)
```
터미널 입출력 핸들. uv_stream_t의 하위 타입.
uv_tty_init(loop, &tty, fd, readable)  — 초기화 (0=stdin, 1=stdout, 2=stderr)
uv_tty_set_mode(&tty, mode)            — UV_TTY_MODE_NORMAL / UV_TTY_MODE_RAW
uv_tty_get_winsize(&tty, &width, &height) — 터미널 크기 조회
uv_tty_reset_mode()                     — 프로그램 종료 시 터미널 복원 (필수)
uv_guess_handle(fd)                     — FD가 TTY/파이프/파일인지 판별
```

### 시스템 정보

| 함수 | 설명 |
|------|------|
| `uv_cpu_info()` | CPU 정보 (모델, 속도, 코어 수) |
| `uv_get_free_memory()` / `uv_get_total_memory()` | 메모리 정보 |
| `uv_interface_addresses()` | 네트워크 인터페이스 목록 |
| `uv_os_uname()` / `uv_os_gethostname()` | OS 정보 / 호스트명 |
| `uv_hrtime()` | 고해상도 타임스탬프 (나노초) |
| `uv_exepath()` / `uv_cwd()` / `uv_chdir()` | 실행 파일 경로 / 작업 디렉토리 |
| `uv_os_homedir()` / `uv_os_tmpdir()` | 홈/임시 디렉토리 |
| `uv_os_getenv()` / `uv_os_setenv()` | 환경 변수 조회/설정 |
| `uv_random()` | 암호학적으로 안전한 난수 생성 |

## 에러 처리
libuv의 에러는 음수 상수로 표현된다. 초기화/동기 함수가 음수를 반환하면 에러. 비동기 함수가 에러를 반환하면 콜백은 절대 호출되지 않는다.

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
| `UV_ECONNREFUSED` / `UV_ECONNRESET` | 연결 거부됨 / 피어에 의해 리셋 |
| `UV_ETIMEDOUT` | 연결 시간 초과 |
| `UV_ENOENT` / `UV_EACCES` | 파일·디렉토리 없음 / 권한 부족 |
| `UV_ENOMEM` / `UV_ENOSPC` | 메모리 / 디스크 공간 부족 |
| `UV_EMFILE` | 열린 파일 디스크립터 한도 초과 |
| `UV_ECANCELED` / `UV_EOF` | 작업 취소됨 / 파일 끝 (스트림 종료) |
| `UV_EINVAL` / `UV_EIO` | 잘못된 인자 / I/O 에러 |

## 관련 문서
- [[libuv|libuv (TOC)]]
- [[libuv-Architecture|libuv 아키텍처]]
- [[libuv-Handles|libuv 핸들·요청·스트림]]
- [[libuv-IO|libuv 네트워킹·파일시스템·프로세스]]
- [[Worker-Threads|워커 스레드]]
- [[Async-Internals|비동기 내부 구조]]
