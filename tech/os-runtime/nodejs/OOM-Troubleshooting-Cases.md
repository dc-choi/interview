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

## 실전 사례: Kafka → MySQL 파이프라인의 이중 누수

Kafka에서 메시지를 읽어 MySQL에 벌크 INSERT하는 Node.js 서비스에서 겪은 실전 사례. **두 층의 누수**가 겹쳐 있어 진단이 까다로웠다.

### 1차 누수: 전역 메시지 버퍼
- **증상:** EC2 메모리가 30분 내에 1.5GB까지 치솟고 프로세스 크래시
- **원인:** Kafka 컨슈머가 `eachMessage`로 메시지를 받아 **전역 변수에 누적**, 주기적 flush 방식이었으나 쌓이는 속도 > 처리 속도
- **진단:** `clinic doctor`로 메모리 그래프가 우상향하고 GC가 따라가지 못함을 확인
- **해결:** `eachBatch`로 전환 + 배치 **지역 스코프**에 홀더를 두어 배치 종료 시 자동 GC
- **효과:** 100MB → 30MB로 안정화

### 2차 누수 (근본 원인): Prepared Statement 캐시 폭발
- **증상:** 1차 해결 후에도 MySQL 서버와 Node.js 클라이언트 양쪽 메모리가 계속 증가
- **원인:** 벌크 INSERT 쿼리가 매 배치마다 **행 수·컬럼 조합**이 달라 prepared statement가 재사용되지 않고 캐시에만 쌓임
- **진단:** Chrome DevTools 힙 스냅샷에서 **retained size의 90% 가까이가 prepared statement 객체**
- **규모:** 서버 측 커넥션당 16,382개 × 10 커넥션 × 32KB ≈ **5GB**, 4토픽×4프로세스 환경에서 **20GB 규모** 메모리 압박
- **해결:** 드라이버의 `maxPreparedStatements` 축소 + 동적 쿼리 경로는 `execute()` 대신 `query()` 사용
- **상세:** [[Prepared-Statement-Cache|Prepared Statement 캐시 폭발]]

### 교훈
1. **메모리 누수는 층층이 숨어 있다** — 1차 해결 후에도 전체 그래프를 다시 관찰해야 한다
2. **`eachBatch`는 만능이 아니다** — 배치 내부에서 전역 상태를 건드리면 다시 누수
3. **드라이버의 숨은 캐시를 의심하라** — `node-mysql2`처럼 투명한 최적화가 역효과를 낼 수 있다
4. **힙 스냅샷이 정답을 가장 빨리 준다** — 추측으로 GC 튜닝하기 전에 먼저 찍어라

## 다음 단계
- [[OOM-Troubleshooting-Response|대응 방법 & 면접 포인트]]

## 관련 문서
- [[OOM-Troubleshooting|OOM 트러블슈팅 인덱스]]
- [[V8|V8 엔진]]
- [[Call-Stack-Heap|콜 스택 과 힙]]
- [[Stream|스트림]]
- [[Backpressure|배압]]
- [[Prepared-Statement-Cache|Prepared Statement 캐시 폭발]]
- [[MQ-Kafka|Kafka (eachBatch 패턴)]]
