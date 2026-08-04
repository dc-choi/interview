---
tags: [architecture, distributed, transaction, tcc, saga, two-phase-commit]
status: done
verified_at: 2026-08-04
category: "Architecture - DDD, Hexagonal"
aliases: ["Distributed Transaction Strategies", "분산 트랜잭션 전략", "TCC Pattern", "2PC"]
---

# 분산 트랜잭션 전략: Local ACID, 2PC, TCC, Saga

여러 서비스가 한 비즈니스 불변식을 함께 지켜야 할 때 사용하는 선택지다. 먼저 모든 쓰기를 한 서비스와 한 로컬 트랜잭션 안에 둘 수 있는지 검토하고, 불가능할 때만 분산 조정 비용을 감수한다.

핵심 질문은 어떤 패턴이 가장 유명한지가 아니라 **실패 중에 어떤 중간 상태를 허용할 수 있고, 누가 언제 복구할 것인가**다.

## 선택 전에 고정할 계약

- **불변식**: 재고가 음수가 되면 안 되는가, 초과 예약을 잠시 허용할 수 있는가
- **일관성 시점**: 응답 전에 맞아야 하는가, 정해진 시간 안에 수렴하면 되는가
- **실패 의미**: timeout을 실패로 볼지 결과 미확인으로 볼지 구분한다
- **가역성**: 취소 가능한 예약인지, 환불처럼 새 거래로 보상해야 하는지 정한다
- **복구 주체**: 요청 스레드, durable coordinator, 주기적 reconciler, 운영자 중 누가 책임지는가
- **관찰성**: 업무 ID로 전체 단계, 재시도 횟수, 마지막 오류를 추적할 수 있어야 한다

## 선택지 비교

| 전략 | 쓰기 시점 | 일관성 성격 | 주된 비용 | 적합한 조건 |
|---|---|---|---|---|
| Local ACID | 한 DB 트랜잭션에서 확정 | 단일 경계 안에서 원자적 | 서비스 경계를 넓혀야 할 수 있음 | 불변식을 한 소유자에게 모을 수 있음 |
| 2PC/XA | 모든 참여자가 prepare한 뒤 최종 결정 | 참여 자원 전체의 원자적 결정 | 지원 제약, prepared 상태의 락과 복구 운영 | 참여자가 프로토콜을 지원하고 짧은 트랜잭션이 필요함 |
| TCC | Try에서 업무 자원 예약, Confirm 또는 Cancel | 예약 계약을 통한 업무 원자성 | API 3종, 상태 전이, 멱등성과 만료 처리 | 명시적으로 예약할 수 있는 희소 자원 |
| Saga | 각 단계가 즉시 로컬 커밋, 실패 시 보상 | 중간 상태를 거쳐 업무적으로 수렴 | 보상 설계, 중간 상태 노출, 메시징 신뢰성 | 긴 업무 흐름과 이질적인 참여자 |

이 표는 빈도 순위가 아니다. 같은 시스템도 결제 승인에는 TCC 성격의 hold를, 배송 흐름에는 Saga를, 서비스 내부 쓰기에는 Local ACID를 함께 사용할 수 있다.

## 2PC를 정확히 이해하기

1. Coordinator가 각 participant에 작업과 prepare를 요청한다.
2. 모두 준비됐으면 commit 결정을, 하나라도 실패하면 rollback 결정을 내린다.
3. participant는 최종 결정을 받을 때까지 prepared transaction을 유지한다.

PostgreSQL의 prepared transaction은 상태가 디스크에 저장되고 세션과 분리된다. 따라서 prepare 전 변경이 단지 메모리에만 있다는 설명은 일반화할 수 없다. 반면 prepared 상태가 오래 남으면 락을 계속 보유하고 VACUUM에도 영향을 줄 수 있어, 외부 transaction manager가 신속하게 종료하고 미결 트랜잭션을 감시해야 한다.

2PC가 항상 나쁜 것도, Saga가 항상 더 가용적인 것도 아니다. 원자적 결정의 가치가 크고 참여 기술과 복구 체계가 갖춰졌다면 2PC가 더 단순할 수 있다. 장시간 사용자 흐름이나 XA를 지원하지 않는 참여자가 섞이면 비용이 급격히 커진다.

## TCC의 상태 모델

