---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
aliases: ["Stream Advanced", "스트림 고급"]
verified_at: 2026-08-26
---

# 스트림 고급 패턴

EventEmitter 아키텍처, Web Streams 비교, 에러 전파를 돕는 pipeline(), cork/uncork 배칭 등 스트림의 고급 사용법을 다룬다.

## Event Emitter 아키텍처
```
Node Streams가 상속하는 이벤트 API. 이벤트 이름별로 리스너를 등록하고 호출한다.

핵심 특성:
- emit()는 등록된 모든 리스너를 "동기적"으로 실행한다.
- 비동기 실행이 필요하면 리스너가 process.nextTick(), setImmediate()나 비동기 API를 직접 사용한다. EventEmitter가 emit()을 내부적으로 nextTick에 넘기는 것은 아니다.
- on()으로 등록, removeListener()로 제거, once()로 일회성 등록.

주의:
- 이벤트별 리스너가 기본 한도인 10개를 넘으면 가능한 메모리 누수를 알리는 경고가 발생한다. 실제 누수로 확정하는 판정은 아니다.
- emitter.setMaxListeners(n)으로 조절 가능.
```

## Web Streams vs Node Streams

| 비교 | Node Streams | Web Streams |
|------|-------------|-------------|
| API 모델 | EventEmitter, async iterator | reader/writer/controller, Promise |
| 호환성 | Node.js 전용 | 브라우저 + Node.js |
| 성능 특성 | Node.js 버전과 워크로드에 따라 측정 | Node.js 버전과 워크로드에 따라 측정 |
| API | on/pipe/write | getReader/getWriter/pipeTo |
| 배압 | drain 이벤트 기반 | pull 기반 (내장) |
| 적합 대상 | Node.js 서버 고성능 I/O | 브라우저-서버 범용 코드 |

Node Congress 2026 발표에서 James Snell은 Node.js의 ReadableStream 구현이 Node Streams보다 열 배 수준(order of magnitude)으로 느리며, 여러 런타임과 프레임워크 벤치마크에서도 Web Streams가 눈에 띄게 느리게 나온다고 말했다.

다만 이 격차는 사양이 아니라 구현과 워크로드에 달려 있다. 2026년 Vercel은 Node.js 내장 Web Streams의 불필요한 할당과 Promise 오버헤드를 줄인 유저랜드 구현으로 최대 10배 이상 개선한 사례를 공개했다. 어느 쪽이 빠른지는 대상 Node.js 버전, 청크 크기, 파이프 단계 수로 직접 측정해 판단한다. 이식성이 필요하면 Web Streams, Node.js 전용 고성능 I/O면 Node Streams가 기본 선택이다.

## EventEmitter vs Callback 선택 기준

| 상황 | 적합한 방식 | 이유 |
|------|-------------|------|
| 단일 결과 반환 | Callback | 일회성 실행 |
| 반복적 이벤트 | EventEmitter | 반복/비보장 이벤트 |
| 다수 구독자 | EventEmitter | 여러 리스너 지원 |
| 단순한 단일 콜백 | Callback | 불필요한 복잡성 회피 |

Callback은 특정 작업의 완료를 한 곳에서 받아야 할 때 적합하다. 결과가 한 번만 발생하고 수신자가 하나이므로 구조가 단순하다.

EventEmitter는 이벤트가 반복적으로 발생하거나, 발생 여부가 보장되지 않거나, 여러 구독자가 동일한 이벤트를 수신해야 할 때 적합하다. on()으로 여러 리스너를 등록할 수 있어 확장에 유리하다.

두 방식을 결합할 수도 있다. 예를 들어 glob(pattern, callback) 함수는 최종 결과를 callback으로 반환하면서, 중간에 발견되는 각 파일을 EventEmitter의 'match' 이벤트로 알린다.

## pipeline() vs pipe() 상세 비교

pipe()는 스트림 간 데이터를 연결하고 배압을 처리하지만, 파이프라인 전체의 에러 전파와 정리를 대신하지 않는다. 각 스트림의 error 이벤트와 종료 정책을 직접 다뤄야 한다. error 리스너가 없으면 프로세스가 종료될 수 있고, 일부 스트림이나 부분 출력이 남을 수 있다.

아래 파일 예제는 각각 독립적으로 실행하며, 현재 작업 디렉터리 대신 OS 임시 디렉터리의 절대 경로를 쓴다. 각 예제 앞에 이 준비 블록을 둔다.

```javascript
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'node-stream-'));
const inputPath = path.join(workDir, 'input.txt');
const gzipPath = path.join(workDir, 'output.gz');
const textOutputPath = path.join(workDir, 'output.txt');
const cleanup = () => fs.rmSync(workDir, { recursive: true, force: true });

fs.writeFileSync(inputPath, 'Hello Stream');
```

