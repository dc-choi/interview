---
tags: [runtime, nodejs, error-handling, async]
status: done
category: "OS & Runtime"
aliases: ["Node.js Error Handling", "uncaughtException", "Error-First Callback"]
verified_at: 2026-08-26
---

# Node.js Error Handling: 처리 전략

## 전역 핸들러 — 마지막 안전망

```ts
process.on('uncaughtException', (err, origin) => {
  console.error('uncaught exception', origin, err);
  process.exit(1);   // 동기식 최소 기록 후 종료
});

process.on('unhandledRejection', reason => {
  // listener를 달면 기본 throw 경로를 가로채므로 로그만 남기고 계속 실행하지 않는다.
  throw reason instanceof Error ? reason : new Error(String(reason));
});
```

| 이벤트 | 의미 |
|--------|------|
| `uncaughtException` | 동기 throw가 아무 try/catch도 못 잡음 |
| `unhandledRejection` | Promise reject가 아무 .catch도 못 잡음 |
| `uncaughtExceptionMonitor` | uncaughtException 직전, 종료 막지 않음 — 로그용 |

`multipleResolves` 이벤트는 Node.js 24 LTS까지 runtime deprecated이며 v25.0.0에서 제거됐다. 현재 릴리스의 전역 안전망으로 사용하지 않는다.

**핵심**: 이 핸들러는 **로그, 정리 후 종료** 용도. 계속 실행하지 말 것 — 상태가 손상됐을 가능성 있음. PM2, Cluster, K8s가 재시작.

정상 종료 신호에서는 새 요청 중단, inflight 대기와 연결 종료 같은 bounded graceful shutdown을 할 수 있다. 반면 `uncaughtException`은 상태가 불명확하므로 동기식 최소 정리만 하고 종료하는 것이 안전하다. `unhandledRejection` listener를 등록하면 현재 Node.js의 기본 throw 동작을 대신하게 되므로, 로그만 남긴 채 정상 상태처럼 계속 돌리지 않는다.

## 도메인 에러 모델

### 운영 에러 vs 프로그래밍 에러

| 분류 | 예 | 대응 |
|------|---|------|
| **운영 에러** | 네트워크 실패, DB 타임아웃, 잘못된 입력 | 핸들링 — 재시도/응답 변환 |
| **프로그래밍 에러** | undefined 호출, 타입 오류, 무한 루프 | 핸들링 X — 빠른 실패 + 재시작 |

운영 에러는 비즈니스 흐름의 일부, 프로그래밍 에러는 버그. 둘을 같은 catch에서 동등 취급하면 버그가 묻힘.

### 커스텀 에러 클래스

```ts
export class AppError extends Error {
  constructor(message: string, public code: string, public statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) { super(`${resource} not found`, 'NOT_FOUND', 404); }
}
```

`statusCode`/`code`로 분기 가능, 메시지 문자열 매칭 의존 X.

## AbortController, Timeout

```ts
try {
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
} catch (err) {
  if (err instanceof DOMException && err.name === 'TimeoutError') { /* 타임아웃 */ }
  else throw err;
}
```

`fetch`와 여러 Node.js 비동기 API가 AbortSignal을 받는다. 지원 여부는 API별 시그니처를 확인한다. 호출자가 직접 취소할 때는 `AbortController`, 단순 deadline에는 타이머 정리가 필요 없는 `AbortSignal.timeout()`을 쓸 수 있다.

## 흔한 실수

- **콜백 안에서 throw** → try/catch 못 잡음 → uncaughtException. `cb(err)`로 전달.
- **Promise 체인에 `.catch` 누락** → unhandledRejection.
- **`async` 함수의 첫 번째 줄 sync throw** → Promise reject로 변환되지만 `.catch` 없으면 같은 문제.
- **uncaughtException 후 계속 실행** → 손상된 상태로 계속 → 더 큰 사고.
- **EventEmitter `error` 리스너 미등록** → throw → 프로세스 종료.
- **에러를 메시지 문자열로 분기** → i18n, OS별 차이로 깨짐. `code` 또는 `instanceof`로.
- **try/catch에서 모든 에러 swallow** → 프로그래밍 에러까지 묻힘. 알려진 운영 에러만 잡고 나머지 throw.
- **early return 누락 — `if (err) cb(err);` 후 다음 줄 실행** → 정상 경로도 호출됨. `return cb(err)`.

## 면접 체크포인트

- 4가지 에러 경로와 잡는 방법 (sync, callback, Promise, EventEmitter)
- 에러 우선 콜백 패턴이 표준이 된 이유
- `unhandledRejection`의 현재 기본 `throw` 동작과 listener 등록 시 책임
- `uncaughtException` 핸들러의 역할 — 로그 후 종료, 계속 실행 금지
- 운영 에러 vs 프로그래밍 에러 구분
- `error.code` 분기가 메시지 매칭보다 안정적인 이유
- AbortController로 타임아웃, 취소 처리
- EventEmitter `error` 리스너 미등록의 결과

## 관련 문서

- [[Node.js|Node.js 개요]]
- [[Async-Programming-Patterns|비동기 프로그래밍 패턴]]
- [[Stream-Types|Stream Types (EventEmitter 기반)]]
- [[Process-Child-Process|Process, Graceful Shutdown]]
- [[NestJS-Exception-Filter|NestJS Exception Filter (HTTP 응답 변환)]]

## 출처

- [Node.js Process API](https://nodejs.org/api/process.html), [Stream API, `pipeline()`](https://nodejs.org/api/stream.html#streampipelinesource-transforms-destination-callback)
- [Node.js Globals API, `AbortSignal.timeout()`](https://nodejs.org/api/globals.html#static-method-abortsignaltimeoutdelay)
- [Node.js, DEP0160: `process.on('multipleResolves', handler)`](https://nodejs.org/api/deprecations.html#DEP0160)
