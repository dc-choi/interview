---
tags: [runtime, nodejs, event-loop, timers]
status: done
verified_at: 2026-09-28
category: "OS & Runtime"
aliases: ["Event Loop Timers", "이벤트 루프 타이머 심화"]
---

# 이벤트 루프 — 타이머 심화

setTimeout의 지연 값 보정, setImmediate와 setTimeout(0)의 선택, setInterval의 한계. 페이즈 구조와 Timers 페이즈의 min-heap 처리는 [[Event-Loop-Phases|이벤트 루프 — 페이즈와 실행 순서]]에서 다룬다.

## setTimeout 타임아웃 0
- 콜백은 현재 실행 중인 코드와 nextTick, microtask 처리가 끝난 뒤, 1ms 임계값(libuv 루프 시각 기준)이 지난 timers 페이즈에서 가능한 한 빨리 실행
- 실행을 뒤로 미룰 수는 있지만 무거운 계산 자체가 이벤트 루프를 막는 문제는 해결하지 못함. 계산 분할이나 Worker Threads 검토
- **지연 값은 0이 아니라 1**: 딜레이가 1 미만이거나 2147483647(약 24.8일) 초과이거나 NaN이면 1로 바꾼다. `setTimeout(fn, 0)`은 내부적으로 `setTimeout(fn, 1)`이다. 1 이상 2147483647 이하이면서 정수가 아닌 delay는 소수점 아래를 버린다(1.7은 1). 판정이 밀리초 정수 단위라 실제 경과 시간은 1ms보다 짧거나 길 수 있다([[Sleep-and-Timing#Node.js 타이머|Sleep과 타이밍]]).

## setImmediate와 setTimeout(0) 선택
둘의 상대 순서는 예약한 문맥과 이벤트 루프 상태에 달려 있어 일반적인 속도 순위를 만들 수 없다. I/O 콜백 안에서 다음 실행 기회로 미룰 때는 poll 뒤 check에 놓이는 `setImmediate()`의 순서가 예측 가능하다. 타이머 임계값(libuv 루프 시각 기준) 이후 실행이라는 의미가 필요하면 `setTimeout()`을 쓴다.

## setInterval의 한계
- 간격은 정확한 실행 시각이 아니라 실행 가능해지는 임계값이다.
- 같은 JavaScript 이벤트 루프 스레드에서는 콜백 실행이 서로 겹치지 않는다. 긴 콜백 때문에 후속 실행이 지연되고 기대한 주기가 깨질 수 있다.
- `setInterval(async () => ...)`은 반환된 Promise를 기다리지 않는다. 동기 콜백은 겹치지 않아도 비동기 작업은 여러 회차가 동시에 진행될 수 있다.
- 완료 시점부터 일정 간격을 두려면 **재귀적 setTimeout**으로 콜백 완료 후 다음 실행을 예약한다.

## setImmediate()
- `setTimeout(() => {}, 0)`과 유사하지만 Node.js 이벤트 루프의 check 단계에서 실행

## 출처
- [Node.js Learn, Discover JavaScript timers](https://nodejs.org/en/learn/asynchronous-work/discover-javascript-timers)
- [Node.js 공식 문서, Timers](https://nodejs.org/api/timers.html#settimeoutcallback-delay-args)
- [Node.js 공식 문서, The Node.js Event Loop](https://nodejs.org/learn/asynchronous-work/event-loop-timers-and-nexttick#setimmediate-vs-settimeout)
- [Node.js v26.7.0 timers.js — Node.js](https://github.com/nodejs/node/blob/v26.7.0/lib/internal/timers.js)
- [libuv 공식 문서, Timer handle](https://docs.libuv.org/en/v1.x/timer.html)

## 관련 문서
- [[Event-Loop-Phases|이벤트 루프 — 페이즈와 실행 순서]]
- [[Event-Loop|이벤트 루프 (TOC)]]
- [[Sleep-and-Timing|Sleep과 타이밍]]
