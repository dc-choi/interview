---
tags: [runtime, nodejs, memory, troubleshooting]
status: done
category: "OS & Runtime"
aliases: ["OOM Response", "Node.js OOM 대응", "OOM 대응 방법"]
---

# Node.js OOM — 대응 방법과 면접 포인트

OOM 발생 원인과 힙 상한선 개념은 [[OOM-Troubleshooting-Cases|힙 이해와 발생 케이스]]에서 먼저 확인할 것.

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
- 자세한 내용은 [[Debugging-Profiling-Memory|프로파일링 & 메모리 진단]] 참조

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
- [[OOM-Troubleshooting|OOM 트러블슈팅 인덱스]]
- [[OOM-Troubleshooting-Cases|힙 이해와 발생 케이스]]
- [[V8|V8 엔진]]
- [[Stream|스트림]]
- [[Debugging-Profiling|디버깅 & 프로파일링]]
