---
tags: [os, concurrency, synchronization, ipc, deadlock]
status: done
verified_at: 2026-10-05
category: "OS&런타임(OS&Runtime)"
aliases: ["원자성과 IPC", "동기화와 교착상태", "Synchronization and IPC", "임계구역 문제", "Critical Section Problem"]
---

# 원자성, 동기화, IPC

공유 상태의 정합성을 지키려면 한 연산의 경계, 실행 순서와 대기 조건을 명시해야 한다. 프로세스 사이에서는 통신 방식과 격리 경계까지 함께 선택한다.

## 원자성, 경쟁 조건, 임계구역

- **원자적 연산**: 다른 실행 흐름이 중간 상태를 관찰할 수 없는 하나의 단위처럼 수행되는 연산
- **경쟁 조건**: 여러 프로세스나 스레드가 같은 데이터를 동시에 조작할 때 타이밍이나 접근 순서에 따라 결과가 달라지는 상태
- **임계구역**: 공유 불변식을 깨지 않도록 동시 진입을 제한해야 하는 코드 구간
- **동기화**: 여러 흐름을 동시에 실행해도 공유 데이터의 일관성이 유지되도록 상호배제, 사건 순서, 조건 대기와 메모리 가시성을 조정하는 메커니즘

락으로 감싼 코드 전체가 하드웨어적으로 한 명령이 되는 것은 아니다. 락의 계약을 지키는 참여자에게 임계구역의 상호배제와 happens-before 관계를 제공하는 것이다. 화장실 문을 잠그는 lock부터 unlock까지가 다른 사람이 끼어들 수 없는 구간이고, 공유하는 사람이 없는 1인 가구라면 잠글 이유가 없다. 이런 보장은 공유 자원이 있을 때만 필요하다.

### 한 줄 코드도 여러 명령이다

공유 카운터의 `count++`는 소스에서 한 문장이지만 CPU에서는 메모리 값을 레지스터로 읽고(load), 1을 더하고(add), 다시 메모리에 쓰는(store) 여러 명령이다. 레지스터 값은 스레드 문맥으로 저장되고 복원되므로, 중간에 컨텍스트 스위칭이 일어나면 낡은 계산 결과가 나중에 그대로 기록된다.

| 순서 | 스레드 T1 | 스레드 T2 | 메모리의 count |
|---|---|---|---|
| 1 | load (레지스터 0) | | 0 |
| 2 | add (레지스터 1) | | 0 |
| 3 | 컨텍스트 스위칭으로 중단 | load, add, store | 1 |
| 4 | store (레지스터 1) | | 1 |

두 번 증가시켰지만 결과는 1이다. 멀티코어에서는 컨텍스트 스위칭이 없어도 두 코어가 같은 값을 동시에 읽어 같은 결과가 나온다. 스레드끼리뿐 아니라 공유 메모리나 파일을 함께 쓰는 프로세스끼리도 같은 문제가 생긴다.

### 동기화, 데이터 동기화, 동기 호출의 구분

한국어에서 동기화와 동기는 서로 다른 뜻으로 섞여 쓰인다.

| 표현 | 뜻 | 관련 문서 |
|---|---|---|
| 동기화 (synchronization) | 경쟁하는 실행 흐름 사이의 상호배제, 순서, 조건 대기와 가시성 조정. 어느 흐름이 가고 어느 흐름이 멈출지 정하는 신호등이나 잠금장치에 가깝다 | 이 문서 |
| 데이터 동기화 | 원본과 사본의 내용을 일치시킴 (파일 동기화, DB 복제, 캐시 갱신) | [[Replication|DB 복제]], [[Cache-Invalidation|캐시 무효화]] |
| 동기 호출 (synchronous) | 호출자가 결과가 완료될 때까지 기다리는 호출 방식 | [[Sync-Async-Blocking|동기, 비동기, 블로킹, 논블로킹]] |

세 뜻은 서로 다른 축이다. 동기 호출을 쓴다고 상호배제가 생기지 않고, 비동기 코드에도 실행 조정으로서의 동기화가 필요하다(아래 `await` 사이 lost update).

### 임계구역 문제와 해결 조건

임계구역 문제는 공유 데이터를 바꾸는 임계구역에 여러 흐름이 동시에 들어가지 않도록 진입 규약을 설계하는 문제다. 각 흐름의 코드는 다음 구조로 본다.

| 구역 | 역할 |
|---|---|
| 진입 구역 (entry section) | 임계구역에 들어갈 수 있는지 확인하고 허가를 얻는다 |
| 임계구역 (critical section) | 공유 데이터를 다룬다 |
| 퇴장 구역 (exit section) | 다음 흐름이 들어올 수 있도록 상태를 되돌린다 |
| 나머지 구역 (remainder section) | 공유 데이터와 무관한 나머지 코드 |

