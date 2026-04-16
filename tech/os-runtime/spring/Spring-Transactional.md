---
tags: [spring, transaction, propagation, isolation, aop]
status: done
category: "OS&런타임(OS&Runtime)"
aliases: ["Spring Transactional", "@Transactional", "Transaction Propagation"]
---

# Spring `@Transactional`

Spring의 선언적 트랜잭션. AOP 프록시로 감싸 **메서드 진입 시 트랜잭션 시작, 정상 종료 시 커밋, 예외 발생 시 롤백**을 자동 처리. 핵심 옵션은 **Isolation(격리수준)**, **Propagation(전파)**, **ReadOnly**, **Timeout**, **RollbackFor**. 격리수준 이론은 [[Isolation-Level|Isolation Level]] 참조, 이 문서는 Spring 고유 동작과 **Propagation**에 집중.

## AOP 프록시 기반 동작

- `@Transactional`이 붙은 빈을 찾아 **CGLIB/JDK Dynamic Proxy** 생성
- 외부에서 메서드 호출 시 프록시가 가로채 트랜잭션 시작 → 원본 호출 → 종료
- 종료 시 정상 반환이면 커밋, RuntimeException이면 롤백
- Connection·영속성 컨텍스트는 **ThreadLocal**로 전파

### 자기 호출(self-invocation) 함정

같은 객체 안에서 `this.method()`로 호출하면 **프록시를 거치지 않아** 트랜잭션이 걸리지 않는다.

```java
@Service
class OrderService {
  public void outer() {
    this.inner(); // @Transactional 미적용 — 함정
  }
  @Transactional
  public void inner() { ... }
}
```

해결:
- 별도 빈으로 분리해서 의존성 주입
- `AopContext.currentProxy()` (권장 안 함)
- 구조 변경이 정답

## 주요 옵션

### `isolation`

DB 격리수준을 트랜잭션별로 지정. 기본은 `DEFAULT`(DB 설정 따름).
- `READ_UNCOMMITTED`, `READ_COMMITTED`, `REPEATABLE_READ`, `SERIALIZABLE`
- 자세한 내용: [[Isolation-Level|Isolation Level]]

### `readOnly`

`true`로 설정하면 **쓰기 플러시를 생략**, Hibernate는 스냅샷 비교를 생략해 메모리·CPU 절약. 성능 최적화용. 실제로 DB에 "읽기 전용" 세마포어를 거는 건 아니므로 **무결성을 보장하는 수단은 아님**.

### `timeout`

초 단위. 지정 시간 내 완료 못 하면 롤백. 지연 테일 제어에 필수.

### `rollbackFor` / `noRollbackFor`

- **기본 롤백**: `RuntimeException`, `Error`
- **기본 커밋**: `Checked Exception` — 이걸 모르면 "왜 롤백 안 됨?"을 만남
- `rollbackFor = Exception.class`로 Checked도 롤백되게 할 수 있음

## Propagation (전파 옵션)

트랜잭션이 **기존 트랜잭션 안에서 호출될 때** 어떻게 처리할지 결정. 가장 Spring다운 부분이며 실무 이슈의 단골.

### 기본: `REQUIRED`

- 기존 트랜잭션 있으면 **참여**, 없으면 새로 시작
- 99% 케이스의 기본값
- 호출된 메서드에서 예외가 나면 **전체가 롤백 마킹** → 호출자가 삼켜도 커밋 실패

### `REQUIRES_NEW`

- **항상 새 트랜잭션을 시작**. 기존은 일시 중단(suspend)
- 독립된 Connection·영속성 컨텍스트
- 호출된 메서드가 롤백되어도 기존 트랜잭션은 살아남음
- **용도**: 감사 로그·알림·외부 시스템 호출처럼 **실패해도 본 작업은 커밋**되어야 할 때

```java
@Transactional
public void placeOrder() {
  repo.save(order);
  auditService.logAudit(); // REQUIRES_NEW로 실패해도 주문은 성공
}
```

### `SUPPORTS`

- 기존 트랜잭션 있으면 참여, 없으면 **비트랜잭션**으로 실행
- 조회 메서드에 간혹 쓰지만 대부분 `REQUIRED` 유지가 안전

### `MANDATORY`

- 기존 트랜잭션 **반드시** 있어야 함, 없으면 예외
- 내부 헬퍼 메서드가 단독 호출되면 안 되는 경우에 사용

