---
tags: [performance, cpu-bound, io-bound, optimization, nodejs, language]
status: done
verified_at: 2026-08-26
category: "성능&확장성(Performance&Scalability)"
aliases: ["CPU-Bound vs IO-Bound", "CPU-Intensive vs IO-Intensive", "CPU vs IO", "병목 구분"]
---

# CPU-Bound vs I/O-Bound

작업의 **병목이 CPU인지 I/O인지**에 따라 우선할 최적화 전략이 크게 달라진다. 언어, 하드웨어, 아키텍처 선택의 출발점이다.

## 핵심 명제

| 구분 | 병목 | 최적화 방향 |
|---|---|---|
| **CPU-Bound (CPU-Intensive)** | 계산 자체 — for 루프, 정규식, 압축, 암호화 | 알고리즘 개선, 저수준 언어(C/C++/Rust), 병렬화 |
| **I/O-Bound (I/O-Intensive)** | 디스크, 네트워크, DB 응답 대기 | 비동기, 캐싱, 배치, 분산, 하드웨어 업그레이드 |

작업의 시간복잡도가 **실제 CPU 사이클**에서 나오면 CPU-Bound, **대기 시간**에서 나오면 I/O-Bound. 혼동하면 엉뚱한 곳을 튜닝한다.

## 구분법 — "시간복잡도가 산출되는가?"

### CPU-Bound 신호

- `for`, `while` 루프의 반복 횟수가 성능을 결정
- 문자열 비교, 조작 (`O(N)`), 정규식 (`O(2^m)`) 최악
- 압축/압축 해제, 이미지/비디오 인코딩
- JSON 파싱, 직렬화/역직렬화 (크기 비례)
- 암호화, 해싱 (bcrypt, Argon2, SHA)
- ML 추론, 수치 연산
- 알고리즘 문제 (BOJ, LeetCode) 거의 모두

### I/O-Bound 신호

- 시스템콜이 대부분의 시간을 차지 (`read`, `write`, `recv`, `send`)
- DB 쿼리 실행 (네트워크, 디스크)
- 파일 읽기/쓰기
- 외부 API 호출
- 메시지 큐 소비
- 사용자 입력 대기

진단할 때 `top`, `htop`에서 `%CPU`가 코어 수에 비례해 포화되는지는 CPU 병목의 단서다. CPU는 낮은데 응답이 느리면 I/O 대기뿐 아니라 lock 경합, connection pool 대기와 upstream queueing도 후보이므로 CPU profile, `iotop`, socket 지표와 분산 추적으로 시간을 나눠 확인한다.

## 언어 선택에 주는 영향

### CPU-Bound에서 언어가 중요한 이유

단일 thread의 CPU 성능은 언어 이름만으로 고정되지 않는다.

- **C/C++/Rust**는 native compilation과 memory control로 낮은 runtime overhead를 만들 수 있다.
- **Go/Java/C#**은 runtime과 JIT 또는 AOT 특성, GC, warm-up과 workload에 따라 결과가 달라진다.
- **Node.js V8**도 JIT 최적화를 하지만 value shape 변화와 allocation이 hot path 비용에 영향을 줄 수 있다.
- **Python**의 pure Python loop는 interpreter overhead가 크지만 native extension, vectorization과 다른 process로 병목을 옮길 수 있다.

온라인 judge의 언어별 시간 보정은 해당 judge의 측정 정책이며 일반적인 언어 성능 배수로 사용하지 않는다.

### I/O-Bound에서 언어 차이의 비중이 줄 수 있는 이유

I/O 대기 중에는 해당 작업이 CPU를 계속 쓰지 않는다. 언어 실행 속도만으로 **외부 네트워크 RTT 자체를 없앨 수는 없다**. 이때 중요한 건:
- 비동기 I/O 지원 (epoll, kqueue, io_uring)
- 이벤트 루프, async/await의 완성도
- 커넥션 풀, 스트림, backpressure 처리

Node.js, Go, Python asyncio와 C++는 비동기 I/O를 처리하는 방식과 생태계가 다르다. 개발 생산성은 팀 숙련도와 라이브러리, 운영 요구를 포함해 판단한다.

## 웹 서버 — I/O 대기가 큰 경우가 많다

일반적인 웹 백엔드 요청 흐름:
1. HTTP 요청 수신 (I/O)
2. JSON 파싱 (CPU, 짧음)
3. DB 조회 (I/O)
4. 비즈니스 로직 (CPU 대부분 짧음)
5. 외부 API 호출 (I/O)
6. 응답 직렬화 (CPU, 짧음)

대부분이 I/O 대기라면 언어 실행 비용의 비중은 작아질 수 있다. 다만 serialization, 메모리 관리와 런타임 overhead는 남으므로 같은 성능을 보장하지 않고 실제 workload로 측정한다.

## 대용량 서비스에서 CPU-Bound가 늘어난다

