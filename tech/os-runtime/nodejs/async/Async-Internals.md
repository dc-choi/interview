---
tags: [runtime, nodejs]
status: index
category: "OS & Runtime"
aliases: ["Async Internals", "비동기 내부 동작"]
---

# 비동기 내부 동작

async/await의 내부 메커니즘과 Promise 최적화, 그리고 실전에서 만나는 비동기 패턴·함정들을 주제별로 나누어 정리한다.

## 목차

- [[Async-Internals-Mechanism|비동기 내부 동작 — 메커니즘]] — async/await 트랜스파일·컨텍스트 스위칭, Promise vs Future, await 비용, Promise 최적화 패턴(병렬화·allSettled·for await)
- [[Async-Internals-Patterns|비동기 내부 동작 — 패턴과 함정]] — CPS, Zalgo 문제, 콜백 지옥 해결, 제한적 동시성(TaskQueue), return await 규칙, 재귀 Promise 체인 메모리 누수

## 관련 문서
- [[Event-Loop|이벤트 루프]]
- [[Execution-Context|실행 컨텍스트]]
- [[Call-Stack-Heap|콜 스택과 힙]]
- [[Node.js]]
