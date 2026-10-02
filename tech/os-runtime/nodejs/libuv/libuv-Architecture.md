---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
verified_at: 2026-10-01
aliases: ["libuv Architecture", "libuv 설계", "libuv 이벤트 루프 구조"]
---

# libuv 아키텍처와 이벤트 루프

libuv는 C 기반의 범용 비동기 I/O 라이브러리다. Node.js에서 출발했지만 Julia, Luvit, uvloop 등에서도 사용한다. JavaScript 실행, Promise와 microtask 처리는 libuv 자체의 역할이 아니다. [[Node.js]], [[V8]], [[Event-Loop]]의 상위 런타임 동작과 구분한다.

## OS 알림과 실행 모델

| 플랫폼 | 주요 이벤트 제공자 | 알림의 의미 |
|---|---|---|
| Linux | epoll | 파일 디스크립터의 준비 상태 |
| macOS, BSD | kqueue | 소켓 등 커널 이벤트 |
| Windows | IOCP | 비동기 I/O 완료 |
| SunOS | event ports | 커널 이벤트 |

Unix의 준비 알림은 Reactor 관점, Windows의 완료 알림은 Proactor 관점으로 이해할 수 있다. libuv는 이 차이를 callback 기반 API로 추상화한다. 소켓 옵션, 파일 감시, 시그널과 경로 제한까지 같아지는 것은 아니다. epoll의 전체 처리 비용을 무조건 O(1)로 설명해서도 안 된다.

초기 libuv는 Unix의 libev와 Windows의 IOCP를 추상화했고, 이후 libev 의존성을 제거하고 독립 라이브러리로 발전했다. 현재의 설계를 이해할 때 과거의 내부 구현을 전제로 삼지 않는다.

하나의 루프는 하나의 스레드에서 실행한다. 여러 루프를 서로 다른 스레드에 둘 수 있지만, 루프와 핸들을 다루는 API는 명시된 예외 외에는 스레드 안전하지 않다. 같은 루프의 네트워크 I/O와 callback은 그 루프 스레드에서 처리한다. callback이 오래 실행되면 다른 연결과 타이머도 지연된다.

파일시스템과 `getaddrinfo/getnameinfo`, 사용자 `uv_queue_work`는 전역 스레드 풀을 이용한다. Linux 파일 I/O에는 버전과 설정에 따른 io_uring 경로도 있다. [[libuv-Filesystem]], [[libuv-Threading]]에서 자원과 완료 계약을 구분한다.

## 루프의 생존 조건

다음 중 하나라도 있으면 `uv_loop_alive()`는 참이다.

- 활성 상태이고 referenced인 핸들
- 활성 요청
- close callback을 기다리는 closing 핸들

