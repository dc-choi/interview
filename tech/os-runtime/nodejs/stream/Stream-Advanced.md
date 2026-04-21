---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
aliases: ["Stream Advanced", "스트림 고급"]
---

# 스트림 고급 패턴

EventEmitter 아키텍처, Web Streams 비교, 에러 안전한 pipeline(), cork/uncork 배칭 등 스트림의 고급 사용법을 다룬다.

## Event Emitter 아키텍처
```
스트림의 기반. Map 구조로 이벤트 이름 → 콜백 배열을 관리한다.

핵심 특성:
- emit()는 등록된 모든 리스너를 "동기적"으로 실행한다.
- 비동기처럼 보이는 것은 내부에서 nextTick으로 지연 호출하기 때문이다.
- on()으로 등록, removeListener()로 제거, once()로 일회성 등록.

주의:
- 리스너가 많으면(기본 10개 초과) 메모리 누수 경고 발생.
- emitter.setMaxListeners(n)으로 조절 가능.
```

## Web Streams vs Node Streams

| 비교 | Node Streams | Web Streams |
|------|-------------|-------------|
| 기반 | EventEmitter | Promise |
| 호환성 | Node.js 전용 | 브라우저 + Node.js |
| 성능 | **더 빠름** (이벤트 기반) | 상대적으로 느림 (Promise 오버헤드) |
| API | on/pipe/write | getReader/getWriter/pipeTo |
| 배압 | drain 이벤트 기반 | pull 기반 (내장) |
| 적합 대상 | Node.js 서버 고성능 I/O | 브라우저-서버 범용 코드 |

```
James Snell (Node.js Core Contributor):
"Web Streams는 이식성이 좋지만, Node Streams가 상당히 더 빠르다.
성능이 중요한 서버 사이드에서는 Node Streams를 사용하라."
```

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

pipe()는 스트림 간 데이터를 연결하고 배압을 자동으로 처리하지만, 에러 발생 시 스트림을 자동으로 정리(destroy)하지 않는다. 각 스트림의 error 이벤트를 수동으로 핸들링해야 하며, 이를 빠뜨리면 메모리 누수가 발생한다.

```javascript
// pipe(): 에러 처리를 각 스트림마다 수동으로 해야 함
const readable = fs.createReadStream('input.txt');
const transform = zlib.createGzip();
const writable = fs.createWriteStream('output.gz');

readable.on('error', handleError);
transform.on('error', handleError);
writable.on('error', handleError);

readable.pipe(transform).pipe(writable);
```

pipeline()은 에러 자동 전파, 모든 스트림의 자동 정리(destroy), 그리고 Promise 지원까지 제공한다. 어느 한 스트림에서 에러가 발생하면 파이프라인 전체가 정리되고 콜백(또는 Promise rejection)으로 에러가 전달된다.

```javascript
// pipeline(): 에러 처리와 정리가 자동
const { pipeline } = require('stream');

// 콜백 스타일
pipeline(
    fs.createReadStream('input.txt'),
    zlib.createGzip(),
    fs.createWriteStream('output.gz'),
    (err) => {
        if (err) console.error('Pipeline failed:', err);
        else console.log('Pipeline succeeded');
    }
);

// async/await 스타일 (권장)
const { pipeline: pipelinePromise } = require('stream/promises');

async function compress() {
    await pipelinePromise(
        fs.createReadStream('input.txt'),
        zlib.createGzip(),
        fs.createWriteStream('output.gz')
    );
    console.log('Pipeline succeeded');
}
```

결론: 신규 코드에서는 항상 pipeline()을 사용해야 한다. pipe()는 레거시 코드와의 호환성을 위해서만 유지하고, 새로 작성하는 코드에서는 에러 안전성과 리소스 정리가 보장되는 pipeline()이 표준이다.

## cork/uncork 패턴

여러 작은 쓰기를 단일 시스템 콜로 배칭하여 성능을 향상시키는 기법이다.

```js
const writable = fs.createWriteStream('output.txt');

writable.cork();           // 쓰기를 버퍼에 보류
writable.write('Hello ');
writable.write('World');
writable.write('!');

// nextTick에서 uncork → 3개의 write가 하나의 시스템 콜로 플러시
process.nextTick(() => writable.uncork());
```

```
cork(): 이후의 write()를 내부 버퍼에 보류하고 즉시 시스템 콜을 하지 않는다.
uncork(): 보류된 데이터를 한꺼번에 플러시한다.

process.nextTick에서 uncork를 호출하는 것이 관용구:
현재 이벤트 루프 턴에서의 모든 쓰기가 배칭된 후 플러시된다.

여러 번 cork()하면 동일한 횟수만큼 uncork()를 호출해야 플러시된다.
```

## 관련 문서
- [[Stream-Types|스트림 타입과 배압]]
- [[Stream|스트림 인덱스]]
- [[Event-Loop|이벤트 루프]]
- [[Node.js]]
