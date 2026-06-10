---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
aliases: ["Advanced Recipes", "고급 레시피"]
---

### 고급 레시피 (Advanced Recipes)

## 비동기 컴포넌트 초기화

데이터베이스 커넥션, 외부 서비스 클라이언트 등 초기화가 비동기인 컴포넌트는 생성자에서 async/await를 사용할 수 없다는 문제가 있다. 초기화가 완료되기 전에 메서드가 호출되면 에러가 발생한다.

이 문제는 State 패턴으로 해결할 수 있다. 컴포넌트가 QueuingState와 InitializedState 두 상태를 가지도록 설계한다. 초기화가 완료되기 전에 들어오는 요청은 QueuingState에서 내부 큐에 버퍼링한다. 초기화가 완료되면 InitializedState로 전환하고, 큐에 쌓인 요청을 일괄 실행한다. 이후 들어오는 요청은 직접 실행된다.

이 패턴의 실전 사례로는 Mongoose가 있다. Mongoose는 MongoDB 연결이 완료되기 전에 호출된 쿼리를 내부적으로 큐잉했다가 연결 후 실행한다. pg 라이브러리의 Pool도 초기화 과정에서 유사한 패턴을 사용한다.

## 요청 배칭 (Request Batching)

동일한 API에 대한 동시 호출을 하나로 합치는 기법이다. 여러 곳에서 같은 데이터를 동시에 요청할 때, 실제 API 호출은 하나만 수행하고 결과를 모든 요청자에게 공유한다.

구현은 Map으로 진행 중인 요청을 추적하는 방식이다. 새 요청이 들어오면 먼저 runningRequests.get(key)로 동일한 요청이 이미 진행 중인지 확인한다. 진행 중이라면 기존 Promise에 "piggyback"하여 같은 결과를 공유받는다. 진행 중이 아니라면 새 요청을 시작하고 Map에 등록한다. 요청이 완료되면 Map에서 제거한다.

```javascript
const runningRequests = new Map();

async function batchedFetch(url) {
    if (runningRequests.has(url)) {
        return runningRequests.get(url); // 기존 Promise 재사용
    }

    const promise = fetch(url).then(res => res.json());
    runningRequests.set(url, promise);

    try {
        return await promise;
    } finally {
        runningRequests.delete(url);
    }
}
```

성능 효과는 상당하다. N개의 동시 호출이 1개로 감소하며, 최대 3배의 오버헤드 감소를 달성할 수 있다.

## 요청 캐싱 (Request Caching)

요청 배칭을 확장하여 결과를 일정 시간 동안 캐시하는 기법이다. TTL(Time-To-Live) 기반으로 캐시 만료를 관리하며, 보통 5초 정도의 짧은 TTL을 설정한다.

요청 조회는 3단계로 이루어진다:

1. **캐시 히트**: 캐시에 유효한 결과가 있으면 즉시 반환한다.
2. **배칭 히트**: 캐시에 없지만 동일 요청이 진행 중이면 해당 Promise에 piggyback한다.
3. **새 요청**: 둘 다 해당하지 않으면 새 요청을 시작한다.

배칭과 캐싱을 결합하면 캐시 스탬피드(cache stampede) 문제를 방지할 수 있다. 캐시가 만료되는 순간 수백 개의 동시 요청이 백엔드를 압도하는 현상을, 배칭이 자연스럽게 하나의 요청으로 합쳐준다.

주의할 점으로, setTimeout 기반의 캐시 정리는 메모리 누수 위험이 있다. 캐시 항목이 많아지면 타이머도 비례하여 증가하므로, 전용 스케줄러나 LRU 캐시 라이브러리를 사용하는 것이 권장된다.

## 비동기 작업 취소

Node.js에서 비동기 작업을 취소하는 세 가지 접근법이 있으며, 점진적으로 개선된다.

### 1. 플래그 체크

cancelObj.cancelRequested 플래그를 await 사이마다 수동으로 확인하는 방식이다. 구현이 단순하지만 코드가 verbose해지고, 체크 지점을 누락할 위험이 있다.

```javascript
async function cancelable(cancelObj) {
    const result1 = await step1();
    if (cancelObj.cancelRequested) throw new Error('Cancelled');

    const result2 = await step2(result1);
    if (cancelObj.cancelRequested) throw new Error('Cancelled');

    return await step3(result2);
}
```

### 2. 래퍼 패턴

취소 로직을 래퍼 함수로 추상화하여 비즈니스 로직과 분리하는 방식이다. 각 비동기 단계를 래퍼가 감싸서 취소 여부를 자동으로 확인한다. 비즈니스 로직의 가독성이 개선되지만, 래퍼 호출이 추가되는 구조적 복잡성이 있다.

### 3. 제너레이터 기반 (최선)

yield를 자동 취소 체크포인트로 활용하는 방식이다. 제너레이터 함수로 비즈니스 로직을 작성하고, 실행기(runner)가 각 yield 지점에서 취소 여부를 자동으로 확인한다. 비즈니스 로직과 취소 로직이 완전히 분리되어 가장 깔끔하다.

```javascript
function* cancelableTask() {
    const result1 = yield step1();
    const result2 = yield step2(result1);
    return yield step3(result2);
}
// runner가 각 yield에서 자동으로 취소 체크
```

추천 라이브러리로 caf(Cancellation-Aware async Functions)가 있다. 제너레이터 기반 취소 패턴을 정제된 API로 제공하며, AbortController와도 통합된다.

## CPU 바운드 작업 실행 전략

CPU 집약적인 작업을 처리하는 세 가지 접근법이 있다.

| 접근법 | 오버헤드 | 멀티코어 | 이벤트 루프 | 용도 |
|--------|----------|----------|-------------|------|
| setImmediate 인터리빙 | 낮음 | 불가 | 공유 | 단순 CPU 작업 |
| child_process.fork | 높음 | 가능 | 격리 | 외부 언어/충돌 격리 |
| Worker Threads | 중간 | 가능 | 공유 | CPU 집약 Node 연산 |

setImmediate 인터리빙은 CPU 작업을 작은 청크로 나누고 각 청크 사이에 setImmediate()를 호출하여 이벤트 루프에 제어권을 반환하는 방식이다. 멀티코어를 활용할 수 없지만 오버헤드가 가장 낮다.

child_process.fork는 별도의 프로세스를 생성하므로 프로세스 생성 비용이 크지만, 완전한 격리를 제공한다. Python이나 Rust 같은 외부 언어로 작성된 스크립트를 실행하거나, 워커의 충돌이 메인 프로세스에 영향을 주지 않아야 할 때 적합하다.

Worker Threads는 같은 프로세스 내에서 별도의 스레드로 실행되어 중간 수준의 오버헤드를 가진다. SharedArrayBuffer를 통한 메모리 공유가 가능하며, CPU 집약적인 Node.js 연산에 가장 적합하다.

추천 라이브러리:
- **piscina**: Worker Threads 풀 관리. 작업 큐, 자동 스케줄링, 메모리 제한을 지원한다.
- **workerpool**: 프로세스와 스레드 풀을 추상화한다. child_process와 Worker Threads를 모두 지원하여 전환이 용이하다.

## 관련 문서
- [[Async-Internals|비동기 내부 동작]]
- [[Event-Loop|이벤트 루프]]
- [[Worker-Threads|워커 스레드]]
- [[Stream|스트림]]
