---
tags: [runtime, nodejs]
status: note
verified_at: 2026-08-04
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

  // 요청 본문 수집 (POST/PUT)
  let body = [];
  request
    .on('error', err => console.error(err))
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

### 파이핑을 활용한 에코 서버
```
request는 ReadableStream이고 response는 WritableStream이므로 pipe를 사용할 수 있다.
```
```js
http.createServer((request, response) => {
  request.on('error', err => { console.error(err); response.statusCode = 400; response.end(); });
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

## HTTP 아래 TCP와 UDP

| 계층 | Node.js API | 데이터 경계와 보장 |
|---|---|---|
| TCP와 IPC 스트림 | `node:net` | `net.Socket`은 Duplex 스트림이다. 순서 있는 바이트 흐름이며 애플리케이션 메시지 경계는 직접 프레이밍한다 |
| UDP 데이터그램 | `node:dgram` | `message` 이벤트가 데이터그램 경계를 보존하지만 전달, 순서와 재전송을 보장하지 않는다 |

TCP는 `net.createServer()`와 `net.createConnection()`으로 서버와 클라이언트를 만들고 `write()`의 배압, `error`, `end`, `close` 수명주기를 관리한다. UDP는 `dgram.createSocket()`으로 만든 소켓을 `bind()`, `send()`, `close()`하며, 유실과 중복을 허용할 수 있는 프로토콜에서 쓴다. HTTP 서버 프레임워크는 이 하위 소켓 계층을 감싸지만, 장시간 연결과 대용량 응답을 진단할 때는 [[Stream-Types|Duplex와 배압]]까지 내려가야 한다.

## 엔터프라이즈 네트워크 설정
```
엔터프라이즈 환경에서는 기업 프록시 뒤에서 작동하고 사용자 정의 CA를 사용해야 한다.
Node.js는 환경 변수와 명령줄 플래그로 이를 기본 지원한다.
```

### 프록시 설정
```bash
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
export NO_PROXY=localhost,127.0.0.1,.company.com
node --use-env-proxy app.js   # v22.21.0+ / v24.5.0+
```

**프로그래밍 방식 (요청별 에이전트 재정의)**
```js
const https = require('node:https');
const agent = new https.Agent({
  proxyEnv: { HTTPS_PROXY: 'http://proxy.company.com:8080' },
});
https.request({ hostname: 'www.external.com', port: 443, path: '/', agent }, res => { /* ... */ });
```

### CA 인증서 설정
```bash
node --use-system-ca app.js                     # 시스템 인증서 저장소 사용 (v22.15.0+)
NODE_EXTRA_CA_CERTS=/path/to/company-ca.pem node app.js  # 추가 CA 인증서
```

| 기능 | 환경 변수 | 명령줄 플래그 | API |
|------|---------|-----------|-----|
| 프록시 | `NODE_USE_ENV_PROXY` | `--use-env-proxy` | `Agent` 객체 |
| 시스템 CA | `NODE_USE_SYSTEM_CA` | `--use-system-ca` | `tls.getCACertificates()` |
| 추가 CA | `NODE_EXTRA_CA_CERTS` | - | `tls.setDefaultCACertificates()` |

## Fetch API
```
Node.js의 Fetch API는 Undici HTTP 클라이언트 라이브러리가 지원한다.
Node.js 내장 HTTP 클라이언트에 의존하지 않으며 처음부터 작성되었다.
```

### 기본 사용법
```js
// GET
const response = await fetch('https://jsonplaceholder.typicode.com/posts');
const data = await response.json();

// POST
const response2 = await fetch('https://jsonplaceholder.typicode.com/posts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'foo', body: 'bar', userId: 1 }),
});
```

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
pool.close();
```

## WebSocket
```
Node.js v22.4.0부터 WebSocket API가 안정적(stable)으로 표시되어 프로덕션 사용이 가능하다.
단일 TCP 연결을 통해 양방향(full-duplex) 통신을 제공한다.

중요: Node.js v22는 WebSocket 클라이언트만 내장 제공. 서버는 ws, socket.io 등 외부 라이브러리 필요.
```

```js
const socket = new WebSocket('ws://localhost:8080');

socket.addEventListener('open', event => {
  console.log('연결 성공');
  socket.send(JSON.stringify({ type: 'message', content: 'Hello!' }));
});

socket.addEventListener('message', event => {
  const data = JSON.parse(event.data);
  console.log('수신:', data);
});

socket.addEventListener('close', event => console.log('종료:', event.code, event.reason));
socket.addEventListener('error', error => console.error('에러:', error));
```

## 출처

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
