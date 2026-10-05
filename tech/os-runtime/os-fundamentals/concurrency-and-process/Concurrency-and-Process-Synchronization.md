---
tags: [os, concurrency, synchronization, spinlock, mutex, semaphore]
status: done
verified_at: 2026-10-05
category: "OS&런타임(OS&Runtime)"
aliases: ["동기화 도구", "Synchronization Primitives", "스핀락 뮤텍스 세마포어", "Mutex vs Semaphore", "우선순위 역전", "Priority Inversion"]
---

# 동기화 도구: 스핀락, 뮤텍스, 세마포어

[[Concurrency-and-Process-IPC|원자성, 동기화, IPC]]에서 분리한 동기화 도구 문서다. 경쟁 조건, 임계구역 문제와 해결 조건은 그 문서에 두고, 여기서는 조건을 만족시키는 도구의 동작과 선택 기준을 다룬다. 조건 대기까지 묶은 모니터는 [[Concurrency-and-Process-Monitor|모니터와 condition variable]]에 있다.

## lock의 기본 구조

여러 실행 흐름이 lock 획득을 두고 경합하고 성공한 하나만 임계구역에 들어간다. 일을 마치면 임계구역을 나오며 lock을 반환한다. 진입 구역의 획득과 퇴장 구역의 반환이 lock 연산이다.

lock 상태를 일반 변수로 검사한 뒤 설정하면(`while (flag == 1); flag = 1;`) 검사와 설정 사이에 다른 흐름이 끼어들어 둘 다 들어갈 수 있다. 그래서 lock 구현은 CPU가 제공하는 원자적 명령에 기댄다.

## test-and-set과 스핀락

test-and-set은 메모리 위치의 이전 값을 반환하면서 그 위치에 새 값(1)을 쓰는 일을 원자적으로 수행하는 하드웨어 명령이다. 실행 도중 끼어들 수 없고, 여러 코어가 같은 주소에 동시에 실행해도 하드웨어가 하나씩 차례로 처리한다. x86에서는 원자적 교환 명령 `xchg`가 이 역할을 한다. 교재가 보여 주는 C 함수 본문은 의미를 설명하는 모형일 뿐 실제 구현이 아니다.

```c
/* 의사 코드: lock 0은 비어 있음, 1은 사용 중 */
while (test_and_set(&lock) == 1)
    ;          /* 이전 값이 1이면 누군가 쥐고 있으므로 다시 시도 */
/* 임계구역 */
lock = 0;      /* 반환 */
```

- 비어 있을 때 호출한 흐름은 0을 받아 바로 들어가고 lock은 1이 된다. 다른 흐름은 1을 받는 동안 루프를 돈다. 보유자가 0으로 되돌린 뒤 가장 먼저 test-and-set을 실행한 흐름이 0을 받아 들어간다.
- lock을 얻을 때까지 반복 확인하는 이 방식이 스핀락이다. compare-and-swap 같은 다른 원자적 명령으로도 만든다([[Java-Atomic-and-Concurrent-Collections|Java Atomic과 CAS]]).

### 스핀락이 손해일 때와 이득일 때

- 기다리는 동안 CPU 사이클을 쓴다. 다른 흐름이 유용하게 쓸 수 있는 시간을 lock 확인에 소비한다.
- 단순 스핀락은 공정성을 보장하지 않는다. 경합이 심하면 특정 흐름이 계속 실패해 기아에 빠질 수 있다.
- 단일 CPU에서는 이득이 없다. lock이 풀리려면 보유자가 실행되어야 하는데 대기자가 CPU를 잡고 돈다. 선점형 스케줄러가 대기자를 내려야 보유자가 진행하므로 타임 슬라이스만큼 CPU를 낭비하고, 선점이 없으면 대기자가 CPU를 놓지 않는다.
- 멀티코어에서 임계구역이 잠들고 깨어나는 컨텍스트 스위칭보다 빨리 끝나면 스핀락이 유리하다. 보유자가 다른 코어에서 실행 중이므로 해제 직후 대기자가 문맥 전환 없이 바로 들어간다.

## 뮤텍스: lock을 얻을 수 없으면 잠든다

