---
tags: [performance, cpu-bound, io-bound, optimization, nodejs, language]
status: done
category: "성능&확장성(Performance&Scalability)"
aliases: ["CPU-Bound vs IO-Bound", "CPU-Intensive vs IO-Intensive", "CPU vs IO", "병목 구분"]
---

# CPU-Bound vs I/O-Bound

작업의 **병목이 CPU인지 I/O인지**에 따라 최적화 전략이 완전히 달라진다. 언어·하드웨어·아키텍처 선택의 출발점.

## 핵심 명제

| 구분 | 병목 | 최적화 방향 |
|---|---|---|
| **CPU-Bound (CPU-Intensive)** | 계산 자체 — for 루프·정규식·압축·암호화 | 알고리즘 개선, 저수준 언어(C/C++/Rust), 병렬화 |
| **I/O-Bound (I/O-Intensive)** | 디스크·네트워크·DB 응답 대기 | 비동기·캐싱·배치·분산, 하드웨어 업그레이드 |

작업의 시간복잡도가 **실제 CPU 사이클**에서 나오면 CPU-Bound, **대기 시간**에서 나오면 I/O-Bound. 혼동하면 엉뚱한 곳을 튜닝한다.

## 구분법 — "시간복잡도가 산출되는가?"

### CPU-Bound 신호

- `for`·`while` 루프의 반복 횟수가 성능을 결정
- 문자열 비교·조작 (`O(N)`), 정규식 (`O(2^m)`) 최악
- 압축/압축 해제, 이미지/비디오 인코딩
- JSON 파싱, 직렬화/역직렬화 (크기 비례)
- 암호화·해싱 (bcrypt, Argon2, SHA)
- ML 추론·수치 연산
- 알고리즘 문제 (BOJ·LeetCode) 거의 모두

### I/O-Bound 신호

- 시스템콜이 대부분의 시간을 차지 (`read`·`write`·`recv`·`send`)
- DB 쿼리 실행 (네트워크·디스크)
- 파일 읽기/쓰기
- 외부 API 호출
- 메시지 큐 소비
- 사용자 입력 대기

진단 명령: `top`·`htop`에서 `%CPU`는 낮은데 응답 지연이 크면 I/O-Bound. `%CPU`가 코어 수 × 100%에 근접하면 CPU-Bound. `iotop`·`netstat`·분산 추적으로 확인.

## 언어 선택에 주는 영향

### CPU-Bound에서 언어가 중요한 이유

단일 스레드 기준 성능:
- **C/C++/Rust**: 기계어에 가까움 → 가장 빠름
- **Go/Java/C# (JIT)**: C++ 대비 1.5~3배 느림
- **Node.js V8**: JIT이지만 dynamic typing 오버헤드
- **Python**: C/C++ 대비 10~100배 느림 (GIL 포함)

알고리즘 대회에서 C/C++이 유리한 이유, BOJ에서 Python +10s·Java +2s 주는 이유.

### I/O-Bound에서 언어가 중요하지 않은 이유

I/O 대기 중에는 CPU가 idle. 언어가 아무리 빨라도 **네트워크 RTT 10ms를 줄일 수 없음**. 이때 중요한 건:
- 비동기 I/O 지원 (epoll·kqueue·io_uring)
- 이벤트 루프·async/await의 완성도
- 커넥션 풀·스트림·backpressure 처리

**Node.js·Go·Python asyncio**가 C++보다 **개발 생산성**이 좋으므로 웹 서버에선 오히려 유리.

## 웹 서버 — 대부분 I/O-Bound

일반적인 웹 백엔드 요청 흐름:
1. HTTP 요청 수신 (I/O)
2. JSON 파싱 (CPU, 짧음)
3. DB 조회 (I/O, 압도적)
4. 비즈니스 로직 (CPU 대부분 짧음)
5. 외부 API 호출 (I/O)
6. 응답 직렬화 (CPU, 짧음)

99%가 I/O 대기 → **언어 선택이 큰 영향을 주지 않음**. Node.js가 C++만큼 빠른 서버를 만들 수 있는 이유.

## 대용량 서비스에서 CPU-Bound가 늘어난다

트래픽이 커지고 기능이 복잡해지면 CPU 비중이 증가:
- 이미지/비디오 처리, ML 추론
- 복잡한 집계·랭킹·추천 로직
- 대규모 로그 분석·파싱
- 실시간 인코딩·압축
- 검색 인덱싱

