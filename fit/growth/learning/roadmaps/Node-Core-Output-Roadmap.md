---
tags: [growth, learning, javascript, typescript, nodejs, output]
status: todo
verified_at: 2026-07-29
category: "Growth - 학습"
aliases: ["Node.js 코어 아웃풋 로드맵", "JS TS Node Core Roadmap"]
---

# Node.js 코어 아웃풋 로드맵

JS, TS와 Node.js 코어를 공식 문서와 런타임 실험으로 다시 검증하고, 아키텍처와 비동기 처리 글로 설명 가능한 지식으로 만든다. [[Current-Goals-and-Roadmap|통합 로드맵]]의 선택 gate에서 이 모듈을 고른 경우에만 시작한다.

## 운영 원칙

- 시작할 때 사용할 Node.js 버전과 해당 버전의 공식 API 문서를 고정한다.
- 기존 vault 문서의 수량을 숙련도로 보지 않는다. 먼저 자료 없이 설명하고 막힌 부분만 다시 읽는다.
- 공식 Learn 문서, API reference와 작은 실행 실험을 먼저 사용한다.
- 한 번에 한 단계를 진행하고, 말하기와 쓰기로 통과한 뒤 다음 단계로 간다.
- 프레임워크 사용법보다 런타임 경계, 실패 조건과 선택 근거를 우선한다.
- 전체 글감은 [[Career-Technical-Output-Backlog|커리어 기술 아웃풋 백로그]]에 보관하고, 이 로드맵에서는 현재 단계의 초안 하나만 활성화한다.
- 1차 성공선은 Node.js 아키텍처 글과 비동기 처리 글 한 편씩이다. 취소, 스트림과 운영 진단은 업무 필요가 있을 때만 선택 확장으로 다룬다.

## 0단계: 현재 수준과 실험 기준 고정

### 할 일

1. JavaScript 언어, V8, Node.js core, libuv와 OS의 경계를 한 장에 그린다.
2. 이벤트 루프, microtask, worker pool과 Worker Threads의 차이를 자료 없이 설명한다.
3. 실험에 사용할 Node.js 버전, 실행 명령과 측정 환경을 기록한다.
4. 기존 [[Node.js]] 문서에서 설명하지 못한 부분만 후보 목록으로 만든다.

### 통과 gate

- [ ] 같은 비동기 예제를 언어 규칙, Node.js host와 OS I/O 관점으로 나눠 설명한다.
- [ ] 네트워크 I/O와 파일시스템, DNS 및 crypto 작업의 실행 경로 차이를 설명한다.
- [ ] 모르는 항목과 확인할 공식 문서 경로를 적고, 아는 내용을 다시 강의 목록으로 만들지 않았다.

## 1단계: JS, TS와 모듈 경계

### 범위

- 실행 컨텍스트, 호출 스택, closure와 Promise job
- CommonJS, ECMAScript Modules와 package 경계
- TypeScript가 검사하는 범위와 Node.js가 실행하는 범위
- 오류 전파, stack trace와 source map

### 산출물과 gate

- [ ] 같은 작은 모듈을 CommonJS, ESM과 TypeScript로 실행하고 해석 및 로딩 차이를 기록한다.
- [ ] compile-time 타입과 runtime 검증이 갈라지는 실패 사례를 만든다.
- [ ] 10분 설명으로 JS, TS와 Node.js의 책임 경계를 말한다.

## 2단계: Node.js 아키텍처

### 범위

- V8, Node.js bindings, libuv와 OS
- 이벤트 루프와 worker pool
- timer, socket, 파일 I/O와 완료 callback의 흐름
- process, child process와 Worker Threads의 선택 기준

### 실험

1. CPU 작업으로 이벤트 루프 지연을 만든다.
2. 파일시스템 또는 crypto 작업으로 worker pool 포화를 관찰한다.
3. 같은 CPU 작업을 Worker Threads로 옮겨 지연과 처리량을 비교한다.

### 통과 gate

- [ ] 요청 하나가 JavaScript에서 OS I/O로 갔다가 callback으로 돌아오는 흐름을 그린다.
- [ ] 싱글 스레드라는 표현이 설명하지 못하는 런타임 스레드와 worker pool을 구분한다.
- [ ] 측정 결과와 한계를 포함한 Node.js 아키텍처 글을 발행 가능한 초안으로 완성한다.

## 3단계: 비동기 실행 모델

### 범위

- 병렬 서브루틴, 스레드와 코루틴의 개념 경계
- callback, Promise와 async/await의 오류 및 스택 경계
- `process.nextTick()`, Promise microtask, timer와 `setImmediate()`
- 순차 `await`과 작업을 먼저 시작한 뒤 기다리는 방식
- `Promise.all()`과 `Promise.allSettled()`의 실패 및 부분 성공

