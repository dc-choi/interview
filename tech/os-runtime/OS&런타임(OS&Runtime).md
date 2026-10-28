---
tags: [runtime]
status: index
category: "OS&런타임(OS&Runtime)"
aliases: ["OS&런타임(OS&Runtime)", "OS & Runtime"]
---

# OS&런타임(OS&Runtime)

## 목차

- [[tech/os-runtime/os-fundamentals/OS기초(OSFundamentals)|OS 기초 (OS Fundamentals)]] — 동시성과 false sharing, 프로세스와 fork/exec 제약, 스레딩 모델, 스케줄링, 가상 메모리, 파일시스템, NVMe와 EDSFF, RAID 용량과 장애 위치, 배터리 잔량 추정과 시스템 종료
- [[tech/os-runtime/linux/Linux-File-System|Linux]] — 파일 시스템, 디렉토리 구조 (FHS), 실행 비트와 파일 시그니처, 로그와 디스크 진단 명령, 파일 생성과 덮어쓰기, 삭제 확인
- [[tech/os-runtime/runtime/런타임(Runtime)|런타임 (Runtime)]] — Thread vs Event Loop, I/O 동시성과 병목 관측, async/await, Backpressure, Go 동시성
- [[tech/os-runtime/jvm/JVM|JVM]] — 로딩과 초기화 경계, 로더별 타입 동일성, GC pause와 할당 정체, 메모리 누수, 컨테이너 메모리
- [[tech/os-runtime/nodejs/Node.js|Node.js]] — V8, libuv API, Event Loop, Stream, Worker Threads, 네이티브 애드온과 Express 5
- [[V8-Cpp-API|V8 C++ API]] — Isolate와 native 자원 수명, module 실행, 직렬화, cppgc와 Inspector
- [[Deno-Runtime|Deno]] — Node와의 차이, TypeScript 실행, import map, 캐시와 lockfile, Docker 배포, Cloudflare 합류 뒤 유지보수 범위와 커뮤니티 포크
  - [[Deno-Runtime-Permissions|Deno 권한 모델]] — 자원별 flag, NotCapable, sandbox를 벗어나는 flag, task별 권한 분리와 permission set
- [[tech/os-runtime/nestjs/NestJS|NestJS]] — DI, HTTP, GraphQL, Microservices, 웹훅, durable workflow, 보안과 신뢰성
- [[tech/os-runtime/spring/Spring|Spring]] — Request Lifecycle, @Transactional, JPA 영속성
  - [[Spring-MVC-Manual-Validation|Spring MVC 수동 검증]] — 비동기 아이디 확인, 최종 저장의 유일성과 계정 존재 노출 경계
  - [[JobRunr-Persistent-Background-Jobs|JobRunr 영속 백그라운드 작업]] — 단계 재시도와 멱등성, OSS/Pro 경계, 관측과 버전 이전

- [[Linux-Mobile-Platform|Linux 모바일]] — UI 스택 재사용, 기기별 전력과 통신 계약, 소스 공개와 앱 배포 권한의 구분
- [[Mobile-OS-Porting|모바일 OS 이식]] — 부트 체인, 커널과 드라이버, 보안 모델과 자기 보고 사례의 확인 범위
- [[Android-Device-Debloat|Android 기기의 광고 줄이기]] — 계층별 수단, ADB 패키지 비활성화와 되돌리기, Private DNS의 한계, 비공식 APK의 공급망 위험
- [[Sovereign-Workplace-Stack|디지털 자율 업무환경]] — DAWO의 OS, 협업과 계정 계층, 파일럿과 운영 전환 검증, NixOS 재구성과 되돌리기의 범위
- [[Linux-Root-Directory-Isolation|루트 디렉터리 격리]] — chroot의 한계, Linux 7.3 fchroot와 failfs, OpenBSD unveil 비교
- [[OpenBSD-Platform|OpenBSD]] — 8.0의 가상화와 arm64 변화, pledge와 unveil, Wine 이식 초안의 보안 제약
- [[Linux-Page-Cache-Contention|Linux 페이지 캐시 경합]] — folio 참조와 공유 카운터, 개발 패치의 확인 경계
- [[Native-Compilation-Compatibility|네이티브 컴파일과 호환성]] — Bun 패키징과 AOT 실험, TurboPython의 소유권

## Linux 체크리스트
- [x] [[Container-Memory-Metrics|Page cache와 컨테이너 메모리 지표 (RSS, file cache, working set, reclaim, cgroup 진단)]]
- [x] [[File-Descriptor-Limit|File descriptor limit]] — 기존 보강: [[Storage-and-FileSystem-Files#파일 메타데이터와 파일 디스크립터|파일 디스크립터 구조]], [[libuv-Threading#완료 시점과 오류 분류|libuv 오류 분류]]
- [x] [[Epoll-Kqueue|epoll / kqueue]] — 기존 보강: [[libuv-Architecture#OS 알림과 실행 모델|libuv의 OS별 이벤트 제공자]]
- [x] [[Linux-Netfilter-and-iptables|netfilter와 iptables (hook, table, chain, conntrack, 규칙 운영, 컨테이너 경로)]] — 기존 보강: [[Docker-Bridge-Networking#netfilter, iptables와 nftables|Docker의 firewall backend]]

## Runtime 체크리스트
- [x] [[Debugging-Profiling-Memory#Heap Snapshot|Heap Snapshot (생성, DevTools 로드, Comparison 분석)]]
- [x] [[Debugging-Profiling-Memory#Flame Graph|Flame Graph (0x, Linux perf, 스택 해석)]]
