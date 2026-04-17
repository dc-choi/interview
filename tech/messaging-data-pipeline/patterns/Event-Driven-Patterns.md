---
tags: [messaging, event-driven, competing-consumer, retry, dlq, correlation-id]
status: done
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Event-Driven Patterns", "이벤트 드리븐 실전 패턴", "Competing Consumer", "Retry DLQ", "Async Request Response"]
---

# 이벤트 드리븐 실전 패턴 3종

이벤트 기반 시스템 설계에서 **반복적으로 등장하는 세 가지 실전 패턴**. 시스템 디자인 면접의 단골 주제이자, 실무에서 비동기 처리를 안전하게 만드는 기본 도구다. 메시징 일반은 [[Messaging-Patterns]]·[[Fan-Out-Architecture]] 참조.

## 3가지 패턴 개관

| 패턴 | 해결하는 문제 | 핵심 도구 |
|---|---|---|
| **Competing Consumer** | 대량 메시지를 여러 소비자에게 로드 밸런싱 | 잠금·가시성 타임아웃·prefetch |
| **Retry + DLQ** | 실패한 메시지의 안전한 재시도 | retry queue·DLQ·지수 백오프 |
| **Async Request-Response** | 인스턴스가 여러 개일 때 응답을 올바른 요청자에게 라우팅 | Correlation ID |

세 패턴은 **배타적이 아니라 보완적** — 실무에서 세 패턴이 한 시스템 안에 공존하는 경우가 흔하다.

## 1. Competing Consumer Pattern

### 문제
대량의 비동기 메시지를 다수의 소비자가 **병렬 처리**하되, 같은 메시지가 **두 번 처리되지 않게** 하려면?

### 작동 원리

```
Producer → Queue ─┬─ Consumer 1
                  ├─ Consumer 2
                  └─ Consumer 3
```

- 소비자들이 같은 큐를 **구독**하고 경쟁해 하나만 획득
- 처리 중에는 다른 소비자에게 같은 메시지가 보이지 않음 (잠금)
- 처리 완료 시 ACK → 큐에서 제거. 실패 시 잠금 해제 → 다른 소비자에게 재노출

### 플랫폼별 잠금 메커니즘

| 플랫폼 | 기법 | 동작 |
|---|---|---|
| **RabbitMQ** | Prefetch Count | 소비자당 미확인 메시지 수 제한. "전송 중" 표시 |
| **Azure Service Bus** | Peek-Lock | 소비자가 메시지를 잠그고 처리, 완료 시 Complete |
| **AWS SQS** | Visibility Timeout | 받은 메시지를 일정 시간 숨김, 만료 시 재노출 |
| **Kafka** | Consumer Group + Partition | 파티션 단위로 한 소비자에게만 할당 |

### 주의사항
- **처리 시간 > 잠금 타임아웃**이면 같은 메시지가 두 번 처리됨 → 반드시 **멱등성** 확보
- **Prefetch 크기 튜닝** — 너무 작으면 throughput 저하, 너무 크면 실패 시 재분배 지연
- Kafka의 경쟁은 파티션 단위 → 소비자 < 파티션 수면 나머지 소비자 idle
- Competing Consumer는 **Pub/Sub과 다름** — 한 메시지가 여러 소비자에게 가지 않음

## 2. Retry + DLQ Pattern (메시지 재시도)

### 문제
소비자가 메시지 처리에 실패했을 때, **무한 재시도 루프 없이** 안전하게 재처리하려면?

### 아키텍처 흐름

```
Main Queue → Consumer
  처리 실패 → 재시도 횟수 확인
    ├─ 횟수 미만 → Retry Queue (지연 후 Main으로 복귀)
    └─ 횟수 초과 → DLQ (Dead Letter Queue, 사람이 분석)
```

**Retry Queue**: 즉시 재시도하지 말고 **일정 시간 지연** 후 재투입. 외부 API 일시 장애가 회복될 여유를 줌.

