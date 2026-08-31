---
tags: [linux, os, io, epoll, kqueue, interview]
status: done
verified_at: 2026-08-31
category: "OS&런타임(OS&Runtime)"
aliases: ["epoll", "kqueue", "I/O 멀티플렉싱", "Epoll Kqueue"]
---

# epoll, kqueue — I/O 멀티플렉싱

한 스레드가 수만 개의 연결을 동시에 감시하려면 커널이 준비된 소켓만 골라서 알려 줘야 한다. **epoll**(Linux)과 **kqueue**(BSD, macOS)는 그 통지를 담당하는 커널 API이고, 이전 세대인 `select`, `poll`의 확장성 한계를 해결하려고 나왔다. Node.js의 libuv, Nginx, Redis가 모두 이 위에 올라가 있어서 Unix 계열에서 이벤트 루프를 설명하면 대개 바닥에 이 API가 깔린다 (Windows에서 libuv는 IOCP를 쓴다).

## 핵심 명제

- **커널은 readiness만 알려 준다** — 실제 `read`/`write`는 애플리케이션이 직접 호출한다. 완료된 데이터를 커널이 버퍼에 채워 주는 completion 모델(IOCP)과 다른 층이다
- **등록 상태가 커널에 상주한다** — `epoll_ctl`로 한 번 등록하면 커널이 interest list를 유지한다. 호출마다 fd 집합 전체를 다시 넘기던 `select`, `poll`과의 결정적 차이
- **통지 비용이 감시 대상 수가 아니라 준비된 fd 수에 비례한다** — `epoll_wait`은 ready list만 수거한다
- **감시 상한은 결국 fd 한도와 커널 파라미터** — 이벤트 API를 바꿔도 프로세스가 열 수 있는 fd 수를 넘길 수는 없다 ([[File-Descriptor-Limit|fd 한도]])
- **소켓, 파이프, 터미널처럼 poll 가능한 fd만 대상** — Linux에서 정규 파일과 디렉터리 fd는 `epoll_ctl`이 `EPERM`으로 거부한다

## select, poll의 한계

`select(2)` man page는 신규 코드에서 쓰지 말라고 직접 권고한다. "All modern applications should instead use poll(2) or epoll(7), which do not suffer this limitation."

| 항목 | `select` | `poll` |
|---|---|---|
| fd 상한 | glibc `fd_set`이 고정 크기라 `FD_SETSIZE`(1024) 미만의 fd 번호만 감시 | 배열 크기만큼, 번호 상한 없음 |
| 인자 형태 | 읽기, 쓰기, 예외 3개의 비트마스크 | `struct pollfd` 배열(fd + events + revents) |
| 호출 후 인자 | 커널이 덮어써서 매 루프마다 재구성 필요 | `revents`만 채워지고 입력은 보존 |
| 공통 한계 | 호출할 때마다 fd 집합 전체를 커널로 복사하고 커널이 전체를 O(n) 스캔 | 동일 |

두 API 모두 감시 대상이 1만 개면 이벤트가 1개만 준비돼도 1만 개를 훑는다. 이것이 **C10K 문제**(동시 1만 연결 처리)의 출발점이었고, 그 해법으로 정리된 목록에 `/dev/poll`, kqueue, epoll이 함께 등장한다.

## epoll 3단 API

| 호출 | 역할 | 비고 |
|---|---|---|
| `epoll_create1(flags)` | epoll 인스턴스를 만들고 그 자체를 fd로 반환 | 이 fd도 프로세스 fd 한도를 소비한다 |
| `epoll_ctl(epfd, op, fd, event)` | interest list 갱신 | `op`는 `EPOLL_CTL_ADD`, `EPOLL_CTL_MOD`, `EPOLL_CTL_DEL` |
| `epoll_wait(epfd, events, max, timeout)` | ready list에서 준비된 이벤트만 수거 | 이벤트가 없으면 `timeout`까지 블로킹 |

- **interest list**: 감시하기로 등록한 fd 집합. 커널이 보관한다
- **ready list**: 그중 지금 I/O 가능한 fd의 부분집합. `epoll_wait`이 반환하는 대상
- 등록 비용은 `epoll_ctl` 한 번뿐이고 감시 루프는 `epoll_wait`만 반복한다. 매 루프의 fd 집합 복사가 사라지는 것이 성능 차이의 실제 원인이다
- man page 기준 등록된 fd 하나당 커널 메모리는 64비트 커널에서 대략 160바이트

## 레벨 트리거(LT)와 엣지 트리거(ET)

