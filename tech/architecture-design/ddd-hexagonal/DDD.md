---
tags: [architecture, ddd]
status: done
category: "아키텍처&설계(Architecture&Design)"
aliases: ["DDD", "Domain-Driven Design"]
---

# DDD (Domain-Driven Design)

## 데이터 중심 계층 구조의 한계

MVC는 UI의 역할 분리 패턴이므로 아래 문제가 MVC 자체에서 필연적으로 생기는 것은 아니다. 업무 규칙이 복잡해졌는데 단순 데이터 전달과 절차 나열에 머물 때 나타나는 문제다. 단순한 업무에는 트랜잭션 스크립트도 유효하다.

- 서비스 레이어가 무의미해지고 레포지토리가 비대해짐
- 도메인 모델이 아무것도 하지 않음 (빈약한 도메인 모델)
- 어플리케이션 서비스에 너무 많은 책임이 들어감 (트랜잭션 스크립트 패턴)

## Aggregate

데이터 집합체(여러 엔티티나 VO)이며, **함께 변경되어야 하는 것의 경계**이다.

- 소유와 참조가 구분되는 경계
- 너무 크게 설계하면 안 됨
- 다른 Aggregate와 하나의 일관성 경계를 만들지 않는다. ID 참조가 안전한 기본값이지만, 모델 표현력이 더 중요하고 로딩/트랜잭션 결합을 통제할 수 있다면 객체 참조도 선택할 수 있다.

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
- 암호 비교처럼 도메인이 이름 붙인 능력이지만 특정 Entity/VO에 둘 수 없는 경우. 기술 구현은 required port 뒤의 adapter가 맡을 수 있다.

**도메인 서비스가 아닌 경우:**
- 유스케이스 순서, 트랜잭션, 외부 I/O를 조율하는 경우. 이는 application service의 책임이다.
- 서비스 자체가 변경 가능한 비즈니스 상태를 저장하는 경우

## 엔티티 매핑

도메인 모델과 ORM 엔티티는 통합하거나 분리할 수 있다. JPA처럼 영속 도메인 객체를 지원하고 두 모델의 구조가 비슷하면 하나의 클래스로도 풍부한 도메인 모델을 만들 수 있다. 저장 구조와 도메인 언어의 간극이 크면 별도 persistence 모델과 수동 Mapper가 유리하다. 판단 기준은 [[Domain-ORM-Mapper|도메인 모델과 ORM 모델 통합/분리]]에서 다룬다.

## 비즈니스 모델링 우선

잘못된 접근: 기술부터 시작하는 것
- "어떤 DB를 쓸지", "어떤 프레임워크를 쓸지"부터 고민

올바른 접근: 비즈니스 질문부터
- "주문이란 정확히 무엇인지?"
- "고객이 주문을 어떻게 취소할 수 있는지?"

**기술 결정을 미루고 비즈니스 로직을 검증하는 것이 먼저다.**
정확한 비즈니스 이해가 견고한 시스템을 만든다.

## Strategic Design — 경계, 언어, 맥락

DDD는 크게 **Strategic Design**(거시적 경계 분할)과 **Tactical Design**(구체 구현 패턴)으로 나뉜다. MSA 전환, 조직 확대 국면에서는 Strategic Design이 먼저다.

### Ubiquitous Language — 공통 언어

도메인 전문가, 개발자, 아키텍트가 **같은 용어**를 같은 의미로 사용하는 것. 번역 과정이 없으므로 요구사항 왜곡이 줄어든다.

- "주문"이 누구에게는 "장바구니 확정"이고 누구에게는 "결제 완료"면 버그의 원천
- 코드의 클래스, 메서드, DB 컬럼명까지 **이 언어와 일치**해야 함
- 용어집(Glossary), 도메인 모델 다이어그램을 팀이 같이 유지

### Bounded Context — 맥락 경계

"같은 단어가 다른 의미"인 구간을 **별도 맥락**으로 분리. 한 맥락 안에서는 언어와 모델이 일관되지만, 다른 맥락에서는 같은 용어가 다른 모델을 가진다.

- 전자상거래 예: `Product`가 상품 카탈로그 맥락에서는 "판매 가능한 물건", 창고 맥락에서는 "재고 단위, 위치", 배송 맥락에서는 "운송 대상"
- **MSA 서비스 경계**의 강력한 후보 — 바운디드 컨텍스트가 마이크로서비스 후보
- 경계가 무너지면 한 변경이 모든 맥락에 번짐

### Context Map — 맥락 간 관계