해결책은 세 조건을 모두 만족해야 한다.

1. **상호배제 (mutual exclusion)**: 한 흐름이 임계구역을 실행 중이면 다른 흐름은 임계구역을 실행할 수 없다. 세마포어처럼 N개까지 허용하는 도구는 허용 수를 넘지 않는 것으로 일반화한다.
2. **진행 (progress)**: 임계구역이 비어 있고 들어가려는 흐름이 있으면, 다음에 들어갈 흐름의 선택이 무한히 미뤄지지 않는다.
3. **한정된 대기 (bounded waiting)**: 한 흐름이 진입을 요청한 뒤 허가받기 전까지 다른 흐름이 먼저 들어갈 수 있는 횟수에 상한이 있다.

상호배제는 safety, 진행과 한정된 대기는 liveness 성질이다. 실제 lock API가 모두 한정된 대기를 보장하는 것은 아니므로(단순 스핀락이 대표적이다) 기아가 문제 되는 경로에서는 사용하는 lock의 공정성 옵션과 대기 시간 상한을 확인한다. 대기 시간을 줄이려면 임계구역에 들어간 흐름이 최대한 빨리 나오게 한다. 외부 호출이나 느린 I/O처럼 공유 상태와 무관한 작업은 임계구역 밖으로 뺀다.

### 인터럽트를 끄는 방식의 한계

임계구역 동안 인터럽트를 꺼서 컨텍스트 스위칭을 막으면 단일 CPU에서는 원자적으로 실행된 효과를 얻는다. 그러나 일반 해법은 아니다.

- 멀티코어에서는 다른 CPU의 스레드가 같은 임계구역을 동시에 실행하므로 막지 못한다.
- 인터럽트 제어는 특권 연산이다. 사용자 프로그램에 맡기면 CPU를 독점하거나 무한 루프로 시스템을 멈출 수 있다.
- 오래 끄면 장치 완료 같은 인터럽트를 놓칠 수 있고, 임계구역이 길면 다른 흐름이 기아에 빠진다.

그래서 운영체제 커널이 자기 자료구조를 짧게 보호할 때처럼 제한된 곳에만 쓰고, 일반 해법은 CPU의 원자적 명령 위에 만든 lock이다.

### 스레드 안전성 확인

공유 상태를 가진 클래스를 멀티스레드에서 그대로 쓰면 경쟁 조건이 생긴다. 직접 만든 카운터뿐 아니라 표준 라이브러리 클래스도 마찬가지다. Java의 `SimpleDateFormat`은 동기화되지 않아 스레드마다 인스턴스를 만들거나 외부에서 동기화해야 하고, API 문서는 불변이며 thread-safe한 `DateTimeFormatter`를 대안으로 제시한다([[Java-Standard-Library-Date-and-Time|Java 날짜와 시간]]). 멀티스레드 서버에서 공유할 클래스는 API 문서의 동기화 설명을 먼저 확인하고, 확인하기 어려우면 thread-safe한 대안을 쓰거나 공유하지 않는 구조로 바꾼다.

## 동기화 도구

스핀락, 뮤텍스, 세마포어의 동작과 선택 기준, 뮤텍스와 binary semaphore의 차이, 우선순위 역전은 [[Concurrency-and-Process-Synchronization|동기화 도구: 스핀락, 뮤텍스, 세마포어]]로, 모니터와 condition variable, bounded buffer와 Java monitor는 [[Concurrency-and-Process-Monitor|모니터와 condition variable]]로 분리했다.

## 교착상태, 라이브락, 기아

교착상태의 네 필요조건, 식사하는 철학자 예시, 조건별 예방 방법과 비용, 회피(은행원 알고리즘), 검출과 복구, 코드에서 생기는 교착상태와 진단, 라이브락과 기아는 [[Concurrency-and-Process-Deadlock|교착상태, 라이브락, 기아]]로 분리했다.

## 프로세스 간 통신

IPC는 서로 다른 주소 공간의 프로세스가 데이터나 사건을 주고받는 메커니즘이다. 크게 메모리를 공유하지 않고 메시지를 주고받는 방식(pipe, message queue, socket)과 같은 메모리를 직접 읽고 쓰는 공유 메모리로 나뉜다. 공유 메모리는 복사가 적은 대신 세마포어, 뮤텍스, 모니터로 동기화를 직접 해야 하고, 같은 문제가 메모리를 공유하는 한 프로세스의 스레드 사이에도 생긴다. signal, 파일, RPC도 협업 수단으로 쓰인다.