| 구분 | Level-Triggered (기본) | Edge-Triggered (`EPOLLET`) |
|---|---|---|
| 통지 조건 | 조건이 유지되는 동안 계속 보고 | 상태가 변할 때만 보고 |
| 소진 의무 | 없음. 일부만 읽고 다음 루프에 이어도 됨 | `read`/`write`가 `EAGAIN`을 낼 때까지 소진해야 함 |
| fd 모드 | 블로킹 fd로도 동작 가능 | 논블로킹 fd 필수 (블로킹이면 다른 fd가 굶는다) |
| 위험 | 처리 전까지 같은 이벤트가 반복 보고돼 루프가 바쁘게 돌 수 있음 | 남은 데이터를 두면 다음 통지가 오지 않아 연결이 멈춘다 |
| 대표 사용처 | 대부분의 애플리케이션 코드, 이해와 디버깅이 쉬움 | Nginx급 고성능 서버에서 syscall 횟수를 줄일 때 |

- ET에서 소진 루프를 돌면 데이터가 많은 fd 하나가 다른 fd를 굶길 수 있다. man page도 이 starvation을 지적하며, 애플리케이션이 자체 ready list를 두고 라운드로빈으로 나눠 처리하라고 권한다
- `EPOLLONESHOT`은 이벤트 1회 통지 후 해당 fd를 비활성화한다. 여러 워커 스레드가 같은 fd를 동시에 잡는 상황을 막을 때 쓰고, 다시 감시하려면 `EPOLL_CTL_MOD`로 재무장해야 한다

## 다중 프로세스 accept와 thundering herd

- 같은 listen 소켓을 여러 프로세스가 epoll에 등록하면 연결 하나에 모두 깨어나 하나만 accept에 성공한다
- **`EPOLLEXCLUSIVE`** (Linux 4.5 도입): 한 이벤트에 대해 대기자 중 일부만 깨운다. `EPOLL_CTL_ADD`에만 쓸 수 있고, 이후 같은 조합에 `EPOLL_CTL_MOD`를 걸면 `EINVAL`
- **`SO_REUSEPORT`** (Linux 3.9 도입): 프로세스별로 별도의 listen 소켓을 같은 주소에 바인드해 커널이 연결을 분배한다. 깨우는 수를 줄이는 것이 아니라 대기 큐 자체를 나누는 접근
- 둘은 층이 다르다. `EPOLLEXCLUSIVE`는 통지 대상 축소, `SO_REUSEPORT`는 소켓 분리다

## kqueue와의 대응

| 관점 | epoll (Linux) | kqueue (FreeBSD, macOS) |
|---|---|---|
| 인스턴스 생성 | `epoll_create1()` | `kqueue()` |
| 등록과 대기 | `epoll_ctl()`과 `epoll_wait()`로 분리 | `kevent()` 하나가 changelist와 eventlist를 함께 처리 |
| 등록 배치 | 한 호출에 fd 하나 | changelist 배열로 여러 변경을 한 번에 적용 |
| 기본 트리거 | 레벨 트리거 | 레벨 트리거, `EV_CLEAR`로 엣지 트리거 전환 |
| 1회성 통지 | `EPOLLONESHOT` | `EV_ONESHOT` |
| 감시 대상 | 소켓 등 poll 가능한 fd 중심 | 필터로 확장 |

kqueue의 필터는 소켓 밖의 이벤트까지 같은 큐로 통합한다는 점이 설계상 가장 큰 차이다.

- `EVFILT_READ`, `EVFILT_WRITE` — I/O readiness
- `EVFILT_VNODE` — 파일 삭제, 이름 변경, 속성 변경 감시
- `EVFILT_PROC` — 프로세스 exit, fork, exec
- `EVFILT_SIGNAL`, `EVFILT_TIMER` — 시그널 전달과 타이머

Linux는 같은 일을 `signalfd`, `timerfd`, `inotify` 같은 별도 fd로 만들어 epoll에 등록하는 방식으로 푼다. 결과는 비슷하지만 kqueue는 한 API 안에서 해결한다.

## readiness와 completion은 다른 층

epoll과 kqueue는 준비 상태를 알리는 readiness 모델이고, Windows의 IOCP는 커널이 I/O를 끝낸 뒤 완료를 알리는 completion 모델이다. 같은 비동기라는 말로 묶이지만 애플리케이션이 언제 `read`를 부르는가가 다르다. 두 축 정리와 흔한 오해(예: epoll이 IOCP로 발전했다는 서술)는 [[Sync-Async-Blocking|동기, 비동기, 블로킹, 논블로킹]]에 정리돼 있다. Linux의 `io_uring`은 readiness가 아니라 completion 계열의 제출, 완료 큐 구조다.

## 정규 파일에는 통하지 않는다

