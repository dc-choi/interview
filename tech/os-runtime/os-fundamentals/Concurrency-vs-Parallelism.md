---
tags: [os, concurrency, parallelism, thread, interview]
status: done
verified_at: 2026-08-04
category: "OS&런타임(OS&Runtime)"
aliases: ["Concurrency vs Parallelism", "동시성 vs 병렬성"]
---

# 동시성, 병렬성

비슷하게 쓰이지만 **다른 층위의 개념**이다. 동시성은 **논리적 구조** — 여러 일이 **겹치는 시간 구간**에 실행되도록 프로그램을 조직하는 방식. 병렬성은 **물리적 실행** — 같은 시점에 둘 이상의 연산이 **실제로** 수행되는 것. 한쪽만 있어도 성립 가능하고, 둘을 합치는 게 현대 멀티코어의 기본이다.

## 정의와 구분

| 축 | 동시성 (Concurrency) | 병렬성 (Parallelism) |
|---|---|---|
| 본질 | "다룰 수 있는 구조" | "동시에 하는 실행" |
| 필요 하드웨어 | 싱글 코어에서도 성립 | 둘 이상의 실행 자원 필요 |
| 구현 기법 | 이벤트 루프, 코루틴, 컨텍스트 스위칭 | SMP, 스레드 풀, GPU, 분산 처리 |
| 목적 | **유휴 시간 최소화**(I/O 대기 중 다른 일) | **처리량, 속도** |
| 주요 위험 | Race condition, deadlock, starvation | False sharing, 메모리 모델, 캐시 라인 경합 |

Rob Pike(Go 설계자)의 한 줄: **"Concurrency is about dealing with lots of things at once. Parallelism is about doing lots of things at once."**

## 4가지 조합

| 조합 | 예시 |
|---|---|
| **동시성 O, 병렬성 X** | 싱글 코어 + 이벤트 루프(Node.js, 단일 스레드 I/O 멀티플렉싱) |
| **동시성 X, 병렬성 O** | SIMD, GPU 벡터 연산, 독립 루프의 자동 벡터화 |
| **동시성 O, 병렬성 O** | 멀티코어 + 스레드 풀, goroutine on GOMAXPROCS=N |
| **동시성 X, 병렬성 X** | 단순 순차 배치 스크립트 |

동시성과 병렬성은 **독립적으로 활성화 가능**하다는 점이 핵심.

## 구현 메커니즘

### 동시성

- **컨텍스트 스위칭** — OS가 시간을 쪼개 스레드를 교대 실행(선점형)
- **이벤트 루프** — 단일 스레드가 논블로킹 I/O 이벤트를 순환 처리
- **코루틴, 가상 스레드** — 런타임이 yield 지점에서 자발적 전환
- **액터 모델** — 각 액터가 자기 상태를 갖고 메시지로만 통신 (Erlang, Akka)

### 병렬성

- **멀티스레드 + 멀티코어** — OS 스레드를 코어에 분산
- **프로세스 병렬** — Node.js `cluster`, Python `multiprocessing`
- **SIMD/벡터 명령** — CPU 단일 명령으로 여러 데이터 처리
- **GPU/TPU** — 수천 개의 작은 코어로 대규모 병렬
- **분산 병렬** — Spark, MapReduce 등 여러 노드에 분할

## 자원 공유가 핵심 차이

- **동시성** — 같은 자원을 여러 작업이 겹치는 실행 구간에 접근. 원자성, 임계구역, 뮤텍스 같은 계약으로 조율
- **병렬성** — 작업이 **독립적으로** 실행되지만, 공유 자원에 접근하는 순간 동시성 문제가 되살아남

공유 상태를 줄이는 **share nothing, 불변 데이터, 메시지 전달**은 동기화 범위를 줄이는 선택지다. 통신 비용, 복사, 일관성 요구까지 함께 비교한다.

## 디자인 패턴

