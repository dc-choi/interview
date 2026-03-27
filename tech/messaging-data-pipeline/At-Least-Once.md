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

## Insert-First 패턴 (핵심 해결책)

1단계: UNIQUE 제약 조건이 있는 테이블에 eventId로 INSERT 시도
2단계: 중복 키 에러 발생 시 → 기존 레코드 조회
3단계: 비관적 잠금 적용 (SELECT ... FOR UPDATE)
4단계: 상태 확인: PROCESSING이면 대기, COMPLETED이면 스킵, FAILED이면 재처리

## 상태 머신

PROCESSING → COMPLETED (성공)
PROCESSING → FAILED (에러)
FAILED → PROCESSING (재시도 가능)

```typescript
// 의사 코드
async function handleMessage(eventId: string, payload: any) {
  try {
    await db.insert({ eventId, status: 'PROCESSING' })
  } catch (duplicateError) {
    const existing = await db.findForUpdate(eventId)
    if (existing.status === 'COMPLETED') return // 이미 처리됨
    if (existing.status === 'PROCESSING') return // 다른 소비자가 처리 중
    // FAILED → 재처리
  }

  try {
    await processBusinessLogic(payload)
    await db.update(eventId, { status: 'COMPLETED' })
  } catch (err) {
    await db.update(eventId, { status: 'FAILED' })
    throw err
  }
}
```

## 구현 체크리스트
- eventId에 UNIQUE 인덱스 설정
- 상태 확인 시 비관적 잠금 (FOR UPDATE) 적용
- 비즈니스 로직 자체도 멱등하게 설계
- 단일 메시지 전달을 절대 신뢰하지 않기
- 타임아웃을 명시적으로 처리

## 관련 문서
- [[Delivery-Semantics|전달 보장]]
- [[Idempotency-Key]]
- [[DLQ]]
