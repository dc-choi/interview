---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
verified_at: 2026-10-01
aliases: ["libuv Threading", "libuv 스레드 풀", "libuv 스레딩", "libuv 에러"]
---

# libuv 스레드 풀과 스레드 간 통신

libuv의 work queue는 루프에서 blocking 작업을 분리하고 완료를 원래 loop 스레드로 돌려준다. 직접 만든 native thread, JavaScript [[Worker-Threads]], libuv pool은 각각 다른 실행 자원이다.

## 전역 스레드 풀

pool은 **프로세스 전체의 모든 event loop가 공유**한다. 기본 4개이며 `UV_THREADPOOL_SIZE`를 startup에 지정한다. 최대치는 1.30.0부터 1024(이전 128)다. 최초 pool 사용 때 설정된 전체 스레드를 초기화하므로 작업마다 스레드를 생성하지 않는다.

1.45.0부터 worker stack은 8MB이며 대부분의 플랫폼에서 실제 stack은 필요에 따라 커진다. 1.50.0부터 기본 이름은 libuv-worker다. 크기 증가가 항상 지연을 줄이지는 않으며 메모리, CPU contention과 OS 한도를 포함해서 판단한다.

| pool 작업 | loop에서 수행하는 작업 |
|---|---|
| 기본 파일시스템 I/O | TCP/UDP nonblocking I/O와 callback |
| 시스템 getaddrinfo/getnameinfo | timer, poll, handle 단계 callback |
| 사용자 uv_queue_work의 work callback | after_work callback |

Linux 파일 I/O의 선택적 io_uring 경로는 [[libuv-Filesystem]]을 본다. Node.js의 일부 crypto/zlib 작업도 pool을 이용하지만 그것은 상위 런타임이 제출한 작업이다. Node의 c-ares resolve를 getaddrinfo의 pool 경로와 혼동하지 않는다.

pool을 늘려도 loop callback의 직렬 실행은 병렬화되지 않는다. 반대로 파일/DNS/CPU 작업을 같은 pool에 많이 넣으면 서로 대기 시간을 늘린다. loop가 여러 개라는 이유만으로 pool이 개별 격리되는 것도 아니다.

## 사용자 작업과 baton

```c
int uv_queue_work(uv_loop_t *loop, uv_work_t *req,
                  uv_work_cb work_cb,
                  uv_after_work_cb after_work_cb);
```

work_cb는 pool 스레드에서, after_work_cb는 제출한 loop의 스레드에서 실행된다. 요청 context는 `req->data`로 전달한다. work_cb에서 loop/handle API나 JavaScript/V8 객체를 직접 조작하지 않는다. thread-safe라고 명시된 API만 별도로 사용할 수 있다.

request와 입력/출력 데이터를 묶은 구조체를 baton이라고 부르는 패턴이 있다. request를 첫 멤버로 두면 공통 포인터 캐스팅이 쉽지만 이것이 스레드 동기화를 제공하지는 않는다. 완료 callback까지 구조체와 필요한 데이터 수명을 유지하고, 제출 오류라면 callback이 오지 않으므로 호출 측에서 정리한다.

main과 worker가 동시에 바꾸는 데이터는 mutex 또는 적절한 atomic 규약을 사용한다. 작업 완료 뒤 loop callback에서 결과를 소비하고 baton을 해제하면 수명 경계가 명확해진다.

