---
tags: [spring, jpa, hibernate, persistence-context, orm, n-plus-one]
status: done
category: "OS&런타임(OS&Runtime)"
aliases: ["JPA Persistence Context", "영속성 컨텍스트", "N+1 쿼리", "Dirty Checking"]
verified_at: 2026-07-15
---

# JPA 영속성 컨텍스트, N+1

JPA의 **영속성 컨텍스트(Persistence Context)** 는 엔티티를 관리하는 **논리적 저장 공간**. 개발자가 `em.persist()`, `repository.save()`를 호출하면 객체가 이 컨텍스트에 등록되어, 1차 캐시, 쓰기 지연, Dirty Checking, 지연 로딩 같은 JPA 특성이 동작한다. ORM을 처음 배울 때 "SQL을 직접 안 쓰는 이유"의 대부분이 여기 있다.

## 엔티티 상태

| 상태 | 설명 |
|---|---|
| **Transient(비영속)** | `new` 한 객체, 컨텍스트 등록 전 |
| **Managed(영속)** | `persist()`, `find()`로 컨텍스트에 등록, 변경이 추적됨 |
| **Detached(준영속)** | 컨텍스트에서 분리(`clear`, `close`, `detach`) — 변경 추적 안 됨 |
| **Removed(삭제)** | `remove()` 호출, flush 시 DELETE 발행 |

## 영속성 컨텍스트의 4가지 이점

### 1. 1차 캐시 (동일성 보장)

같은 트랜잭션 안에서 **같은 ID로 조회하면 동일 객체 반환**. DB 재조회 없음.

```java
User a = em.find(User.class, 1L); // SELECT
User b = em.find(User.class, 1L); // 캐시 히트
assert a == b; // 동일성 보장
```

- 단일 트랜잭션 범위 캐시(분산 캐시 아님)
- `==` 비교가 성립하는 환경이 생김 — equals/hashCode 설계의 특수성

### 2. 쓰기 지연 (Write-Behind)

JPA는 변경 내용을 영속성 컨텍스트에 모아두었다가 **flush 시점에** SQL로 동기화한다. 다만 `merge()`는 기존 엔티티 조회를 유발할 수 있고, `IDENTITY` 키 전략의 `persist()`는 ID 확보를 위해 INSERT가 빨리 나갈 수 있다.

- flush는 커밋 직전, `em.flush()` 명시 호출, JPQL 실행 전에 자동
- 같은 트랜잭션의 여러 변경을 모아 **배치 insert/update** 가능(`hibernate.jdbc.batch_size`)
- 즉시 검증이 필요한 경우 flush를 강제

### 3. Dirty Checking (변경 감지)

영속 상태 객체의 **필드를 바꾸면 자동으로 UPDATE**가 발행된다. 별도로 `save`를 호출하지 않아도 됨.

```java
User user = em.find(User.class, 1L);
user.setName("Alice"); // UPDATE 자동 발행 (flush 시)
```

- JPA가 **스냅샷과 현재 상태를 비교**하여 변경 여부를 감지한다. Hibernate 기본 UPDATE는 여러 컬럼을 포함할 수 있고, 변경 컬럼만 UPDATE하려면 `@DynamicUpdate` 같은 설정이 필요하다.
- 변경이 없다면 UPDATE는 아예 발행되지 않음
- Detached 객체는 감지 안 되므로 `merge()`로 재영속화 필요

### 4. 지연 로딩 (Lazy Loading)

연관 로딩 전략은 매핑마다 다르다. Jakarta Persistence 3.x 기본값은 `@ManyToOne`, `@OneToOne`이 `EAGER`, `@OneToMany`, `@ManyToMany`가 `LAZY`다. 지연 로딩이 필요하면 아래처럼 `fetch = FetchType.LAZY`를 명시하고 실제 쿼리 계획을 확인한다.

```java
@Entity
class Order {
  @ManyToOne(fetch = FetchType.LAZY)
  private User user;
}

Order o = em.find(Order.class, 1L); // Order만 조회
o.getUser().getName();               // 이때 User SELECT 발행
```

- Hibernate는 **프록시 객체**로 지연 필드를 채움
- 트랜잭션 밖에서 접근하면 **LazyInitializationException**
- OSIV(Open Session in View) 설정으로 뷰까지 열어두면 회피 가능(성능 trade-off 있음)

## 1차 캐시 vs 2차 캐시

| 구분 | 1차 캐시 | 2차 캐시 |
|---|---|---|
| 범위 | 트랜잭션(세션) | 애플리케이션 전역 |
| 기본 제공 | ✓ | 설정 필요(EhCache, Redis) |
| 일관성 | 자동 | 캐시 무효화 전략 직접 관리 |
| 용도 | JPA 기본 동작 | 읽기 비중 높은 테이블 |

## N+1 쿼리 문제

ORM 입문자가 가장 많이 마주치는 성능 함정. 연관 엔티티를 지연 로딩으로 설정했는데 **컬렉션을 순회하며 각 요소마다 추가 쿼리가 발생**하는 현상.

### 발생 시나리오

```java
List<Order> orders = orderRepo.findAll();   // 1번: SELECT * FROM orders (N건)
for (Order o : orders) {
  System.out.println(o.getUser().getName()); // 각 Order당 SELECT * FROM users (N번)
}
// 총 1 + N번 쿼리
```

### 원인

