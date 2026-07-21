---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
aliases: ["Stream Types", "스트림 타입"]
verified_at: 2026-07-21
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

파일 I/O나 네트워크처럼 **실제로 비동기 대기**가 개입되면 자연스럽게 이 함정을 피하게 되지만, 인메모리 데이터로 스트림을 만들 때는 명시적으로 비동기화해야 한다.

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

예: net.Socket (TCP 소켓), zlib 스트림
```

**Duplex의 실제 사례** — 모두 입력, 출력 경로가 **서로 무관**하게 흐름:

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
쓰기 속도가 읽기 속도보다 빠를 때 발생하는 메모리 문제를 방지하는 메커니즘.

문제 상황:
읽기(100MB/s) → 쓰기(10MB/s) → 버퍼에 데이터가 쌓여 메모리 폭주

해결: pipe()가 자동으로 배압을 처리한다.
1. Writable의 내부 버퍼가 highWaterMark를 초과하면
2. write()가 false를 반환
3. Readable이 읽기를 일시 중지 (pause)
4. Writable이 버퍼를 비우면 'drain' 이벤트 발생
5. Readable이 읽기 재개 (resume)
```

### highWaterMark와 메모리 관리
```
highWaterMark: 추가 읽기나 쓰기를 멈추라는 버퍼링 임계값. 엄격한 메모리 상한이 아니다.
- Node.js 24 일반 바이트 스트림 기본값: 64KiB, objectMode: 16개. `fs.createReadStream()` 같은 일부 구현은 별도 기본값을 가진다.
- 배압 무시 시 메모리 영향: ~87MB (배압 준수) vs ~1.5GB (무시) → 약 17배 차이
- GC 부담도 비례하여 증가 → 응답 시간 저하
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
- 이를 무시하면 메모리가 무한히 증가한다

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
- [Node.js — DEP0106 crypto.createCipher and crypto.createDecipher](https://nodejs.org/api/deprecations.html#dep0106-cryptocreatecipher-and-cryptocreatedecipher)
