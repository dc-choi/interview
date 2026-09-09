---
tags: [runtime, nodejs]
status: index
category: "OS & Runtime"
aliases: ["node.js"]
verified_at: 2026-08-26
---

# node.js
웹 브라우저밖에서 돌아가는 JS 런타임

## 탄생 배경

Node.js는 2009년 5월 27일 처음 공개됐고, Ryan Dahl은 같은 해 11월 JSConf.eu에서 이를 발표했다. 당시 흔했던 연결별 프로세스나 스레드와 blocking I/O 모델은 동시 연결이 많을 때 메모리와 스케줄링 비용이 커질 수 있었다. Node.js는 이 대안으로 이벤트 기반 I/O를 JavaScript 런타임에 결합했다.

### 핵심 설계 선택
- **V8 엔진 채택**: 구글이 Chrome을 위해 만든 고성능 JS 엔진이 이미 오픈소스로 공개돼 있었다. JIT 컴파일로 인터프리터보다 훨씬 빠르고, JS라는 이미 널리 쓰이는 언어를 서버에 끌어올 수 있다는 장점이 컸다.
- **이벤트 기반 비동기 I/O**: JavaScript callback을 이벤트 루프로 조정하고, OS의 readiness/completion 알림과 libuv worker pool을 함께 사용한다. 동시 I/O마다 JavaScript 스레드를 하나씩 둘 필요가 없다.
- **JavaScript 실행 모델**: 기본 isolate의 JavaScript는 주로 한 메인 스레드에서 실행되지만 Node.js 런타임이 한 스레드뿐인 것은 아니다. worker pool과 `worker_threads`는 별도 스레드를 사용한다.

### 철학: Unix의 영향
Node.js의 설계 철학은 Unix의 영향을 강하게 받았다. **"작고 단순한 것이 아름답다(Small is beautiful)"**, **"한 가지 일을 잘하는 프로그램"** 같은 Unix 격언이 Node.js의 모듈 생태계(npm)와 코어 모듈 설계에 그대로 녹아 있다. 코어는 최소한만 제공하고, 나머지는 작은 모듈을 조합해 해결하는 방식이다.

### 면접 포인트
- "왜 Node.js가 등장했나?" → 당시 흔했던 연결별 프로세스나 스레드와 blocking I/O 모델의 동시성 비용을 줄이기 위해서다. 이벤트 루프와 비동기 I/O로 많은 대기 연결을 적은 JavaScript 스레드에서 다중화한다.
- "왜 기본 JavaScript 실행을 한 메인 스레드에 뒀나?" → 한 isolate 안의 공유 메모리 스레드 동기화 부담을 줄이고 callback 실행 모델을 단순화한다. 비동기 상태의 논리적 race는 여전히 제어해야 하고, CPU 집약 작업에 Worker Threads를 쓰면 공유 메모리 동기화도 다시 필요하다.

## 핵심 정의
기본 Node.js 프로세스는 한 V8 isolate의 JavaScript를 메인 스레드와 이벤트 루프에서 실행한다. 하지만 프로세스 안에는 libuv thread pool과 런타임 보조 스레드가 있을 수 있고, 애플리케이션도 Worker Threads나 child process를 추가할 수 있다. 요청마다 JavaScript 스레드를 새로 만드는 모델은 아니다.

네트워크 I/O는 OS의 비동기 알림을 주로 사용하고, 일부 파일시스템, DNS와 crypto 작업은 libuv thread pool을 사용한다. 완료 알림 뒤 JavaScript callback이나 Promise continuation은 이벤트 루프와 microtask 처리 규칙에 따라 메인 JavaScript 실행으로 돌아온다.

## 아키텍처
```
┌─────────────────────────────────────────────┐
│              User JavaScript Code           │
├─────────────────────────────────────────────┤
│          Node.js JS Libraries (fs, http…)   │
├─────────────────────────────────────────────┤
│    Node.js Bindings (Node API / C++ Bridge) │
├──────────────────────┬──────────────────────┤
│     V8 Engine        │       libuv          │
│  (JS 컴파일/실행)     │  (비동기 I/O 추상화)  │
├──────────────────────┴──────────────────────┤
│               OS Kernel                     │
└─────────────────────────────────────────────┘
```

