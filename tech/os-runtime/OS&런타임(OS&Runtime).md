---
tags: [runtime]
status: index
category: "OS&런타임(OS&Runtime)"
aliases: ["OS&런타임(OS&Runtime)", "OS & Runtime"]
---

# OS&런타임(OS&Runtime)

## 목차

- [[tech/os-runtime/os-fundamentals/OS기초(OSFundamentals)|OS 기초 (OS Fundamentals)]] — 동시성, 프로세스, 스레딩 모델, 스케줄링, 가상 메모리, 파일시스템, NVMe와 EDSFF
- [[tech/os-runtime/linux/Linux-File-System|Linux]] — 파일 시스템, 디렉토리 구조 (FHS), 실행 비트와 파일 시그니처, 로그와 디스크 진단 명령
- [[tech/os-runtime/runtime/런타임(Runtime)|런타임 (Runtime)]] — Thread vs Event Loop, I/O 동시성과 병목 관측, async/await, Backpressure
- [[tech/os-runtime/jvm/JVM|JVM]] — 아키텍처, GC pause와 할당 정체, 메모리 누수, 컨테이너 메모리
- [[tech/os-runtime/nodejs/Node.js|Node.js]] — V8, libuv API, Event Loop, Stream, Worker Threads, 네이티브 애드온과 Express 5
- [[V8-Cpp-API|V8 C++ API]] — Isolate와 native 자원 수명, module 실행, 직렬화, cppgc와 Inspector
- [[Deno-Runtime|Deno]] — Node와의 차이, TypeScript 실행, import map, 캐시와 lockfile, Docker 배포
  - [[Deno-Runtime-Permissions|Deno 권한 모델]] — 자원별 flag, NotCapable, sandbox를 벗어나는 flag, task별 권한 분리와 permission set
- [[tech/os-runtime/nestjs/NestJS|NestJS]] — DI, HTTP, GraphQL, Microservices, 웹훅, durable workflow, 보안과 신뢰성
- [[tech/os-runtime/spring/Spring|Spring]] — Request Lifecycle, @Transactional, JPA 영속성
  - [[Spring-MVC-Manual-Validation|Spring MVC 수동 검증]] — 비동기 아이디 확인, 최종 저장의 유일성과 계정 존재 노출 경계

## Linux 체크리스트
- [x] [[Container-Memory-Metrics|Page cache와 컨테이너 메모리 지표 (RSS, file cache, working set, reclaim, cgroup 진단)]]
- [x] [[File-Descriptor-Limit|File descriptor limit]] — 기존 보강: [[Storage-and-FileSystem-Files#파일 메타데이터와 파일 디스크립터|파일 디스크립터 구조]], [[libuv-Threading#완료 시점과 오류 분류|libuv 오류 분류]]
- [x] [[Epoll-Kqueue|epoll / kqueue]] — 기존 보강: [[libuv-Architecture#OS 알림과 실행 모델|libuv의 OS별 이벤트 제공자]]
- [x] [[Linux-Netfilter-and-iptables|netfilter와 iptables (hook, table, chain, conntrack, 규칙 운영, 컨테이너 경로)]] — 기존 보강: [[Docker-Bridge-Networking#netfilter, iptables와 nftables|Docker의 firewall backend]]

## Runtime 체크리스트
- [x] [[Debugging-Profiling-Memory#Heap Snapshot|Heap Snapshot (생성, DevTools 로드, Comparison 분석)]]
- [x] [[Debugging-Profiling-Memory#Flame Graph|Flame Graph (0x, Linux perf, 스택 해석)]]