`uv_unref()`는 핸들의 생존 기여를 해제한다. 핸들 닫기, 작업 취소, callback 비활성화와는 다른 동작이다. 다른 작업 때문에 루프가 계속 돌면 unref한 핸들도 callback을 받을 수 있다. [[libuv-Handles#활성 상태와 참조]]를 함께 본다.

## 현재 v1.x의 반복 흐름

`uv_run()` 진입 시 루프의 cached time을 설정한다. `UV_RUN_DEFAULT`에서는 반복에 들어가기 전 due timer를 처리하는 단계도 있다. 반복 안의 순서는 현재 Design overview를 기준으로 다음과 같다.

1. 생존 조건을 확인하고 반복을 시작한다.
2. 이전 반복에서 연기한 pending callback을 처리한다.
3. active idle callback을 실행한다.
4. prepare callback을 실행한다.
5. poll timeout을 계산한다.
6. 이벤트 제공자에서 대기하고 I/O callback을 처리한다.
7. check callback을 실행한다.
8. close callback을 실행한다.
9. cached time을 갱신한다.
10. due timer를 실행한다.
11. 실행 모드와 남은 작업에 따라 반환하거나 반복한다.

타이머 처리 중에는 cached time을 계속 갱신하지 않는다. 다른 callback 실행 중 만료된 타이머가 다음 반복까지 기다릴 수 있다. libuv 1.45.0 이후의 타이머 순서 변화와 Node.js에서 관찰하는 `setImmediate/setTimeout` 순서는 [[Event-Loop]]의 런타임 설명을 함께 확인한다.

### poll timeout

`UV_RUN_NOWAIT`, stop 요청, 활성 핸들/요청 부재, active idle, closing 핸들이 있으면 timeout은 0이다. 나머지는 가장 가까운 타이머까지 기다리며, 타이머가 없으면 무기한 대기가 가능하다. timeout 0은 I/O를 처리하지 않는다는 뜻이 아니라 대기하지 않는다는 뜻이다.

idle은 한가할 때만 실행하는 낮은 우선순위 scheduler가 아니다. 매 반복에 실행하고 poll 대기를 없애므로 지속적으로 활성화하면 CPU를 소모할 수 있다.

## 실행 모드와 중지

| 모드 | 계약 |
|---|---|
| `UV_RUN_DEFAULT` | 생존 조건이 사라지거나 stop 요청을 처리할 때까지 반복 |
| `UV_RUN_ONCE` | 한 반복을 수행하며, 필요하면 I/O에서 대기 |
| `UV_RUN_NOWAIT` | 한 반복을 수행하되 I/O 대기하지 않음 |

ONCE/NOWAIT는 callback 한 개만 실행하는 모드가 아니다. `uv_run()`의 0은 루프가 끝났음을, nonzero는 남은 작업 때문에 다시 실행할 필요가 있음을 나타낸다. callback 안에서 재진입할 수 없다.

`uv_stop()`는 진행 중인 callback이나 worker를 강제 중단하지 않는다. 현재 반복에서 준비된 callback이 더 실행될 수 있으며, poll 전에 호출하면 그 반복의 I/O 대기를 건너뛴다. stop 뒤에도 자원 정리는 별도로 수행한다.

`uv_loop_close()`는 열린 핸들과 요청이 남아 있으면 `UV_EBUSY`를 반환한다. 핸들 stop만으로는 닫히지 않는다. close 요청 뒤 루프를 다시 돌려 close callback까지 처리하고, loop close 성공 뒤 루프 메모리를 해제한다. default loop도 정리 대상이며 `uv_default_loop()` 자체는 스레드 안전하지 않다.

## 다른 이벤트 루프에 포함하기

`uv_backend_fd()`는 epoll, kqueue, event ports backend FD를 노출한다. 외부 루프에서 이를 poll하고 `uv_run(loop, UV_RUN_NOWAIT)`로 callback을 실행하는 방식이 가능하다. `uv_backend_timeout()`은 밀리초 timeout, -1은 무제한 대기다.

kqueue FD를 다른 kqueue에 넣어도 일부 플랫폼에서는 이벤트가 오지 않는다. backend FD를 얻었다는 사실만으로 모든 GUI loop와 모든 OS에 통합된다고 판단하지 않는다. NOWAIT를 무제한 반복하는 방식도 busy loop가 될 수 있다.

`fork()` 뒤 부모에서 만든 루프를 재사용한다면 자식에서 `uv_loop_fork()`를 먼저 호출해야 한다. 재사용할 모든 루프와 default loop에 각각 적용한다. 가능하면 자식에서 새 루프를 만든다. 이 API는 실험적이며 Windows에서는 `UV_ENOSYS`다.

fork 뒤 기존 backend FD는 무효이므로 다시 얻는다. macOS의 디렉토리 감시는 FSEvents 대신 다른 방식으로 바뀔 수 있고, AIX/SunOS에서 부모가 시작한 fs event watcher는 닫고 다시 시작해야 한다.

## 관측과 시간

`uv_now()`는 임의 기준점부터 증가하는 cached 밀리초 시간이다. epoch 시간이 아니다. 긴 callback 뒤 필요한 경우 `uv_update_time()`으로 갱신한다. 나노초 단위 구간 측정은 `uv_hrtime()`을 사용한다.

`uv_loop_configure()`는 일반적으로 첫 `uv_run()` 전에 호출하고 미지원 옵션의 `UV_ENOSYS`를 처리한다.

- `UV_LOOP_BLOCK_SIGNAL`: poll 중 SIGPROF를 차단하여 sampling profiler의 불필요한 wakeup을 줄인다. 다른 시그널은 `UV_EINVAL`이다.
- `UV_METRICS_IDLE_TIME`: kernel event provider에서 기다린 누적 시간을 수집한다(1.39.0+).
- `UV_LOOP_USE_IO_URING_SQPOLL`: Linux의 비동기 파일 I/O용 SQPOLL을 명시적으로 켠다(1.49.0+).

`uv_metrics_idle_time()`은 설정 이후 provider에서 대기한 누적 나노초 시간이며 스레드 안전하다. CPU idle, 요청 지연, worker idle을 그대로 뜻하지 않는다. 두 시점의 차이와 같은 구간의 경과 시간을 비교해 해석한다.

`uv_metrics_info()`(1.45.0+)는 `loop_count`, 처리한 `events`, provider 호출 시 이미 대기 중이던 `events_waiting`을 복사한다. 카운터 일관성을 위해 prepare callback에서 읽는 방식이 권장된다. provider 대기 시간이 짧은 원인은 부하 외에도 active idle이나 NOWAIT 설정일 수 있다.

## 버전과 오래된 예제

v1.x는 1.0부터 semantic versioning을 따르며 minor release에 API가 추가된다. `UV_VERSION_*`, `UV_VERSION_HEX`는 빌드 시 조건부 컴파일에, `uv_version()/uv_version_string()`은 실행 시 라이브러리 버전 확인에 사용한다. 개발 snapshot에는 suffix가 붙을 수 있다.

현재 온라인 v1.x 문서에는 1.53.0에 명시된 계약도 있다. 사용하는 Node.js가 이 버전을 포함한다고 가정하지 말고 Node의 `process.versions.uv`와 해당 배포의 header/API를 확인한다. C 라이브러리에 존재하는 기능과 Node.js가 JavaScript로 공개한 기능도 다르다.

User guide는 v1.42.0 기반 예제이며, 일부 절과 코드에 미검토 경고, TODO, 알려진 오류가 있다. `uv_fs_t.errorno`, `uv_err_t`, 오래된 루프 순서, 미완성 정리 예제를 현재 계약으로 복제하지 않는다. API reference를 우선한다.

0.10에서 1.0으로 바뀐 주요 계약은 다음과 같다.

- loop 메모리를 사용자가 할당하고 `uv_loop_init/close`로 관리한다.
- `uv_last_error()`와 -1 중심 처리 대신 반환값/status의 실제 음수 에러를 사용한다.
- Unix/Windows thread pool 구현이 통합됐다.
- alloc callback이 `uv_buf_t*`를 채우고 read/recv callback은 `const uv_buf_t*`를 받는다.
- IPv4/IPv6 bind API가 `sockaddr*` 기반으로 통합됐다.
- `uv_read2_start` 대신 pipe pending count/type과 `uv_accept`를 사용한다.
- 내부 FD 필드 대신 `uv_fileno()`, 옛 `uv_fs_readdir` 대신 `uv_fs_scandir/next`를 사용한다. 현재의 directory stream `uv_fs_readdir`는 별도 API다.

## 출처

- [libuv 개요](https://docs.libuv.org/en/v1.x/index.html), [API 개요](https://docs.libuv.org/en/v1.x/api.html)
- [Design overview](https://docs.libuv.org/en/v1.x/design.html)
- [Event loop API](https://docs.libuv.org/en/v1.x/loop.html), [Metrics](https://docs.libuv.org/en/v1.x/metrics.html)
- [Version checking](https://docs.libuv.org/en/v1.x/version.html)
- [User guide](https://docs.libuv.org/en/v1.x/guide.html), [Introduction](https://docs.libuv.org/en/v1.x/guide/introduction.html), [Basics](https://docs.libuv.org/en/v1.x/guide/basics.html)
- [Advanced event loops](https://docs.libuv.org/en/v1.x/guide/eventloops.html), [About](https://docs.libuv.org/en/v1.x/guide/about.html)
- [Upgrading](https://docs.libuv.org/en/v1.x/upgrading.html), [0.10에서 1.0 이행](https://docs.libuv.org/en/v1.x/migration_010_100.html)

## 관련 문서

- [[libuv]], [[libuv-Handles]], [[libuv-Threading]]
- [[Event-Loop]], [[Node.js]], [[V8]]
