---
tags: [runtime, nodejs]
status: index
category: "OS & Runtime"
aliases: ["node.js"]
---

# node.js
웹 브라우저밖에서 돌아가는 JS 런타임

## 탄생 배경

Node.js는 2009년 5월 27일 JSConf EU에서 **Ryan Dahl**이 발표하며 세상에 나왔다. 당시 주류였던 Apache HTTP 서버의 **요청당 스레드 모델**은 동시 연결 수가 많아질수록 스레드 생성·컨텍스트 스위칭 비용 때문에 성능이 급격히 떨어지는 한계가 있었다. Ryan Dahl은 실시간 업로드 진행률 표시 같은 기능을 구현하면서 이 문제를 절감했고, **논블로킹 I/O 기반의 새로운 서버 런타임**을 구상했다.

### 핵심 설계 선택
- **V8 엔진 채택**: 구글이 Chrome을 위해 만든 고성능 JS 엔진이 이미 오픈소스로 공개돼 있었다. JIT 컴파일로 인터프리터보다 훨씬 빠르고, JS라는 이미 널리 쓰이는 언어를 서버에 끌어올 수 있다는 장점이 컸다.
- **이벤트 기반 비동기 I/O**: 요청당 스레드 대신 **하나의 이벤트 루프 + 논블로킹 I/O** 모델을 선택. 적은 메모리로 수천 개 동시 연결을 처리할 수 있다.
- **싱글 스레드 모델**: 스레드 동기화/락/데드락 등 멀티 스레드의 복잡성을 개발자에게서 숨기고, 단순한 프로그래밍 모델을 제공하는 것을 우선시했다.

### 철학: Unix의 영향
Node.js의 설계 철학은 Unix의 영향을 강하게 받았다. **"작고 단순한 것이 아름답다(Small is beautiful)"**, **"한 가지 일을 잘하는 프로그램"** 같은 Unix 격언이 Node.js의 모듈 생태계(npm)와 코어 모듈 설계에 그대로 녹아 있다. 코어는 최소한만 제공하고, 나머지는 작은 모듈을 조합해 해결하는 방식이다.

### 면접 포인트
- "왜 Node.js가 등장했나?" → **Apache 요청당 스레드 모델의 C10K 문제를 해결하기 위해.** 논블로킹 I/O + 이벤트 루프로 적은 리소스에서 많은 동시 연결을 처리할 수 있다.
- "왜 싱글 스레드를 선택했나?" → **개발자가 동시성 버그(경쟁 조건, 데드락 등)를 걱정하지 않도록 복잡성을 런타임 내부로 숨기기 위해.** 대신 CPU 집약적 작업은 Worker Threads로 해결.

## 핵심 정의
```
하나의 프로세스, 하나의 스레드, 하나의 이벤트 루프, 하나의 V8 인스턴스, 하나의 Node.js 인스턴스
```

Node.js는 싱글 프로세스에서 동작하며, 요청마다 새 스레드를 생성하지 않는다. 비동기 I/O 프리미티브를 표준 라이브러리로 제공하여 논블로킹 패러다임으로 작성된다. I/O 작업(네트워크, DB, 파일시스템) 수행 시 스레드를 차단하지 않고, 응답이 돌아오면 재개하여 단일 서버에서 수천 개의 동시 연결을 처리한다.

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
- **Node.js Bindings**: JS 모듈과 C++ 구현을 연결하는 브릿지. `process.binding`을 통해 JS에서 저수준 C++ 기능을 호출할 수 있다.

### 동작 흐름 예시: `fs.readFile()`
```
1. JS에서 fs.readFile() 호출
2. Node.js JS 라이브러리 → process.binding으로 C++ 바인딩 호출
3. libuv가 비동기 파일 읽기 작업 수행 (스레드 풀 활용)
4. 완료 시 콜백이 이벤트 큐에 등록
5. 이벤트 루프가 콜백을 꺼내 실행
```

## Reactor 패턴
Node.js의 핵심 설계 패턴. **동기적 이벤트 디멀티플렉싱 + 논블로킹 I/O**로 동작한다.
```
Hollywood Principle: "Don't call us, we'll call you"
애플리케이션이 I/O 완료를 폴링하지 않고, 완료 시 시스템이 콜백을 호출한다.
```
상세 동작 및 Proactor 패턴 비교는 [[libuv]] 참조.