```javascript
// pipe(): 에러 처리를 각 스트림마다 수동으로 해야 함
const readable = fs.createReadStream(inputPath);
const transform = zlib.createGzip();
const writable = fs.createWriteStream(gzipPath);
const streams = [readable, transform, writable];

function handleError(error) {
    console.error('Pipe failed:', error);
    process.exitCode = 1;
    streams.forEach((stream) => stream.destroy());
}

readable.on('error', handleError);
transform.on('error', handleError);
writable.on('error', handleError);
writable.once('close', cleanup);

readable.pipe(transform).pipe(writable);
```

pipeline()은 에러 전파와 연결된 스트림의 정리(destroy), 그리고 Promise 지원을 제공한다. 어느 한 스트림에서 에러가 발생하면 이미 종료된 스트림 등을 제외한 연결 스트림을 정리하고 콜백 또는 Promise rejection으로 에러를 전달한다. 아래 두 방식 중 하나를 선택한다.

```javascript
// pipeline(): 에러 처리와 정리가 자동
const { pipeline } = require('stream');

// 콜백 스타일
pipeline(
    fs.createReadStream(inputPath),
    zlib.createGzip(),
    fs.createWriteStream(gzipPath),
    (err) => {
        if (err) {
            console.error('Pipeline failed:', err);
            process.exitCode = 1;
        } else {
            console.log('Pipeline succeeded');
        }
        cleanup();
    }
);
```

```javascript
// async/await 스타일 (권장)
const { pipeline: pipelinePromise } = require('stream/promises');

async function compress() {
    try {
        await pipelinePromise(
            fs.createReadStream(inputPath),
            zlib.createGzip(),
            fs.createWriteStream(gzipPath)
        );
        console.log('Pipeline succeeded');
    } finally {
        cleanup();
    }
}

compress().catch((error) => {
    console.error('Pipeline failed:', error);
    process.exitCode = 1;
});
```

여러 스트림을 한 작업으로 묶어 에러 전파와 정리가 필요하면 신규 코드에서는 pipeline()을 우선 검토한다. 다만 pipeline()도 실패 시 스트림을 destroy하고 일부 리스너를 남길 수 있으므로 HTTP 응답이나 스트림 재사용처럼 수명 주기가 특별한 경우에는 공식 문서의 주의사항을 확인한다. 단순 연결이나 별도 수명 주기 제어가 필요한 경우에는 pipe()와 명시적 에러 처리가 적합할 수 있다.

## cork/uncork 패턴

여러 작은 쓰기를 버퍼링해 하위 쓰기 호출 수를 줄일 수 있는 기법이다. 정확히 한 번의 시스템 콜로 합쳐지는지는 스트림 구현과 _writev() 지원에 달려 있다.

```js
const writable = fs.createWriteStream(textOutputPath);
writable.on('error', (error) => {
    console.error('Write failed:', error);
    process.exitCode = 1;
});
writable.once('close', cleanup);

writable.cork();           // 쓰기를 버퍼에 보류
writable.write('Hello ');
writable.write('World');
writable.write('!');

// 현재 JavaScript 스택의 연속 쓰기를 모은 뒤 플러시
process.nextTick(() => {
    writable.uncork();
    writable.end();
});
```

```
cork(): 이후의 write()를 내부 버퍼에 보류하고 즉시 시스템 콜을 하지 않는다.
uncork(): 보류된 데이터를 한꺼번에 플러시한다.

process.nextTick에서 uncork를 호출하는 것이 관용구:
현재 JavaScript 작업에서 이어진 쓰기를 모은 뒤 이벤트 루프가 진행되기 전에 플러시한다.

여러 번 cork()하면 동일한 횟수만큼 uncork()를 호출해야 플러시된다.
```

## 관련 문서
- [[Stream-Types|스트림 타입과 배압]]
- [[Stream|스트림 인덱스]]
- [[Event-Loop|이벤트 루프]]
- [[Node.js]]

## 출처

- [We Deserve a Better Streams API for the Web — James Snell, Node Congress 2026](https://gitnation.com/contents/we-deserve-a-better-streams-api-for-the-web)
- [Node.js, Events](https://nodejs.org/api/events.html)
- [Node.js, Stream](https://nodejs.org/api/stream.html)
- [Node.js — Web Streams API](https://nodejs.org/api/webstreams.html)
- [We Ralph Wiggumed WebStreams to make them 10x faster — Vercel](https://vercel.com/blog/we-ralph-wiggumed-webstreams-to-make-them-10x-faster)
