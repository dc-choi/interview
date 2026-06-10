---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
aliases: ["setImmediate 인터리빙", "Worker Threads 라이브러리"]
---

### setImmediate 인터리빙과 추천 라이브러리
Worker 없이 이벤트 루프 블로킹을 완화하는 setImmediate 인터리빙 기법과 워커 풀 관리 라이브러리를 다룬다.

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

## 추천 라이브러리

**piscina**: Worker Threads 풀을 관리하는 라이브러리이다. 작업 큐를 내장하고 있으며, 사용 가능한 워커에 작업을 자동으로 스케줄링한다. 워커별 메모리 제한 설정이 가능하고, 유휴 워커 자동 종료, 작업 취소 등의 기능을 제공한다. Node.js 코어 팀 멤버가 유지보수하여 안정성이 높다.

**workerpool**: 프로세스와 스레드 풀을 추상화하는 라이브러리이다. child_process와 Worker Threads를 모두 지원하며, 설정 하나로 전환할 수 있다. 작업 타임아웃, 동적 워커 수 조절 등의 기능을 제공한다.

**caf (Cancellation-Aware async Functions)**: 제너레이터 기반으로 취소 가능한 비동기 함수를 구현하는 라이브러리이다. yield를 취소 체크포인트로 활용하여 비즈니스 로직과 취소 로직을 완전히 분리한다. AbortController와 통합되며, 타임아웃 기반 자동 취소도 지원한다.
