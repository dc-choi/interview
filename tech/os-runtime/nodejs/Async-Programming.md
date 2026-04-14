---
tags: [runtime, nodejs]
status: index
category: "OS & Runtime"
aliases: ["비동기 프로그래밍"]
---

# 비동기 프로그래밍

Node.js 비동기 프로그래밍 개요. 이벤트 루프의 내부 동작은 [[Event-Loop]] 참조. 여기서는 비동기 프로그래밍 패턴과 실전 활용에 초점을 맞추고, 주제 단위로 아래 문서에 나누어 정리한다.

## 목차

- [[Async-Programming-Basics|비동기 프로그래밍 — 기초]] — 콜백, Promise(정적 메서드 포함), async/await, 작업 예약(queueMicrotask/nextTick/setImmediate)
- [[Async-Programming-Patterns|비동기 프로그래밍 — 패턴]] — 흐름 제어(순차/제한/병렬), 타이머, 블로킹 vs 논블로킹, EventEmitter, nextTick vs setImmediate, 이벤트 루프 차단 방지(ReDoS/JSON DoS/분할/오프로드)

## 관련 문서
- [[Event-Loop|이벤트 루프]]
- [[Async-Internals|비동기 내부 동작]]
- [[Worker-Threads|워커 스레드]]