## "비동기 JavaScript는 존재하지 않는다"
```
JavaScript 자체에는 비동기가 없다. 비동기성은 C++ 스케줄링 메커니즘(libuv)이 동기적 JS 실행을
감싸면서 시뮬레이션하는 것이다. 이벤트 루프의 어떤 단계가 실행될 때, 루프와 메인 스레드 모두
해당 단계가 완료될 때까지 블로킹된다.

— James Snell (Node.js Core Contributor)
```

## 장단점
- 장점
```
1. 이벤트루프를 활용하여 비동기 I/O를 효율적으로 처리. 단일 서버에서 수천 개 동시 연결 가능.
2. NPM에서 제공되는 다양한 오픈 소스 라이브러리와 도구를 쉽게 사용할 수 있음.
3. 스레드 동시성 관리 부담이 없어 동시성 버그가 적음.
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
npm은 Node.js의 표준 패키지 관리자. npm 레지스트리에는 210만 개 이상의 패키지가 등록되어 있으며,
지구상에서 가장 큰 단일 언어 코드 저장소이다. 대안: Yarn, pnpm
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
| `dependencies` | 프로덕션 번들에 포함되는 필수 패키지 |
| `devDependencies` | 개발 단계에만 필요 (테스트, 빌드 도구 등) |
| `optionalDependencies` | 빌드 실패해도 설치 계속 진행 |

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

## ECMAScript 2015+ 지원
```
Node.js는 최신 V8 엔진을 기반으로 구축. ECMA-262 명세의 새로운 기능을 적시에 제공한다.
V8 버전 확인: node -p process.versions.v8
```

| 분류 | 설명 | 플래그 |
|------|------|--------|
| Shipping | V8에서 안정적으로 판단한 기능. 기본 활성화 | 불필요 |
| Staged | 거의 완성되었지만 불안정. `--harmony` 필요 | `--harmony` |
| In Progress | 개발 중. 테스트 목적으로만 권장 | 개별 harmony 플래그 |

```bash
node --harmony script.js          # staged 기능 활성화
node --v8-options | grep "in progress"  # 진행 중인 기능 확인
```
- 프로덕션에서는 `--harmony` 플래그 사용을 제거하는 것이 권장됨
- 지원 기능 확인: node.green 웹사이트

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
그러나 npm 라이브러리들이 NODE_ENV를 인식하므로, 항상 NODE_ENV=production으로 실행해야 한다.
```

**NODE_ENV가 안티패턴으로 간주되는 이유**: 개발자들이 최적화와 소프트웨어 동작을 실행 환경과 결합하면, 프로덕션과 스테이징이 달라져 신뢰할 수 있는 테스트가 불가능해진다.

**권장**: 모든 환경에서 동일한 코드 로직 유지. 환경별 설정은 환경 변수나 설정 파일로 관리.

## Userland Migrations
```
Node.js는 "userland" 코드가 새 기능을 채택하고 breaking changes를 처리하도록
Codemod와의 협력으로 구축된 migrations를 제공한다.
```

```bash
npx codemod @nodejs/import-assertions-to-attributes   # 실제 마이그레이션 예제
```

**모범 사례**: 별도 브랜치에서 실행, 변경사항 검토, 테스트 실행, 포맷팅/린팅 확인

## 하위 문서

### JS 언어 특성
- [[Execution-Context|실행 컨텍스트]]
- [[Call-Stack-Heap|콜 스택 과 힙]]
- [[Scope|스코프]]
- [[Closure|클로저]]

### Node.js 런타임
- [[V8|V8 엔진]]
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
- [[Command-Line|커맨드라인]]
- [[HTTP-Networking|HTTP 네트워킹]]
- [[File-System|파일 시스템]]
- [[Async-Programming|비동기 프로그래밍]]
- [[Debugging-Profiling|디버깅 & 프로파일링]]
- [[Test-Runner|테스트 러너]]
- [[Security|보안 모범 사례]]
- [[TypeScript-Node|TypeScript]]
- [[WebAssembly|WebAssembly]]