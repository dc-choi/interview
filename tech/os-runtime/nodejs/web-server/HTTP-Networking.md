---
tags: [runtime, nodejs]
status: note
verified_at: 2026-10-01
category: "OS & Runtime"
aliases: ["HTTP 네트워킹"]
---

# HTTP 네트워킹

## HTTP 트랜잭션 해부

### 서버 생성과 요청 처리
```js
const http = require('node:http');

http.createServer((request, response) => {
  const { headers, method, url } = request;  // 메서드, URL, 헤더 추출 (헤더는 모두 소문자)

  // 학습용 수집 예시: 실제 서버는 본문 크기와 수신 시간을 제한한다.
  let body = [];
  request
    .on('error', err => { console.error(err); response.destroy(); })
    .on('data', chunk => body.push(chunk))
    .on('end', () => {
      body = Buffer.concat(body).toString();

      // 응답 구성
      response.on('error', err => console.error(err));
      response.statusCode = 200;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ headers, method, url, body }));
    });
}).listen(8080);
```

chunk를 문자열로 바로 이어 붙이지 않고 Buffer 배열에 모았다가 `end`에서 한 번 디코딩하는 이유는 [[Buffer-Memory#흔한 실수|Buffer 흔한 실수]]의 청크 경계 멀티바이트 깨짐 참조.

### 파이핑을 활용한 에코 서버
request는 Node Readable이고 response는 Node Writable이므로 `pipe()`로 배압을 연결할 수 있다. 단순 `pipe()`만으로 양쪽 오류와 종료가 모두 정리되는 것은 아니다.
```js
http.createServer((request, response) => {
  request.on('error', err => { console.error(err); response.destroy(); });
  response.on('error', err => console.error(err));

  if (request.method === 'POST' && request.url === '/echo') {
    request.pipe(response);  // 요청 본문을 그대로 응답으로 스트리밍
  } else {
    response.statusCode = 404;
    response.end();
  }
}).listen(8080);
```

### writeHead로 명시적 헤더 전송
```js
response.writeHead(200, {
  'Content-Type': 'application/json',
  'X-Powered-By': 'bacon',
});
```

### 요청 URL 파싱

`IncomingMessage.url`은 보통 origin이 없는 request target이다. 고정된 기준 URL과 WHATWG `URL`을 조합하면 경로와 쿼리를 나눠 처리할 수 있다.

```js
const target = new URL(request.url, 'http://internal.invalid');
const page = target.searchParams.get('page');
console.log(target.pathname, page);
```

외부 origin을 복원해야 할 때는 `Host`와 프록시 전달 헤더를 그대로 신뢰하지 말고 허용한 프록시와 호스트인지 먼저 검증한다.

요청 헤더 객체는 소문자 키를 사용하지만 `rawHeaders`는 원래 순서와 표기를 보존한다. 중복 헤더 병합 규칙은 헤더 종류에 따라 다르다. 상태 코드와 헤더는 첫 body 쓰기 전에 결정하고 모든 응답 경로에서 `end()` 또는 명시적인 연결 종료를 수행한다.

본문을 Buffer 배열에 모으는 방식은 전체 본문과 병합 버퍼의 메모리를 사용한다. 크기 제한, 수신 timeout과 연결 종료를 처리한다. 스트림 오류 뒤 이미 전송한 헤더를 다시 쓰려 하지 말고 `headersSent`, `writableEnded`, 연결 상태를 확인한다.

## HTTP 아래 TCP와 UDP

| 계층 | Node.js API | 데이터 경계와 보장 |
|---|---|---|
| TCP와 IPC 스트림 | `node:net` | `net.Socket`은 Duplex 스트림이다. 순서 있는 바이트 흐름이며 애플리케이션 메시지 경계는 직접 프레이밍한다 |
| UDP 데이터그램 | `node:dgram` | `message` 이벤트가 데이터그램 경계를 보존하지만 전달, 순서와 재전송을 보장하지 않는다 |

TCP는 `net.createServer()`와 `net.createConnection()`으로 서버와 클라이언트를 만들고 `write()`의 배압, `error`, `end`, `close` 수명주기를 관리한다. UDP는 `dgram.createSocket()`으로 만든 소켓을 `bind()`, `send()`, `close()`하며, 유실과 중복을 허용할 수 있는 프로토콜에서 쓴다. HTTP 서버 프레임워크는 이 하위 소켓 계층을 감싸지만, 장시간 연결과 대용량 응답을 진단할 때는 [[Stream-Types|Duplex와 배압]]까지 내려가야 한다.

## 프록시와 인증서

사내 프록시와 시스템 CA, 추가 인증서의 적용 범위는 [[Nodejs-Enterprise-Networking]]을 따른다. HTTP Agent 설정과 Fetch dispatcher 설정은 구분한다.

## Fetch API
Node.js Fetch는 Undici를 사용한다. `http.globalAgent` 설정이 Fetch의 연결 정책을 바꾸지는 않는다. HTTP 오류 응답도 Promise가 이행되므로 `response.ok` 또는 상태 코드를 직접 검사한다.

### 기본 사용법
```js
// GET
const response = await fetch('https://jsonplaceholder.typicode.com/posts');
if (!response.ok) {
  await response.body?.cancel();
  throw new Error(`HTTP ${response.status}`);
}
const data = await response.json();

// POST
const response2 = await fetch('https://jsonplaceholder.typicode.com/posts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'foo', body: 'bar', userId: 1 }),
});
```

응답 body는 소비하거나 취소해야 연결 자원을 회수할 수 있다. `response.json()`은 JSON 전체를 메모리에 구성한다. stream chunk를 문자열 하나로 계속 누적하는 구현 역시 일정한 메모리 사용량을 보장하지 않는다. `AbortSignal.timeout()` 등으로 취소 경로를 정하고, 재시도는 HTTP 메서드와 업무의 멱등성을 확인한 뒤 적용한다.

### Undici Pool (연결 재사용)
```js
import { Pool } from 'undici';
const pool = new Pool('http://localhost:11434', { connections: 10 });

const { statusCode, body } = await pool.request({
  path: '/api/generate',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'Hello', model: 'mistral' }),
});

// 스트리밍 응답 처리
const decoder = new TextDecoder();
for await (const chunk of body) {
  console.log(decoder.decode(chunk, { stream: true }));
}
console.log(decoder.decode()); // 마지막 디코더 상태 비우기
await pool.close();
```

실제 Pool 사용은 `try/finally`에서 `await pool.close()`로 종료한다. 오류 상태에서도 body를 소비하거나 버려야 한다. Pool API를 import하려면 `undici` 패키지를 별도 설치한다.

### Axios에서 Fetch로 이전

`response.data`를 `await response.json()`으로 바꾸는 것 외에 4xx/5xx 실패 처리, timeout, query 직렬화, interceptor와 instance 설정을 검토한다. 자동 변환 결과의 `.catch(() => null)`은 rejection을 성공 값으로 바꾸므로 기존 오류 계약을 보존하는지 확인한다. JSON 요청은 `Content-Type`도 명시한다.

## WebSocket
내장 WebSocket 클라이언트는 v22.4.0부터 stable이다. `ws:`/`wss:` 연결에서 양방향 메시지를 교환한다. 클라이언트가 있다는 것과 수신 서버가 내장되어 있다는 것은 다르다. Socket.IO는 별도 프로토콜 계층이 있으므로 일반 WebSocket 클라이언트와 직접 호환된다고 가정하지 않는다.

```js
const socket = new WebSocket('ws://localhost:8080');

socket.addEventListener('open', event => {
  console.log('연결 성공');
  socket.send(JSON.stringify({ type: 'message', content: 'Hello!' }));
});

socket.addEventListener('message', event => {
  try {
    const data = JSON.parse(event.data);
    console.log('수신:', data);
  } catch (error) { console.error('JSON 해석 실패:', error); }
});

socket.addEventListener('close', event => console.log('종료:', event.code, event.reason));
socket.addEventListener('error', error => console.error('에러:', error));
```

## 출처

- [Node.js — Axios to WHATWG Fetch](https://nodejs.org/learn/userland-migrations/axios-to-whatwg-fetch)
- [Node.js — Native WebSocket client](https://nodejs.org/learn/getting-started/websocket)

- [Node.js — Anatomy of an HTTP Transaction](https://nodejs.org/en/learn/http/anatomy-of-an-http-transaction)
- [Node.js — Net API](https://nodejs.org/api/net.html)
- [Node.js — UDP/datagram sockets](https://nodejs.org/api/dgram.html)
- [Node.js — URL API](https://nodejs.org/api/url.html)
- [Node.js — Enterprise network configuration](https://nodejs.org/en/learn/http/enterprise-network-configuration)
- [Node.js — Fetching data with Undici](https://nodejs.org/en/learn/getting-started/fetch)
- [Node.js — WebSocket global](https://nodejs.org/api/globals.html#class-websocket)
- [얄팍한 코딩사전 강사 — TCP & UDP](https://www.inflearn.com/courses/lecture?courseId=336276&unitId=271249)
- [얄팍한 코딩사전 강사 — HTTP](https://www.inflearn.com/courses/lecture?courseId=336276&unitId=271844)
- [얄팍한 코딩사전 강사 — url, dns, util, os 모듈](https://www.inflearn.com/courses/lecture?courseId=336276&unitId=273476)