**DLQ (Dead Letter Queue)**: 재시도 한도를 넘긴 메시지를 **별도 큐에 격리**. 자동 버리지 않고 사람·알림·분석 경로로.

### 지수 백오프 (Exponential Backoff)

재시도 간 지연을 점진 증가 — `1s → 2s → 4s → 8s → 16s …`. 목적:
- **Thundering Herd 방지**: 실패한 메시지들이 회복 시점에 동시 몰리는 현상
- **외부 시스템 회복 여유**: 다운스트림이 과부하면 거리두기
- **Jitter 추가**: `base × 2^n + random(0, jitter)` — 소비자들의 재시도 시점이 같아지지 않게

### 오류 분류 — 재시도 vs 즉시 DLQ

| 오류 종류 | 처리 |
|---|---|
| **일시적 (Transient)** | 재시도 (네트워크·타임아웃·503 Rate Limit) |
| **영구적 (Permanent)** | 즉시 DLQ (검증 오류·401·404·데이터 스키마 불일치) |
| **독성 메시지 (Poison)** | 즉시 DLQ (반복 실패, 크기 초과, 악성 페이로드) |

분류 없이 모든 실패를 재시도하면 **영구 오류가 무한 루프**를 만듦.

### 필수 동반 요소

- **멱등성 ([[Idempotency-Key]])** — 재시도해도 같은 결과. At-least-once 보장의 전제
- **메시지 TTL** — 오래된 메시지의 강제 만료 (1일·7일 등)
- **재시도 횟수 헤더** — 메시지에 재시도 카운트 실어 보내 관리
- **DLQ 알람** — DLQ가 비어있지 않으면 알림. 방치되면 운영 공백

### 플랫폼별 구현

- **AWS SQS**: Main Queue + Redrive Policy(maxReceiveCount 초과 시 DLQ로)
- **RabbitMQ**: Dead Letter Exchange + delay plugin
- **Kafka**: 직접 구현 (retry topic·DLT topic)
- **BullMQ**: `backoff.type = 'exponential'` + `attempts` 옵션

## 3. Async Request-Response Pattern

### 문제
요청자 서비스가 **여러 인스턴스**로 운영되고, 응답자가 비동기로 결과를 돌려줄 때, 응답이 **원래 요청한 인스턴스**로 (혹은 그 인스턴스가 죽었다면 다른 인스턴스로) 어떻게 라우팅되는가?

동기 HTTP에서는 TCP 커넥션이 자동 해결하지만, 비동기에서는 "요청자-응답자 1:1 연결"이 사라짐.

### 해결책 — Correlation ID

```
요청자(인스턴스 A): 고유 correlationId 생성
  → 캐시/DB에 "이 ID로 응답 기다림" 기록
  → Request Queue로 메시지 (payload + correlationId + replyTo)
응답자: 처리 후 Response Queue로 (result + correlationId)
요청자(인스턴스 A 또는 B가 구독): correlationId로 원래 요청 매칭
  → 대기 중이던 Promise resolve 또는 callback 실행
```

### 구현 요소

- **Correlation ID**: UUID v4 또는 `requestId`. 비즈니스 ID(주문 ID)와 분리 — 한 주문에 여러 요청 가능
- **Reply Queue**: 요청자 측이 구독하는 응답 전용 큐
- **대기 상태 저장소**: 인스턴스 로컬 (캐시·메모리·DB). 인스턴스 간 공유해야 하면 Redis
- **타임아웃**: 응답이 안 오면 실패 처리 (무한 대기 금지)

### 분산 추적과의 관계

Correlation ID는 **분산 추적(distributed tracing)** 에서의 Trace ID와 개념이 겹치지만 용도가 다르다.