### `NEVER`

- 트랜잭션 있으면 예외. 거의 안 씀

### `NOT_SUPPORTED`

- 기존 트랜잭션 suspend, 비트랜잭션으로 실행
- JPA와 함께 쓰면 영속성 컨텍스트 동작에 혼란 — 주의

### `NESTED`

- 기존 트랜잭션 안에 **savepoint**를 만들어 부분 롤백 가능
- 중첩 실패 시 savepoint까지만 롤백, 상위는 유지
- DB 드라이버가 savepoint를 지원해야 함
- JPA와의 호환성 제한적 — 실무에서는 `REQUIRES_NEW`가 더 흔한 대안

## Propagation 선택 가이드

| 시나리오 | 추천 |
|---|---|
| 일반 서비스 메서드 | `REQUIRED` (기본) |
| 감사·로그·알림(실패해도 본 작업 성공) | `REQUIRES_NEW` |
| 트랜잭션 필수 내부 메서드 | `MANDATORY` |
| 조건부 부분 롤백(DB가 savepoint 지원) | `NESTED` |

## ReadOnly 트랜잭션 활용

- 조회 전용 서비스 메서드에 `@Transactional(readOnly = true)` 권장
- Hibernate가 **Dirty Checking 스킵**·flush 생략 → 성능 향상
- **JPA 없이 순수 JDBC**라면 체감 차이 적음
- replica DB 라우팅에도 활용(AbstractRoutingDataSource) — readOnly 플래그 기반 라우팅

## 트랜잭션 경계 설계 원칙

- **서비스 레이어**에 두기 — 컨트롤러·리포지토리 레이어에 두면 경계가 흩어짐
- **짧게 유지** — 트랜잭션 안에서 외부 API 호출 금지. Connection을 오래 쥐어 풀 고갈
- **읽기 전용으로 시작 → 쓰기 필요하면 별도 메서드** — 모니터링·라우팅에 유리
- **`@Transactional` 중첩**을 남발하지 말고 **경계 메서드**에만
- **예외 전략 정렬** — 커스텀 RuntimeException 계열로 도메인 예외 설계

## 분산 트랜잭션 주의

Spring `@Transactional`은 **단일 DB 트랜잭션**만 보장. 여러 DB·메시지 큐·외부 API에 걸친 작업의 원자성은 별도 전략 필요.

- **Transactional Outbox** — DB와 이벤트 발행을 한 트랜잭션에 묶음 → [[Transactional-Outbox]]
- **Saga** — 단계별 보상 트랜잭션
- **2PC** — 이론적으론 가능하지만 성능·가용성 비용으로 기피

## 흔한 실수

- **Checked Exception은 기본 롤백 안 됨** — `rollbackFor` 지정 누락
- **자기 호출로 프록시 우회** → 트랜잭션 미적용
- **트랜잭션 안에서 외부 HTTP 호출** → 타임아웃 지연이 DB Connection을 점유
- **`@Transactional(readOnly=true)` 안에서 쓰기 시도** → Hibernate 경고, JDBC에선 통과 후 DB에서 오류
- **너무 큰 메서드를 통째로 트랜잭션화** → Lock 경합·롤백 비용↑
- **`REQUIRES_NEW` 남발** — 별도 Connection이 생기므로 풀 사용량 2배 가능
- **예외를 try-catch로 삼켜놓고 커밋 기대** → 이미 롤백 마킹되어 커밋 실패

## 면접 체크포인트

- `@Transactional`이 AOP 프록시로 동작하며 **자기 호출 시 미적용**되는 이유
- 기본 롤백은 `RuntimeException`뿐이고 **Checked Exception은 커밋**되는 점
- `REQUIRED` vs `REQUIRES_NEW`의 차이와 실무 선택
- `readOnly = true`가 주는 최적화(Dirty Checking 스킵)
- 트랜잭션 안에서 외부 API 호출이 위험한 이유
- 분산 환경에서 `@Transactional`의 한계와 Outbox/Saga

## 관련 문서
- [[Spring|Spring 개요 (IoC·DI·AOP)]]
- [[Isolation-Level|Isolation Level]]
- [[JPA-Persistence-Context|JPA 영속성 컨텍스트]]
- [[Transactional-Outbox|Transactional Outbox 패턴]]
- [[Transactions|ACID 트랜잭션]]
- [[Spring-Exception-Handling|Spring 예외 처리 전략]]
