---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
aliases: ["Stream Types", "스트림 타입"]
verified_at: 2026-09-22
---

# 스트림 타입과 배압

데이터를 청크(chunk) 단위로 처리하는 추상 인터페이스. 전체 데이터를 메모리에 올리지 않고도 대용량 데이터를 처리할 수 있으며, 모든 스트림은 **EventEmitter**의 인스턴스이다.

## 4가지 스트림 타입

### 1. Readable
```
데이터를 읽을 수 있는 스트림. 내부에 버퍼 큐가 있으며 highWaterMark를 버퍼링 임계값으로 사용한다. hard limit은 아니다.

두 가지 읽기 모드:
- Pull 모드 (paused): on('readable') + read() 호출로 직접 꺼냄
- Push 모드 (flowing): on('data') 이벤트로 자동 수신

예: fs.createReadStream(), http.IncomingMessage (req), process.stdin
```

**push() 반환값과 피드백 신호**
Readable 스트림을 직접 구현할 때 `push(chunk)`는 **boolean을 반환**하며, 이것이 backpressure 피드백이다.
- `true` → highWaterMark 미도달, 계속 push 가능
- `false` → 내부 버퍼가 임계값에 도달했으므로 구현체는 다음 `_read()` 호출까지 생산을 멈춰야 함

**동기 push의 함정**: `_read()`에서 `push()`의 반환값을 무시하고 여러 chunk를 계속 밀면 highWaterMark가 강제 상한이 아니므로 버퍼가 임계값을 넘을 수 있다. 동기 처리 자체가 문제라기보다 `false` 피드백을 무시하는 구현이 문제다.

```js
// BAD: push() 피드백 무시
new Readable({
  read() {
    while (hasMore()) this.push(nextChunk());
  }
});

// GOOD: false이면 생산을 멈추고 다음 _read()를 기다림
new Readable({
  read() {
    while (hasMore()) {
      if (!this.push(nextChunk())) return;
    }
    this.push(null);
  }
});
```

동기적으로 생산해도 `push()`가 `false`일 때 멈추고 다음 `_read()`에서 재개하면 된다. 반대로 비동기 I/O라고 배압이 자동으로 지켜지지는 않는다. 생산 방식보다 소비 속도에 따라 생산을 멈추는 계약이 중요하다.

`on('data', async chunk => ...)`도 이벤트 발생을 비동기 작업의 완료까지 기다리게 만들지 않는다. 처리 중인 작업이 계속 쌓이면 내부 스트림 버퍼와 별개로 메모리가 늘 수 있다. 순차 처리는 `for await...of` 안에서 작업을 `await`하고, 병렬 처리가 필요하면 진행 중인 작업 수를 제한한다.

### 2. Writable
```
데이터를 쓸 수 있는 스트림.

write(chunk) → 내부 _write(chunk, encoding, callback) 호출
callback을 호출해야 다음 청크를 받을 수 있다 → 이것이 배압(backpressure)의 핵심

예: fs.createWriteStream(), http.ServerResponse (res), process.stdout
```

### 3. Duplex
```
읽기와 쓰기를 동시에 수행. Readable 측과 Writable 측이 독립적으로 동작한다.

예: net.Socket (TCP 소켓). zlib 스트림은 입력과 출력이 연결되는 Transform의 예다.
```

**양방향 통신 사례** — Duplex는 읽기와 쓰기 측을 따로 관리한다. 업무상 요청과 응답은 관련될 수 있으며, child process의 stdio는 한 Duplex가 아닌 별도 스트림이다:

| 사례 | 쓰기 측 | 읽기 측 |
|------|--------|--------|
| `net.Socket` (TCP) | `socket.write(...)` 송신 | `socket.on('data')` 수신 |
| HTTP/2 stream | `req.write(...)` 요청 본문 | `req.on('data')` 응답 본문 |
| Child process stdio | `child.stdin.write(...)` | `child.stdout.on('data')` |

```ts
// TCP — 양방향 소켓
net.createServer(socket => {
  socket.write('greeting');
  socket.on('data', d => console.log('client said:', d.toString()));
});

// Child stdio — stdin은 Writable, stdout은 Readable이지만
// child 자체가 양방향 통신 채널
const child = spawn('node', ['script.js']);
child.stdin.write('input');
child.stdout.on('data', d => console.log(d.toString()));
```