- **Actor 모델** — 각 액터가 자기 상태를 가지며 메시지로만 소통(Erlang, Akka, Orleans)
- **CSP / Channel** — Go `chan`, Rust `mpsc`, Kotlin `Channel` — 공유 메모리 대신 통신으로 조율
- **MapReduce** — 분할, 변환, 집계 3단계로 대규모 데이터 병렬 처리
- **Blackboard** — 공유 저장소에 부분 결과를 쌓고, 여러 프로세스가 골라 처리
- **Work Stealing** — 유휴 워커가 바쁜 워커의 작업 큐를 훔쳐 균형 맞춤 (ForkJoinPool, V8 Orinoco GC)

## 런타임별 기본 선택

| 런타임 | 동시성 | 병렬성 |
|---|---|---|
| **Node.js** | main event loop와 비동기 I/O | Worker Threads는 JavaScript를 병렬 실행, `cluster`는 여러 process 활용 |
| **Python(CPython)** | `asyncio`, `threading` | 기본 GIL build와 optional free-threaded build가 다름. process와 native extension도 선택지 |
| **Java** | Thread/Executor, Project Loom(가상 스레드) | ForkJoinPool, Streams parallel |
| **Go** | goroutine + runtime scheduler | 병렬 상한은 `GOMAXPROCS`, default는 version, CPU affinity와 container limit 등에 따라 결정 |
| **Rust** | async/await | Rayon, tokio multi-thread |

## 실전에서 자주 나오는 함정

- **"멀티스레드 = 더 빠르다"** — CPU bound가 아니면 오히려 컨텍스트 스위칭으로 느려짐
- **"병렬로 바꾸면 동시성 문제 사라진다"** — 공유 자원이 남아 있으면 동일
- **"코어를 다 쓰게 스레드를 코어 수보다 많이"** — I/O bound에서는 이득 있지만, CPU bound에서는 역효과
- **"동시성 이슈는 테스트로 잡힌다"** — 재현율이 낮아 프로덕션에서만 터지기 쉬움. 모델 검증, 락 프리 자료구조, 스레드 세이프 프로미티브가 근본

## 면접 체크포인트

- 동시성과 병렬성의 한 문장 구분(구조 vs 실행)
- 싱글 코어에서도 동시성이 성립하는 이유(이벤트 루프, 컨텍스트 스위칭)
- event loop, GIL-enabled/free-threaded build와 worker가 병렬성에 미치는 영향
- 공유 자원이 없으면 왜 안전한가(share nothing, 불변, 메시지)
- Actor vs CSP 채널의 차이

## 출처
- 인프런, 널널한 개발자 강사, [동시성과 병렬성](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128252)
- [Node.js, Worker threads](https://nodejs.org/api/worker_threads.html)
- [Python 3.14, Python support for free threading](https://docs.python.org/3/howto/free-threading-python.html)
- [Go runtime, GOMAXPROCS](https://pkg.go.dev/runtime#GOMAXPROCS)
- [Effective Go, concurrency and parallelism](https://go.dev/doc/effective_go#concurrency)
- [동시성 vs 병렬성 - YouTube, 코딩하는기술사](https://www.youtube.com/watch?v=qCW-N-B7Mgc)
- [seamless — 동시성 vs 병렬성](https://seamless.tistory.com/42)
- [binux — 동시성, 액터, 칠판 패턴](https://binux.tistory.com/169)
- [yeonyeon — Concurrency vs Parallelism](https://yeonyeon.tistory.com/270)

## 관련 문서
- [[Concurrency-and-Process|동시성과 프로세스]]
- [[Concurrency-and-Process-IPC|원자성, 동기화, IPC]]
- [[Thread-vs-Event-Loop|Thread vs Event Loop]]
- [[Sync-Async-Blocking|동기, 비동기, 블로킹, 논블로킹]]
- [[Async-vs-Threads|async/await vs 스레드]]
- [[Single-vs-Multi-Thread|Node.js 싱글 vs 멀티 스레드]]
