---
tags: [runtime]
status: index
category: "OS&런타임(OS&Runtime)"
aliases: ["OS&런타임(OS&Runtime)", "OS & Runtime"]
---

# OS&런타임(OS&Runtime)

## 목차

- [[tech/os-runtime/os-fundamentals/OS기초(OSFundamentals)|OS 기초 (OS Fundamentals)]] — 동시성, 프로세스, 스케줄링, 가상 메모리, 파일시스템
- [[tech/os-runtime/linux/Linux-File-System|Linux]] — 파일 시스템, 디렉토리 구조 (FHS)
- [[tech/os-runtime/runtime/런타임(Runtime)|런타임 (Runtime)]] — Thread vs Event Loop, async/await, Backpressure
- [[tech/os-runtime/jvm/JVM|JVM]] — 아키텍처, GC, 컨테이너 메모리
- [[tech/os-runtime/nodejs/Node.js|Node.js]] — V8, libuv, Event Loop, Module System, Stream, Worker Threads
- [[tech/os-runtime/nestjs/NestJS|NestJS]] — Clean Architecture, DI
- [[tech/os-runtime/spring/Spring|Spring]] — Request Lifecycle, @Transactional, JPA 영속성

## Linux 체크리스트
- [x] [[Container-Memory-Metrics|Page cache와 컨테이너 메모리 지표 (RSS, file cache, working set, reclaim, cgroup 진단)]]
- [ ] File descriptor limit (작성 예정: `File-Descriptor-Limit`) — 기존 보강: [[Storage-and-FileSystem-Files#파일 메타데이터와 파일 디스크립터|파일 디스크립터 구조]], [[libuv-Threading#에러 처리|UV_EMFILE]]
- [ ] epoll / kqueue (작성 예정: `Epoll-Kqueue`) — 기존 보강: [[libuv-Architecture#이벤트 디멀티플렉서|libuv의 OS별 이벤트 디멀티플렉서]]

## Runtime 체크리스트
- [x] [[Debugging-Profiling-Memory#Heap Snapshot|Heap Snapshot (생성, DevTools 로드, Comparison 분석)]]
- [x] [[Debugging-Profiling-Memory#Flame Graph|Flame Graph (0x, Linux perf, 스택 해석)]]
