---
tags: [runtime, nodejs]
status: index
category: "OS & Runtime"
aliases: ["libuv"]
---

# libuv
Node.js의 비동기 I/O를 담당하는 C 라이브러리. OS별 이벤트 디멀티플렉서(epoll/kqueue/IOCP)를 추상화하며 이벤트 루프, 스레드 풀, 비동기 I/O API를 제공한다.

## 하위 문서
- [[libuv-Architecture|아키텍처]] — 역할·역사, 이벤트 디멀티플렉서, 설계 개요, 이벤트 루프 반복 단계, Reactor/Proactor 패턴
- [[libuv-Handles|핸들·요청·스트림]] — Handle/Request 추상화, 이벤트 루프 API, 참조 카운팅, 스트림, 타이머, idle/prepare/check/poll
- [[libuv-IO|네트워킹·파일시스템·프로세스]] — TCP/UDP/DNS, 파일시스템 작업, 자식 프로세스 생성 및 IPC, 시그널 처리
- [[libuv-Threading|스레드 풀·스레딩·에러]] — 스레드 풀, 스레딩 프리미티브, `uv_async`, dlopen/TTY/시스템 정보, 에러 처리

## 관련 문서
- [[Event-Loop|이벤트 루프]]
- [[V8|V8 엔진]]
- [[Worker-Threads|워커 스레드]]
- [[Node.js]]
- [[Stream|스트림]]
- [[Async-Internals|비동기 내부 구조]]
