---
tags: [database, concurrency, race-condition, os, synchronization]
status: done
verified_at: 2026-10-05
category: "Data & Storage - RDB"
aliases: ["OS 수준 동기화", "Mutex Semaphore Spinlock"]
---

# OS 수준 동기화 기초 (Mutex, Semaphore, Spinlock)

분산/앱 레벨 도구를 이해하려면 **OS 수준 개념**이 기초. 세 가지 전형적 동시성 문제와 해결 도구:

## 3대 동시성 문제
- **Mutual Exclusion (상호 배제)**: 공유 자원에 동시 접근 막기 — 해결 필요
- **Deadlock (교착)**: 여러 프로세스가 서로의 자원을 기다리며 무한 대기
- **Starvation (기아)**: 특정 프로세스가 영원히 자원 못 받음

## Mutex (뮤텍스)
- 공유 자원에 **한 스레드만** 접근 허용
- **locking ↔ unlocking** 원자적 연산
- 소유자만 해제 가능 (ownership)

## Semaphore (세마포어)
- **카운터**로 자원 상태 관리
- N개 스레드까지 **동시 접근** 허용 (N = 자원 수)
- 소유 개념 없음 (누구나 해제 가능)
- 초기값을 0으로 두면 **실행 순서**를 맞추는 데 쓴다. 한 흐름이 wait로 기다리고 다른 흐름이 선행 작업을 마친 뒤 signal한다. wait와 signal을 호출하는 주체가 달라도 된다
- Mutex를 **Binary Semaphore (N=1)** 와 같은 것으로 보지 않는다. 소유자가 없으면 누가 해제할지 알 수 없어 우선순위 상속을 적용할 수 없고, 소유자가 아닌 해제도 막지 못한다. 상호배제에는 Mutex, 순서 맞추기와 수량 제한에는 Semaphore를 쓴다 ([[Concurrency-and-Process-Synchronization#뮤텍스와 binary semaphore는 다르다|뮤텍스와 binary semaphore의 차이]])

## 스핀락 (Spinlock)
- 락 획득 실패 시 **busy waiting** (루프 돌며 재시도)
- 멀티코어에서 락 예상 보유 시간 < 컨텍스트 스위치 비용일 때 유용 (짧은 critical section)
- 단일 코어에서는 보유자가 실행되어야 락이 풀리므로 도는 시간만큼 손해다
- 단순 스핀락은 공정성을 보장하지 않는다. 실제 mutex 구현은 경합이 없으면 원자적 명령으로 끝내고 경합할 때만 잠드는 혼합형이 많고, 잠들기 전에 잠깐 도는 구현도 있다(DB의 2단계 잠금과 다른 OS의 two-phase lock)
- OS 커널, 저수준 동시성 제어에서 사용

## 비교표

| 도구 | 허용 스레드 | Ownership | 대기 방식 | 적합 상황 |
|---|---|---|---|---|
| Mutex | 1 | O | block | 일반 critical section |
| Semaphore(N) | N | X | block | 리소스 풀, 연결 수 제한 |
| Binary Semaphore | 1 | X | block | 신호 (이벤트) |
| Spinlock | 1 | O/X | busy loop | 멀티코어의 매우 짧은 구간, 커널 |

앱 레벨 라이브러리(async-mutex, Redisson, 분산락)는 이 OS 개념을 **애플리케이션 추상화 레벨**로 끌어올린 것. 근본 원리는 동일.

## 출처

- [Microsoft .NET Documentation, SpinWait](https://learn.microsoft.com/en-us/dotnet/standard/threading/spinwait)
- [Linux Kernel Documentation, Lock types and their rules](https://docs.kernel.org/locking/locktypes.html)
- [Locks — Operating Systems: Three Easy Pieces, Remzi H. Arpaci-Dusseau, Andrea C. Arpaci-Dusseau](https://pages.cs.wisc.edu/~remzi/OSTEP/threads-locks.pdf)
- [YouTube, 쉬운코드, 스핀락(spinlock), 뮤텍스(mutex), 세마포(semaphore)의 특징과 차이](https://www.youtube.com/watch?v=gTkvX2Awj6g)

## 관련 문서
- [[Race-Condition-Patterns|Race Condition 패턴 (인덱스)]]
- [[Concurrency-and-Process-IPC|동시성과 프로세스, IPC]]
- [[Concurrency-and-Process-Synchronization|동기화 도구: 스핀락, 뮤텍스, 세마포어]]
- [[Lock|DB Lock]]
- [[Distributed-Lock|분산 락 (Redlock, fencing token)]]
