---
tags: [runtime, nodejs, stream, backpressure]
status: done
category: "OS&런타임(OS&Runtime)"
aliases: ["Backpressure", "배압"]
verified_at: 2026-07-21
---

# Backpressure (배압)

Consumer의 처리 속도가 Producer의 생성 속도보다 느릴 때 발생하는 **부하를 제어하는 메커니즘**. 단순한 "속도 조절"을 넘어 시스템의 **가용성(Availability)**과 **신뢰성(Reliability)**을 결정짓는 핵심 요소.

## 왜 백프레셔가 필요한가

백프레셔가 없으면:
- **메모리 고갈 (OOM)**: 소비되지 못한 데이터가 큐/버퍼에 계속 쌓여 서버 메모리가 터짐
- **응답 지연 (Latency)**: 큐에 대기 중인 데이터가 많아질수록 전체 처리 시간 증가
- **시스템 연쇄 붕괴 (Cascading Failure)**: 한 서비스가 마비되면 업스트림 서비스로 전이

### 실험 결과 (Node.js 스트림)
- 배압 지원 O: 최대 메모리 ~87.81MB, GC가 4~8ms 일정 간격으로 분산
- 배압 지원 X: 최대 메모리 ~1.52GB, GC가 점진적으로 느려지고 실행 횟수 절반으로 감소

## 백프레셔 구현 전략

### A. Pull 방식 (Consumer-Driven)
가장 이상적인 모델. 컨슈머가 처리할 수 있는 만큼만 데이터를 요청하는 방식.
- Project Reactor와 Reactive Streams: 구독자가 `request(n)`으로 처리 가능한 수요를 생산자에게 알림

RxJS `Observable`은 기본적으로 생산자가 알림을 보내는 push 모델이다. RxJS에서는 `buffer`, `sample`, `throttle` 같은 연산자나 소스별 일시 중지 기능으로 과부하를 다루며, 일반적인 `Observable` 구독 자체가 `request(n)` 프로토콜을 제공하는 것은 아니다.

### B. Feedback-based push flow control

- Node.js Writable Stream은 생산자가 `write()`로 밀어 넣되, 내부 큐가 임계값에 도달하면 `false`를 반환하고 `drain` 이후 재개하도록 피드백한다
- 이는 Reactive Streams의 `request(n)` pull 모델과는 다르지만 생산자가 신호를 지킬 때 버퍼 증가를 억제하는 backpressure다

### C. Buffering (잠시 참기)
데이터를 임시 저장소에 쌓아두는 방식.
- Message Queue (Kafka, BullMQ): 생산자와 소비자 사이에 거대한 버퍼를 두는 것과 같음
- 하지만 버퍼도 한계가 있으므로 무한정 쌓는 것은 해결책이 아님

### D. Dropping / Throttling (버리기)
처리가 안 되면 과감하게 데이터를 버리거나 요청을 거절.
- **Sampling**: 10개 중 1개만 처리
- **Dropping**: 최신 데이터만 남기고 이전 데이터 삭제
- **Circuit Breaker**: 부하가 임계치를 넘으면 일시적으로 요청 차단하여 시스템 보호

## Side Effects & Trade-offs

| 고려사항 | 설명 |
|----------|------|
| 처리 지연 증가 | 생산 속도를 억제하므로 전체 처리 속도가 컨슈머 속도로 하향 평준화. 실시간성이 극도로 중요한 시스템에서 치명적일 수 있음 |
| 데이터 유실 가능성 | Dropping 전략 시 어떤 데이터를 버릴지 정교한 비즈니스 로직 필요. 로그는 버려도 되지만 결제 데이터는 절대 안 됨 |
| 복잡성 증가 | 단순 Push보다 상태 관리/신호 주고받기 로직이 들어가므로 코드 복잡도 상승, 디버깅 까다로움 |

## NestJS/BullMQ에서의 백프레셔
Worker의 **concurrency**는 동시에 처리하는 작업 수를 제한해 worker와 downstream을 보호하지만 producer에 수요를 되돌리거나 큐의 무한 증가를 막지는 않는다. backlog까지 제어하려면 producer rate limit, admission control, bounded queue와 보존/삭제 정책, queue depth 알람과 autoscaling을 함께 설계한다.

## .pipe()와 배압 메커니즘

소스(Readable Stream)에서 .pipe()가 호출되면 소비자(Writable Stream)에게 데이터가 있다는 신호를 보냄. 파이프 기능이 배압 폐쇄를 설정.

### 배압 트리거 시점
Writable의 **.write()** 함수 반환값으로 결정:
- write 뒤 내부 대기열이 **highWaterMark에 도달하거나 넘으면** `false` 반환
- `false`는 hard limit이나 실패가 아니라 생산자에게 `drain`까지 기다리라는 흐름 제어 신호

### 배압 동작 흐름
1. .write()가 false 반환 → 배압 시스템 작동 (읽기 일시 중지)
2. 데이터 버퍼가 비워지면 **drain 이벤트** 발생
3. 들어오는 데이터 흐름 재개

`.pipe()`는 이 피드백을 자동으로 연결해 버퍼 증가를 억제한다. 다만 highWaterMark는 임계값이지 메모리 상한이 아니고, 호출자가 `false`를 무시하거나 다른 큐가 쌓이면 메모리는 계속 늘 수 있다.

### highWaterMark
- 기본값은 Node.js 버전과 stream 구현에 따라 다르다. Node.js 24의 generic binary stream 기본값은 64KiB, objectMode는 16개지만 `fs` 등 개별 class가 다른 값을 쓸 수 있음
- 처리량과 메모리의 tradeoff를 실제 workload로 측정해 조정

## .pipe() 수명 주기

Readable Stream → .pipe() → Writable Stream
- Transform 스트림을 사용하면 Readable의 출력이 Transform에 들어가고 Writable로 파이프
- Transform의 수신/발신 highWaterMark 모두 배압 시스템에 영향

## 에러 처리

### pump (Node.js 8.x 이하)
- 파이프라인 중 하나가 고장/닫힐 경우 모든 스트림을 적절히 파괴하는 유틸리티

### pipeline (Node.js 10.x 이상)
- 스트림 간 에러 전달, 파이프라인 완료 시 적절한 정리와 콜백 제공
- stream/promises 모듈로 async/await와 함께 사용 가능

## 커스텀 스트림 가이드라인

### 황금률: 항상 배압을 존중

**일반 규칙:**
- 요청을 받지 않으면 .push()를 사용하지 않기
- .write()가 false를 반환한 후에는 호출하지 말고 drain을 기다리기
- Node.js 버전 간 스트림 변경에 주의하여 테스트

**Readable 스트림:**
- .push() 반환값 존중: false이면 소스에서 읽기 중지
- Readable이 Writable의 데이터 중단 요청을 무시하면 문제 발생

**Writable 스트림:**
- .write() 반환값 존중
- `false`가 반환되면 `drain` 전까지 추가 쓰기를 중단
- highWaterMark는 도달 시 피드백을 주는 임계값이며 hard cap이 아님
- .cork()를 호출한 만큼 .uncork()를 호출해야 다시 흐름

## 관련 문서
- [[Async-IO|Async I/O]]
- [[Event-Loop|Node.js Event Loop]]

## 출처
- [Node.js Streams API](https://nodejs.org/api/stream.html)
- [RxJS Observable 가이드](https://rxjs.dev/guide/observable)
- [Reactive Streams 사양](https://www.reactive-streams.org/)
- [BullMQ concurrency](https://docs.bullmq.io/guide/parallelism-and-concurrency)
