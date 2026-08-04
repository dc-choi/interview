---
tags: [architecture, reactive, resilience, elasticity, messaging, backpressure]
status: done
verified_at: 2026-08-04
category: "아키텍처&설계(Architecture&Design)"
aliases: ["Reactive Systems", "리액티브 시스템", "Reactive Manifesto"]
---

# 리액티브 시스템 원칙

리액티브 시스템은 특정 프레임워크나 비동기 문법이 아니라, 변화하는 부하와 장애에서도 **예측 가능한 시간 안에 응답하려는 시스템 설계 원칙**이다. 리액티브 선언문은 네 특성을 함께 요구한다.

## 네 특성의 관계

```text
                    목표
                 Responsive
                /          \
       Resilient            Elastic
          장애 대응          부하 변화 대응
                \          /
                 Message-Driven
             격리, 위임과 흐름 제어
```

| 특성 | 의미 | 확인할 증거 |
|---|---|---|
| Responsive | 가능하면 정해진 시간 경계 안에 일관되게 응답 | 지연 분포, timeout budget, SLO |
| Resilient | 구성 요소가 실패해도 시스템이 응답성을 유지 | 격리, 복제, 복구 훈련, graceful degradation |
| Elastic | 부하가 변할 때 자원을 늘리거나 줄여 응답성을 유지 | queue depth 기반 확장, 병목 없는 분할, scale-in 안전성 |
| Message-Driven | 비동기 메시지 경계로 구성 요소를 결합 | 위치 투명성, 실패 위임, bounded queue와 backpressure |

Responsive는 단순 평균 속도가 아니다. 느린 요청의 상한과 실패 응답까지 포함해 사용자가 결과를 예측할 수 있어야 한다.

## Message-Driven이 제공하는 것과 제공하지 않는 것

비동기 메시지는 송신자와 수신자의 시간, 위치와 실행 자원을 분리할 수 있다. 수신자가 잠시 느려도 송신자가 같은 call stack에서 기다리지 않으며, queue 상태를 관찰해 부하를 조절할 수도 있다.

하지만 메시지를 쓴다는 사실만으로 다음이 보장되지는 않는다.

- 유실 방지와 정확히 한 번 처리
- 비즈니스 순서와 데이터 일관성
- 무제한 트래픽 흡수
- 장애 전파 차단

전송 보장, 멱등성, 순서 정책, timeout, 격리와 용량 제한을 별도로 설계해야 한다.

## Backpressure와 bounded queue

생산 속도가 소비 속도보다 빠른 상태가 계속되면 queue는 결국 메모리, 디스크나 허용 지연을 소진한다. 무제한 buffer는 장애를 늦춰 보일 뿐 제거하지 않는다.

1. queue와 처리 동시성에 명시적 상한을 둔다.
2. 포화 신호를 upstream에 전달해 생산률을 낮춘다.
3. 대기 시간이 예산을 넘으면 거부, 우선순위화, 샘플링이나 부하 제거를 선택한다.
4. queue depth, oldest message age, 처리율과 실패율을 함께 관측한다.

Reactive Streams는 이 문제를 위해 **비동기 스트림 처리와 non-blocking backpressure의 상호운용 규약**을 정의한다. 이는 전체 시스템 아키텍처를 다루는 리액티브 선언문보다 범위가 좁다.

## 리액티브 시스템과 혼동하기 쉬운 개념

| 개념 | 범위 | 리액티브 시스템과의 관계 |
|---|---|---|
| async/await | 한 런타임의 제어 흐름 | blocking을 줄일 수 있지만 회복성과 탄력성을 보장하지 않음 |
| Reactive Streams | 비동기 stream의 흐름 제어 규약 | backpressure 구현 수단 중 하나 |
| Event-Driven Architecture | 상태 변화와 이벤트 중심의 결합 방식 | message-driven 경계에 활용할 수 있으나 동일 개념은 아님 |
| CQRS | command와 query 모델 분리 | 독립 확장과 읽기 응답성에 도움을 줄 수 있음 |
| optimistic UI | 완료 전 사용자에게 예상 결과를 표시 | 체감 응답 기법이며 서버 처리 성공을 보장하지 않음 |

## BASE와 ACID를 이분법으로 보지 않기

BASE는 분산 시스템에서 가용성과 최종 일관성을 설명하는 관점이지만 ACID의 반대말이나 데이터가 틀려도 된다는 허가가 아니다.

- 한 서비스의 로컬 트랜잭션에서는 ACID로 불변식을 지킬 수 있다.
- 서비스 사이에는 Saga, Outbox와 멱등 소비로 상태를 수렴시킬 수 있다.
- 사용자에게 보여 줄 임시 상태와 절대 위반하면 안 되는 불변식을 구분한다.
- consistency window, 충돌 처리, 보상과 수동 복구 경로를 명시한다.

예를 들어 댓글을 먼저 화면에 보이는 optimistic UI는 실패 시 되돌림과 상태 표시가 있어야 한다. 결제 금액이나 재고 하한처럼 중요한 불변식을 단순히 나중에 맞춘다는 말로 미루면 안 된다.

## 설계 체크리스트

### 응답성

- 사용자 여정마다 latency budget과 timeout을 정했는가
- 평균이 아니라 p95/p99와 실패 응답을 보는가

### 회복성

- 실패가 어느 bulkhead 안에 갇히는가
- retry가 부하를 증폭하지 않도록 횟수, 지연과 jitter가 제한됐는가
- 의존 서비스가 없을 때 대체, 축소 또는 빠른 실패가 가능한가

### 탄력성

- 어떤 지표로 scale-out과 scale-in을 결정하는가
- 상태 이전, cold start와 중앙 병목이 확장을 막지 않는가

### 메시지 경계

- queue 용량과 만료, 중복, 순서 및 DLQ 정책이 있는가
- 소비자가 감당하지 못할 때 upstream이 받는 신호는 무엇인가
- trace와 business correlation ID가 경계를 통과하는가

## 자주 만나는 실패

- 비동기로 바꾼 뒤 성공을 먼저 응답하고 후속 실패를 사용자에게 숨김
- 무제한 queue로 순간 부하를 견디다가 긴 지연과 메모리 고갈을 만듦
- 모든 오류에 retry를 걸어 장애 서비스에 retry storm을 보냄
- 자동 확장만 믿고 DB, lock, 외부 API 같은 고정 병목을 방치함
- Reactive라는 라이브러리 이름을 시스템 품질의 증거로 사용함

## 출처

- [The Reactive Manifesto 2.0](https://www.reactivemanifesto.org/)
- [The Reactive Manifesto Glossary](https://www.reactivemanifesto.org/glossary)
- [Reactive Streams](https://www.reactive-streams.org/)
- [han jeong heon 강사, 리액티브 선언 및 BASE 개념 이해](https://www.inflearn.com/courses/lecture?courseId=328412&unitId=113787)

## 관련 문서

- [[Event-Driven-Architecture|Event-Driven Architecture]]
- [[Saga-Pattern|Saga 패턴]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[Idempotency-Key|멱등성 키]]
- [[External-Service-Resilience|Circuit Breaker와 외부 service resilience]]
- [[SLI-SLO|SLI와 SLO]]