| 구분 | 분산 추적 Trace ID | 비동기 Correlation ID |
|---|---|---|
| 용도 | 요청이 여러 서비스를 타고 간 경로 추적 (디버깅) | 비동기 응답을 원 요청자에게 라우팅 |
| 수명 | 전체 트랜잭션 | 특정 요청-응답 쌍 |
| 저장 | OpenTelemetry span | 요청자 로컬/공유 캐시 |

두 개념은 **동일한 ID**를 재활용할 수 있다 — Correlation ID가 곧 Trace ID인 설계도 자주 씀. 상세는 [[Correlation-ID]].

## 세 패턴의 결합 사용 — 실전 흐름

```
API 서버 (요청자) ─┐
                   ├→ Request Queue ──Competing Consumer──→ Worker Pool
                   │                                            │
                   └─대기(correlationId)                          │
                                                                 ▼
                     ┌──── Response Queue ◀────── 결과 + correlationId
                     │         (여기서도 Retry + DLQ 적용)
                     ▼
            correlationId 매칭 → 요청자에게 반환
```

- **Competing Consumer**: Worker Pool이 여러 대, 한 메시지는 한 워커만
- **Retry + DLQ**: Worker 처리 실패 시 재시도, 한도 초과 시 DLQ
- **Correlation ID**: 결과를 요청한 API 서버 인스턴스로 라우팅

## 흔한 함정

- **Competing Consumer에 멱등성 없음** — 잠금 타임아웃 초과 시 동일 메시지 중복 처리
- **Retry 없이 At-least-once만 사용** — 실패 메시지 영구 손실
- **DLQ 알람 없음** — DLQ에 쌓인 줄 모르고 수개월 방치
- **Correlation ID 저장소 인스턴스 로컬** — 인스턴스 재시작 시 응답 매칭 불가. 장기 요청은 Redis 같은 공유 저장소로
- **Correlation ID와 비즈니스 ID 혼용** — 한 주문의 여러 요청 추적 불가. 별개 ID 필수
- **모든 실패를 재시도** — 영구 오류가 무한 루프 만듦. 오류 분류 필수
- **TTL 없음** — 며칠 지난 요청이 갑자기 처리됨 (금융 시스템에서 특히 위험)

## 면접 체크포인트

- **3패턴의 문제-해결 매칭** (경쟁 소비자·재시도·Correlation ID)
- **Competing Consumer의 플랫폼별 잠금 메커니즘** (visibility timeout·peek-lock·prefetch·partition)
- **Retry + DLQ 아키텍처**와 **지수 백오프 + Jitter** 필요성
- **오류 분류** (일시적 vs 영구적 vs 독성)
- **At-least-once와 멱등성**의 필수 결합 ([[At-Least-Once]]·[[Idempotency-Key]])
- **Correlation ID**의 용도와 분산 추적 Trace ID와의 차이
- 세 패턴의 **결합 시 아키텍처**

## 출처
- [DevPill — 이벤트 기반 시스템 설계 실전 패턴 3종](https://maily.so/devpill/posts/8do7q4pnrgq)
- [F-Lab — 이벤트 소싱과 CQRS 패턴의 이해와 적용](https://f-lab.kr/insight/event-sourcing-cqrs-20240528)
- [datamoney — 이벤트 기반 아키텍처 개념 정리](https://datamoney.tistory.com/376)
- [choidongkuen — 메시지 큐란?](https://velog.io/@choidongkuen/서버-메세지-큐Message-Queue-을-알아보자)

## 관련 문서
- [[Messaging-Patterns|메시징 패턴 (Pub/Sub·Task Distribution·Request/Reply)]]
- [[Fan-Out-Architecture|Fan-out Architecture (1:N 분배)]]
- [[SQS|SQS]]
- [[MQ-Kafka|Kafka]]
- [[Delivery-Semantics|Delivery Semantics]]
- [[At-Least-Once|At-Least-Once]]
- [[Idempotency-Key|Idempotency Key]]
- [[Consumer-Group|Consumer Group]]
- [[Correlation-ID|Correlation ID (분산 추적)]]
