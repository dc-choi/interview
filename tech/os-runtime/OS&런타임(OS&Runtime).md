---
tags: [runtime]
status: index
category: "OS&런타임(OS&Runtime)"
aliases: ["OS&런타임(OS&Runtime)", "OS & Runtime"]
---

# OS&런타임(OS&Runtime)

## OS기초
- [x] [[Concurrency-and-Process|동시성과 프로세스 (커널, 동기화, 데드락, Node.js 동기화)]]
- [x] [[Concurrency-vs-Parallelism|동시성 · 병렬성 (구조 vs 실행, Actor/CSP 채널, 런타임별 선택)]]
- [x] [[Storage-and-FileSystem|기억장치와 파일시스템 (HDD, SSD, 주변장치, 디스크 할당)]]

## Linux
- [x] [[Linux-File-System|Linux 파일 시스템 · 디렉토리 구조 (FHS, /etc·/var·/usr, everything is a file)]]
- [x] [[Process-Lifecycle|Process lifecycle (PCB, 상태, fork/exec, 좀비, 쓰레드, 컴파일)]]
- [x] [[Context-Switching|Context switching (CPU 스케줄링, FIFO, SJF, RR, MLFQ)]]
- [x] [[Virtual-Memory|Virtual memory (세그멘테이션, 페이징, 디맨드 페이징, 페이지 교체)]]
- [ ] [[Page-Cache|Page cache]]
- [ ] [[File-Descriptor-Limit|File descriptor limit]]
- [ ] [[Epoll-Kqueue|epoll / kqueue]]

## Runtime
- [x] [[Thread-vs-Event-Loop|Thread vs Event Loop (멀티스레드 패턴, CPU 캐시, Lock, Node.js)]]
- [x] [[Event-Loop|Node.js event loop phases]]
- [x] [[Async-IO|Async I/O (이벤트 루프/워커풀 차단 방지, REDOS, 보안, 프로파일링)]]
- [x] [[Sync-Async-Blocking|동기·비동기·블로킹·논블로킹 (2×2 조합, 제어권 vs 결과 처리)]]
- [x] [[tech/computer-science/js/Promise-Async|Promise / Callback / Stream]]
- [x] [[Async-vs-Threads|async/await vs 스레드 (컬러 함수, 백프레셔, 가상 스레드, 구조적 동시성)]]
- [x] [[Backpressure|Backpressure (스트림 배압, highWaterMark, pipe 수명주기)]]
- [x] [[GC-Algorithm|GC 알고리즘 (Orinoco, Tri-color Marking, Parallel/Incremental/Concurrent, Work Stealing)]]
- [x] [[JVM-GC|JVM GC (Young/Old/Metaspace, Minor vs Full GC, G1·ZGC·Shenandoah)]]
- [x] [[JVM-Architecture|JVM 아키텍처 (ClassLoader·Runtime Data Area·Execution Engine·JIT C1/C2·GraalVM)]]
- [ ] [[Heap-Snapshot|Heap snapshot]]
- [ ] [[Flamegraph]]
- [x] [[OOM-Troubleshooting|Node.js OOM 트러블슈팅 (V8 힙 한계, 누수 패턴, 대응 방법)]]

## Node.js
- [[Node.js|Overview]]
- [x] [[V8|V8 엔진 (컴파일 파이프라인, Hidden Classes, Inline Caching, TLAB)]]
- [x] [[WebAssembly|WebAssembly (Liftoff, Dynamic Tiering, SIMD, 코드 캐싱)]]
- [x] [[libuv|libuv (스레드 풀, 이벤트 디멀티플렉서, Reactor/Proactor)]]
- [x] [[Call-Stack-Heap|Call Stack & Heap (V8 메모리 구조, Generational GC)]]
- [x] [[Stream|스트림 (4가지 타입, 배압, Web Streams vs Node Streams)]]
- [x] [[Worker-Threads|워커 스레드 (Worker Threads vs libuv 스레드 풀, Cluster)]]
- [x] [[Single-vs-Multi-Thread|Node.js 싱글 vs 멀티 스레드 (면접 프레임, libuv 스레드 풀, CPU-bound)]]
- [x] [[Async-Internals|비동기 내부 동작 (async/await 메커니즘, Promise 최적화)]]
- [x] [[Closure|클로저]]
- [x] [[Scope|스코프]]
- [x] [[Execution-Context|실행 컨텍스트]]
- [x] [[Module-System|모듈 시스템 (CommonJS, ESM, Live Bindings, 상호운용성)]]
- [x] [[Advanced-Recipes|고급 레시피 (비동기 초기화, 배칭, 캐싱, 취소)]]
- [x] [[Nodejs-Design-Patterns|Node.js 생성 패턴 (Singleton·Factory·Builder·Prototype, 모듈 캐싱)]]
- [x] [[Nodejs-Clustering|Node.js 클러스터링 (cluster 모듈·PM2, 멀티코어, K8s와의 선택)]]

## NestJS
- [[tech/os-runtime/nestjs/NestJS|Overview]]
- [x] [[Clean-Architecture-NestJS|NestJS Clean Architecture (포트 인터페이스·Symbol 토큰·DI 테스트)]]

## Spring
- [[tech/os-runtime/spring/Spring|Overview]]
- [x] [[Servlet-vs-Spring-Container|Servlet Container vs Spring Container]]
- [x] [[Spring-Request-Lifecycle|Spring 요청 처리 흐름 (Tomcat→DispatcherServlet→Controller, 부팅 순서)]]
- [x] [[Spring-Exception-Handling|Spring 예외 처리 전략]]
- [x] [[Spring-Transactional|Spring @Transactional (Propagation·Isolation·readOnly, 자기 호출 함정)]]
- [x] [[JPA-Persistence-Context|JPA 영속성 컨텍스트 · N+1 (1차 캐시·Dirty Checking·Fetch Join·EntityGraph)]]
