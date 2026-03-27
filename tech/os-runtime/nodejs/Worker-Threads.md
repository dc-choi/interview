---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
aliases: ["Worker Threads", "워커 스레드"]
---

### 워커 스레드 (Worker Threads)
Node.js에서 CPU 집약적인 작업을 병렬로 처리하기 위한 모듈. (`worker_threads`)

## 핵심 개념
```
각 Worker Thread는 완전히 독립된 Node.js 인스턴스이다:
- 자체 V8 인스턴스
- 자체 이벤트 루프
- 자체 libuv 스레드 풀
- 자체 JS 실행 컨텍스트

메인 스레드와 Worker는 별도의 OS 스레드에서 실행되므로 진정한 병렬 처리가 가능하다.
```

## Worker Threads vs libuv 스레드 풀
```
이 둘은 완전히 다른 개념이다. 혼동하지 말 것.

┌──────────────────────┬──────────────────────────────────┐
│   libuv 스레드 풀     │       Worker Threads             │
├──────────────────────┼──────────────────────────────────┤
│ C++ 레벨             │ JS 레벨                           │
│ JS 코드 실행 불가     │ JS 코드 실행 가능                  │
│ V8 인스턴스 없음      │ 독립된 V8 인스턴스                  │
│ 이벤트 루프 없음      │ 독립된 이벤트 루프                  │
│ 기본 4개 (최대 1024)  │ 개발자가 필요에 따라 생성            │
│ fs, dns, crypto 등   │ CPU 집약적 JS 연산                 │
│ 자동으로 작업 할당     │ 명시적으로 코드를 전달해야 함         │
│ libuv가 관리         │ 개발자가 관리                       │
└──────────────────────┴──────────────────────────────────┘
```

## 사용 예시
```javascript
// main.js
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

if (isMainThread) {
    // 메인 스레드: Worker 생성
    const worker = new Worker(__filename, {
        workerData: { num: 42 }
    });

    worker.on('message', (result) => {
        console.log(`계산 결과: ${result}`); // 1764
    });

    worker.on('error', (err) => console.error(err));
    worker.on('exit', (code) => console.log(`Worker 종료: ${code}`));
} else {
    // Worker 스레드: CPU 집약적 작업 수행
    const { num } = workerData;
    const result = heavyComputation(num);
    parentPort.postMessage(result);
}

function heavyComputation(n) {
    // CPU 집약적 연산 (예: 행렬 곱, 이미지 처리, ML 추론)
    return n * n;
}
```

## 통신 방식
```
1. postMessage / on('message')
   - 기본 통신 방식. 메시지는 구조화된 클론 알고리즘(structured clone)으로 복사됨.
   - 복사 비용이 있으므로 대용량 데이터에는 비효율적.

2. SharedArrayBuffer
   - 메인 스레드와 Worker가 메모리를 직접 공유.
   - 복사 비용 없이 빠르지만, 동기화(Atomics)를 직접 관리해야 함.
   - 경쟁 조건(race condition) 주의 필요.

3. MessageChannel
   - 양방향 통신 채널 생성. 두 Worker 간 직접 통신 가능.

4. transferList
   - ArrayBuffer 등을 복사 없이 소유권을 이전(transfer).
   - 이전 후 원본에서는 접근 불가.
```

## 언제 사용하는가
```
사용해야 할 때:
- CPU 집약적 작업 (이미지/비디오 처리, 암호화, 압축, ML 추론)
- 대규모 데이터 파싱 (JSON, CSV, XML)
- 수학적 연산 (행렬 곱셈, 시뮬레이션)

사용하지 말아야 할 때:
- I/O 바운드 작업 → 이벤트 루프 + libuv가 이미 잘 처리함
- 간단한 작업 → Worker 생성 오버헤드가 더 클 수 있음
```