- `epoll_ctl(2)`의 `EPERM`: "The target file fd does not support epoll. This error can occur if fd refers to, for example, a regular file or a directory."
- 디스크 읽기는 대기 여부를 미리 알리는 readiness 개념 자체가 성립하지 않는다. 커널에 요청하면 캐시 히트든 디스크 접근이든 그 자리에서 처리되므로 준비됨을 기다릴 대상이 없다
- 그래서 파일 I/O는 스레드 풀이나 `io_uring` 같은 별도 경로로 간다. libuv가 파일 I/O를 스레드 풀에 넣는 설계 배경은 [[libuv-Architecture|libuv 아키텍처]]에 정리돼 있다

## 운영에서 만나는 지점

- **`/proc/sys/fs/epoll/max_user_watches`** — 사용자당 등록 가능한 fd 총량 상한. 커넥션 수를 늘리기 전에 fd 한도와 함께 확인한다
- **`EMFILE`** — accept 루프에서 fd가 고갈되면 accept가 실패하는데 listen 소켓은 계속 readable이라 바쁜 루프가 된다. 여유 fd를 하나 예약해 두고 고갈 시 그 fd를 닫아 accept한 뒤 즉시 닫는 방어가 관용적이다
- **fd 닫기와 등록 해제** — man page 기준 fd는 그 open file description을 참조하는 모든 fd가 닫힌 뒤에야 interest list에서 빠진다. `dup`, `fork`로 복제된 fd가 남아 있으면 닫았다고 생각한 fd의 이벤트가 계속 올 수 있으므로 명시적으로 `EPOLL_CTL_DEL`을 건다

## 흔한 실수

- **ET에서 소진하지 않음** — `EAGAIN`까지 읽지 않고 한 번만 읽으면 남은 데이터의 통지가 오지 않아 연결이 조용히 멈춘다
- **ET를 블로킹 fd에 사용** — 소진 루프의 마지막 `read`가 블로킹돼 이벤트 루프 전체가 멈춘다
- **`EPOLL_CTL_DEL` 없이 fd만 닫기** — 복제된 fd가 남아 있으면 유령 이벤트가 발생한다
- **`epoll_wait` 결과를 일부만 처리하고 루프 재진입** — LT면 다시 오지만 ET면 유실된다
- **정규 파일을 epoll에 등록** — Linux에서는 `EPERM`으로 실패한다. 비동기 파일 I/O가 필요하면 스레드 풀이나 `io_uring`
- **감시 API 교체만으로 동시 접속을 늘릴 수 있다고 기대** — fd 한도, `max_user_watches`, 메모리가 먼저 걸린다

## 면접 체크포인트

- epoll이 `select`보다 빠른 진짜 이유 — 알고리즘 트릭이 아니라 등록 상태가 커널에 상주해 매 호출의 fd 집합 복사와 전체 스캔이 사라지는 것
- LT와 ET 중 무엇을 언제 고르는가, ET 선택 시 반드시 따라오는 논블로킹 fd와 소진 루프 의무
- readiness와 completion의 차이, `epoll_wait` 자체는 블로킹될 수 있다는 점
- epoll과 kqueue의 API 형태 차이(3단 분리 vs `kevent` 단일 호출)와 kqueue 필터의 범용성
- 파일 I/O가 epoll 대상이 아닌 이유, 런타임이 스레드 풀을 두는 배경 ([[Event-Loop-Phases|이벤트 루프 단계]])
- Node.js와 Redis가 결국 같은 커널 API 위에 올라간다는 연결 ([[Redis-Architecture|Redis 아키텍처]])

## 출처
- [Linux man-pages, epoll(7)](https://man7.org/linux/man-pages/man7/epoll.7.html)
- [Linux man-pages, epoll_ctl(2)](https://man7.org/linux/man-pages/man2/epoll_ctl.2.html)
- [Linux man-pages, select(2)](https://man7.org/linux/man-pages/man2/select.2.html)
- [Linux man-pages, socket(7)](https://man7.org/linux/man-pages/man7/socket.7.html)
- [FreeBSD Manual Pages, kqueue(2)](https://man.freebsd.org/cgi/man.cgi?kqueue)
- [The C10K problem — kegel.com](http://www.kegel.com/c10k.html)

## 관련 문서
- [[Sync-Async-Blocking|동기, 비동기, 블로킹, 논블로킹]]
- [[libuv-Architecture|libuv 아키텍처와 이벤트 디멀티플렉서]]
- [[Event-Loop-Phases|Node.js 이벤트 루프 단계]]
- [[Async-IO|Async I/O]]
- [[Thread-vs-Event-Loop|Thread vs Event Loop]]
- [[Single-vs-Multi-Thread|Node.js 싱글 vs 멀티 스레드]]
- [[Redis-Architecture|Redis 아키텍처]]
- [[File-Descriptor-Limit|파일 디스크립터 한도]]
- [[Storage-and-FileSystem-Files|파일 디스크립터와 파일 구조]]
- [[CPU-Bound-Vs-IO-Bound|CPU 바운드와 I/O 바운드]]
- [[Linux-File-System|Linux 파일 시스템]]