- 위 예시처럼 연관을 **지연 로딩으로 설정**하면 `orders`를 가져올 때 `user`는 프록시
- 루프 안에서 `getUser()` 호출할 때마다 개별 SELECT
- 즉시 로딩(`FetchType.EAGER`)도 JPQL에서는 N+1 가능 → 근본 해결 안 됨

### 해결 1 — Fetch Join

JPQL 레벨에서 **한 번의 JOIN으로 연관 엔티티까지** 조회.

```java
@Query("SELECT o FROM Order o JOIN FETCH o.user")
List<Order> findAllWithUser();
```

- 단일 SQL로 해결, 가장 직관적
- **컬렉션 fetch join은 페이징 불가** (Hibernate 경고 + 메모리 페이징으로 전환 → 위험)

### 해결 2 — `@EntityGraph`

메서드 단위로 fetch 그래프 선언.

```java
@EntityGraph(attributePaths = "user")
List<Order> findAll();
```

- Fetch Join과 유사하지만 선언적
- 페이징, 여러 연관 동시 로드에 더 편함

### 해결 3 — Batch Size

`@BatchSize(size = 100)` 또는 `hibernate.default_batch_fetch_size = 100`.
- N+1 대신 **N/100 + 1 쿼리** (`IN (...)` 절 묶어서)
- 완벽하진 않지만 광범위 대응
- 페이징과 함께 가능

### 해결 4 — Projection DTO

애초에 엔티티를 꺼내지 않고 **필요한 컬럼만 DTO로** 조회.

```java
@Query("SELECT new com.x.OrderDto(o.id, u.name) FROM Order o JOIN o.user u")
List<OrderDto> findAllDto();
```

- 읽기 전용 화면에서 가장 빠름
- 영속성 컨텍스트 오염 없음

## OSIV (Open Session In View)

Spring Boot 기본 `true`. **영속성 컨텍스트를 HTTP 응답 반환까지** 열어둠 → 뷰 템플릿에서도 지연 로딩 접근 가능.

**단점**:
- DB 커넥션을 오래 쥠 → 고부하 시 커넥션 고갈
- 트랜잭션 경계 밖에서 지연 로딩이 발생해 DB 접근 위치가 흐려지고, 엔티티 변경 의도가 서비스 레이어 밖으로 새기 쉬움

**권장**: 성능 중시 서비스는 `spring.jpa.open-in-view=false`로 끄고, 서비스 레이어 내에서 필요한 모든 데이터를 DTO로 말아서 반환.

## 트랜잭션과 영속성 컨텍스트의 생명주기

- Spring에서는 보통 트랜잭션 범위의 `EntityManager`가 현재 스레드에 바인딩되고, 그 안에서 영속성 컨텍스트가 공유된다.
- `@Transactional` 메서드 진입 시 컨텍스트가 준비되고, 정상 종료 시 flush 후 트랜잭션 commit. OSIV가 켜져 있으면 컨텍스트 생명주기가 HTTP 응답까지 늘어날 수 있다.
- 여러 메서드에 걸친 작업은 같은 트랜잭션으로 묶어야 동일 컨텍스트 공유
- `@Transactional(propagation = REQUIRES_NEW)`는 **별도 컨텍스트** 생성 → 주의

## 흔한 실수

- **엔티티를 그대로 응답** → 직렬화 순간 지연 로딩 발동, 무한 순환, LazyInitializationException. **[[DTO-Layering|DTO 변환]]** 필수
- **`findById + save` 반복** — Dirty Checking을 모르고 명시적 save. 이미 영속 상태면 `save` 불필요
- **`@Transactional` 없이 Lazy 접근** → 예외. 서비스 레이어 바깥에서 지연 로딩하지 말 것
- **컬렉션 Fetch Join + 페이징** → 경고, 메모리 페이징. `@EntityGraph` + BatchSize로 대체
- **`EAGER`로 N+1 회피 시도** → JPQL에서는 여전히 N+1. 그리고 불필요 조인으로 성능 악화
- **OSIV 켜둔 채 장시간 뷰 렌더링** → 커넥션 고갈

## 면접 체크포인트

- 영속성 컨텍스트의 4가지 이점(1차 캐시, 쓰기 지연, Dirty Checking, 지연 로딩)
- Dirty Checking이 동작하는 조건(영속 상태 + 트랜잭션)
- N+1이 발생하는 근본 원인(지연 로딩 + 컬렉션 순회)
- Fetch Join과 `@EntityGraph`의 차이, 한계
- OSIV의 편의와 위험
- "엔티티를 응답으로 반환하면 안 되는 이유"의 JPA 관점 설명

## 출처

- [ManyToOne annotation — Jakarta Persistence 공식 API](https://jakarta.ee/specifications/persistence/3.0/apidocs/jakarta.persistence/jakarta/persistence/manytoone)
- [Jakarta Persistence explained — Jakarta EE 공식 가이드](https://jakarta.ee/learn/specification-guides/persistence-explained/)

## 관련 문서
- [[Spring|Spring 개요]]
- [[Spring-Transactional|Spring @Transactional (Isolation, Propagation)]]
- [[ORM|ORM]]
- [[ORM-Impedance-Mismatch|ORM과 임피던스 불일치]]
- [[DTO-Layering|DTO 레이어 스코프]]
- [[Isolation-Level|Isolation Level]]
- [[Index|Index 기본]]
