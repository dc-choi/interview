---
tags: [spring, transaction, event, data-access]
status: done
verified_at: 2026-09-16
category: "OS & Runtime"
aliases: ["Spring Transaction Events", "TransactionalEventListener", "트랜잭션 이벤트 리스너"]
---

# Spring 트랜잭션 이벤트 (`@TransactionalEventListener`)

같은 프로세스 안에서 본 작업과 부수효과를 분리할 때 쓰는 배선이다. 저장이 끝나면 색인을 갱신하거나 결제가 확정되면 알림을 보내는 식으로, 실패해도 본 작업을 되돌리지 않아야 하는 일을 커밋 이후로 미룬다. 브로커를 건너 다른 프로세스로 넘기는 원자성 문제는 다른 층이다 → [[Transactional-Outbox]].

## 계약을 정확히 읽기

가장 흔한 오독은 이 어노테이션을 커밋 이후에 실행으로 읽는 것이다. 공식 javadoc의 계약은 다르다.

- 클래스 설명: 이벤트가 활성 트랜잭션 안에서 발행되지 않으면, `fallbackExecution` 플래그를 명시적으로 켜지 않는 한 그 이벤트는 버려진다.
- `phase` 설명: 진행 중인 트랜잭션이 없으면 `fallbackExecution`을 명시적으로 켜지 않는 한 이벤트는 아예 처리되지 않는다. 기본 phase는 `AFTER_COMMIT`이다.
- `fallbackExecution` 설명: 트랜잭션이 돌고 있지 않을 때 이벤트를 처리할지 여부. 기본값은 `false`다.

즉 실제 계약은 커밋 이후 실행이 아니라 **활성 트랜잭션이 있을 때만 등록**이다. 발행 시점에 트랜잭션이 있으면 리스너를 그 트랜잭션의 완료 단계 콜백으로 걸어 두고, 없으면 등록하지 않고 반환한다. 기본 설정에서는 예외도 경고도 남지 않으므로 이벤트는 발행됐는데 아무도 받지 않은 상태가 신호 없이 지나간다.

`phase` 값은 넷이다.

| phase | 의미 |
|---|---|
| `BEFORE_COMMIT` | 커밋 직전에 처리 |
| `AFTER_COMMIT` | 커밋이 성공적으로 끝난 뒤 처리. 기본값 |
| `AFTER_ROLLBACK` | 롤백된 경우 처리 |
| `AFTER_COMPLETION` | 완료 후 처리. 위 둘의 상위 개념 |

javadoc이 덧붙이는 주의가 하나 더 있다. `AFTER_COMMIT`과 `AFTER_ROLLBACK`은 `AFTER_COMPLETION`의 특수화라 같은 순서대로 실행되며, 이 phase에서 기저 트랜잭션 리소스에 가한 조작은 커밋되지 않는다. 그러니 커밋 이후 리스너에서 DB에 쓰려면 새 트랜잭션을 여는 전파 설정을 따로 줘야 한다 → [[Spring-Transactional]]의 Propagation.

## 무증상 누락이 생기는 구조

한 메서드가 늘 트랜잭션 안에서만 불린다면 이 계약은 문제를 일으키지 않는다. 함정은 같은 메서드가 두 경로로 불릴 때 열린다.

| 호출 경로 | 발행 시점의 트랜잭션 | 결과 |
|---|---|---|
| 일반 흐름, 상위가 `@Transactional`로 감쌈 | 있음 | 커밋 이후로 등록되고 실행된다 |
| 운영 콘솔이나 배치가 저장 메서드를 직접 호출 | 없음 | 등록되지 않고 조용히 사라진다 |

두 경로는 같은 코드를 지나가고 같은 이벤트를 발행한다. 차이는 코드가 아니라 호출자가 트랜잭션을 열었는지라는 메서드 바깥의 문맥에 있다. 그래서 리스너 코드를 아무리 들여다봐도 원인이 보이지 않는다. 증상은 대개 사용자 문의로 먼저 도착한다.

## 평범한 `@EventListener`로 바꾸면 다른 함정에 들어간다

트랜잭션 단계를 신경 쓰지 않는 `@EventListener`로 받으면 누락은 사라진다. 대신 발행이 일어난 트랜잭션 안에서 동기로 실행되어 본 작업과 같은 트랜잭션에 합류한다.

문제는 리스너가 실패할 수 있을 때다. 부수효과가 예외를 던지면 호출부에서 예외를 삼켜 로그만 남기더라도 참여 트랜잭션은 이미 롤백 전용으로 표시된 뒤다. 표시는 남으므로 바깥에서 커밋하려는 순간 `UnexpectedRollbackException`이 발생하고, 실패한 것은 부수효과 하나인데 본 작업 전체가 뒤집힌다. 같은 메커니즘의 일반 설명은 [[Spring-Transactional]]의 rollback rule에 있다.

## 어느 쪽을 고를 것인가

기준은 옵션이 아니라 부수효과가 본 작업과 운명을 같이해야 하는지다.

| 부수효과의 성격 | 선택 | 근거 |
|---|---|---|
| 실패하면 본 작업도 되돌려야 한다 | `@EventListener` | 같은 트랜잭션에 묶여 함께 롤백된다 |
| 본 작업은 이미 확정이고 되돌리면 안 된다 | `@TransactionalEventListener(AFTER_COMMIT)` | 커밋 이후로 미뤄 본 작업을 보호한다 |

색인 갱신은 후자다. 저장은 이미 끝난 사실이고 색인이 한 박자 늦거나 재시도로 메워질지언정 저장 자체를 뒤집을 이유가 없다.

## `fallbackExecution`이 실제로 하는 일

커밋 이후 계약을 골랐다면 남은 것은 누락을 막는 일이고, 그 자리를 메우는 것이 이 속성이다.

