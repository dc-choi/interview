---
tags: [runtime, nodejs, memory, troubleshooting]
status: done
category: "OS & Runtime"
aliases: ["OOM Cases", "Node.js OOM 원인", "OOM 케이스"]
---

# Node.js OOM — 힙 이해와 발생 케이스

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

## 다음 단계
- [[OOM-Troubleshooting-Response|대응 방법 & 면접 포인트]]

## 관련 문서
- [[OOM-Troubleshooting|OOM 트러블슈팅 인덱스]]
- [[V8|V8 엔진]]
- [[Call-Stack-Heap|콜 스택 과 힙]]
- [[Stream|스트림]]
- [[Backpressure|배압]]