| 방식 | 특징 | 주의점 |
|---|---|---|
| pipe/FIFO | 바이트 스트림, 생산자와 소비자 연결 | 메시지 경계가 없어 구분 규칙을 애플리케이션이 정해야 함 |
| message queue | 커널이 메시지 단위를 큐잉 | 크기와 용량 제한, backpressure |
| shared memory | 같은 물리 메모리를 여러 주소 공간에 매핑 | 복사가 적지만 별도 동기화 필요 |
| socket | 로컬 또는 네트워크 endpoint 간 통신 | 스트림/데이터그램 의미가 protocol마다 다름 |
| signal/event | 작은 제어 사건 전달 | 전달 정보와 처리 제약이 큼 |

### 선택 기준: 방향, 양 끝의 공존, 범위

| 방식 | 방향 | 송수신 측이 함께 있어야 하는가 | 범위 |
|---|---|---|---|
| pipe | 단방향. 양방향은 pipe 두 개나 `socketpair` | 그렇다. 쓰는 끝이 모두 닫히면 읽기는 EOF, 읽는 끝이 모두 닫히면 쓰기는 `SIGPIPE`(무시하면 `EPIPE`) | 같은 호스트 |
| FIFO (named pipe) | 단방향 | 그렇다. 보통 반대쪽이 열릴 때까지 open이 막히고, 파일시스템에는 이름만 있고 내용은 커널 pipe 객체에만 있다 | 같은 호스트 |
| POSIX message queue | 양쪽이 같은 큐를 열어 보내고 받을 수 있음 | 아니다. `mq_unlink`나 시스템 종료 전까지 큐가 남아(kernel persistence) 송수신 측 수명이 분리된다 | 같은 호스트 |
| POSIX shared memory | 양방향 | 아니다. 객체는 `shm_unlink` 전까지 남지만 접근 순서는 따로 동기화한다 | 같은 호스트 |
| socket | 양방향 | 연결형은 양 끝이 있어야 함 | Unix domain socket은 같은 호스트, TCP와 UDP는 호스트 경계를 넘음 |

RPC는 transport 위에 요청/응답, 직렬화와 오류 의미를 얹는 상위 모델이다. regular file도 협업에 쓸 수 있지만 동시 업데이트, flush와 lock 규칙을 직접 설계해야 한다. 같은 프로세스의 thread가 공유 heap으로 통신하는 것은 inter-process communication이 아니다.

### 파일 잠금은 운영체제마다 다르다

- Windows는 `CreateFile`의 공유 모드(`dwShareMode`)로 다른 프로세스가 같은 파일을 어떤 접근으로 열 수 있는지 정한다. 이미 열린 핸들의 공유 모드와 충돌하는 접근을 요청하면 열기가 `ERROR_SHARING_VIOLATION`으로 실패하고, 공유 모드 0으로 연 파일은 그 핸들을 닫을 때까지 다시 열 수 없다. 쓰기 모드로 열면 다른 프로세스가 차단된다는 설명은 이 모델에 가깝고, 실제 결과는 먼저 연 쪽의 공유 모드에 달렸다.
- Linux와 Unix의 `fcntl` record lock, open file description lock과 `flock`은 기본적으로 advisory다. 같은 규약으로 lock을 잡는 협조적인 프로세스 사이에서만 효력이 있고, lock을 확인하지 않는 프로세스의 읽기와 쓰기는 막지 않는다. 쓰기 모드로 열었다고 다른 프로세스가 막히지도 않는다.
- Linux의 mandatory locking은 4.5부터 커널 설정(`CONFIG_MANDATORY_FILE_LOCKING`)에 따른 선택 기능이 됐고 5.15 이상에서는 지원되지 않는다.
- cron과 배치의 중복 실행은 `flock -n /var/lock/job.lock command`처럼 lock 파일로 막는다(`-n`은 기다리지 않고 실패). 같은 파일을 여러 프로세스가 갱신하면 모두 같은 lock 규약과 flush 시점을 따른다.
- 네트워크 파일시스템에서는 의미가 달라진다. NFS의 advisory lock은 서버 조치나 오래 끊긴 네트워크로 사라질 수 있고, SMB 마운트의 `flock()`은 Linux 5.5부터 SMB byte-range lock으로 흉내 내어 advisory가 아니게 된다. 컨테이너 bind mount처럼 경로가 바뀌는 배포에서는 lock 파일이 실제로 같은 파일시스템의 같은 파일인지 확인한다.

## 멀티프로세싱과 멀티스레딩