`uv_cancel()`은 아직 실행되지 않은 work를 취소하고 after_work에 `UV_ECANCELED`를 전달한다. 시작된 장기 작업은 강제 중단하지 못한다. 종료 플래그를 주기적으로 확인하는 협력적 취소가 필요하다. 취소 성공 뒤에도 완료 callback 전 메모리를 해제하면 안 된다. 전체 request 취소 계약은 [[libuv-Handles#취소는 완료를 기다리는 작업]]을 본다.

## 직접 스레드 만들기

native threading API는 event loop 없이도 사용할 수 있다. `uv_thread_create(tid, entry, arg)`는 void entry와 context를 실행한다. `uv_thread_join()`은 종료까지 호출 스레드를 막으며 pthread_join처럼 반환값 pointer를 받지 않으므로 결과는 공유 context에 저장한다.

`uv_thread_create_ex()`는 STACK_SIZE flag와 stack_size를 받는다. 0은 기본 크기, 다른 값은 page 경계로 올림한다. options 구조체의 크기/layout은 이후 확장될 수 있으므로 고정된 바이너리 layout을 가정하지 않는다.

`uv_thread_detach()`(1.50.0+)는 종료 시 thread 자원을 자동 해제하게 한다. detach는 실행 중인 context나 동기화 객체까지 자동 해제하지 않는다. 종료 확인이 필요한 자원에는 join이나 별도 완료 규약을 선택한다.

`uv_thread_self/equal`로 ID를 다루며 Unix의 pthread_t 구현에 직접 의존하지 않는다. name과 priority API는 이미 종료한 thread에 호출하면 undefined behavior다. name 길이는 플랫폼 한도를 넘으면 잘리고 getname은 NUL 여유가 필요하다.

affinity는 byte 단위 CPU mask와 `uv_cpumask_size()` 이상 용량을 사용한다(1.45.0+). macOS 미지원, Windows 변경은 원자적이지 않다. `uv_thread_getcpu()`는 현재 Windows/Linux/FreeBSD만 지원한다. thread priority는 OS별 실제 값과 권한 요구가 다르며 set/get 왕복 값이 같다고 가정하지 않는다.

## 동기화 프리미티브

| 프리미티브 | 역할과 주의점 |
|---|---|
| mutex | 배타적 접근, init/lock/unlock/destroy와 trylock |
| recursive mutex | 같은 thread의 재진입, condition variable과 함께 사용하지 않음 |
| rwlock | 동시 reader와 배타적 writer, 공정성이나 writer 우선 보장을 추정하지 않음 |
| semaphore | permit count, wait는 block, trywait는 즉시 결과 |
| condition variable | mutex와 predicate를 함께 사용하고 깨어나면 조건 재확인 |
| barrier | count만큼 도착할 때까지 기다리는 동기화 지점 |

일반 mutex의 재진입 동작은 플랫폼에 따라 다르다. Windows mutex는 재귀적이라는 guide 설명을 portable한 재귀 보장으로 사용하지 않는다. 명시적 recursive API와 재진입을 피하는 설계를 구분한다. 다른 thread가 소유한 mutex를 대신 unlock하는 방식은 사용하지 않는다.

`uv_cond_wait/timedwait()`는 spurious wakeup이 가능하다. timeout은 호출 시점 기준 상대 나노초다. condition이 실제 만족했는지를 반복 확인하며 recursive mutex를 함께 사용하지 않는다.

`uv_barrier_wait()`의 양수 반환은 임의로 선택된 serializer thread다. 이 역할을 정리에 쓸 수 있지만 다른 thread의 마지막 접근이 끝나는 수명까지 보장해야 한다. 동기화 객체를 destroy한 뒤 재사용하지 않는다.

`uv_once()`는 `UV_ONCE_INIT`으로 정적 초기화한 같은 guard에 대해 딱 한 번 callback을 실행하며 다른 caller는 기다린다. guard를 pointer로 전달한다. `uv_key_create/get/set/delete`는 TLS pointer 슬롯이며 키 수 한도가 있을 수 있다. 슬롯에 넣은 객체의 소유권은 별도 관리한다.

## uv_async는 알림 병합

`uv_async_init()`은 성공 즉시 active handle을 만든다. callback NULL도 허용된다. 다른 thread 또는 native signal handler에서 `uv_async_send()`로 깨우면 callback은 **loop 스레드**에서 실행된다. async handle을 닫기 전 sender를 종료시켜 해제된 handle 접근을 막는다.

여러 send가 한 callback으로 합쳐질 수 있다. send 횟수를 작업 개수로 해석하지 않는다. 메시지마다 처리가 필요하면 mutex/atomic으로 보호한 queue를 두고 callback에서 queue를 drain한다. 최신 진행률만 필요하다면 상태 값을 읽는 방식으로 충분하다.

현재 API는 1.53.0부터 같은 async handle의 send와 callback을 sequentially consistent로 명시한다. send 이전 memory access가 callback에서 관찰되도록 하는 fence 계약이다. 이전 버전의 coalescing 경우에는 full seq_cst fence가 필요할 수 있다는 공식 설명을 확인한다.

이 fence도 동시에 여러 thread가 공유 구조체를 무잠금 변경하는 것을 허용하지 않는다. data 필드 자체는 concurrent message queue가 아니므로 atomics/lock과 소유권을 지킨다. 온라인 최신 계약을 Node.js 번들 버전에 그대로 적용하지 않는다.

`uv_async_send()`는 async-signal-safe지만 mutex/rwlock은 signal handler 안에서 사용하지 않는다. signal handler는 최소한의 안전한 알림만 보내고 실제 작업은 loop callback에서 수행한다.

## 완료 시점과 오류 분류

libuv 대부분의 int 반환/status에서 음수는 `UV_E*` 오류다. Unix errno의 부호를 바꾼 구현에 의존하지 말고 상수로 비교한다. Windows는 별도 값이다.

- 제출 즉시 오류: callback이 오지 않는다. 호출 측이 request와 입력을 정리한다.
- 제출 성공 뒤 완료 오류: callback에서 정리와 retry/종료를 결정한다.
- 취소: callback까지 수명을 유지하고 `UV_ECANCELED`를 일반 실패와 구분한다.
- stream EOF: `UV_EOF`, 파일 read EOF: result 0이다.

`UV_EAGAIN`은 지금 진행 불가, `UV_EBUSY`는 자원/작업 상태 충돌, `UV_ENOSYS/ENOTSUP`은 기능/플랫폼 미지원, `UV_EINVAL`은 입력/상태 문제를 구분한다. DNS에는 `UV_EAI_*` 계열이 있다.

`uv_err_name/uv_strerror`는 알려지지 않은 오류 코드에서 작은 메모리 누수가 발생할 수 있다. 사용자 buffer를 채우는 `*_r` 변형(1.22.0+)도 있다. `uv_translate_sys_error()`는 errno/GetLastError/WSAGetLastError를 portable 코드로 바꾸며 이미 libuv 오류면 그대로 반환한다.

## 출처

- [Thread pool](https://docs.libuv.org/en/v1.x/threadpool.html), [Threading API](https://docs.libuv.org/en/v1.x/threading.html)
- [Async](https://docs.libuv.org/en/v1.x/async.html), [Request cancellation](https://docs.libuv.org/en/v1.x/request.html)
- [Errors](https://docs.libuv.org/en/v1.x/errors.html), [Threads guide](https://docs.libuv.org/en/v1.x/guide/threads.html)

## 관련 문서

- [[libuv]], [[libuv-Handles]], [[libuv-Filesystem]], [[Worker-Threads]], [[Async-Internals]]
