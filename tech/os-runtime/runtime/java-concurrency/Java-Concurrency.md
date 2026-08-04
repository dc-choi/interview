---
tags: [java, concurrency, thread, jmm, executor]
status: index
verified_at: 2026-08-04
category: "OS&런타임(OS&Runtime)"
aliases: ["Java Concurrency", "자바 멀티스레드와 동시성"]
---

# Java 멀티스레드와 동시성

Java 동시성은 스레드를 많이 만드는 기술이 아니라, 공유 상태의 **가시성, 원자성, 실행 순서와 수명**을 명시적으로 설계하는 일이다. 저수준 원리를 이해하되 애플리케이션에서는 검증된 `java.util.concurrent` 추상화를 우선한다.

## 학습 지도

- [[Java-Threads-Lifecycle-and-Cancellation|스레드 생성, 생명 주기와 협력적 취소]]
- [[Java-Memory-Model-and-Monitors|Java Memory Model과 monitor]]
- [[Java-Locks-Monitors-and-Conditions|Lock, monitor와 Condition]]
- [[Java-BlockingQueue-and-Producer-Consumer|BlockingQueue와 생산자, 소비자]]
- [[Java-Atomic-and-Concurrent-Collections|Atomic 연산과 동시성 컬렉션]]
- [[Java-Executors-Futures-and-Thread-Pools|Executor, Future와 thread pool]]

## 선택 순서

1. 공유 상태를 없애거나 불변 값으로 전달한다.
2. 생산자, 소비자는 bounded `BlockingQueue`, 단일 값 갱신은 atomic class, 복합 불변식은 `synchronized`나 `Lock`을 선택한다.
3. 작업 실행은 직접 만든 platform thread보다 `ExecutorService` 또는 virtual-thread-per-task executor에 맡긴다.
4. 모든 대기에는 취소, timeout, 종료와 과부하 정책을 함께 둔다.

## 강의 접근 기록

김영한 강사의 인프런 과정 `334352`, `김영한의 실전 자바 - 고급 1편, 멀티스레드와 동시성`에서 lecture 118개를 조회해 117개 본문을 확인했다. Quiz 13개는 lecture 본문 수집 대상에서 제외했다. [강의 소스 코드, unit 232311](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232311)는 세 차례 조회했지만 매번 `not_found` 응답이어서 본문을 가져오지 못했다.

## 출처

- 김영한 강사, [강의 소개](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232309), [수업 자료](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232310), [다음으로](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232440)
- [Java Language Specification 17, Threads and Locks, Java SE 26](https://docs.oracle.com/javase/specs/jls/se26/html/jls-17.html)
- [java.util.concurrent, Java SE 26](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/package-summary.html)

## 관련 문서

- [[Java-Concurrency-Primitives|Java 동시성 프리미티브]]
- [[Thread-vs-Event-Loop|Thread vs Event Loop]]
- [[Concurrency-vs-Parallelism|동시성과 병렬성]]