TCC는 DB 락 대신 업무 수준의 예약을 드러낸다.

```text
                Confirm
TRYING -> RESERVED ------> CONFIRMED
   |          |
   +----------+-----------> CANCELED
                 Cancel
```

- **Try**: 가용량을 검사하고 `available`에서 `reserved`로 옮긴다. 로컬 트랜잭션은 여기서 커밋한다.
- **Confirm**: 예약을 최종 사용 상태로 전환한다.
- **Cancel**: 예약을 해제한다.
- `CONFIRMED`, `CANCELED`는 terminal state다. 같은 요청의 반복은 같은 결과를 내야 하고 반대 terminal state로 전이하면 안 된다.

TCC가 물리적 DB 락을 오래 잡지 않는다고 해서 자원이 공짜로 풀리는 것은 아니다. 예약된 재고, 한도, 좌석은 다른 요청이 사용할 수 없는 **업무 수준의 lock 또는 escrow**다. 예약 만료 시간과 고객에게 보이는 상태가 필요하다.

## TCC 참여자 계약

모든 호출은 `businessActionId` 같은 안정적인 멱등성 키를 공유한다. 참여자는 요청 payload뿐 아니라 단계와 결과를 로컬 트랜잭션으로 함께 기록한다.

| 도착 상황 | 참여자의 처리 |
|---|---|
| 같은 Try 재시도 | 기존 예약과 결과 반환, 중복 예약 금지 |
| Try 결과 timeout | 실패로 단정하지 않고 같은 ID로 조회 또는 재시도 |
| Try 없이 Cancel 도착 | empty rollback을 기록하고 성공 응답 |
| Cancel 뒤 늦은 Try 도착 | 이미 취소된 ID이므로 예약 거부, hanging 방지 |
| Confirm 또는 Cancel 재시도 | terminal 결과를 반복 반환 |
| Confirm 뒤 Cancel 또는 그 반대 | 잘못된 상태 전이로 거부하고 경보 |

Seata의 TCC fence도 `(xid, branchId)`와 상태를 로컬 업무 변경과 함께 기록해 멱등성, empty rollback, hanging을 제어한다. 프레임워크를 쓰지 않아도 같은 실패 모델은 남는다.

## 동시성과 재시도

Try가 재고 행을 읽고 수정한다면 낙관적 락의 version 조건으로 lost update를 막을 수 있다. 충돌 후에는 오래된 entity를 그대로 저장하지 말고 **새 트랜잭션에서 다시 읽어 전체 판단을 재실행**한다.

- transient error만 제한적으로 재시도한다. validation 실패와 영구 오류는 제외한다.
- exponential backoff와 jitter로 동시 재시도 집중을 줄인다.
- hot key에서 충돌률이 높다면 비관적 락, 직렬화 큐, 원자 조건부 갱신을 비교한다.
- HTTP timeout은 처리 여부를 알려주지 않으므로 멱등성 키 없이 재호출하지 않는다.

## Coordinator와 복구 경로

요청 메모리의 `try/catch`만으로는 프로세스 종료 뒤 복구할 수 없다. coordinator는 업무 흐름과 보상 작업을 durable state로 남겨야 한다.

```text
transaction_id, business_key, current_state, deadline_at
step, participant, desired_action, status
attempts, next_attempt_at, last_error, updated_at
```

복구 worker는 `next_attempt_at`이 지난 미완료 작업을 claim하고 재시도한다. deadline을 넘긴 예약은 일률적으로 확정하거나 취소하지 않고, 업무 정책과 이미 확인된 participant 상태에 따라 결정한다. 자동 판단이 안전하지 않은 경우에만 운영자 대기열로 보내며, 운영자 화면도 같은 상태 전이 API를 호출해야 한다.

각 participant가 오래된 예약을 찾아 coordinator 상태와 대조하는 reconciliation도 필요하다. coordinator push와 participant pull을 함께 두면 한쪽 전달 경로가 끊겨도 고아 예약을 발견할 수 있다.

## Saga와의 경계

TCC는 최종 사용 전에 자원을 예약한다. Saga는 각 단계의 실제 업무 변경을 커밋한 뒤 후속 실패를 보상한다. 보상이 정확한 역연산이 아닐 수 있다는 점이 가장 큰 차이다. 결제 완료 뒤 환불은 과거 결제를 지우는 것이 아니라 별도 환불 거래를 추가한다.