- **V8 엔진**: Google이 개발한 C++ JS 엔진. JS를 머신코드로 컴파일하고 실행한다.
- **libuv**: C 라이브러리. OS별 비동기 I/O API(epoll, kqueue, IOCP)를 추상화하고, 이벤트 루프와 스레드 풀을 구현한다.
- **Node.js Bindings**: core JavaScript와 native 구현을 연결하는 내부 계층. 애플리케이션이 deprecated internal API인 `process.binding()`에 의존하는 구조로 설명하지 않으며, native addon의 안정된 공개 경계는 Node-API를 사용한다.

### 동작 흐름 예시: `fs.readFile()`
```
1. JS에서 fs.readFile() 호출
2. Node.js core가 native I/O 계층에 작업 전달
3. 일반 파일 I/O는 libuv thread pool에서 수행될 수 있음
4. 완료가 이벤트 루프에 전달됨
5. callback 실행 뒤 Promise continuation이 있으면 microtask 규칙에 따라 처리
```

## Reactor 패턴
Node.js의 핵심 설계 패턴. **동기적 이벤트 디멀티플렉싱 + 논블로킹 I/O**로 동작한다.
```
Hollywood Principle: "Don't call us, we'll call you"
애플리케이션이 I/O 완료를 폴링하지 않고, 완료 시 시스템이 콜백을 호출한다.
```
상세 동작 및 Proactor 패턴 비교는 [[libuv]] 참조.

## 언어 비동기와 host I/O의 경계

ECMAScript는 Promise, async function, job queue 같은 비동기 제어 의미를 정의한다. Node.js host는 timer, socket, 파일 I/O와 이벤트 루프를 제공하고, libuv와 OS가 그 I/O 완료를 전달한다. JavaScript callback 하나는 해당 스레드에서 run-to-completion으로 실행되지만, 비동기 전체를 C++이 흉내 낸다고 표현하면 언어의 Promise job과 host scheduling을 혼동한다.

## 장단점
- 장점
```
1. 이벤트루프를 활용하여 비동기 I/O를 효율적으로 처리. 단일 서버에서 수천 개 동시 연결 가능.
2. NPM에서 제공되는 다양한 오픈 소스 라이브러리와 도구를 쉽게 사용할 수 있음.
3. 기본 isolate에서는 공유 메모리 스레드 동기화 부담이 작음. 비동기 상태 race와 Worker Threads의 공유 메모리는 별도 제어 필요.
4. 새로운 ECMAScript 표준을 브라우저 업데이트 없이 바로 사용 가능.
   Node.js 버전을 변경하여 사용할 ECMAScript 버전을 결정할 수 있고,
   --experimental-* 플래그로 실험적 기능도 활성화 가능.
5. 프론트엔드와 백엔드 모두 JavaScript로 작성 가능(언어 통일성).
   프론트엔드 개발자가 별도 언어 학습 없이 서버 측 코드를 작성할 수 있음.
```
- 단점
```
1. 이벤트루프가 싱글스레드로 동작하여 CPU 집약적인 작업(행렬 연산, 이미지 처리, ML)에서
   병목 현상이 일어날 수 있음. Worker Threads, 클러스터 모드로 해결.
2. 비동기 코드 작성시 콜백 지옥이 발생할 수 있음. Promise, async/await로 해결.
3. 패키지가 많아서 의존성 관리가 어려울 수 있으며 버전 충돌 문제가 발생하기도 함.
```

## HTTP 서버 예제
Node.js의 네트워킹 지원은 최고 수준이며, 표준 라이브러리의 `node:http` 모듈로 간단하게 HTTP 서버를 생성할 수 있다.

### CJS 버전 (server.js)
```js
const { createServer } = require('node:http');

const hostname = '127.0.0.1';
const port = 3000;

const server = createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello World');
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
```

### ESM 버전 (server.mjs)
```js
import { createServer } from 'node:http';

const hostname = '127.0.0.1';
const port = 3000;

const server = createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello World');
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
```

