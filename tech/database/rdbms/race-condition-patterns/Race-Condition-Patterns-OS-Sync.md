---
tags: [database, concurrency, race-condition, os, synchronization]
status: done
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
- Mutex는 **Binary Semaphore (N=1)** 의 특수 케이스로 볼 수 있지만, 엄밀히는 ownership 여부로 구분

## 스핀락 (Spinlock)
- 락 획득 실패 시 **busy waiting** (루프 돌며 재시도)
- 컨텍스트 스위치 비용 < 락 예상 보유 시간일 때 유용 (짧은 critical section)
- OS 커널, 저수준 동시성 제어에서 사용

## 비교표

| 도구 | 허용 스레드 | Ownership | 대기 방식 | 적합 상황 |
|---|---|---|---|---|
| Mutex | 1 | O | block | 일반 critical section |
| Semaphore(N) | N | X | block | 리소스 풀, 연결 수 제한 |
| Binary Semaphore | 1 | X | block | 신호 (이벤트) |
| Spinlock | 1 | O/X | busy loop | 매우 짧은 구간, 커널 |

앱 레벨 라이브러리(async-mutex, Redisson, 분산락)는 이 OS 개념을 **애플리케이션 추상화 레벨**로 끌어올린 것. 근본 원리는 동일.

## 관련 문서
- [[Race-Condition-Patterns|Race Condition 패턴 (인덱스)]]
- [[Concurrency-and-Process-IPC|동시성과 프로세스, IPC]]
- [[Lock|DB Lock]]
- [[Distributed-Lock|분산 락 (Redlock, fencing token)]]
