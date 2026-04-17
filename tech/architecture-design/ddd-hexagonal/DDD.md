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

## Strategic Design — 경계·언어·맥락

DDD는 크게 **Strategic Design**(거시적 경계 분할)과 **Tactical Design**(구체 구현 패턴)으로 나뉜다. MSA 전환·조직 확대 국면에서는 Strategic Design이 먼저다.

### Ubiquitous Language — 공통 언어

도메인 전문가·개발자·아키텍트가 **같은 용어**를 같은 의미로 사용하는 것. 번역 과정이 없으므로 요구사항 왜곡이 줄어든다.

- "주문"이 누구에게는 "장바구니 확정"이고 누구에게는 "결제 완료"면 버그의 원천
- 코드의 클래스·메서드·DB 컬럼명까지 **이 언어와 일치**해야 함
- 용어집(Glossary)·도메인 모델 다이어그램을 팀이 같이 유지

### Bounded Context — 맥락 경계

"같은 단어가 다른 의미"인 구간을 **별도 맥락**으로 분리. 한 맥락 안에서는 언어와 모델이 일관되지만, 다른 맥락에서는 같은 용어가 다른 모델을 가진다.

- 전자상거래 예: `Product`가 상품 카탈로그 맥락에서는 "판매 가능한 물건", 창고 맥락에서는 "재고 단위·위치", 배송 맥락에서는 "운송 대상"
- **MSA 서비스 경계**의 강력한 후보 — 바운디드 컨텍스트가 마이크로서비스 후보
- 경계가 무너지면 한 변경이 모든 맥락에 번짐

### Context Map — 맥락 간 관계

여러 Bounded Context가 어떻게 연결·통합되는지 그림으로 표현.

- **Partnership**: 양쪽이 같이 성공·실패하는 강한 협력 관계
- **Shared Kernel**: 두 맥락이 공유하는 작은 모델 (공용 코드·테이블)
- **Customer-Supplier**: 상류(supplier)가 변경을 통제, 하류(customer)가 의존
- **Conformist**: 하류가 상류 모델을 그대로 따를 수밖에 없는 관계
- **Anti-Corruption Layer**: 외부 모델을 내 도메인 언어로 번역하는 어댑터
- **Published Language**: 여러 컨텍스트가 공유하는 공식 스키마 (JSON·Protobuf)

## Tactical Design — 구체 구현 패턴

Strategic으로 그려낸 각 Bounded Context **내부를 구현**하는 도구들.

- **Entity·Value Object**: 식별자 기반 vs 값 기반
- **Aggregate·Aggregate Root**: 트랜잭션 경계
- **Repository**: Aggregate 단위 영속성 추상화
- **Domain Service**: Aggregate에 속하지 않는 도메인 규칙
- **Domain Event**: 도메인 내부에서 일어난 사실
- **Factory**: 복잡한 Aggregate 생성 책임 분리

Tactical은 Strategic이 없으면 의미가 축소된다. **큰 경계 없이 내부 패턴만** 적용하면 빈약한 도메인 모델·거대 Aggregate 같은 안티패턴으로 회귀하기 쉽다.

## 관련 문서
- [[DDD-Hexagonal-In-Production|DDD + Hexagonal 실무 경험 (부릉 7년)]]
- [[Hexagonal-In-Practice|Hexagonal 실전 적용]]
- [[OOP|OOP / SOLID]]
- [[VO-DTO]]
- [[Layered-Clean-Hexagonal|Layered / Clean / Hexagonal]]
- [[Monolith-vs-Microservice|Monolith vs Microservice]]
