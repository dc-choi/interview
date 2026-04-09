---
tags: [runtime, nodejs, memory, troubleshooting]
status: done
category: "OS & Runtime"
aliases: ["OOM Troubleshooting", "Node.js OOM", "메모리 부족"]
---

# Node.js OOM 트러블슈팅

Node.js의 OOM(Out Of Memory)은 **V8 엔진이 할당받은 힙 메모리가 한계치에 도달했을 때** 발생한다. 단순히 "메모리가 부족"한 것이 아니라 **V8의 힙 상한선**을 넘었다는 의미이므로, 시스템 메모리가 남아 있어도 프로세스가 죽을 수 있다.

## V8 힙 상한선 이해

### 시스템 메모리 ≠ Node.js 가용 메모리
```
Node.js는 기본적으로 시스템 전체 메모리를 다 쓰지 않는다.
V8 엔진의 기본 설정에 따라 가용 메모리가 제한된다.

- 최신 Node.js는 시스템 메모리에 맞춰 어느 정도 유연하게 조정됨
- 컨테이너(K8s, Docker) 환경에서는 여전히 --max-old-space-size 제한이 결정적
- 이 값을 넘으면 프로세스가 즉시 죽는다 (FATAL ERROR: Reached heap limit)
```

### 힙 사이즈 조정
```bash
# Old Space 상한을 4GB로 설정 (기본값은 환경에 따라 다름)
node --max-old-space-size=4096 app.js

# 컨테이너 메모리 인식 확인
node -p "v8.getHeapStatistics().heap_size_limit"
```

**원칙**: 컨테이너 메모리의 **약 75%** 정도로 힙 사이즈를 제한하는 것이 안전하다. 나머지 25%는 Buffer, 네이티브 모듈, 스택, 코드 페이지, OS 오버헤드를 위해 남겨둔다.

```
컨테이너 메모리: 4GB
→ --max-old-space-size=3072 (3GB)
→ 나머지 1GB는 Buffer + 네이티브 + OS용
```

## OOM이 발생하는 4가지 대표 케이스

### 1. 대량 데이터 일괄 로드
```
수백만 건의 row를 한 번에 가져와 메모리에 올려 가공하는 경우.

증상:
- 배치 작업/리포트 생성 중 프로세스 크래시
- "JavaScript heap out of memory" 메시지
- 힙 사용량 그래프가 급격히 치솟음

전형적인 안티패턴:
```
```js
// BAD: 전체 테이블을 메모리로
const rows = await db.query('SELECT * FROM orders');  // 500만 건
for (const row of rows) {
  process(row);
}
```

### 2. 메모리 누수 (전역 캐시, 이벤트 리스너)
```
전역 변수/캐시에 데이터를 계속 쌓기만 하고 삭제하지 않는 경우,
또는 이벤트 리스너/클로저에 참조가 누적되어 GC 대상이 되지 못하는 경우.
```
```js
// BAD: 전역 캐시가 무한정 성장
const cache = {};
app.get('/user/:id', (req, res) => {
  cache[req.params.id] = fetchUser(req.params.id);  // 삭제 X
});

// BAD: 리스너가 매 요청마다 등록됨
app.post('/event', (req, res) => {
  emitter.on('update', () => { /* ... */ });  // off X → 누적
});
```

### 3. 스트림 미사용 대용량 처리
```
파일/네트워크로 대용량 데이터를 처리할 때 전체를 메모리에 올리면 OOM 확정.
스트림 기반 처리로 청크 단위로 흘려보내야 한다.
```
```js
// BAD: 1GB 파일을 통째로 읽음
const data = fs.readFileSync('/data/huge.csv');

// GOOD: 청크 단위 스트림
fs.createReadStream('/data/huge.csv')
  .pipe(csvParser())
  .pipe(transformStream)
  .pipe(fs.createWriteStream('/data/out.csv'));
```

### 4. 백프레셔 처리 실패
```
비동기 작업에서 데이터를 "생성하는 속도"가 "소비하는 속도"보다 훨씬 빠를 때 발생.
쌓여 있는 데이터가 메모리에 누적되면 OOM.

예: 외부 API에서 데이터를 계속 pull 하는데, DB insert가 느려서 내부 큐가 폭증.
```