| 관점 | 여러 프로세스 | 한 프로세스의 여러 스레드 |
|---|---|---|
| 주소 공간 | 기본적으로 분리 | 코드, heap과 여러 자원 공유 |
| 통신 | IPC 필요 | 공유 메모리 접근이 직접적 |
| 격리 | 메모리 손상 범위를 줄임 | 치명적 process 오류는 모든 thread에 영향 가능 |
| 비용 | 주소 공간과 IPC 경계 비용 | 동기화, cache contention 비용 |

프로세스가 분리되어도 공유 파일, socket, supervisor 관계를 통해 장애가 전파될 수 있다. 스레드 하나의 일반 오류가 항상 전체 프로세스를 종료하는 것도 아니다. 언어 런타임과 오류 종류에 따라 다르다.

## 사용자 수준 task와 커널 thread

- **커널 thread/task**: 커널 스케줄러가 직접 실행 대상을 보고 CPU에 배치한다.
- **사용자 수준 task**: 런타임이 자체 큐에서 관리하며 하나 이상의 커널 thread에 매핑한다.
- **1:1, M:N 모델**: 사용자 실행 단위와 커널 실행 단위의 매핑 방식이다. 생성 비용, blocking 처리, 병렬성 제어의 tradeoff가 다르다.

싱글 스레드 이벤트 루프에서도 `await` 사이에 다른 작업이 끼어 논리적 lost update가 생길 수 있다. Worker나 shared memory를 쓰면 실제 data race도 고려한다. 데이터베이스의 dirty read/lost update는 DB transaction isolation과 동시성 제어의 별도 문제다.

## 관련 문서

- [[Concurrency-and-Process-Overview|OS 개요와 동시성]]
- [[Concurrency-and-Process-Synchronization|동기화 도구: 스핀락, 뮤텍스, 세마포어]]
- [[Concurrency-and-Process-Monitor|모니터와 condition variable]]
- [[Concurrency-and-Process-Deadlock|교착상태, 라이브락, 기아]]
- [[Concurrency-and-Process|동시성과 프로세스 (인덱스)]]
- [[Context-Switching|컨텍스트 스위칭과 CPU 스케줄링]]
- [[Concurrency-vs-Parallelism|동시성과 병렬성]]
- [[Thread-vs-Event-Loop|Thread vs Event Loop]]
- [[Race-Condition-Patterns-Toolbox|Race Condition 도구 선택과 경쟁 재현]]

## 출처

- 인프런, 널널한 개발자 강사, [원자성, 동기화 그리고 교착상태](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128253)
- 인프런, 감자 강사, [프로세스 간 통신](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100805), [공유자원과 임계구역](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100806)
- 인프런, 널널한 개발자 강사, [프로세스간 관계와 권한](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476541)
- YouTube, 쉬운코드, [동기화(synchronization), 경쟁 조건(race condition), 임계 영역(critical section)](https://www.youtube.com/watch?v=vp0Gckz3z64)
- [Concurrency: An Introduction — Operating Systems: Three Easy Pieces, Remzi H. Arpaci-Dusseau, Andrea C. Arpaci-Dusseau](https://pages.cs.wisc.edu/~remzi/OSTEP/threads-intro.pdf)
- [Locks — Operating Systems: Three Easy Pieces, Remzi H. Arpaci-Dusseau, Andrea C. Arpaci-Dusseau](https://pages.cs.wisc.edu/~remzi/OSTEP/threads-locks.pdf)
- [Synchronization Tools 강의 슬라이드 — Operating System Concepts 10th Edition, Silberschatz, Galvin, Gagne](https://www.os-book.com/OS10/slide-dir/PPTX-dir/ch6.pptx)
- [Java SE 26 API, SimpleDateFormat](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/text/SimpleDateFormat.html)
- [Java Language Specification 17.1, Synchronization](https://docs.oracle.com/javase/specs/jls/se25/html/jls-17.html#jls-17.1)
- [Linux pipe(7)](https://man7.org/linux/man-pages/man7/pipe.7.html)
- [Linux fifo(7)](https://man7.org/linux/man-pages/man7/fifo.7.html)
- [Linux mq_overview(7)](https://man7.org/linux/man-pages/man7/mq_overview.7.html)
- [Linux POSIX shared memory overview](https://man7.org/linux/man-pages/man7/shm_overview.7.html)
- [Linux socketpair(2)](https://man7.org/linux/man-pages/man2/socketpair.2.html)
- [Linux unix(7)](https://man7.org/linux/man-pages/man7/unix.7.html)
- [Linux fcntl_locking(2)](https://man7.org/linux/man-pages/man2/fcntl_locking.2.html)
- [Linux flock(2)](https://man7.org/linux/man-pages/man2/flock.2.html)
- [util-linux flock(1)](https://man7.org/linux/man-pages/man1/flock.1.html)
- [Microsoft Learn, CreateFileW function](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew)