- 예약 자체가 도메인에 자연스럽고 짧게 끝나면 TCC를 검토한다.
- 참여자가 Try/Confirm/Cancel을 제공할 수 없거나 흐름이 길면 Saga를 검토한다.
- 흐름이 복잡하고 중앙 가시성이 중요하면 orchestration이 유리하다.
- 참여자가 적고 이벤트 반응이 독립적이면 choreography도 가능하지만 전체 흐름 관찰 장치를 별도로 둔다.

## 이벤트 발행은 별도 원자성 문제다

DB commit 후 Spring `afterCommit`에서 Kafka를 호출하면 DB rollback 뒤 잘못된 이벤트를 보내는 경우는 피한다. 그러나 commit 직후 프로세스가 죽거나 broker 전송이 실패하면 이벤트가 유실된다. 이 간극은 [[Transactional-Outbox|Transactional Outbox]]로 막는다.

Kafka key는 같은 key를 같은 partition으로 보내는 기반이며, Kafka가 보장하는 순서도 topic-partition 안의 기록 순서다. 이것만으로 consumer의 end-to-end exactly-once 처리나 전역 직렬 실행이 보장되지는 않는다. 소비자의 멱등성과 상태 전이 검증이 여전히 필요하다.

## 실전 선택 순서

1. 불변식의 소유자를 하나로 모아 Local ACID로 끝낼 수 있는지 본다.
2. 중간 상태와 최대 허용 시간을 명시한다.
3. 자원 예약이 도메인에 자연스러운지, 이미 한 일을 보상할 수 있는지 구분한다.
4. 정상 흐름보다 timeout, 중복, 역순, 프로세스 종료를 먼저 표로 만든다.
5. coordinator log, Outbox, 멱등성 저장소, reconciler, 운영자 절차까지 한 설계로 검증한다.
6. 장애 주입 테스트로 응답 유실, 중복 전달, participant 장기 중단과 복구를 확인한다.

## 면접 체크포인트

- 2PC의 prepare는 단순 사전 조회가 아니라 복구 가능한 prepared 상태를 만드는 단계다.
- TCC의 성능 이점은 장기 DB 락을 업무 예약으로 바꾸는 데서 오며, 예약 용량과 구현 복잡성은 사라지지 않는다.
- Saga의 보상은 과거를 지우는 rollback이 아니라 새 업무 행위일 수 있다.
- 분산 호출의 timeout은 실패가 아니라 결과 미확인이다.
- 최종 일관성은 언젠가 알아서 맞는다는 뜻이 아니라 수렴시키는 복구 메커니즘과 기한이 있다는 뜻이다.

## 출처

- [PostgreSQL, PREPARE TRANSACTION](https://www.postgresql.org/docs/current/sql-prepare-transaction.html)
- [Apache Seata, TCC Mode](https://seata.apache.org/docs/v2.4/dev/mode/tcc-mode/)
- [Apache Seata, TCC fence와 idempotence, empty rollback, hanging](https://seata.apache.org/blog/seata-tcc-fence/)
- [AWS Prescriptive Guidance, Saga patterns](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/saga-patterns.html)
- [Apache Kafka, Introduction](https://kafka.apache.org/documentation/)
- [최상용 강사, 2PC란 무엇인가](https://www.inflearn.com/courses/lecture?courseId=337778&unitId=324544)
- [최상용 강사, TCC란 무엇인가](https://www.inflearn.com/courses/lecture?courseId=337778&unitId=324565)
- [최상용 강사, TCC 재시도와 Pending 복구](https://www.inflearn.com/courses/lecture?courseId=337778&unitId=325955)
- [최상용 강사, Orchestration 보상 작업 기록](https://www.inflearn.com/courses/lecture?courseId=337778&unitId=337628)
- [최상용 강사, Choreography 이벤트 발행](https://www.inflearn.com/courses/lecture?courseId=337778&unitId=344376)

## 관련 문서

- [[Saga-Pattern|Saga 패턴]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[Idempotency-Key|멱등성 키]]
- [[Lock|트랜잭션과 락]]
- [[Delivery-Semantics|메시지 전달 보장]]
