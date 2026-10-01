---
tags: [runtime, nodejs]
status: done
verified_at: 2026-10-01
category: "OS & Runtime"
aliases: ["Worker Threads 핵심 개념", "워커 스레드 통신 방식", "워커 스레드 종료"]
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

## 종료, 오류와 재사용

워커가 언제 끝나는지는 그 스레드의 이벤트 루프에 무엇이 남았는지로 정해진다. 아래는 Node.js v26.7.0 문서와 같은 버전의 로컬 실행으로 확인한 동작이다.

| 종료 경로 | 동작 | `'exit'`의 exitCode |
|---|---|---|
| 할 일을 마침 | 이벤트 루프가 비면 스스로 끝난다. 위 예시처럼 계산 후 `postMessage`만 하는 워커가 여기에 해당한다 | 0 |
| `parentPort.on('message')`로 대기 | 리스너가 붙으면 포트가 자동으로 ref되어 메인의 다음 메시지를 기다리며 끝나지 않는다 | 끝나지 않음 |
| 작업 후 `parentPort.close()` | 양쪽 포트에 `'close'`가 오고, 남은 타이머나 I/O가 없으면 정상 종료된다. 리스너 제거나 `port.unref()`도 대기를 푼다 | 0 |
| 메인의 `worker.terminate()` | JS 실행을 가능한 한 빨리 멈춘다. 반환 Promise는 exit code로 이행된다 | 1 |
| 워커 안 `process.exit(code)` | 전체 프로그램이 아니라 그 스레드만 끝낸다 | `code` |
| 처리되지 않은 예외 | 메인에 `'error'` 이벤트가 온 뒤 워커가 종료된다 | 1 |

- `'exit'`는 Worker 인스턴스의 마지막 이벤트다. 메인에서 `worker.on('error')`를 달지 않으면 EventEmitter 규칙에 따라 워커의 예외가 메인에서 다시 던져져 프로세스 전체가 종료됐다. 워커를 만들면 `'error'`와 `'exit'` 리스너를 함께 단다.
- 기본은 결과를 받은 뒤 메시지 기반으로 닫는 종료다. `terminate()`는 타임아웃이나 취소처럼 진행 중인 작업을 버려도 되는 강제 종료로 구분한다. 실행이 아무 지점에서나 멈출 수 있으므로 워커 안의 정리 코드가 돈다고 기대하지 않는다.
- 워커 환경은 메인과 다르다. `process.env`는 부모 환경의 복사본이라 한쪽 변경이 다른 스레드에 보이지 않고(`env: SHARE_ENV`로 공유 가능), 시그널은 워커의 `process.on()`으로 전달되지 않으며, `process.chdir()`과 uid, gid 변경 메서드는 쓸 수 없다. 종료 신호와 설정 변경은 메인이 받아 메시지로 전한다.
- 스레드 풀은 정해진 수의 워커를 고정해 두고 작업이 끝난 워커에 다음 작업을 줘 생성 비용을 줄인다. 풀을 직접 운영하면 `'error'`나 `'exit'`가 온 워커가 맡던 작업을 실패로 끝내고 새 워커로 교체해야 한다. 이 수명주기를 대신 관리하는 piscina 같은 라이브러리는 [[Worker-Threads-Patterns|setImmediate 인터리빙과 추천 라이브러리]]에 있다.

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

## 출처

- [Node.js, Worker threads (v26)](https://nodejs.org/docs/latest-v26.x/api/worker_threads.html)
- [Node.js, Events: Error events (v26)](https://nodejs.org/docs/latest-v26.x/api/events.html#error-events)
- [libuv, Thread pool work scheduling](https://docs.libuv.org/en/v1.x/threadpool.html)
- [인프런, 얄팍한 코딩사전, worker_threads](https://www.inflearn.com/courses/lecture?courseId=336276&unitId=276231)
