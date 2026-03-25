---
tags: [os, thread, concurrency, cpu-cache, nodejs]
status: done
category: "OS&런타임(OS&Runtime)"
aliases: ["Thread vs Event Loop", "멀티스레드 패턴"]
---

# Thread vs Event Loop

## 멀티스레드 기본

- 실행파일 실행 → 프로세스 생성 → 메인 스레드 생성
- 멀티스레드: 메인 스레드 외 다른 스레드가 있고 **메모리 공유**가 일어나는 경우
- 스레드 간 메모리 공유가 없다면 멀티스레드라고 부르기 애매함

### 프로세스 vs 스레드 면접 포인트
- 스레드끼리는 메모리 공유 가능, 프로세스끼리는 불가능
- 이 차이가 동시성 문제, 배타 제어, IPC 등 다양한 주제로 이어짐

## 배타 제어 (Exclusive Control)

### Concurrent 클래스
- 처음부터 망가뜨릴 수 없는 오브젝트를 만듦 (concurrent prefix 클래스)
- 구현 방식에 따라 성능 저하 발생 가능
- 일반 클래스도 read는 스레드 세이프한 경우 있음. write를 한 스레드에서만 하고 read를 여러 스레드가 하면 유용

### Lock
- 특정 코드 구간(크리티컬 섹션)을 한 스레드만 실행하도록 막음
- 락을 건 구간의 실행 시간이 길수록 성능 저하. 최악엔 싱글 스레드가 나음
- 그래서 **원 프로세스, 원 스레드 아키텍처**가 등장

### Lock-Free
- 락 없이 배타 제어. CAS(Compare-And-Swap) 연산이 핵심
- CAS(메모리 주소, 예상 값, 새 값) → 예상 값 일치 시 교체 후 true, 불일치 시 false 반환하고 재시도
- 장점: 데드락 방지, 컨텍스트 스위칭 감소, 우선순위 역전 방지
- 적어도 하나의 스레드는 반드시 진전을 이룬다는 보장이 핵심
- 웬만하면 쓰지 말라는 의견. 매우 어려움

Node.js: Atomics.compareExchange()로 Lock-Free 설계 가능. 분산 시스템에서 낙관적 락도 Lock-Free 철학과 유사

### Spin Lock
- 잠금이 풀릴 때까지 CPU를 계속 돌면서(busy-wait) 확인
- 락이 아주 짧은 시간만 유지되거나, 커널-유저 전환 비용이 더 큰 경우 사용
- 오래 걸리면 CPU 100% 낭비. OS 커널/low-level 시스템에서 주로 사용
- Node.js: Atomics.wait() & Atomics.notify()가 Spin Lock보다 CPU 친화적

## Blocking & Non-Blocking

| 구분 | 설명 |
|------|------|
| Blocking | 함수 실행 후 모든 코드 완료 후 리턴 |
| Non-Blocking | 실행한 함수의 코드가 완료되지 않고 리턴 |

Non-Blocking 함수의 완료를 알 수 있는 방법:
- **Polling**: 완료를 주기적으로 확인
- **Event**: 이벤트 발생 시 콜백 함수 호출 → 콜백 지옥 가능성

### async/await의 장점 (면접 포인트)
- 콜백 지옥 해결, 동기 함수처럼 보이는 코드 흐름
- Promise 체인보다 간결, 병렬 처리도 명시적 작성 가능
- IO 바운드 작업 시 CPU를 놀리지 않고 다른 작업 처리 가능

## CPU Cache와 멀티스레드

CPU 발전 속도 > 메모리 접근 속도 → **Memory Wall** 문제 → CPU Cache 도입. 하지만 멀티스레드에서 곤란해짐.

### Stale Data (오래된 데이터)
- 두 스레드가 공유 자원에 접근할 때 캐시로 인해 갱신된 값 대신 기존 데이터를 참조
- 데이터 무결성이 깨짐

### ReOrdering (재정렬)
- 코드 최적화로 실행 순서가 바뀔 수 있음
- 멀티스레드 환경에서는 조건에 따라 함수가 실행되거나 안 될 수 있음

### 해결: Visibility, Atomicity, ReOrdering 방지

**Visibility**: 해당 메모리를 반드시 메인 메모리에서 읽고/씀 (캐시 우회)

**Atomicity**: 하나의 일관된 동작이 한 스레드에서만 시작하고 종료 = Atomic Operation

**Memory Barrier (Fence)**:
- Read Memory Barrier / Write Memory Barrier / Full Memory Barrier
- 직접 사용은 어려움. Lock, Monitor, volatile, synchronized, Atomics 등 쉬운 방법을 쓸 것
- Node.js: Atomics.store, Atomics.load 등이 메모리 펜스를 제공하여 ReOrdering 방지

### CPU Caching Policy