이때 흔히 취하는 패턴:
- **서비스 분리** — CPU-heavy 작업을 별도 서비스로 (Node → Python/Go/C++ 마이크로서비스)
- **언어 혼용** — 한 프로세스 안에서 C++ addon 호출 (Python C extension·Node native module·Tensorflow)
- **전용 하드웨어** — GPU·TPU·FPGA로 오프로드
- **사전 계산** — 쿼리 시점 계산을 쓰기 시점이나 배치로

## 최적화 전략 매트릭스

| 병목 | 하드웨어 | 소프트웨어 |
|---|---|---|
| **CPU** | CPU 코어 증설, 높은 클럭 CPU, SIMD·GPU | 알고리즘 개선, 저수준 언어, 멀티스레드·SIMD, 프로파일링 기반 핫스팟 제거 |
| **디스크 I/O** | NVMe SSD, 대용량 RAM (페이지 캐시) | 배치 I/O, mmap, 압축, 적절한 파일시스템 |
| **네트워크 I/O** | 대역폭 증설, 낮은 지연 존, CDN | 비동기 I/O(epoll/io_uring), 커넥션 풀, HTTP keep-alive, 압축, 배치 |
| **DB I/O** | 인스턴스 스케일업 | 인덱스, 쿼리 튜닝, 캐시, 읽기 복제본, 샤딩 |
| **혼합** | — | 작업을 CPU·I/O로 분리 (워커 풀, Competing Consumer) |

## 흔한 오해

- **"C++로 짜면 무조건 빨라진다"** — I/O-Bound에서는 거의 차이 없음. 개발 비용만 커짐
- **"Node.js는 느려서 대규모 서비스에 부적합"** — 웹 서버 대부분 I/O-Bound라 충분. 넷플릭스·우버도 Node 사용
- **"비동기 = 빠름"** — 비동기는 I/O-Bound에서만 의미. CPU-Bound 작업을 async로 감싸면 오히려 이벤트 루프 블로킹
- **"멀티스레드면 CPU 최적화"** — I/O-Bound 작업을 멀티스레드로 만들어도 대기 시간은 같음. 병렬 처리에 필요한 동시성 향상은 async로 충분
- **"Node.js는 싱글 스레드"** — 이벤트 루프만 싱글. libuv 스레드 풀·Worker Threads로 CPU-Bound 처리 가능 (자세히 [[Single-vs-Multi-Thread]])
- **"CPU-Bound를 async로 처리"** — 실패 패턴. Worker Thread·별도 프로세스·RPC로 분리해야

## 판단 프로세스 — 최적화 전 체크리스트

1. **프로파일링** — `top`·`perf`·flame graph로 CPU vs wait 시간 측정
2. **가장 긴 구간 식별** — 전체 응답 시간의 무엇이 가장 큰가 (DB? 외부 API? 계산?)
3. **재현 가능한 벤치마크** 만들기
4. **작은 변경 하나씩** — 여러 변경 동시 적용하면 원인 파악 불가
5. **측정 후 수용 또는 폐기**

측정 없이 "C++로 바꾸자"·"async로 감싸자"는 흔히 역효과.

## 면접 체크포인트

- **CPU-Bound vs I/O-Bound 구분 기준** (시간복잡도가 CPU 사이클에서 나오는지 vs 대기에서)
- 웹 서버가 대부분 **I/O-Bound**인 이유
- **언어 선택이 중요한 경우 vs 아닌 경우**
- **Node.js 싱글 스레드**의 한계와 Worker Threads·C++ addon의 역할
- CPU-Bound 작업을 **분리**하는 전략 (마이크로서비스·RPC·전용 프로세스)
- **프로파일링 없이 최적화 금지** 원칙
- 하드웨어 vs 소프트웨어 최적화의 경계

## 출처
- [arca.live 프로그래머즈 — CPU-intensive vs I/O-intensive (모댕숲)](https://arca.live/b/programmers/62350982)
- [Node.js — Don't Block the Event Loop](https://nodejs.org/ko/docs/guides/dont-block-the-event-loop/)

## 관련 문서
- [[Latency-Optimization|레이턴시 최적화 개관]]
- [[Async-vs-Threads|async/await vs 스레드]]
- [[Single-vs-Multi-Thread|Node.js 싱글 vs 멀티 스레드]]
- [[Thread-vs-Event-Loop|Thread vs Event Loop]]
- [[Worker-Threads|워커 스레드]]
