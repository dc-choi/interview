---
tags: [architecture, clean-architecture]
status: done
category: "아키텍처&설계(Architecture&Design)"
aliases: ["Layered / Clean / Hexagonal", "클린 아키텍처", "계층 아키텍처"]
---

# Layered / Clean / Hexagonal Architecture

비즈니스 로직을 외부 기술(DB, 프레임워크, UI)로부터 분리하는 아키텍처 패턴들이다. 핵심 목표는 동일하다: **의존성이 안쪽(비즈니스)을 향하도록 만든다.**

## Layered Architecture (계층 아키텍처)

가장 전통적인 구조. 상위 레이어가 하위 레이어에만 의존한다.

**계층 구조:**
- Presentation → Application → Domain → Infrastructure

**문제점:**
- Infrastructure가 최하단이라 Domain이 Infrastructure에 의존하게 되는 경향
- 레이어 간 순환 의존이 발생하기 쉬움
- "모든 것이 서비스 레이어에 몰리는" 문제 (Fat Service)

## Clean Architecture (클린 아키텍처)

Robert C. Martin(Uncle Bob)이 제안. **의존성 규칙(Dependency Rule)**이 핵심이다.

**동심원 구조 (안쪽 → 바깥):**
1. **Entities** — 비즈니스 규칙, 어떤 프레임워크에도 의존하지 않음
2. **Use Cases** — 애플리케이션 고유 비즈니스 규칙
3. **Interface Adapters** — 컨트롤러, 프레젠터, 게이트웨이
4. **Frameworks & Drivers** — DB, 웹 프레임워크, 외부 API

**의존성 규칙:** 바깥 원은 안쪽 원에 의존할 수 있지만, 안쪽 원은 바깥 원을 모른다.

### 왜 "DB가 중심"이면 안 되는가

레이어드 아키텍처의 가장 큰 함정은 **DB가 사실상 최상위 중심**이 되는 것. 원칙은 "Presentation → Business → Data"지만 실제로는:

- ORM의 엔티티 = 도메인 엔티티로 혼용됨 → 비즈니스 로직이 DB 스키마에 묶임
- DB 컬럼이 바뀌면 도메인·UseCase·컨트롤러까지 영향
- "도메인"이라는 이름을 가진 클래스가 실제로는 **DB row의 OOP 표현**에 불과

Clean Architecture는 이를 뒤집는다: **도메인이 중심, DB는 바깥 메커니즘**. 도메인 정의가 먼저 서고, Repository 인터페이스가 도메인이 원하는 형태를 정의, JPA·MongoDB 등은 이 인터페이스의 **구현 세부**일 뿐.

### 경계(Boundary)와 의존성 역전

안→바깥 의존은 어떻게 막는가? **Use Case 입력·출력 포트**로 역전시킨다.

```
Controller → [InputPort]  ← UseCase (구현)
UseCase    → [OutputPort] ← RepositoryAdapter (구현)
```

- `InputPort`·`OutputPort`는 **안쪽(UseCase)에 정의**된 인터페이스
- 바깥 계층(Controller·Repository)은 이 인터페이스를 **구현**하거나 **호출**
- 컴파일 방향은 바깥 → 안쪽, 하지만 **런타임 호출은 양방향** 가능

### 인터페이스 설계 — ISP 관점

- **클라이언트 필요 중심**: 인터페이스는 **구현이 아닌 호출자 관점**에서 설계. 한 서비스가 여러 클라이언트를 모두 만족시키려 하면 **비대해진 인터페이스**가 됨
- **구현 디테일 노출 금지**: 인터페이스 이름이 `JpaUserRepository`가 아니라 `UserRepository`. JPA는 구현의 선택
- **파라미터 vs 전체 객체**: 단순 값이면 개별 파라미터, 속성 진화가 예상되면 객체로

### DTO 중복은 "Accidental Duplication"

계층마다 DTO/VO를 따로 두는 것은 **진짜 중복이 아니라 우연적 중복**. 같은 이름이어도:

- Create DTO: 사용자 입력 검증용 (필수·선택 필드)
- Update DTO: 부분 수정 (모두 nullable)
- Entity: DB 제약·관계
- API Response: 외부 계약

시간이 지나면 **각자 다르게 진화**한다. 하나로 묶으려 하면 모든 계층의 제약을 다 수용해야 해서 오염이 누적.

## Hexagonal Architecture (헥사고날, 포트와 어댑터)

Alistair Cockburn이 제안. 비즈니스 로직(핵심)과 외부 세계 사이에 **포트(인터페이스)**와 **어댑터(구현)**를 둔다.

**구성:**
- **Core (Domain)** — 순수 비즈니스 로직
- **Port** — 핵심이 외부와 소통하는 인터페이스 (입력 포트 / 출력 포트)
- **Adapter** — 포트의 구현체 (HTTP 컨트롤러, DB 리포지토리 등)

외부 기술을 교체할 때 어댑터만 바꾸면 된다.

## 세 아키텍처의 공통점

| 원칙 | 설명 |
|---|---|
| 의존성 역전 | 비즈니스 로직이 기술 세부사항에 의존하지 않음 |
| 테스트 용이성 | 핵심 로직을 외부 의존 없이 단위 테스트 가능 |
| 교체 용이성 | DB, 프레임워크 등을 핵심 로직 변경 없이 교체 가능 |

## 실제 적용: 도메인 기반 구조

school-manage 프로젝트에서는 Clean Architecture를 도메인별 수직 슬라이싱과 결합했다.

**디렉토리 구조:**
- `domains/{도메인}/application/` — Use Case (비즈니스 로직)
- `domains/{도메인}/presentation/` — Router (HTTP/tRPC 어댑터)
- `infrastructure/` — DB, 메일, 스케줄러, 로깅 (공통 인프라)
- `global/` — 에러 처리, 미들웨어, 설정 (횡단 관심사)

**각 레이어의 역할:**
- **Presentation (Router):** 입력 검증, 요청/응답 변환만 담당. 비즈니스 로직 없음
- **Application (Use Case):** 비즈니스 규칙 실행, 트랜잭션 경계, 외부 서비스 호출 조정
- **Infrastructure:** DB 접근, 메일 발송, 로깅 등 기술 세부사항

**장점:**
- 도메인별로 코드가 모여 있어 응집도 높음
- Use Case 클래스가 하나의 비즈니스 기능만 담당 (SRP)
- CQRS와 자연스럽게 결합 (각 Use Case가 하나의 Command/Query 핸들러)

## 면접 포인트

Q. Clean Architecture를 어떻게 적용했는가?
- 도메인별 수직 슬라이싱: 각 도메인 안에 application(use case)과 presentation(router)을 분리
- Use Case 하나가 비즈니스 기능 하나를 담당 (예: CreateStudentUseCase)
- Router는 입력 검증과 위임만 하고, 비즈니스 로직은 Use Case에 집중

Q. Layered와 Clean Architecture의 차이는?
- Layered: 위→아래 단방향 의존, Infrastructure가 최하단
- Clean: 바깥→안쪽 의존, Domain이 중심이고 Infrastructure가 바깥

## 출처
- [우아한형제들 — 클린 아키텍처](https://techblog.woowahan.com/2647/)
- [coldpresso — 클린 아키텍처 정리](https://coldpresso.tistory.com/24)
- [당근 — 아키텍처에 대한 고민은 처음이라](https://medium.com/daangn/아키텍처에-대한-고민은-처음이라-b75dffd73eb0)
- [Clean Architecture 예제 (wikibook)](https://github.com/wikibook/clean-architecture)

## 관련 문서
- [[Hexagonal-In-Practice|Hexagonal 실전 적용 (Port/Adapter 디렉토리 구조와 NestJS 매핑)]]
- [[DDD|DDD (Aggregate, CQRS, 도메인 서비스)]]
- [[DDD-Hexagonal-In-Production|DDD + Hexagonal 프로덕션 패턴]]
- [[OOP|OOP / SOLID]]
- [[App-Architecture-OOP|애플리케이션 아키텍처와 객체지향]]