| 정책 | 설명 |
|------|------|
| Write-Through | Cache에 쓰면 즉시 메인 메모리에도 씀 |
| Write-Back (Lazy Write) | Cache에 쓰면 지연된 쓰기를 함 |
| Write No Allocation | Cache Miss 시 바로 메모리에 씀 |
| Write Allocation | Cache Miss 시 메모리에서 Cache로 가져온 뒤 Cache에 씀 |

**Dirty Flag**: 캐시된 데이터가 수정되었는지 저장하는 변수. CPU Cache는 이걸로 메인 메모리 write 여부 결정. Redis 캐시 서버도 RDB 영구 저장 시 사용.

### CPU Cache Line과 적중률
- CPU Cache Line: 64byte. 메인 메모리 데이터를 그대로 가져와 적재
- 시간적 지역성 + 공간적 지역성을 고려해야 적중률이 올라감

**Node.js에서 캐시 적중률 높이기:**
- 일반 JS 배열/객체는 캐시 친화적 제어가 거의 불가능
- **TypedArray/Buffer**로 바꾸면 진짜 연속 메모리라서 캐시라인 효과를 받음
- 순방향(+1) 선형 스캔, 작은 stride, packed 배열 유지
- 복잡 객체가 많으면 SoA(Structure of Arrays)로 분해 (AoS보다 프리패처 친화적)
- 히든 클래스 안정화: 같은 필드 집합/순서로 객체 생성, 생성 후 속성 추가/삭제 피하기
- 핫패스에서는 가능한 평평한 배열/버퍼로 처리, 해시/포인터 체이싱 줄이기

## 멀티스레드 디자인 패턴

### Guarded Suspension
- 할 일이 없는 스레드는 대기열에 넣고 할 일이 생기면 깨워서 실행
- CPU 자원을 다른 스레드에 집중 할당 가능
- Node.js: Promise 대기큐, EventEmitter/events.once(), Worker Threads + Atomics.wait

### Balking
- 작업이 있는지 주기적으로 확인. 있으면 하고 없으면 무시
- Guarded Suspension과 달리 할 일이 없어도 다른 작업을 할 수 있음

### Producer-Consumer
- 한 스레드는 데이터 생산, 다른 스레드는 소비
- 서버 스레드 모델에서 IO 스레드(Producer)와 Worker 스레드(Consumer)가 이 패턴
- Node.js: EventEmitter, BullMQ, Kafka, RabbitMQ, SQS, Redis Stream

### Read-Write Lock
- read lock과 write lock을 분리. write 시 read/write 둘 다 불가, read 시 다른 스레드도 read 가능
- 같은 lock을 거는 것보다 read 성능 향상
- Node.js: 비동기 로직 → Promise, 공유메모리 → Atomics+SharedArrayBuffer, 분산 → DB락/Redis 분산락

### Thread Per Message
- 하나의 작업을 다른 스레드에 위임, 작업당 하나의 스레드
- 스레드 수가 많으면 컨텍스트 스위칭으로 성능 저하
- Node.js: Worker Thread, Cluster, AsyncLocalStorage, MQ 기반 워커

### Future
- 비동기 작업의 결과를 미래 시점에서 받을 수 있는 객체
- Node.js에서 **Promise**가 Future 패턴의 구현

## Thread-Specific-Storage

스레드마다 독립적인 저장 공간. 자기 전용 데이터를 가지면 락이 필요 없다는 아이디어.

### Node.js에서의 구현
- **AsyncLocalStorage**: 비동기 호출 체인별 데이터 격리. NestJS nestjs-cls도 내부적으로 사용 (요청 단위 request context)
- **Worker Threads**: 각 워커가 독립된 V8 인스턴스와 메모리를 가지므로 그 자체가 TSS

### 활용 사례
- 로그 트레이싱, 요청 ID, 트랜잭션 컨텍스트 유지

## Thread Graceful Shutdown

더 이상 새 작업 안 받기 → 진행 중 작업 마무리 → 리소스 정리 → 정상 종료

Node.js 패턴:
- HTTP 서버 + Worker Threads 풀
- SharedArrayBuffer + Atomics로 즉시 중지 플래그 (CPU 바운드)
- AbortController로 비동기 작업 일괄 취소 (I/O 위주)

## Dead Lock (Node.js)

싱글 스레드 이벤트 루프에서는 드물지만 Worker Thread, DB 트랜잭션, Redis 분산락에서 발생 가능

| 상황 | 대응 |
|------|------|
| Worker Thread | wait 전후로 notify 보장, timeout 버전 (Atomics.wait(..., timeout)) 사용 |
| DB 트랜잭션 | 항상 동일한 순서로 자원 접근, retry 로직 추가 |
| Redis 분산락 | try/finally로 항상 해제, TTL 자동 만료, 락 점유 시간보다 긴 작업 피하기 |

## 관련 문서
- [[Concurrency-and-Process|동시성과 프로세스]]
- [[Context-Switching|컨텍스트 스위칭과 CPU 스케줄링]]
- [[Event-Loop|Node.js Event Loop]]
