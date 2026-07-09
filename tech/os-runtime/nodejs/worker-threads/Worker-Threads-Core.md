---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
aliases: ["Worker Threads 핵심 개념", "워커 스레드 통신 방식"]
---

### 워커 스레드 핵심 개념과 통신 방식
Worker Threads의 구조, libuv 스레드 풀과의 차이, 기본 사용 예시, 통신 방식, 사용 판단 기준을 다룬다.

## 핵심 개념
```
각 Worker Thread는 완전히 독립된 Node.js 인스턴스이다:
- 자체 V8 isolate와 JS 실행 컨텍스트
- 자체 이벤트 루프
- libuv 이벤트 루프는 별도지만, libuv 스레드 풀은 프로세스 전역 리소스를 공유
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
│ libuv가 관리         │ 개발자가 관리, libuv 풀은 전역 공유    │
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