### 코드 해설
```
1. createServer()가 새 HTTP 서버를 생성하고 반환한다.
2. 새 요청이 들어올 때마다 request 이벤트가 발생하며 콜백이 호출된다.
   - req (http.IncomingMessage): 요청 정보(메서드, URL, 헤더 등)를 제공
   - res (http.ServerResponse): 클라이언트에 응답을 구성하여 반환
3. 응답 구성:
   - res.statusCode = 200          → HTTP 상태 코드 설정
   - res.setHeader('Content-Type') → 응답 헤더 설정
   - res.end('Hello World')        → 응답 본문을 전송하고 종료
4. server.listen(port, hostname, callback)으로 서버를 시작하며,
   준비 완료 시 콜백이 호출된다.
```

## Node.js와 브라우저의 차이
```
JavaScript는 브라우저와 Node.js 모두에서 동작하지만, 두 환경의 애플리케이션 구축 방식은 완전히 다르다.
프론트엔드와 백엔드를 단일 언어로 프로그래밍할 수 있는 것이 Node.js의 큰 이점이다.
```

| 특성 | Node.js | 브라우저 |
|------|---------|--------|
| API | 파일 시스템, OS 접근 (`fs`, `path`, `os`) | DOM, Web APIs (`document`, `window`) |
| 환경 제어 | 실행 환경을 완전히 제어 가능 | 방문자의 브라우저 선택 불가 |
| JS 버전 | 최신 ES2015+ 직접 사용 | Babel 트랜스파일 필요할 수 있음 |
| 모듈 시스템 | CommonJS + ES Module 모두 지원 | ES Module 중심 |
| 전역 객체 | `global`, `process` | `window`, `document` |

## npm 패키지 관리자
```
npm은 Node.js와 함께 널리 쓰이는 패키지 관리자이며, 매우 큰 공개 레지스트리를 제공한다. 대안으로 Yarn, pnpm이 있다.
```

### 의존성 설치
```bash
npm install                              # 모든 의존성 설치
npm install <package>                    # dependencies에 추가
npm install --save-dev <package>         # devDependencies에 추가 (-D)
npm install --save-optional <package>    # optionalDependencies에 추가 (-O)
npm install --no-save <package>          # package.json에 추가하지 않음
```

| 타입 | 설명 |
|------|------|
| `dependencies` | 패키지 실행에 필요한 의존성. 번들 포함 여부는 번들러 설정과 배포 방식이 결정 |
| `devDependencies` | 로컬 개발, 테스트, 빌드에 필요한 의존성. 배포 산출물을 미리 빌드한다면 런타임 설치에서 제외 가능 |
| `optionalDependencies` | 설치에 실패해도 전체 설치는 실패하지 않는 선택 의존성. 코드에서 부재를 처리해야 함 |

### 스크립트 실행
```json
{
  "scripts": {
    "start": "node lib/server-production",
    "start-dev": "node lib/server-development",
    "test": "node --test"
  }
}
```
```bash
npm run start-dev
npm run test
```

## ECMAScript와 V8 옵션

Node.js가 제공하는 ECMAScript 기능은 **배포 대상 Node.js 릴리스에 포함된 V8**에 따라 달라진다. 지원 여부는 대상 릴리스의 Node.js 문서와 실제 버전으로 확인한다.

```bash
node --version
node -p process.versions.v8
node --v8-options
```

`node --v8-options`는 현재 설치된 Node.js가 포함한 V8 옵션을 보여 준다. V8 옵션은 Node.js의 안정성 보장을 받지 않으므로, `--harmony`나 임의의 V8 실험 플래그를 기능 활성화의 일반 전략으로 쓰지 않는다. 운영 설정에는 대상 Node.js 릴리스가 문서화한 Node CLI 옵션만 명시한다.

## 비동기 프로그래밍
```
비동기 I/O는 콜백 함수로 처리하며 I/O 작업이 완료되면 콜백 함수가 호출됩니다.
콜백 지옥을 피하기 위해서 Promise를 사용합니다. then(), catch()를 사용해서 비동기 처리를 할 수 있습니다.
최근에는 async/await를 사용합니다. await는 Promise가 해결될 때까지 기다린 후 값을 반환합니다.
Promise의 정적 메서드를 통해서도 비동기처리를 할 수 있습니다.
```
콜백, Promise, async/await, 흐름 제어, 타이머, EventEmitter, nextTick/setImmediate 등 상세 내용은 [[Async-Programming|비동기 프로그래밍]] 참조.