뮤텍스는 lock을 얻지 못한 흐름을 대기 큐에 넣어 재우고, 해제하는 쪽이 깨운다. 기다리는 동안 CPU를 쓰지 않는다.

교재식 구현은 lock 상태 값, 대기 큐, 그리고 이 둘을 바꾸는 짧은 구간만 지키는 스핀락(guard)으로 이루어진다.

| 연산 | 동작 |
|---|---|
| lock | guard를 test-and-set으로 얻는다. lock이 사용 중이면 자신을 큐에 넣고 guard를 놓은 뒤 잠든다. 비어 있으면 상태 값을 사용 중으로 바꾸고 guard를 놓는다 |
| unlock | guard를 얻는다. 큐에 대기자가 있으면 하나를 깨우고, 없을 때만 상태 값을 비어 있음으로 되돌린다. 어느 경우든 마지막에 guard를 놓는다. 깨울 때 값을 되돌리지 않는 것은 lock을 깨어난 흐름에 바로 넘기기 위해서다 |

- guard도 스핀락이지만 상태 값과 큐를 바꾸는 몇 개 명령 동안만 돌므로, 사용자 임계구역 전체 동안 도는 스핀락과 비용이 다르다.
- 큐에 들어가 guard를 놓은 직후 잠들기 전에 보유자가 unlock하며 깨우면, 깨우기가 먼저 지나가 영원히 잠들 수 있다(wakeup/waiting race). Solaris의 `setpark()`는 잠들 예정임을 미리 알려 그 사이 깨우기가 오면 잠들지 않게 하고, Linux futex는 커널이 값 검사와 잠들기를 원자적으로 처리한다.

실제 구현은 혼합형이 많다. glibc의 futex 기반 사용자 공간 mutex는 경합이 없으면 원자적 명령만으로 얻고 놓으며, 경합할 때만 커널에 들어가 잠든다. 그래서 mutex와 스핀락을 같은 것으로 보지 않는다. Linux 커널 mutex는 경합이 없으면 원자적 비교 교환 한 번으로 얻고, 커널 설정에 따라 보유자가 실행 중이면 곧 풀릴 것으로 보고 잠시 돌다가(optimistic spinning), 그래도 못 얻으면 대기 큐에서 잠든다. 먼저 잠깐 돌고 그다음 잠드는 방식을 two-phase lock이라 부르며 DB의 2단계 잠금(2PL)과는 다른 개념이다. 이득은 하드웨어, 스레드 수와 작업 부하에 따라 달라진다.

## 세마포어

세마포어는 정수 값과 대기 큐로 임계구역에 동시에 들어갈 수 있는 흐름의 수를 제한하고, 다른 흐름에 사건이 일어났다는 신호를 보내는 데도 쓰인다.

- `wait`(P, down): 값이 양수면 1 줄이고 진행하고, 0이면 큐에서 잠든다.
- `signal`(V, post, up): 값을 1 늘리고 기다리는 흐름이 있으면 하나를 깨운다. Linux 커널의 `up()`처럼 대기자가 있으면 값을 늘리지 않고 깨운 흐름에 바로 넘기는 구현도 있다.
- 초기값은 처음부터 내줄 수 있는 자원 수다. 공유 변수 하나를 지키는 lock이면 1, 좌변기 3칸이나 프린터 N대처럼 N개를 동시에 쓸 수 있으면 N, 아직 일어나지 않은 사건을 기다리면 0이다.
- 값이 0과 1만 오가면 binary semaphore, 1보다 큰 값을 쓰면 counting semaphore다. counting semaphore는 메모리를 많이 쓰는 구간이나 외부 연결처럼 동시에 실행할 수를 제한하는 throttling에도 쓴다.

### 실행 순서 맞추기

초기값 0인 세마포어 S로 사건의 순서를 강제할 수 있다.

| 흐름 | 실행 |
|---|---|
| P1 | task1 → `signal(S)` |
| P2 | task2 → `wait(S)` → task3 |

P1이 먼저 signal하면 값이 1이 되어 P2의 wait가 바로 통과한다. P2가 먼저 wait에 도달하면 값이 0이라 잠들었다가 P1의 signal에 깨어난다. 어느 쪽이 먼저든 task3는 task1 뒤에 실행된다. wait와 signal을 서로 다른 흐름이 호출한다는 점이 lock과 다르다.

