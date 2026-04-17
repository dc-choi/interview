---
tags: [architecture, ddd]
status: done
category: "아키텍처&설계(Architecture&Design)"
aliases: ["DDD", "Domain-Driven Design"]
---

# DDD (Domain-Driven Design)

## MVC의 한계

- 서비스 레이어가 무의미해지고 레포지토리가 비대해짐
- 도메인 모델이 아무것도 하지 않음 (빈약한 도메인 모델)
- 어플리케이션 서비스에 너무 많은 책임이 들어감 (트랜잭션 스크립트 패턴)

## Aggregate

데이터 집합체(여러 엔티티나 VO)이며, **함께 변경되어야 하는 것의 경계**이다.

- 소유와 참조가 구분되는 경계
- 너무 크게 설계하면 안 됨
- 소유가 아니라면 id만 가질 수 있음

## DAO vs Repository

| 구분 | DAO | Repository |
|---|---|---|
| 사고방식 | 데이터 중심 | 도메인 중심 |
| 접근 범위 | 데이터의 경계 없이 자유롭게 CRUD | Aggregate를 조회/변경 |

## CQRS (Command Query Responsibility Segregation)

명령과 조회의 분리. 논리부터 물리까지 분리 가능하다.

- 서비스의 메서드를 클래스 핸들러로 분리
- 복잡한 서비스를 **커맨드 핸들러**로 나눠서 분리
- 비즈니스가 복잡하지 않은 경우 컨트롤러에서 바로 핸들러로 조회해도 됨

## 도메인 서비스

Aggregate가 소유하기 애매한 경우 도메인 서비스를 둔다.

**도메인 서비스 후보:**
- 둘 이상의 Aggregate를 동시에 다루는 경우
- 도메인 규칙이지만 상태를 가지지 않는 경우
- 외부 API와 연동이 필요한 경우

**도메인 서비스가 아닌 경우:**
- 상태를 저장하는 경우
- 사이드이펙트가 발생하는 경우

## 엔티티 매핑

인프라 엔티티와 도메인 엔티티를 그대로 쓰면 도메인과 인프라 관심사가 섞인다.
**수동 매핑**을 통해 관심사를 분리할 수 있다.

## 비즈니스 모델링 우선

잘못된 접근: 기술부터 시작하는 것
- "어떤 DB를 쓸지", "어떤 프레임워크를 쓸지"부터 고민

올바른 접근: 비즈니스 질문부터
- "주문이란 정확히 무엇인지?"
- "고객이 주문을 어떻게 취소할 수 있는지?"

**기술 결정을 미루고 비즈니스 로직을 검증하는 것이 먼저다.**
정확한 비즈니스 이해가 견고한 시스템을 만든다.

## 관련 문서
- [[DDD-Hexagonal-In-Production|DDD + Hexagonal 실무 경험 (부릉 7년)]]
- [[Hexagonal-In-Practice|Hexagonal 실전 적용]]
- [[OOP|OOP / SOLID]]
- [[VO-DTO]]
- [[Layered-Clean-Hexagonal|Layered / Clean / Hexagonal]]
- [[Monolith-vs-Microservice|Monolith vs Microservice]]