## 개발 vs 프로덕션
```
Node.js 자체에는 개발과 프로덕션 간의 차이가 없다.
NODE_ENV는 Node.js 자체의 예약된 동작이 아니라 애플리케이션, 프레임워크와 라이브러리가 해석하는 관례다.
```

프로덕션 배포에서는 사용하는 프레임워크나 라이브러리가 요구하는 경우에만 `NODE_ENV=production`을 명시하고, 스테이징과 테스트는 목적에 맞는 값을 의도적으로 설정한다. 값의 의미와 배포 절차는 애플리케이션이 문서화해야 한다.

**권장**: 최적화나 비즈니스 동작을 실행 환경과 무심코 결합하지 말고, 필요한 환경별 설정만 별도 환경 변수나 설정 파일로 관리한다. 프로덕션과 같은 경로가 필요한 검증은 별도 배포 설정으로 재현한다.

## 하위 문서

### JS 언어 특성
- [[js-core|JS 코어 폴더 인덱스 (실행 컨텍스트, 콜 스택, 스코프, 클로저)]]
- [[Execution-Context|실행 컨텍스트]]
- [[Call-Stack-Heap|콜 스택 과 힙]]
- [[Scope|스코프]]
- [[Closure|클로저]]

### Node.js 런타임
- [[process-model|프로세스와 스레드 모델 폴더 인덱스 (싱글 vs 멀티 스레드, child_process, 클러스터링)]]
- [[V8|V8 엔진]]
  - [[V8-Ignition-TurboFan|V8 컴파일 파이프라인]]
  - [[V8-Hidden-Class|V8 히든 클래스]]
  - [[V8-Inline-Cache|V8 인라인 캐시]]
- [[libuv]]
- [[Event-Loop|이벤트루프]]
- [[Module-System|모듈 시스템]]
- [[Package-Publishing|패키지 배포]]
- [[Stream|스트림]]
- [[Worker-Threads|워커 스레드]]
- [[Single-vs-Multi-Thread|싱글 vs 멀티 스레드 (면접 프레임)]]
- [[Async-Internals|비동기 내부 동작]]
- [[Advanced-Recipes|고급 레시피]]

### Node.js 실전
- [[tooling|개발 도구 폴더 인덱스 (커맨드라인, 의존성 선택, 패키지 배포, TypeScript 연동)]]
- [[Command-Line|커맨드라인]]
- [[Dependency-Selection|의존성 선택]]
- [[Nodejs-Web-Server|웹 서버와 프레임워크 (http 모듈, Hono, Apollo Server)]]
- [[File-System|파일 시스템]]
- [[Async-Programming|비동기 프로그래밍]]
- [[Buffer-Memory|Buffer, Memory Management (alloc, allocUnsafe, poolSize)]]
- [[Process-Child-Process|Process, Child Process (spawn/exec/fork, IPC, 시그널)]]
- [[Error-Handling|Error Handling (4가지 경로, 전역 핸들러, 운영 vs 프로그래밍 에러)]]
- [[Debugging-Profiling|디버깅 & 프로파일링]]
- [[Test-Runner|테스트 러너]]
- [[Nodejs-Design-Patterns|Node.js 생성 패턴 (Singleton, Factory, Builder, Prototype)]]
- [[Nodejs-Production-Readiness|Node.js 프로덕션 운영 체크리스트 (6대 운영 축, 단계별 전략)]]
- [[tech/os-runtime/nodejs/Security|보안 모범 사례]]
- [[TypeScript-Node|TypeScript]]
- [[WebAssembly|WebAssembly]]
- [[Nodejs-Native-Addons|Native Addons (Node-API, node-addon-api, napi-rs, prebuild)]]

## 출처

- [Node.js, Don't Block the Event Loop](https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop)
- [Node.js 0.1.5 documentation, early release archive](https://nodejs.org/download/docs/v0.1.5/)
- [Ryan Dahl: Node.js — JSConf.eu 2009](https://www.jsconf.eu/2009/2009.html)
- [Node.js Node-API](https://nodejs.org/api/n-api.html)
- [Node.js, Environment Variables](https://nodejs.org/api/environment_variables.html)
- [Node.js, Command-line API](https://nodejs.org/api/cli.html)
- [npm, package.json dependencies](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#dependencies)
- [ECMAScript Jobs and Promise reactions](https://tc39.es/ecma262/)
