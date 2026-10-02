---
tags: [runtime, nodejs]
status: index
category: "OS & Runtime"
aliases: ["libuv"]
---

# libuv

C 기반의 범용 비동기 I/O 라이브러리. OS별 이벤트 알림을 callback API로 추상화하고 루프, 네트워킹, 파일 I/O, 프로세스와 스레드 기능을 제공한다. 현재 v1.x API와 Node.js가 번들한 libuv 버전은 구분해서 확인한다.

## 하위 문서

- [[libuv-Architecture|아키텍처와 이벤트 루프]] — 실행 단계, 생존 조건, embedding/fork, metrics, 버전과 0.10 이행
- [[libuv-Handles|핸들, 요청과 스트림]] — 메모리 수명, ref/unref, 취소, 버퍼/역압, timer/idle/prepare/check/poll
- [[libuv-IO|네트워킹과 DNS]] — TCP/UDP, 연결/종료, reuse, batch 송수신, resolver와 인터페이스
- [[libuv-Filesystem|파일시스템과 감시]] — pool/io_uring, 결과/정리, 파일/디렉토리, 복사/링크, OS 감시/stat polling
- [[libuv-Processes|프로세스, IPC와 시그널]] — spawn/exit, stdio, pipe 이름, handle 전달, 플랫폼별 signal
- [[libuv-Threading|스레드 풀과 통신]] — work queue, 직접 thread, 동기화, async coalescing/fence, 오류
- [[libuv-Utilities|시스템 유틸리티와 TTY]] — 시간/메모리/CPU, 경로/환경, 문자열, 난수, allocator, shared library

## 관련 문서

- [[Event-Loop]], [[Node.js]], [[V8]]
- [[Worker-Threads]], [[Stream]], [[Async-Internals]]
