---
tags: [jpa, spring-boot, osiv, transaction, connection-pool]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["JPA OSIV", "Open EntityManager in View"]
---

# JPA OSIV와 transaction 경계

OSIV(Open EntityManager in View)는 web request 동안 `EntityManager`와 persistence context를 열어 transaction 밖의 controller/view에서도 lazy loading이 가능하게 하는 패턴이다. 편의 기능이지 transaction을 request 전체로 자동 확장하는 기능은 아니다.

## Persistence context와 connection을 구분한다

OSIV가 유지하는 것은 `EntityManager`이지 물리 DB connection 자체가 아니다. 현재 Hibernate의 resource-local 기본 모드는 connection을 필요할 때 얻고 transaction 종료 뒤 반환한다. 따라서 OSIV가 켜졌다는 이유만으로 connection이 request 시작부터 응답 끝까지 항상 고정된다고 설명하면 틀리다.

Transaction coordinator, `hibernate.connection.handling_mode`, user-provided connection과 transaction 밖 lazy SQL에 따라 획득과 반환 시점은 달라진다. OSIV가 허용한 암묵적 lazy query는 추가 checkout과 직렬 query를 만들고, hold 계열 모드나 긴 transaction과 결합하면 pool 점유를 늘릴 수 있다. 실제 checkout 시간을 관측한다.

Transaction이 끝난 뒤 OSIV persistence context에서 lazy load를 실행하는 것은 새 SQL을 허용하지만 이미 끝난 business transaction과 같은 atomic 작업은 아니다. Serializer가 어느 query를 실행할지 암묵적으로 결정하게 두면 성능과 일관성 경계가 흐려진다.

## ON과 OFF 비교

| 선택 | 이점 | 비용 | 맞는 조건 |
|---|---|---|---|
| OSIV ON | Controller/view에서 lazy load 가능 | 암묵 query, 추가 checkout, transaction 밖 읽기 | 낮은 traffic의 내부 UI 등에서 위험을 수용할 때 |
| OSIV OFF | Transaction과 SQL 경계가 선명, 빠른 connection 반환 | 필요한 graph와 DTO를 미리 조립 | API 서버의 안전한 기본값 |

Spring Boot 4.1 web application은 기본적으로 `OpenEntityManagerInViewInterceptor`를 등록한다. 끄려면 의도를 설정에 명시한다.

```properties
spring.jpa.open-in-view=false
```

## OFF에서의 조회 구조

1. Application/query service의 read-only transaction을 연다.
2. Fetch join, entity graph, batch fetch 또는 DTO projection으로 필요한 graph를 읽는다.
3. Transaction 안에서 response DTO를 완성한다.
4. Controller는 완성된 DTO만 직렬화한다.

```java
@Transactional(readOnly = true)
public OrderDetail getOrder(long id) {
    Order order = orderRepository.findDetail(id).orElseThrow();
    return OrderDetail.from(order);
}
```

Transaction 밖에서 초기화되지 않은 proxy/collection에 접근하면 `LazyInitializationException`이 발생할 수 있다. 예외를 피하려고 모든 관계를 EAGER로 바꾸거나 write transaction을 HTTP 응답 끝까지 늘리지 않는다. 필요한 조회를 use case별로 명시한다.

## Command와 query를 분리한다

복잡한 화면 조회는 핵심 write service와 별도 query service/repository로 둘 수 있다. 이는 읽기와 쓰기의 모델, 저장소까지 완전히 분리하는 CQRS를 반드시 뜻하지 않는다. 우선 목적은 transaction과 fetch plan의 책임을 분명히 하는 것이다.

- Command service는 불변조건, 변경과 write transaction에 집중한다.
- Query service는 endpoint별 DTO와 조회 최적화에 집중한다.
- Query별 SQL과 integration test를 가까이 둔다.
- 공통 entity repository에 모든 화면 조합을 누적하지 않는다.

## 운영 판단

OSIV 선택은 traffic 규모만으로 끝나지 않는다. Request duration, transaction duration, connection checkout 시간과 pool 대기를 함께 관측한다. OSIV를 켠 내부 도구도 느린 외부 호출과 lazy serialization이 있으면 pool을 고갈시킬 수 있다. 설정값, 기대 query 경계와 회귀 test를 architecture decision에 남긴다.

## 출처

- [Spring Boot 4.1, Open EntityManager in View](https://docs.spring.io/spring-boot/reference/data/sql.html#data.sql.jpa-and-spring-data.open-entity-manager-in-view)
- [Hibernate ORM current User Guide, Connection handling](https://docs.hibernate.org/stable/orm/userguide/html_single/#database-connection-handling)
- 강의: [OSIV와 성능 최적화](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24339)

## 관련 문서

- [[JPA-API-Performance|JPA API 조회 성능]]
- [[JPA-API-DTO-Boundary|JPA DTO와 API 경계]]
- [[JPA-Persistence-Context|JPA 영속성 컨텍스트]]
- [[Spring-Transactional|Spring @Transactional]]
