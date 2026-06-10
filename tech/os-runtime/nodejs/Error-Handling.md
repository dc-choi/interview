---
tags: [runtime, nodejs, error-handling, async]
status: done
category: "OS & Runtime"
aliases: ["Node.js Error Handling", "uncaughtException", "Error-First Callback"]
---

# Node.js Error Handling

동기, 콜백, Promise, async/await가 섞인 환경에서 에러는 **각 비동기 경계마다 다른 방식으로 흘러간다**. 한 군데서 빠뜨리면 프로세스가 죽거나 무한 대기. 4가지 경로 모두 잡는 표준 패턴이 필요하다.

## 4가지 에러 경로

| 경로 | 잡는 방법 | 빠뜨리면 |
|------|----------|----------|
| 동기 throw | `try/catch` | 스택 위로 전파, 안 잡으면 프로세스 종료 |
| 콜백 비동기 | error-first callback `(err, data)` | 무시되거나 다음 단계로 이상값 전달 |
| Promise reject | `.catch` / `try/catch` (await) | `unhandledRejection` 이벤트, 향후 process exit |
| EventEmitter | `'error'` 리스너 | 등록 안 하면 throw → 프로세스 종료 |

## 동기 에러

```ts
try {
  const data = fs.readFileSync('nonexistent.txt');
} catch (err) {
  if ((err as NodeJS.ErrnoException).code === 'ENOENT') { /* 파일 없음 */ }
  else throw err;
}
```

**code 분기**가 표준 — 메시지 문자열은 i18n, OS별로 달라짐. `ENOENT`/`EACCES`/`EEXIST`/`EADDRINUSE`/`ECONNREFUSED` 등 안정적.

## 에러 우선 콜백 (error-first callback)

Node.js 표준 콜백 시그니처. **첫 인자는 항상 에러 또는 null**.

```ts
function readUser(id: string, cb: (err: Error | null, data?: User) => void) {
  db.query('SELECT * FROM users WHERE id = ?', [id], (err, rows) => {
    if (err) return cb(err);
    if (rows.length === 0) return cb(new Error('Not found'));
    cb(null, rows[0]);
  });
}

readUser('42', (err, data) => {
  if (err) {
    logger.error(err);
    return;   // 반드시 early return — 안 그러면 정상 경로 함께 실행
  }
  console.log(data);
});
```

**콜백 내부 throw 금지** — 비동기 컨텍스트라 try/catch가 못 잡음. `cb(err)`로 전달.

## Promise 에러

```ts
fs.promises.readFile('file.txt')
  .then(data => process(data))
  .catch(err => logger.error(err));
```

체인 중간에서 throw하면 다음 `.catch`까지 흘러감. **`.catch` 누락 시 unhandledRejection**.

### async/await

```ts
try {
  const data = await fs.promises.readFile('file.txt');
  return await process(data);
} catch (err) {
  logger.error(err);
  throw err;   // 상위로 전파할지 선택
}
```

`await` 없는 Promise를 그대로 두면 (`fire-and-forget`) 에러가 unhandledRejection으로. 의도적이라면 `.catch(noop)` 명시.

## EventEmitter 에러

```ts
const stream = fs.createReadStream('file.txt');
stream.on('error', err => logger.error(err));   // 필수
stream.pipe(dest);
```

`'error'` 리스너 0개인 EventEmitter가 에러 emit하면 **즉시 throw → 프로세스 종료**. Stream, net.Socket, child_process 모두 EventEmitter라 동일.

## 전역 핸들러 — 마지막 안전망

```ts
process.on('uncaughtException', (err, origin) => {
  logger.fatal({ err, origin }, 'uncaught');
  process.exit(1);   // 정리 후 종료 — 계속 실행하지 말 것
});

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({ reason }, 'unhandled rejection');
  // Node 15+: 기본 동작이 process exit으로 변경됨
});
```

| 이벤트 | 의미 |
|--------|------|
| `uncaughtException` | 동기 throw가 아무 try/catch도 못 잡음 |
| `unhandledRejection` | Promise reject가 아무 .catch도 못 잡음 |
| `uncaughtExceptionMonitor` | uncaughtException 직전, 종료 막지 않음 — 로그용 |
| `multipleResolves` | Promise가 여러 번 resolve/reject (deprecated) |

**핵심**: 이 핸들러는 **로그, 정리 후 종료** 용도. 계속 실행하지 말 것 — 상태가 손상됐을 가능성 있음. PM2, Cluster, K8s가 재시작.

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
const ac = new AbortController();
setTimeout(() => ac.abort(), 5000);

try {
  const res = await fetch(url, { signal: ac.signal });
} catch (err) {
  if (err.name === 'AbortError') { /* 타임아웃 */ }
  else throw err;
}
```

`fs.promises`, `fetch`, `http`가 AbortSignal 지원. 타임아웃, 취소 표준 모델.

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
- `unhandledRejection`과 Node 15+ 동작 변경
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
