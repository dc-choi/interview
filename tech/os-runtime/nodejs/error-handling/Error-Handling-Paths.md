---
tags: [runtime, nodejs, error-handling, async]
status: done
category: "OS & Runtime"
aliases: ["Node.js Error Handling", "uncaughtException", "Error-First Callback"]
verified_at: 2026-08-26
---

# Node.js Error Handling: 에러 경로

동기, 콜백, Promise, async/await가 섞인 환경에서 에러는 **각 비동기 경계마다 다른 방식으로 흘러간다**. 한 군데서 빠뜨리면 프로세스가 죽거나 무한 대기. 4가지 경로 모두 잡는 표준 패턴이 필요하다.

## 4가지 에러 경로

| 경로 | 잡는 방법 | 빠뜨리면 |
|------|----------|----------|
| 동기 throw | `try/catch` | 스택 위로 전파, 안 잡으면 프로세스 종료 |
| 콜백 비동기 | error-first callback `(err, data)` | 무시되거나 다음 단계로 이상값 전달 |
| Promise reject | `.catch` / `try/catch` (await) | `unhandledRejection`. 현재 기본 `throw` 모드에서는 처리되지 않으면 프로세스 종료 |
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

`await` 없는 Promise를 그대로 두면 (`fire-and-forget`) 에러가 unhandledRejection으로 이어질 수 있다. 의도적 비동기 작업도 `.catch`에서 로깅, 상태 정리나 상위 실패 신호를 명시하고 조용히 버리지 않는다.

## EventEmitter 에러

```ts
import { pipeline } from 'node:stream/promises';

try {
  await pipeline(fs.createReadStream('file.txt'), dest);
} catch (err) {
  logger.error(err);   // source와 destination 어느 쪽의 실패도 여기로 온다.
  throw err;
}
```

`'error'` 리스너 0개인 EventEmitter가 에러 emit하면 **즉시 throw → 프로세스 종료**. Stream, net.Socket, child_process 모두 EventEmitter라 동일하다. 스트림을 연결할 때는 한쪽 리스너만 다는 대신 `pipeline()`으로 전체 체인의 오류 전파와 정리를 맡긴다.

## 출처

- [Node.js Process API](https://nodejs.org/api/process.html), [Stream API, `pipeline()`](https://nodejs.org/api/stream.html#streampipelinesource-transforms-destination-callback)