### 오용 위험

임계구역마다 `wait`와 `signal`을 프로그래머가 직접 짝지어야 한다. 값 1로 상호배제에 쓸 때 `signal`을 먼저 부르고 `wait`를 나중에 부르면 값이 늘어 여러 흐름이 동시에 임계구역에 들어간다. `signal` 자리에 `wait`를 한 번 더 부르면 그 흐름 자신까지 영원히 막히고, `signal`을 빠뜨리면 나머지가 영원히 기다린다. 예외로 빠져나가는 경로에서 `signal`이 누락되는 것도 같은 실패다. 모니터는 이 짝 맞추기를 언어 구성으로 옮겨 위험을 줄인다.

## 뮤텍스와 binary semaphore는 다르다

값이 0과 1만 오가는 점은 같지만 계약이 다르다.

| 기준 | 뮤텍스 | binary semaphore |
|---|---|---|
| 소유권 | lock한 흐름이 소유자이고 소유자만 해제한다 | 소유자가 없어 wait한 흐름과 signal하는 흐름이 달라도 된다 |
| 소유자가 아닌 해제 | POSIX의 error-checking, recursive 타입과 robust mutex는 `EPERM`을 반환하고, non-robust인 normal, default 타입은 정의되지 않은 동작이다 | 정상적인 사용법이다. Linux 커널의 lock 유형 중 세마포어만 획득한 task가 해제해야 한다는 소유 규칙이 없다 |
| 우선순위 상속 | 소유자를 알 수 있어 적용할 수 있다 | 누가 signal할지 알 수 없어 높일 대상이 없다 |
| 주 용도 | 상호배제 | 실행 순서 맞추기, 수량 제한 |

상호배제만 필요하면 뮤텍스를, 작업 사이의 실행 순서를 맞춰야 하면 세마포어를 쓴다. Linux 커널 문서도 새 커널 코드에서는 세마포어 하나로 직렬화와 대기를 겸하지 말고 mutex와 completion처럼 두 메커니즘을 나눠 쓰라고 권한다. 세부 동작은 OS와 언어 런타임마다 다르므로 사용하는 API 문서를 확인한다.

### 우선순위 역전과 우선순위 상속

우선순위 기반 스케줄링에서 낮은 우선순위 L이 lock을 쥔 상태로 높은 우선순위 H가 그 lock을 기다리면 H는 L이 lock을 놓을 때까지 진행하지 못한다. 이때 lock과 무관한 중간 우선순위 M이 실행 가능해지면 스케줄러는 L보다 M을 먼저 실행하므로, H는 M보다 우선순위가 높은데도 M이 끝나기를 기다리게 된다. 이것이 우선순위 역전이다. 높은 우선순위를 항상 먼저 실행하는 단일 CPU에서 H가 L의 스핀락을 기다리며 돌면 L이 실행되지 못해 시스템이 멈출 수도 있다.

- **우선순위 상속**: lock을 기다리는 흐름 중 가장 높은 우선순위만큼 보유자의 우선순위를 임시로 올려 빨리 임계구역을 빠져나오게 하고, 해제하면 원래대로 되돌린다. Linux rt-mutex는 높아진 보유자가 다른 rt-mutex에 막히면 그 보유자에게도 상승을 전파한다.
- **자동이 아니다**: POSIX mutex의 protocol 속성 기본값은 `PTHREAD_PRIO_NONE`이다. `pthread_mutexattr_setprotocol`로 `PTHREAD_PRIO_INHERIT`를 지정해야 상속이 적용되고, `PTHREAD_PRIO_PROTECT`는 mutex마다 정한 priority ceiling까지 올리는 방식이다. Linux는 PI-futex와 rt-mutex로 `PTHREAD_PRIO_INHERIT`를 지원한다.
- **세마포어에는 적용할 수 없다**: 소유자를 모르면 높일 대상도 없다. Linux 커널 문서는 같은 이유로 PREEMPT_RT도 세마포어에 우선순위 상속을 제공하지 못해 세마포어 대기가 우선순위 역전을 일으킬 수 있다고 설명한다.
- **다른 해법**: 우선순위 역전이 생기는 구간에서 스핀락을 피하거나 관련 흐름의 우선순위를 같게 둔다.