여러 Bounded Context가 어떻게 연결, 통합되는지 그림으로 표현.

- **Partnership**: 양쪽이 같이 성공, 실패하는 강한 협력 관계
- **Shared Kernel**: 두 맥락이 공유하는 작은 모델 (공용 코드, 테이블)
- **Customer-Supplier**: 상류(supplier)가 변경을 통제, 하류(customer)가 의존
- **Conformist**: 하류가 상류 모델을 그대로 따를 수밖에 없는 관계
- **Anti-Corruption Layer**: 외부 모델을 내 도메인 언어로 번역하는 어댑터
- **Published Language**: 여러 컨텍스트가 공유하는 공식 스키마 (JSON, Protobuf)

## Tactical Design — 구체 구현 패턴

Strategic으로 그려낸 각 Bounded Context **내부를 구현**하는 도구들.

- **Entity, Value Object**: 식별자 기반 vs 값 기반
- **Aggregate, Aggregate Root**: 트랜잭션 경계
- **Repository**: Aggregate 단위 영속성 추상화
- **Domain Service**: Aggregate에 속하지 않는 도메인 규칙
- **Domain Event**: 도메인 내부에서 일어난 사실
- **Factory**: 복잡한 Aggregate 생성 책임 분리

Tactical은 Strategic이 없으면 의미가 축소된다. **큰 경계 없이 내부 패턴만** 적용하면 빈약한 도메인 모델, 거대 Aggregate 같은 안티패턴으로 회귀하기 쉽다.

## 관련 문서

- [[DDD-Hexagonal-In-Production|DDD + Hexagonal 실무 경험 (부릉 7년)]]
- [[Hexagonal-In-Practice|Hexagonal 실전 적용]]
- [[OOP|OOP / SOLID]]
- [[VO-DTO]]
- [[Layered-Clean-Hexagonal|Layered / Clean / Hexagonal]]
- [[Monolith-vs-Microservice|Monolith vs Microservice]]

## 모델을 발전시키는 절차

도메인 모델은 그림 자체가 아니라 참여자가 공유하는 개념, 관계와 규칙이다. 업무 담당자와 실제 사례를 듣고, 핵심 용어와 관계를 찾고, 각 개념의 행위와 제약을 적은 뒤 그림과 코드로 검증한다. 도메인 전문가가 따로 없다면 기획자, 창업자와 사용자의 경험을 가설로 삼고 실제 사용과 피드백으로 수정한다. 경쟁 서비스는 참고 사례이며 우리 규칙의 정답은 아니다.

용어집, 간단한 모델 문서와 코드를 함께 유지한다. 등록과 활성화처럼 다른 상태 전이를 같은 말로 뭉개지 않는다. 기능 변경 뒤 문서의 규칙을 코드와 테스트에 대조하고, AI가 찾은 차이도 실제 구현을 확인한 뒤 반영한다.

## 변경 경계와 생명주기 규칙

Aggregate Root를 통해 내부 엔티티를 변경하고, 저장도 루트를 기준으로 다룬다. 내부 엔티티마다 Repository를 열면 불변식을 우회하기 쉽다. 읽기 전용 프로젝션은 변경 모델과 다른 형태로 조회할 수 있다. 하나의 경계 안에서 보장할 규칙과 다른 Aggregate 사이에서 조정할 규칙을 구분한다.

주문과 주문 항목의 합계처럼 함께 맞아야 하는 규칙은 같은 경계의 후보지만, 외형상 소속 관계만으로 모두 묶지는 않는다. 교육 서비스에서 강의 소개와 섹션/수업 편집이 별도로 변한다면 커리큘럼이라는 개념을 찾아 별도 Aggregate로 나눌 수 있다. 수강도 회원과 강의 사이의 단순 연결을 넘어 상태와 진도를 가진 독립 개념이 된다.

직접 객체 참조는 단일 프로세스 ORM 모델에서 탐색을 읽기 쉽게 할 수 있다. 이때 다른 Aggregate의 상태를 탐색 중 변경하지 않고, 로딩 비용과 순환을 통제한다. 분산 경계와 비동기 메시지에는 ID 참조가 적합하다. `ensureActive()` 같은 읽기 검사도 검사 직후 다른 트랜잭션이 상태를 바꿀 수 있으므로 참조 방식만으로 교차 Aggregate 동시성이 해결되지는 않는다.

