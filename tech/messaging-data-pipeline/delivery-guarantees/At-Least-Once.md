---
tags: [messaging]
status: done
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["At-Least-Once", "최소 한 번 전달"]
---

# At-Least-Once (최소 한 번 전달)

메시지가 반드시 한 번 이상 처리됨을 보장하는 전달 방식. 중복 실행 가능성이 있으므로 멱등성 처리가 필수이다.

## 중복이 발생하는 원인
- Lambda/Consumer 타임아웃으로 처리 중 재시도
- Visibility Timeout 만료 전 메시지 삭제 실패
- 인프라 재실행 (Lambda 재시도 정책)
- 네트워크 장애로 ACK 전달 실패

## 가장 위험한 시나리오
중복 성공 실행이 가장 위험하다: 이중 결제, 중복 이메일, 포인트 이중 적립. 명시적 실패는 모니터링으로 감지 가능하지만, 성공으로 보이는 중복은 발견이 어렵다.

## 처리 경계별 멱등 패턴

### 같은 DB의 짧은 작업

Inbox INSERT, 업무 쓰기와 `COMPLETED` 기록을 하나의 짧은 DB transaction에서 커밋한 뒤 ACK한다. 중복 키면 저장된 완료 결과를 반환한다. crash가 나면 모두 rollback되므로 durable `PROCESSING` lease나 heartbeat가 필요 없다. [[Idempotent-Consumer#Inbox 패턴]]

### 오래 걸리거나 외부 효과가 있는 작업

1단계: UNIQUE 제약 조건이 있는 테이블에 eventId로 INSERT 시도
2단계: 중복 키면 기존 행을 잠근다 (`SELECT ... FOR UPDATE`)
3단계: `COMPLETED`만 이미 끝난 작업으로 보고 ACK한다
4단계: 신선한 `PROCESSING`은 다른 워커가 소유한 상태이므로 삭제하지 않고 재시도하고, `FAILED` 또는 하트비트가 만료된 `PROCESSING`만 새 lease로 회수한다

claim은 별도 transaction에서 커밋한다. 외부 호출에는 provider가 보장하는 안정적인 idempotency key를 쓰고 결과가 불명확하면 같은 키로 재시도하거나 대사한다.

## 상태 머신

PROCESSING → COMPLETED (성공)
PROCESSING → FAILED (에러)
FAILED 또는 하트비트가 만료된 PROCESSING → PROCESSING (새 owner로 재시도)

```typescript
// 긴 작업/외부 효과용 흐름이다. claimMessage()는 claim/lease를 커밋한 뒤 결과를 반환한다.
async function handleMessage(eventId: string, payload: any) {
  const ownerToken = randomUUID()
  const claim = await claimMessage(eventId, ownerToken)

  if (claim.kind === 'COMPLETED') return { kind: 'ACK' }
  if (claim.kind === 'BUSY') {
    return { kind: 'BUSY', deferUntil: claim.leaseExpiresAtWithJitter }
  }

  try {
    await withHeartbeat(eventId, ownerToken, processBusinessLogic, payload)
    const completed = await db.updateWhere(
      { eventId, status: 'PROCESSING', ownerToken },
      { status: 'COMPLETED' },
    )
    if (!completed) throw new RetryableError('lease lost')
    return { kind: 'ACK' } // 새로 COMPLETED가 된 뒤에만 ACK
  } catch (err) {
    await db.updateWhere(
      { eventId, status: 'PROCESSING', ownerToken },
      { status: 'FAILED' },
    )
    throw err
  }
}
```

`withHeartbeat`는 처리 중 DB의 `heartbeat_at`과 SQS visibility를 함께 연장한다. 직접 폴링 워커는 `ACK`일 때만 `DeleteMessage`를 호출하고, `BUSY`면 receipt handle로 `ChangeMessageVisibility`를 호출해 남은 lease와 jitter까지 미룬다. Lambda는 기본적으로 한 항목이 실패해도 배치 전체를 다시 노출한다. 항목별 ACK가 필요하면 `ReportBatchItemFailures`를 켜고 `BUSY`와 실패 항목의 ID를 `batchItemFailures`로 반환한다. Lambda 경로도 큐 visibility 또는 명시적 연장으로 lease 회수 시점 전 재노출을 막는다. 두 경로 모두 `BUSY` 재수신이 `ApproximateReceiveCount`를 올릴 수 있으므로 처리시간과 lease에 맞춰 `maxReceiveCount`를 잡고 DLQ 원인을 구분해 감시한다. 신선한 `PROCESSING`을 ACK하면 메시지가 삭제되어 워커 장애 시 작업이 유실된다.

워커가 죽으면 행이 `PROCESSING`으로 좌초된다. 하트비트가 만료된 행만 새 owner token으로 회수하고, 하트비트와 완료 UPDATE는 모두 owner token 조건을 둔다. 회수 뒤 되살아난 옛 워커가 새 소유자의 상태를 덮어쓰지 못하게 하는 장치다. lease를 잃은 뒤에도 외부 부수효과가 실행될 수 있으므로 그 부수효과도 멱등해야 한다. [[SQS-Worker-Reliability#PROCESSING으로 좌초된 행 회수]]

## 구현 체크리스트
- eventId에 UNIQUE 인덱스 설정
- 상태 확인 시 비관적 잠금 (FOR UPDATE) 적용
- 비즈니스 로직 자체도 멱등하게 설계
- 단일 메시지 전달을 절대 신뢰하지 않기
- 타임아웃을 명시적으로 처리

## 관련 문서
- [[Delivery-Semantics|전달 보장]]
- [[Idempotency-Key]]
- [[Event-Driven-Patterns|DLQ (Retry + DLQ 패턴)]], Kafka 구현은 [[MQ-Kafka-Retry-DLT|재시도와 DLT]]