## 도구 선택

| 목적 | 적합한 도구 | 핵심 계약 |
|---|---|---|
| 공유 불변식 보호 | mutex | 소유자 한 명, unlock 규칙 |
| N개 자원 수량 제한 | counting semaphore | permit 감소/증가 |
| 사건 순서 맞추기 | 초기값 0인 semaphore | wait와 signal을 다른 흐름이 호출 |
| 상태 조건을 기다림 | [[Concurrency-and-Process-Monitor\|monitor + condition variable]] | mutex와 predicate 재검사 |
| 멀티코어의 매우 짧은 임계구역 | spinlock | 잠들지 않고 반복 확인 |

## 면접 체크포인트

- test-and-set이 원자적이어야 하는 이유와 일반 flag 검사로 만든 lock이 깨지는 지점
- 스핀락이 단일 코어에서 손해이고 멀티코어의 짧은 임계구역에서 이득인 이유
- 뮤텍스가 잠들고 깨는 사이의 wakeup/waiting race와 이를 막는 커널 지원
- 세마포어의 초기값을 정하는 기준 (lock은 1, 수량 제한은 N, 순서 맞추기는 0)
- 뮤텍스와 binary semaphore의 차이 (소유권, 우선순위 상속, 용도)
- 우선순위 역전 시나리오와 우선순위 상속의 한계 (POSIX 기본값은 상속 없음, 세마포어는 적용 불가)

## 출처

- YouTube, 쉬운코드, [스핀락(spinlock), 뮤텍스(mutex), 세마포(semaphore)의 특징과 차이](https://www.youtube.com/watch?v=gTkvX2Awj6g)
- 인프런, 감자 강사, [세마포어](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100807)
- [Locks — Operating Systems: Three Easy Pieces, Remzi H. Arpaci-Dusseau, Andrea C. Arpaci-Dusseau](https://pages.cs.wisc.edu/~remzi/OSTEP/threads-locks.pdf)
- [Semaphores — Operating Systems: Three Easy Pieces, Remzi H. Arpaci-Dusseau, Andrea C. Arpaci-Dusseau](https://pages.cs.wisc.edu/~remzi/OSTEP/threads-sema.pdf)
- [Synchronization Tools 강의 슬라이드 — Operating System Concepts 10th Edition, Silberschatz, Galvin, Gagne](https://www.os-book.com/OS10/slide-dir/PPTX-dir/ch6.pptx)
- [Linux sem_wait(3)](https://man7.org/linux/man-pages/man3/sem_wait.3.html)
- [Linux sem_post(3)](https://man7.org/linux/man-pages/man3/sem_post.3.html)
- [POSIX pthread_mutex_lock(3p)](https://man7.org/linux/man-pages/man3/pthread_mutex_lock.3p.html)
- [POSIX pthread_mutexattr_getprotocol(3p)](https://man7.org/linux/man-pages/man3/pthread_mutexattr_getprotocol.3p.html)
- [Linux Kernel Documentation, Generic Mutex Subsystem](https://docs.kernel.org/locking/mutex-design.html)
- [Linux Kernel Documentation, RT-mutex subsystem with PI support](https://docs.kernel.org/locking/rt-mutex.html)
- [Linux Kernel Documentation, Lock types and their rules](https://docs.kernel.org/locking/locktypes.html)
- [kernel/locking/semaphore.c — Linux kernel source](https://github.com/torvalds/linux/blob/master/kernel/locking/semaphore.c)

## 관련 문서

- [[Concurrency-and-Process-IPC|원자성, 동기화, IPC]]
- [[Concurrency-and-Process-Monitor|모니터와 condition variable]]
- [[Concurrency-and-Process-Deadlock|교착상태, 라이브락, 기아]]
- [[Concurrency-and-Process|동시성과 프로세스 (인덱스)]]
- [[Context-Switching|컨텍스트 스위칭과 CPU 스케줄링]]
- [[Race-Condition-Patterns-OS-Sync|OS 수준 동기화 기초]]