상태는 이름 있는 전이 메서드로 바꾸고 허용된 선행 상태를 확인한다. 항상 참이어야 하는 불변식과 공개 직전에만 필요한 완결성 조건을 구분한다. 초안은 소개나 수업이 비어 있어도 편집할 수 있지만 검수와 공개 전에는 갖춰야 한다. 생성부터 모든 공개 조건을 강제하면 정상적인 작성 흐름이 막힌다.

## 검증과 협력의 책임

자기 상태의 규칙은 도메인이, 저장소 조회와 유스케이스 순서는 애플리케이션 서비스가 맡는다. 수정 시 중복 검사는 자기 자신을 제외해야 하고, 선조회만으로 동시 요청의 중복을 막을 수 없으므로 DB 제약도 둔다. 사용자가 고칠 오류, 업무 충돌, 프로그래밍 오류를 구분하되 클라이언트가 미리 조회했다는 이유만으로 경합에 따른 중복 요청을 프로그램 오류로 단정하지 않는다.

엔티티가 도메인 서비스를 필요로 한다면 필요한 행위나 이름 있는 정적 팩토리의 인자로 받을 수 있다. 예를 들어 비밀번호 검증 능력의 계약은 도메인 언어로 표현하고 구체 해시 구현은 외부에 둔다. 엔티티를 Spring Bean처럼 필드 주입 대상으로 만들 필요는 없다. 테스트 대역은 도메인 협력을 확인하고, 실제 보안 구현은 별도로 검증한다.

참고: [Fowler, Anemic Domain Model](https://martinfowler.com/bliki/AnemicDomainModel.html), [Model View Controller](https://martinfowler.com/eaaCatalog/modelViewController.html).

## 강의 참고

- [도메인 모델과 DDD](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=290149)
- [Splearn 도메인 모델 만들기 (1)](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=290151)
- [Splearn 도메인 모델 만들기 (2)](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=290759)
- [Splearn 도메인 모델 만들기 (3)](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=290891)
- [회원 애플리케이션의 포트 정의](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=301409)
- [헥사고날 아키텍처의 사실과 오해 (2)](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=300707)
- [회원 상세 정보 도메인 모델](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=313061)
- [애그리거트와 헥사고날 아키텍처](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=313062)
- [Member 애플리케이션 추가 기능 개발](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=313421)
- [문서와 코드 다듬기](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=313422)
- [회원 도메인 모델 작성](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=290154)
- [엔티티 클래스와 JPA 매핑 정보 분리](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=312327)
- [아키텍처 개념 과 레이어드 아키텍처](https://www.inflearn.com/courses/lecture?courseId=328412&unitId=104421)
- [비지니스로직은 어디에? - 레이어드 아키텍처](https://www.inflearn.com/courses/lecture?courseId=328412&unitId=105077)
- [강사 도메인 설계](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=454901)
- [애그리거트와 컴포넌트 연결](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=454902)
- [ArchUnit을 이용한 슬라이스 의존 관계 검증](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=461995)
- [강의 도메인 개발 (1)](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=464142)
- [Part 2 강의 정리와 AI 시대의 클린 스프링](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=472191)
- [강사 도메인 개발](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=454903)
- [강의 도메인 설계](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=463719)
- [강의 도메인 개발 (2)](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=464143)
- [수강 도메인 설계와 개발](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=466444)
- [커리큘럼 도메인 설계](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=470527)
- [커리큘럼 도메인 개발 (3)](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=470530)
- [코드 리뷰와 개선 리팩터링](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=471512)
- [강의 애플리케이션 서비스 개발 (1)](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=465195)
- [커리큘럼 도메인 개발 (2)](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=470529)
- [커리큘럼 도메인 개발 (4)](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=470531)
- [회원 인증 포트 개발](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=453034)
- [개발 가이드 업데이트](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=453817)
- [강사 애플리케이션 서비스 개발](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=457085)
- [코드 리뷰와 수정](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=457195)
- [강의 애플리케이션 서비스 개발 (2)](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=466440)
- [강의 애플리케이션 서비스 개발 (3)](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=466441)
- [강의 애플리케이션 서비스 개발 (4)](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=466442)
- [수강 애플리케이션 서비스 개발 (1)](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=467531)
- [수강 애플리케이션 서비스 개발 (2)](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=467534)
- [도메인 모델 문서 업데이트](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=443356)

- [토비 강사 — 애그리거트와 JPA](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=313420)
- [토비 강사 — PasswordEncoder 도메인 서비스](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=291136)
- [토비 강사 — 애그리거트와 애플리케이션 컴포넌트 의존 관계](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=458026)
- [토비 강사 — 커리큘럼 도메인 모델](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=470526)