트래픽이 커지고 기능이 복잡해지면 CPU 비중이 증가:
- 이미지/비디오 처리, ML 추론
- 복잡한 집계, 랭킹, 추천 로직
- 대규모 로그 분석, 파싱
- 실시간 인코딩, 압축
- 검색 인덱싱

이때 흔히 취하는 패턴:
- **서비스 분리** — 격리와 독립 확장이 필요할 때 CPU-heavy 작업을 별도 worker나 서비스로 분리
- **언어 혼용** — 한 프로세스 안에서 C++ addon 호출 (Python C extension, Node native module, Tensorflow)
- **전용 하드웨어** — GPU, TPU, FPGA로 오프로드
- **사전 계산** — 쿼리 시점 계산을 쓰기 시점이나 배치로

## 최적화 전략 매트릭스

| 병목 | 하드웨어 | 소프트웨어 |
|---|---|---|
| **CPU** | CPU 코어 증설, 높은 클럭 CPU, SIMD, GPU | 알고리즘 개선, 저수준 언어, 멀티스레드, SIMD, 프로파일링 기반 핫스팟 제거 |
| **디스크 I/O** | NVMe SSD, 대용량 RAM (페이지 캐시) | 배치 I/O, mmap, 압축, 적절한 파일시스템 |
| **네트워크 I/O** | 대역폭 증설, 낮은 지연 존, CDN | 비동기 I/O(epoll/io_uring), 커넥션 풀, HTTP keep-alive, 압축, 배치 |
| **DB I/O** | 인스턴스 스케일업 | 인덱스, 쿼리 튜닝, 캐시, 읽기 복제본, 샤딩 |
| **혼합** | — | 작업을 CPU, I/O로 분리 (워커 풀, Competing Consumer) |

## 흔한 오해

- **"C++로 짜면 무조건 빨라진다"** — I/O-Bound에서는 네트워크와 저장소 대기가 더 큰 병목일 수 있다. 측정 없이 언어 교체부터 하지 않는다.
- **"Node.js는 느려서 대규모 서비스에 부적합"** — 요청별 JavaScript 작업을 작게 유지하는 I/O 중심 workload에는 적합할 수 있고, CPU-heavy 경로는 별도로 측정하고 격리한다.
- **"비동기 = 빠름"** — 비동기는 대기 중 다른 작업을 진행하게 하지만 CPU-Bound JavaScript를 병렬화하지 않는다. CPU 작업은 worker, 별도 process나 native 경로로 격리한다.
- **"멀티스레드면 CPU 최적화"** — thread를 늘린다고 외부 I/O 지연이 줄지는 않는다. blocking API 격리나 CPU 병렬화처럼 thread가 필요한 이유와 queueing 비용을 먼저 측정한다.
- **"Node.js는 싱글 스레드"** — 이벤트 루프만 싱글. libuv 스레드 풀, Worker Threads로 CPU-Bound 처리 가능 (자세히 [[Single-vs-Multi-Thread]])
- **"CPU-Bound를 async로 처리"** — 실패 패턴. Worker Thread, 별도 프로세스, RPC로 분리해야

## 판단 프로세스 — 최적화 전 체크리스트

1. **프로파일링** — `top`, `perf`, flame graph로 CPU vs wait 시간 측정
2. **가장 긴 구간 식별** — 전체 응답 시간의 무엇이 가장 큰가 (DB? 외부 API? 계산?)
3. **재현 가능한 벤치마크** 만들기
4. **작은 변경 하나씩** — 여러 변경 동시 적용하면 원인 파악 불가
5. **측정 후 수용 또는 폐기**

측정 없이 "C++로 바꾸자", "async로 감싸자"는 흔히 역효과.

## 면접 체크포인트

- **CPU-Bound vs I/O-Bound 구분 기준** (시간복잡도가 CPU 사이클에서 나오는지 vs 대기에서)
- 웹 서버가 대부분 **I/O-Bound**인 이유
- **언어 선택이 중요한 경우 vs 아닌 경우**
- **Node.js 싱글 스레드**의 한계와 Worker Threads, C++ addon의 역할
- CPU-Bound 작업을 **분리**하는 전략 (마이크로서비스, RPC, 전용 프로세스)
- **프로파일링 없이 최적화 금지** 원칙
- 하드웨어 vs 소프트웨어 최적화의 경계

## 출처
- [arca.live 프로그래머즈 — CPU-intensive vs I/O-intensive (모댕숲)](https://arca.live/b/programmers/62350982)
- [Node.js — Don't Block the Event Loop](https://nodejs.org/ko/docs/guides/dont-block-the-event-loop/)
- [Node.js, Worker threads](https://nodejs.org/api/worker_threads.html)

## 관련 문서
- [[Latency-Optimization|레이턴시 최적화 개관]]
- [[Async-vs-Threads|async/await vs 스레드]]
- [[Single-vs-Multi-Thread|Node.js 싱글 vs 멀티 스레드]]
- [[Thread-vs-Event-Loop|Thread vs Event Loop]]
- [[Worker-Threads|워커 스레드]]
