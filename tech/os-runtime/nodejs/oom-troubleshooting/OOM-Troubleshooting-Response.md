---
tags: [runtime, nodejs, memory, troubleshooting]
status: done
verified_at: 2026-09-12
category: "OS & Runtime"
aliases: ["OOM Response", "Node.js OOM 대응", "OOM 대응 방법"]
---

# Node.js OOM — 대응 방법과 면접 포인트

OOM 대응은 V8 heap fatal OOM, native 또는 external allocation failure, OS/cgroup OOM kill을 먼저 구분한다. 원인별 증거와 경계는 [[OOM-Troubleshooting-Cases|힙 이해와 발생 케이스]]에서 확인한다.

## 대응 방법

### A. 스트림으로 전환
```
스트림은 대용량 전체를 한 번에 보관하는 일을 피하고 소비 속도에 맞춰 읽기를 늦춘다. 하지만 메모리 상한을 "한 청크 크기 + 버퍼"로 보장하지는 않는다. `highWaterMark`는 임계값일 뿐 엄격한 한도가 아니고, Transform은 읽기와 쓰기 버퍼를 각각 가진다.

- upstream 구현은 `push()`가 `false`를 반환하면 더 읽지 않아야 하고, 직접 `write()`한다면 `false` 뒤 `drain`을 기다려야 한다. `data` 이벤트의 async 처리도 동시성을 제한하지 않으면 처리 중인 청크가 누적될 수 있다.
- DB cursor 스트리밍: `pg`의 QueryStream, 지원 드라이버에서 TypeORM QueryBuilder의 `stream()`을 사용한다. TypeORM stream 결과는 entity가 아닌 raw data다.
- Prisma: `$queryRaw`는 결과 배열을 반환하므로 전체 조회 뒤 JS에서 나누면 이미 전량이 메모리에 올라온다. `findMany`는 고유키 기준 `orderBy`와 `take`로 조회하고, 다음 페이지부터 직전 페이지의 마지막 행을 가리키는 `cursor`와 `skip: 1`로 경계 행을 제외한다. raw SQL은 keyset 조건과 `LIMIT`으로 매 쿼리 결과를 제한한다.
- 파일: fs.createReadStream / createWriteStream
- HTTP 응답 전송: `readable.pipe(res)`처럼 원본 Readable에서 Writable인 `ServerResponse`로 쓴다. 변환이 필요하면 중간에 Transform을 둔다.
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
- 대량 application data를 JS heap에 오래 보관하지 않음. 다만 client Buffer와 연결의 process 메모리 사용은 계속 관측
- TTL/LRU로 자동 만료 관리
```

### D. 인프라 설정 정렬
```
컨테이너 memory limit과 process RSS 예산을 맞춘다.

- `--max-old-space-size`는 Old Space만 제한하므로 전체 RSS limit으로 쓰지 않는다.
- 부하 중 `heapUsed`, `external`, `arrayBuffers`, RSS와 컨테이너 memory 사용량을 함께 측정한다.
- peak RSS에서 필요한 headroom을 남긴 뒤 workload별 Old Space 값을 정한다. 75% 같은 고정 비율은 보편 안전 기준이 아니다.
```

### E. 모니터링 & 조기 경보
```
OOM이 발생하기 전에 감지하기 위한 지표 수집.
```
```js
setInterval(() => {
  const { heapUsed, heapTotal, rss, external, arrayBuffers } = process.memoryUsage();
  // Prometheus/Datadog 등에 전송
  metrics.gauge('nodejs_heap_used', heapUsed);
  metrics.gauge('nodejs_heap_total', heapTotal);
  metrics.gauge('nodejs_rss', rss);
  metrics.gauge('nodejs_external', external);
  metrics.gauge('nodejs_array_buffers', arrayBuffers);
}, 10_000);
```
- V8 heap fatal OOM은 GC 증가, `heapUsed`와 heap snapshot으로 진단한다.
- native 또는 external 메모리는 RSS 추세와 `external`/`arrayBuffers`, 라이브러리 지표를 함께 본다. `arrayBuffers`는 `external`에 포함되며, 이 값들의 단순 합산이나 차감으로 native 메모리 전체를 계산할 수는 없다.
- cgroup 종료는 컨테이너 메모리 사용량/limit과 종료 이유, 커널 이벤트를 함께 확인한다.
- 임계값은 부하 중 기준선과 headroom에서 정한다. `heapUsed / heapTotal` 하나만으로 process memory 경보를 만들지 않는다.

## 면접 포인트

Q. Node.js 프로세스가 메모리로 종료될 때 무엇을 구분하나?
- **V8 heap fatal OOM**: heap snapshot과 GC 증거로 JS 객체 누수, 일괄 로드, 백프레셔를 찾고 작업 단위를 줄인다.
- **native 또는 external allocation failure**: RSS, `external`, `arrayBuffers`와 라이브러리의 native 사용량을 확인한다.
- **OS/cgroup OOM kill**: 컨테이너 종료 이유와 메모리 사용량/limit, process RSS를 확인하고 동시성과 memory budget을 조정한다.

Q. 왜 `--max-old-space-size`를 컨테이너 memory limit과 같게 두면 안 되나?
- Node.js 프로세스는 V8 힙 외에도 Buffer(네트워크/파일 I/O), 네이티브 모듈, 스택, 코드 페이지 등 **힙 바깥의 메모리**를 사용한다
- Old Space 상한은 전체 RSS나 cgroup 메모리 사용량을 제한하지 않는다. cgroup에는 파일 캐시와 커널 메모리 등도 계상되므로 개별 process RSS와 구분해야 하며, limit에 도달한 뒤 충분히 회수하지 못하면 OOM kill이 발생할 수 있다.
- 필요한 headroom은 Buffer, native addon, thread 수와 workload의 peak 사용량을 측정해 정한다. 고정 25%를 일반 규칙으로 쓰지 않는다.

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

## 출처

- [Node.js, CLI `--max-old-space-size`](https://nodejs.org/api/cli.html#--max-old-space-sizesize-in-mib)
- [Node.js, `process.memoryUsage()`](https://nodejs.org/api/process.html#processmemoryusage)
- [Node.js, Stream buffering](https://nodejs.org/api/stream.html#buffering)
- [TypeORM, Select Query Builder: Streaming result data](https://typeorm.io/docs/query-builder/select-query-builder/#streaming-result-data)
- [Prisma, Raw queries](https://www.prisma.io/docs/orm/v6/prisma-client/using-raw-sql/raw-queries)
- [Prisma, Pagination](https://www.prisma.io/docs/orm/v7/prisma-client/queries/pagination)
- [Kubernetes, Pod와 Container 리소스 관리](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Linux Kernel, cgroup v2 Memory](https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html#memory)