## Cluster 모듈과의 비교
```
┌──────────────────┬──────────────────────────┐
│    Cluster       │     Worker Threads       │
├──────────────────┼──────────────────────────┤
│ 프로세스 기반     │ 스레드 기반               │
│ 메모리 공유 불가  │ SharedArrayBuffer로 공유   │
│ IPC 통신         │ postMessage 통신          │
│ 포트 공유 가능    │ 포트 공유 불가             │
│ 수평 확장 (서버)  │ 병렬 연산 (CPU 작업)       │
└──────────────────┴──────────────────────────┘

Cluster: HTTP 서버를 멀티 코어로 확장할 때 (로드 밸런싱)
Worker Threads: CPU 집약적 연산을 병렬화할 때
```

## setImmediate 인터리빙

CPU 집약적인 루프를 실행하면 이벤트 루프가 블로킹되어 다른 요청을 처리할 수 없다. setImmediate()를 활용하면 작업을 작은 청크로 나누고, 각 청크 사이에 이벤트 루프에 제어권을 반환하여 다른 이벤트를 처리할 수 있게 한다.

이 기법은 이벤트 루프 기아(starvation)를 방지하고 서버의 응답성을 유지한다. 총 연산 시간 자체는 줄어들지 않지만, 다른 요청이 블로킹되지 않으므로 전체 시스템의 응답성이 향상된다.

```javascript
function processChunked(data, chunkSize = 1000) {
    return new Promise((resolve) => {
        let index = 0;
        const results = [];

        function processChunk() {
            const end = Math.min(index + chunkSize, data.length);

            for (; index < end; index++) {
                results.push(heavyComputation(data[index]));
            }

            if (index < data.length) {
                setImmediate(processChunk); // 이벤트 루프에 제어권 반환
            } else {
                resolve(results);
            }
        }

        processChunk();
    });
}
```

## child_process vs Worker Threads 비교

| 항목 | child_process | Worker Threads |
|------|---------------|----------------|
| 단위 | 프로세스 | 스레드 |
| 메모리 공유 | 불가 (IPC) | SharedArrayBuffer |
| 통신 비용 | 높음 (직렬화) | 중간 (structured clone) |
| 격리 수준 | 완전 격리 | 같은 프로세스 |
| 외부 언어 | 가능 (Python, Rust 등) | 불가 (JS/TS만) |
| 충돌 영향 | 메인 무관 | 메인에 영향 가능 |
| 리소스 제어 | cgroup 가능 | 제한적 |

child_process는 완전히 독립된 프로세스를 생성하므로 격리 수준이 높다. 워커 프로세스가 크래시해도 메인 프로세스에 영향이 없으며, exec()이나 spawn()으로 Python, Rust 등 다른 언어로 작성된 프로그램을 실행할 수 있다. 다만 프로세스 생성 비용이 크고, IPC를 통한 통신은 직렬화/역직렬화 오버헤드가 있다.

Worker Threads는 같은 프로세스 내의 스레드이므로 SharedArrayBuffer를 통해 메모리를 직접 공유할 수 있어 통신 비용이 낮다. 하지만 같은 프로세스 내에 있으므로 워커 스레드의 심각한 에러(segfault 등)가 메인 프로세스에 영향을 줄 수 있다.

## 추천 라이브러리

**piscina**: Worker Threads 풀을 관리하는 라이브러리이다. 작업 큐를 내장하고 있으며, 사용 가능한 워커에 작업을 자동으로 스케줄링한다. 워커별 메모리 제한 설정이 가능하고, 유휴 워커 자동 종료, 작업 취소 등의 기능을 제공한다. Node.js 코어 팀 멤버가 유지보수하여 안정성이 높다.

**workerpool**: 프로세스와 스레드 풀을 추상화하는 라이브러리이다. child_process와 Worker Threads를 모두 지원하며, 설정 하나로 전환할 수 있다. 작업 타임아웃, 동적 워커 수 조절 등의 기능을 제공한다.

**caf (Cancellation-Aware async Functions)**: 제너레이터 기반으로 취소 가능한 비동기 함수를 구현하는 라이브러리이다. yield를 취소 체크포인트로 활용하여 비즈니스 로직과 취소 로직을 완전히 분리한다. AbortController와 통합되며, 타임아웃 기반 자동 취소도 지원한다.

## 관련 문서
- [[Event-Loop|이벤트 루프]]
- [[libuv]]
- [[Node.js]]
