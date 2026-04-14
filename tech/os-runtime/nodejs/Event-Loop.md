---
tags: [runtime, nodejs, event-loop, microtask, macrotask]
status: index
category: "OS & Runtime"
aliases: ["Event Loop", "이벤트 루프"]
---

# 이벤트 루프

비동기 작업(File, Network I/O)과 이벤트 핸들링(CallBack)을 관리하는 매커니즘. 이벤트 루프는 별도의 스레드가 아니라 JS 메인 스레드 내에서 실행된다. 주제 단위로 아래 두 문서에 나누어 정리한다.

## 목차

- [[Event-Loop-Microtask|이벤트 루프 — Microtask/Macrotask & 브라우저 vs Node]] — Microtask/Macrotask 개념, 실행 순서, 브라우저 단일 큐 vs Node.js 페이즈 기반 큐, 흔한 오해, 이름 혼동 주의
- [[Event-Loop-Phases|이벤트 루프 — 페이즈와 실행 순서]] — libuv `uv_run` 소스, nextTick/microtask 삽입 지점, 6개 페이즈 상세, 전체 실행 흐름, CJS/ESM 차이, 타이머 심화

## 관련 문서
- [[Call-Stack-Heap|Call Stack Heap]]
- [[Execution-Context|Execution Context]]
- [[Async-Internals|비동기 내부 동작]]
- [[tech/computer-science/js/Promise-Async|Promise와 Async]]
- [[Stream|스트림]]
- [[libuv]]
- [[Thread-vs-Event-Loop|Thread vs Event Loop]]