### 실험

1. 같은 사례를 callback, Promise와 async/await로 바꾸며 중첩, scope와 오류 전파를 비교한다.
2. CommonJS와 ESM에서 비동기 실행 순서를 기록한다.
3. 순차 `await`과 여러 작업을 먼저 시작한 뒤 기다리는 방식을 비교한다.
4. 같은 실패 입력으로 `Promise.all()`과 `Promise.allSettled()`의 결과를 비교한다.

### 통과 gate

- [ ] 실행 순서를 암기하지 않고 각 queue와 host 경계로 설명한다.
- [ ] callback, Promise와 async/await의 관계, 중첩과 오류 전파 차이를 설명한다.
- [ ] 순차 실행, 동시 시작, 전체 실패와 부분 성공을 구분해 선택한다.
- [ ] 재현 코드와 도식이 포함된 Node.js 비동기 처리 글을 발행 가능한 초안으로 완성한다.

## 선택 확장 1: 취소, 스트림과 동시성

### 범위

- deadline, `AbortSignal`과 취소 전파
- `AsyncLocalStorage`를 이용한 요청 컨텍스트
- Readable, Writable, `pipeline()`과 backpressure
- `highWaterMark`, `.write()` 반환값과 `drain`
- `AbortSignal`을 이용한 pipeline 종료
- Worker Threads, child process와 다중 process 선택

### 확인 항목

- 느린 consumer를 만들어 메모리와 처리량 변화를 측정하고 backpressure 적용 전후를 비교한다.
- client 종료가 stream과 하위 작업 취소로 이어지는지 검증한다.
- I/O 중심, CPU 중심과 격리가 필요한 작업별 동시성 모델을 선택하고 이유를 설명한다.

## 선택 확장 2: 운영 가능한 Node.js

### 범위

- 오류 분류와 process 종료 경계
- HTTP server의 graceful shutdown
- memory, event loop delay와 CPU profiling
- diagnostic report, inspector와 performance hooks
- 기본 test runner와 실패 재현

### 확인 항목

- 진행 중 요청을 보호하면서 새 요청을 중단하고 제한 시간 뒤 종료하는 흐름을 검증한다.
- event loop 지연, memory 증가와 CPU 병목을 각각 재현하고 다른 진단 근거로 구분한다.
- 증상, 가설, 측정, 원인, 복구와 재발 방지를 한 장의 incident note로 남긴다.

## 완료 조건

- [ ] Node.js 아키텍처 글과 비동기 처리 글을 각각 한 편 완성했다.
- [ ] 두 글의 핵심을 자료 없이 15분씩 설명하고 질문받은 빈칸을 보완했다.
- [ ] 이벤트 루프 지연, worker pool과 callback, Promise 및 async/await 비교 실험을 같은 명령으로 다시 실행할 수 있다.
- [ ] 실제 업무나 작은 개인 실험의 결정 하나에 학습 결과를 적용하고 선택 이유와 결과를 기록했다.

완료 뒤에는 [[Current-Goals-and-Roadmap|통합 로드맵]]의 선택 gate로 돌아간다. CS/OOP/패턴/아키텍처, 시스템 디자인과 MySQL을 자동으로 병행하지 않는다.

아키텍처 글과 비동기 처리 글은 각 시리즈의 첫 발행물로 사용할 수 있다. 나머지 글감은 이 로드맵의 완료 조건이 아니며 별도 백로그에 남긴다.

## 공식 자료

- [Node.js Learn - How much JavaScript do you need to know?](https://nodejs.org/en/learn/getting-started/how-much-javascript-do-you-need-to-know-to-use-nodejs)
- [Node.js Learn - The Node.js Event Loop](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)
- [Node.js Learn - Don't Block the Event Loop](https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop)
- [Node.js Learn - Streams](https://nodejs.org/en/learn/modules/how-to-use-streams)
- [Node.js API reference](https://nodejs.org/api/)
- [Node.js source documentation](https://github.com/nodejs/node/tree/main/doc/api)

## 관련 문서

- [[Node.js|Node.js 지식 지도]]
- [[Event-Loop|Event Loop]]
- [[Async-Internals|Node.js 비동기 내부 구조]]
- [[Stream|Node.js Stream]]
- [[Worker-Threads|Worker Threads]]
- [[Career-Technical-Output-Backlog|커리어 기술 아웃풋 백로그]]
- [[roadmaps|학습 로드맵 인덱스]]