**Transform vs Duplex** — Transform은 Duplex의 서브셋이지만 의미가 다름:

| 축 | Duplex | Transform |
|----|--------|-----------|
| 입력↔출력 관계 | 독립 (무관할 수도) | 입력에 의해 출력이 만들어짐. 청크 수와 크기는 1:1일 필요 없음 |
| 사용처 | 양방향 통신 채널 | gzip, 암호화, 인코딩 변환 |
| 구현 메서드 | `_read`, `_write` | `_transform` |

### 4. Transform
```
Duplex의 하위 타입. 입력을 변환하여 출력으로 내보낸다.
_transform(chunk, encoding, callback) 메서드를 구현한다.

예: zlib.createGzip(), crypto.createCipheriv('aes-256-gcm', key, iv)
```

## 배압 (Backpressure)
```
생산 속도가 소비 속도보다 빠를 때 데이터 누적으로 생기는 메모리 문제를 줄이는 메커니즘.

문제 상황:
읽기(100MB/s) → 쓰기(10MB/s) → 버퍼에 데이터가 쌓여 메모리 폭주

해결: pipe()가 자동으로 배압을 처리한다.
1. Writable의 내부 버퍼가 highWaterMark에 도달하거나 초과하면
2. write()가 false를 반환
3. Readable이 읽기를 일시 중지 (pause)
4. Writable이 버퍼를 비우면 'drain' 이벤트 발생
5. Readable이 읽기 재개 (resume)
```

### highWaterMark와 메모리 관리
```
highWaterMark: 추가 읽기나 쓰기를 멈추라는 버퍼링 임계값. 엄격한 메모리 상한이 아니다.
- Node.js 24 일반 바이트 스트림 highWaterMark 기본값은 non-Windows 64KiB, Windows 16KiB이고 objectMode는 16개다. `fs.createReadStream()` 같은 일부 구현은 별도 기본값을 가진다.
- Node.js 공식 가이드의 특정 실험: 약 87MB (배압 준수) vs 약 1.5GB (무시). 모든 부하에서 같은 배율을 보장하지 않는다.
- 누적 객체는 GC 부담을 늘릴 수 있다. 메모리 사용량과 지연의 관계는 실제 부하에서 측정한다.
```

**수동 배압 처리 (pipe 미사용 시)**
```js
function writeChunks(writable, chunks) {
  let i = 0;
  function write() {
    while (i < chunks.length) {
      const ok = writable.write(chunks[i++]);
      if (!ok) {
        // 버퍼가 가득 찼으면 drain 이벤트까지 대기
        writable.once('drain', write);
        return;
      }
    }
    writable.end();
  }
  write();
}
```
- `write()`가 `false`를 반환하면 반드시 `drain` 이벤트를 기다려야 한다
- 소비보다 빠르게 계속 쓰면 버퍼가 누적되어 메모리 고갈에 이를 수 있다

### pipe()의 중요성
```javascript
// ✗ 배압 미처리: 메모리 문제 발생 가능
readable.on('data', (chunk) => {
    writable.write(chunk); // write()의 반환값을 무시
});

// ✓ 배압 자동 처리
readable.pipe(writable);

// ✓ pipeline: 에러 처리 + 정리까지 자동
const { pipeline } = require('stream');
pipeline(readable, transform, writable, (err) => {
    if (err) console.error('Pipeline failed:', err);
});
```

## 관련 문서
- [[Stream-Advanced|스트림 고급 패턴]]
- [[Stream|스트림 인덱스]]
- [[Event-Loop|이벤트 루프]]
- [[libuv]]

## 출처

- [Node.js — Stream API](https://nodejs.org/api/stream.html)
- [Backpressuring in Streams — Node.js](https://nodejs.org/learn/modules/backpressuring-in-streams) — 배압 준수 여부를 비교한 예시 실험
- [Node.js — Events API](https://nodejs.org/api/events.html#asynchronous-vs-synchronous) — 2026-09-22 이벤트 리스너의 동기 호출과 반환값 처리 대조
- [Node.js — DEP0106 crypto.createCipher and crypto.createDecipher](https://nodejs.org/api/deprecations.html#dep0106-cryptocreatecipher-and-cryptocreatedecipher)
- [Node.js v24.20.0, internal stream state](https://github.com/nodejs/node/blob/v24.20.0/lib/internal/streams/state.js)