Node.js 스트림은 `highWaterMark`와 `drain` 이벤트로 이를 제어한다. 자세한 내용은 [[Backpressure|배압]] 참조.

## 대응 방법

### A. 스트림으로 전환
```
청크 단위 처리로 메모리 상한을 "한 청크 크기 + 버퍼"로 제한한다.

- DB: 커서 기반 스트리밍 (pg: QueryStream, TypeORM: stream(), Prisma: $queryRaw + chunking)
- 파일: fs.createReadStream / createWriteStream
- HTTP: res.pipe(), Transform stream
```

### B. 힙 덤프 분석
```
증상이 반복되면 힙 스냅샷을 찍어 누수 객체를 추적한다.
```
```js
const v8 = require('node:v8');
// 특정 시점에 힙 덤프 생성
v8.writeHeapSnapshot('/tmp/heap.heapsnapshot');
```
- Chrome DevTools Memory 탭에서 로드
- **Comparison 뷰**로 두 스냅샷 간 차이를 비교하여 누수 객체를 식별
- 자세한 내용은 [[Debugging-Profiling|디버깅 & 프로파일링]] 참조

### C. 외부 캐시로 오프로드
```
프로세스 힙 대신 Redis, Memcached 등 외부 저장소에 캐시.

이유:
- 프로세스 재시작해도 캐시 유지
- 여러 인스턴스 간 공유 가능
- 힙 사용량에 영향 없음
- TTL/LRU로 자동 만료 관리
```

### D. 인프라 설정 정렬
```
컨테이너 메모리 제한과 Node.js 힙 설정을 적절히 맞춘다.

- K8s limits.memory: 4Gi
- --max-old-space-size: 3072 (약 75%)
- 나머지 1GB: Buffer, 네이티브 모듈, 스택, 코드, OS
```

### E. 모니터링 & 조기 경보
```
OOM이 발생하기 전에 감지하기 위한 지표 수집.
```
```js
setInterval(() => {
  const { heapUsed, heapTotal, rss, external } = process.memoryUsage();
  // Prometheus/Datadog 등에 전송
  metrics.gauge('nodejs_heap_used', heapUsed);
  metrics.gauge('nodejs_heap_total', heapTotal);
  metrics.gauge('nodejs_rss', rss);
}, 10_000);
```
- `heapUsed / heapTotal > 0.85` 알람
- GC 소요 시간 증가 추세 모니터링 (`--trace-gc`)

## 면접 포인트

Q. Node.js에서 OOM이 발생하는 원인과 대응 방법은?
- **원인**: V8 힙 상한 도달. (1) 대량 데이터 일괄 로드, (2) 전역 캐시/리스너 누수, (3) 스트림 미사용, (4) 백프레셔 실패
- **대응**: 스트림 전환, 힙 덤프 분석, 외부 캐시 오프로드, 컨테이너 메모리의 75% 수준으로 `--max-old-space-size` 설정, 힙 사용량 모니터링

Q. 왜 컨테이너 메모리를 다 쓰면 안 되고 75% 정도로 제한하나?
- Node.js 프로세스는 V8 힙 외에도 Buffer(네트워크/파일 I/O), 네이티브 모듈, 스택, 코드 페이지 등 **힙 바깥의 메모리**를 사용한다
- 힙 상한을 100%로 잡으면 힙 바깥에서 쓰는 메모리 때문에 OOM Killer가 프로세스 전체를 죽인다 (Linux cgroup)
- 25% 여유를 두면 GC가 가동될 시간도 확보되고, 네이티브 영역의 일시적 증가도 흡수 가능

Q. 메모리 누수를 어떻게 찾는가?
- 부하 테스트 중 주기적으로 Heap Snapshot 캡처
- Chrome DevTools Comparison 뷰로 누수 의심 객체 식별
- `--trace-gc` 로 GC 추세 확인 — 회수량이 줄어들면 누수 의심
- 흔한 원인: 제거 안 된 이벤트 리스너, 무한 성장하는 Map/Set, 클로저로 인한 참조 유지

## 관련 문서
- [[V8|V8 엔진]]
- [[Call-Stack-Heap|콜 스택 과 힙]]
- [[Stream|스트림]]
- [[Backpressure|배압]]
- [[Debugging-Profiling|디버깅 & 프로파일링]]
