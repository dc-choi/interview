---
tags: [runtime, nodejs]
status: index
category: "OS & Runtime"
aliases: ["비동기 프로그래밍"]
---

# 비동기 프로그래밍

Node.js 비동기 프로그래밍 시리즈의 인덱스. 상위 async 폴더 목차는 [[async|Node.js 비동기 목차]]이고, 이벤트 루프의 내부 동작은 [[Event-Loop]]를 참조한다. 여기서는 비동기 프로그래밍 패턴과 실전 활용을 주제별 문서로 나누어 정리한다.

## 목차

- [[Async-Programming-Basics|비동기 프로그래밍 — 기초]] — 콜백, Promise(정적 메서드 포함), async/await, 작업 예약(queueMicrotask/nextTick/setImmediate)
- [[Async-Programming-Patterns|비동기 프로그래밍 — 패턴]] — 흐름 제어(순차/제한/병렬), 타이머, 블로킹 vs 논블로킹, EventEmitter, nextTick vs setImmediate, 이벤트 루프 차단 방지(ReDoS/JSON DoS/분할/오프로드)
- [[Async-Internals|비동기 내부 동작]] — 아래 두 문서의 개요
  - [[Async-Internals-Mechanism|비동기 내부 동작 — 메커니즘]] — async/await 트랜스파일, 컨텍스트 스위칭, Promise vs Future, await 비용, Promise 최적화 패턴(병렬화, allSettled, for await)
  - [[Async-Internals-Patterns|비동기 내부 동작 — 패턴과 함정]] — CPS, Zalgo 문제, 콜백 지옥 해결, 제한적 동시성(TaskQueue), return await 규칙, 재귀 Promise 체인 메모리 누수
- [[Advanced-Recipes|고급 레시피]] — 비동기 컴포넌트 초기화, 요청 배칭과 캐싱, 비동기 작업 취소, CPU 바운드 작업 실행 전략

## 관련 문서
- [[Event-Loop|이벤트 루프]]
- [[Worker-Threads|워커 스레드]]
