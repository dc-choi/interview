---
tags: [database, concurrency, race-condition, patterns]
status: index
category: "Data & Storage - RDB"
aliases: ["Race Condition Patterns", "경쟁 조건 패턴"]
---

# Race Condition 패턴과 해결

**여러 주체가 공유 자원에 동시 접근할 때 실행 순서, 타이밍에 따라 결과가 달라지는 현상**. 발생 지점, 규모에 따라 해결 도구가 다름. 핵심 원칙: **"락이 마지막 수단. 먼저 원자 연산, 낙관적 제어, 이벤트 큐를 검토"**.

## 하위 문서

- [[Race-Condition-Patterns-Process|층위 1: 프로세스 내부 (Node.js 이벤트 루프 race, async-mutex 패턴)]]
- [[Race-Condition-Patterns-DB-Distributed|층위 2와 3: 단일 DB 다중 서버, 분산 환경 (DB 락, 분산 락, Saga, 카카오 안티패턴 사례)]]
- [[Race-Condition-Patterns-Toolbox|도구 선택 플로차트, 흔한 실수, 면접 체크포인트]]
- [[Race-Condition-Patterns-OS-Sync|OS 수준 동기화 기초 (Mutex, Semaphore, Spinlock)]]

## 3가지 층위

| 층위 | 주체 | 해결 도구 |
|---|---|---|
| **단일 프로세스, 스레드 내부** | 같은 프로세스 안 여러 async 흐름 | async-mutex, 메모리 락 |
| **단일 DB에 여러 API 서버** | 다른 프로세스, 다른 서버 | DB 락 (Pessimistic, Optimistic) |
| **분산 환경** (여러 서버 + 여러 리소스) | 마이크로서비스, 여러 DB | 분산 락 (Redis Redlock, Zookeeper) |

문제의 층위를 잘못 잡으면 해결책이 비효율. 단일 서버인데 분산 락 쓰면 과함, 분산 환경에 메모리 락만 쓰면 무효.

## 출처
- [nodejsdesignpatterns — Node.js Race Conditions](https://www.nodejsdesignpatterns.com/blog/node-js-race-conditions/)
- [iredays — Race Condition과 예방 방법 (Mutex, Semaphore)](https://iredays.tistory.com/125)
- [varunkukade (Medium) — JavaScript: Synchronize async calls with async-mutex](https://medium.com/@varunkukade999/javascript-synchronize-async-calls-with-async-mutex-0cd1f8d2562c)
- [GitHub — DirtyHairy/async-mutex](https://github.com/DirtyHairy/async-mutex)
- [velog @imkkuk — Redis로 동시성 문제 해결하기](https://velog.io/@imkkuk/Redis%EB%A1%9C-%EB%8F%99%EC%8B%9C%EC%84%B1-%EB%AC%B8%EC%A0%9C-%ED%95%B4%EA%B2%B0%ED%95%98%EA%B8%B0)
- [towardsdev — Mutex Implementation in NestJS](https://towardsdev.com/mutex-implementation-in-nestjs-905ae890586a)
- [tech.kakao — 잃어버린 리포트를 찾아서 (경쟁 조건, 안티 패턴)](https://tech.kakao.com/posts/810)
- [4sii — Redis 분산 락](https://4sii.tistory.com/456)

## 관련 문서
- [[Lock|DB Lock (Shared, Exclusive, Gap, Next-Key)]]
- [[MySQL-Gap-Lock|MySQL Gap Lock]]
- [[Distributed-Lock|분산 락 (Redlock, fencing token)]]
- [[Redis-Atomic-Operations|Redis 원자적 연산]]
- [[Isolation-Level|Isolation Level]]
- [[Transactional-Outbox|Transactional Outbox]]