```kotlin
@TransactionalEventListener(phase = AFTER_COMMIT, fallbackExecution = true)
fun onDocumentSaved(event: DocumentSaved) { /* 색인 갱신 */ }
```

트랜잭션이 있으면 원래대로 커밋 이후에 실행하고, 없으면 버리지 않고 발행 시점에 처리한다. 값어치는 지금 트랜잭션 밖 경로가 있다는 사실보다 나중에 생길 경로까지 미리 막는 데 있다. 배치 스크립트나 새 운영 도구가 트랜잭션 없이 같은 메서드를 부르는 순간, 이 속성이 없으면 그 경로의 부수효과는 예외도 로그도 없이 사라진다.

### 순서가 뒤집히는 위험

이 속성이 하는 일을 정확히 쓰면 누락을 막는다기보다 트랜잭션 밖 발행을 발행 스레드에서 그 자리에 처리해 버리는 것이다. 그래서 다음 상황이 성립한다.

- 오늘의 코드는 발행이 메서드의 마지막 줄이다. 아무 문제가 없다.
- 반년 뒤 누군가 발행 밑에 마무리 한 줄을 덧붙인다. 리뷰에서 걸릴 이유가 없는 평범한 순서다.
- 트랜잭션 밖 경로에서는 그 발행 줄에서 리스너가 먼저 끝까지 돌고, 그다음에 마무리 줄이 실행된다.

같은 발행 지점인데 두 경로의 실행 순서가 반대가 된다. 트랜잭션 안 경로에서는 변경이 다 끝나고 커밋까지 지난 뒤에 실행된다는 보장이 있었는데, 트랜잭션 밖 경로에서는 그 보장이 조용히 뒤집힌다. 리스너가 방금 쓴 데이터를 다시 읽거나 확정 신호를 외부로 보내는 종류라면 그대로 정합성 사고다. 이때 이 속성은 누락을 막은 것이 아니라 보이던 누락을 보이지 않는 오작동으로 바꾼 것이다.

## 리스너의 성질이 처방을 가른다

먼저 물을 것은 옵션이 아니라 이 리스너가 커밋된 상태에 의존하는지, 아니면 몇 번 실행되든 결과가 같은 멱등한 부수효과인지다.

| 리스너 성질 | 처방 | 지켜야 할 규율 |
|---|---|---|
| 멱등하고 커밋 상태에 의존하지 않음 | `fallbackExecution = true`로 누락을 막는다 | 발행을 메서드 마지막에 두어 뒤에 딸린 로직을 없애고, 멱등이며 커밋에 의존하지 않는다는 전제를 주석으로 고정한다 |
| 커밋된 결과를 읽거나 외부에 확정 신호를 보냄 | 트랜잭션 밖 발행을 누락이 아니라 규약 위반으로 본다 | 발행 직전에 트랜잭션 활성 여부를 검사해 없으면 예외로 터뜨린다 |

두 처방은 대립하지 않는다. `fallbackExecution`은 가용성(누락 방지)을 지키고, 발행 지점 검사는 정합성(위상 계약 위반의 조기 노출)을 지킨다. 갈림길은 리스너가 커밋에 의존하는지 하나다.

### 발행 지점에서 계약을 못 박기

```kotlin
check(TransactionSynchronizationManager.isActualTransactionActive()) {
    "이 이벤트는 활성 트랜잭션 안에서만 발행해야 한다"
}
publisher.publishEvent(DocumentSaved(id))
```

무증상 누락을 조용히 메우는 대신 잘못된 호출 자체를 배선 단계에서 막는다. 같은 도구를 방향만 바꿔, 이 작업은 트랜잭션 밖에서만 돌아야 한다는 제약을 거는 데도 쓸 수 있다.

## 체크포인트

- `@TransactionalEventListener`의 계약을 커밋 이후 실행이 아니라 활성 트랜잭션이 있을 때만 등록으로 설명할 수 있는가
- 같은 메서드가 두 경로로 불릴 때 왜 한쪽만 조용히 사라지는가
- `@EventListener`로 바꿨을 때 롤백 전용 표시와 `UnexpectedRollbackException`이 생기는 경로
- `fallbackExecution = true`가 누락을 막는 대신 만들 수 있는 실행 순서 역전
- 멱등 여부로 처방을 가르는 기준과, 규약 위반을 조기에 드러내는 발행 지점 검사
- `AFTER_COMMIT` 리스너에서 기저 리소스 조작이 커밋되지 않는다는 점과 그 대응

## 출처

- [Spring Framework, TransactionalEventListener](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/transaction/event/TransactionalEventListener.html)
- [Spring Framework, TransactionPhase](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/transaction/event/TransactionPhase.html)
- [Spring Framework, Transaction Management](https://docs.spring.io/spring-framework/reference/data-access/transaction.html)
- [@TransactionalEventListener는 왜 조용히 무시될까 — flex 기술 블로그 (2026-09-15)](https://flex.team/blog/2026/09/15/backend42)

## 관련 문서

- [[Spring-Transactional|Spring transaction (전파, rollback rule, proxy 경계)]]
- [[Transactional-Outbox|Transactional Outbox 패턴 (프로세스를 건너는 원자성은 다른 층)]]
- [[Event-Driven-Patterns|이벤트 주도 패턴 (프로세스 내 이벤트와 브로커 이벤트의 경계)]]
- [[Event-Driven-Architecture|이벤트 주도 아키텍처]]
- [[Spring-AOP|Spring AOP (프록시로 걸리는 선언적 배선의 한계)]]
- [[External-API-Integration-Patterns|외부 API 연동 패턴 (커밋 이후 외부 호출의 분리와 대사)]]
