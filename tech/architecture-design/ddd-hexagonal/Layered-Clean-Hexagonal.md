---
tags: [architecture, clean-architecture]
status: done
category: "아키텍처&설계(Architecture&Design)"
aliases: ["Layered / Clean / Hexagonal", "클린 아키텍처", "계층 아키텍처"]
verified_at: 2026-10-09
---

# Layered / Clean / Hexagonal Architecture

관심사를 경계로 나누는 아키텍처 패턴들이다. Clean과 Hexagonal은 의존성이 비즈니스 규칙을 향하게 하는 것이 핵심이고, Layered는 계층을 나누지만 구체적인 의존 방향은 변형과 경계 설계에 따라 달라진다.

## Layered Architecture (계층 아키텍처)

흔한 형태에서는 상위 레이어가 바로 아래 레이어를 호출한다. 다만 포트와 의존성 역전을 적용한 도메인 중심 Layered 구조도 가능하므로 아래 구조를 유일한 정의로 보지는 않는다.

**계층 구조:**
- Presentation → Application → Domain → Infrastructure

**문제점:**
- Business나 Domain이 구체 Infrastructure 구현을 직접 참조하면 기술 세부사항에 묶일 수 있음
- 레이어 간 순환 의존이 발생하기 쉬움
- 모든 것이 서비스 레이어에 몰리는 문제 (Fat Service)

## Clean Architecture (클린 아키텍처)

Robert C. Martin(Uncle Bob)이 제안. **의존성 규칙(Dependency Rule)**이 핵심이다.

**동심원 구조 (안쪽 → 바깥):**
1. **Entities** — 비즈니스 규칙, 어떤 프레임워크에도 의존하지 않음
2. **Use Cases** — 애플리케이션 고유 비즈니스 규칙
3. **Interface Adapters** — 컨트롤러, 프레젠터, 게이트웨이
4. **Frameworks & Drivers** — DB, 웹 프레임워크, 외부 API

**의존성 규칙:** 바깥 원은 안쪽 원에 의존할 수 있지만, 안쪽 원은 바깥 원을 모른다.

### DB 스키마에 업무 모델을 종속시키지 않는다

레이어드 아키텍처의 가장 큰 함정은 **DB가 사실상 최상위 중심**이 되는 것. 원칙은 "Presentation → Business → Data"지만 실제로는:

- 테이블 행을 그대로 옮긴 데이터 객체만 두고 업무 규칙을 외부에 흩어 놓으면 스키마 변경이 업무 코드 전체로 전파됨
- DB 컬럼이 바뀌면 도메인, UseCase, 컨트롤러까지 영향
- "도메인"이라는 이름을 가진 클래스가 실제로는 **DB row의 OOP 표현**에 불과

Clean Architecture는 이를 뒤집는다: **도메인이 중심, DB는 바깥 메커니즘**. 도메인 정의가 먼저 서고, Repository 인터페이스가 도메인이 원하는 형태를 정의, JPA, MongoDB 등은 이 인터페이스의 **구현 세부**일 뿐.

ORM 엔티티와 도메인 엔티티를 같은 클래스로 쓰는 것 자체가 문제는 아니다. 풍부한 행위와 불변식을 가진 모델도 ORM으로 매핑할 수 있다. 저장 구조와 도메인 언어의 차이가 매핑 비용을 정당화할 때 분리한다([[Domain-ORM-Mapper]]).

### 경계(Boundary)와 의존성 역전

안→바깥 의존은 어떻게 막는가? **Use Case 입력, 출력 포트**로 역전시킨다.

```
Controller → [InputPort]  ← UseCase (구현)
UseCase    → [OutputPort] ← RepositoryAdapter (구현)
```

- `InputPort`, `OutputPort`는 **안쪽(UseCase)에 정의**된 인터페이스
- 바깥 계층(Controller, Repository)은 이 인터페이스를 **구현**하거나 **호출**
- 컴파일 방향은 바깥 → 안쪽, 하지만 **런타임 호출은 양방향** 가능

### 인터페이스 설계 — ISP 관점

- **클라이언트 필요 중심**: 인터페이스는 **구현이 아닌 호출자 관점**에서 설계. 한 서비스가 여러 클라이언트를 모두 만족시키려 하면 **비대해진 인터페이스**가 됨
- **구현 디테일 노출 금지**: 인터페이스 이름이 `JpaUserRepository`가 아니라 `UserRepository`. JPA는 구현의 선택
- **파라미터 vs 전체 객체**: 단순 값이면 개별 파라미터, 속성 진화가 예상되면 객체로

### DTO 분리는 변화 이유가 다를 때

입력, 저장과 출력 계약은 변화 이유가 서로 다를 수 있어 필드가 우연히 같더라도 별도 모델이 필요할 수 있다. 예를 들면:

- Create DTO: 사용자 입력 검증용 (필수, 선택 필드)
- Update DTO: 부분 수정에서 필드 생략과 명시적 null의 의미를 구분
- Entity: DB 제약, 관계
- API Response: 외부 계약

이 계약들이 실제로 독립적으로 진화한다면 분리가 결합을 줄인다. 반대로 제약과 변화 이유가 같은데 계층마다 1:1 복사 DTO를 만들면 매핑 비용만 늘어난다. 경계별 독립 계약이 있는지 확인한 뒤 분리한다.

### FastAPI에서 HTTP 계약을 분리하는 예

`APIRouter`로 경로 연산을 모듈로 나누고 `include_router()`로 애플리케이션에 연결할 수 있다. 이 도구는 라우트 구성을 돕지만, 서비스와 저장소의 책임 분리까지 대신하지 않는다. 폴더 이름보다 HTTP 입력, 업무 규칙과 저장 계약이 어디서 만나는지 확인한다.

Pydantic 모델의 검증을 타입 변환 없는 엄격한 검사로 가정하지 않는다. 기본 모드에서는 정수 필드의 문자열 `"123"`을 `123`으로 변환할 수 있다. 변환을 제한해야 하면 필드나 모델의 strict 설정을 검토하고, JSON의 날짜 문자열처럼 strict 모드에서도 허용하는 타입별 예외를 확인한다.

출력 DTO는 클래스를 선언하는 데서 끝나지 않는다. FastAPI의 `response_model`에 연결하면 반환 데이터를 해당 모델에 맞게 검증하고 필터링한다. 예를 들어 입력 모델에 비밀번호가 있어도 출력 모델에서 제외해 응답에 노출되지 않게 한다. 다만 `Response`를 직접 반환하면 이 자동 변환 경로를 우회하므로, 실제 응답 경로에서 민감 필드가 빠지는지 확인한다. DTO 분리만으로 권한 검사나 DB 교체 가능성이 보장되지는 않는다.

## Hexagonal Architecture (헥사고날, 포트와 어댑터)

Alistair Cockburn이 제안. 비즈니스 로직(핵심)과 외부 세계 사이에 **포트(인터페이스)**와 **어댑터(구현)**를 둔다.

**구성:**
- **Core (Domain)** — 순수 비즈니스 로직
- **Port** — 핵심이 외부와 소통하는 인터페이스 (입력 포트 / 출력 포트)
- **Adapter** — 외부 기술과 포트를 연결하는 변환 컴포넌트. 입력 어댑터인 HTTP 컨트롤러는 입력 포트나 유스케이스를 호출하고, 출력 어댑터인 DB 리포지토리는 출력 포트를 구현한다

포트 계약이 유지되고 새 기술의 의미 차이를 어댑터 안에서 흡수할 수 있으면 핵심 로직 변경을 줄일 수 있다. 데이터 이관이나 일관성 의미까지 달라지면 어댑터 교체만으로 끝나지 않는다.

## 세 아키텍처의 공통점

| 원칙 | 설명 |
|---|---|
| 관심사 분리 | UI, 업무 규칙과 데이터 접근의 책임을 경계로 나눔 |
| 의존성 역전 | Clean과 Hexagonal은 핵심 규칙이며, Layered도 포트를 두면 적용 가능 |
| 테스트 용이성 | 경계와 의존성 주입을 적용하면 핵심 로직의 단위 테스트가 쉬워짐 |
| 교체 용이성 | 계약과 의미가 유지되는 범위에서 외부 기술 변경의 영향이 줄어듦 |

## 적용 예: 도메인 기반 구조

한 웹 애플리케이션에서 Clean Architecture를 도메인별 수직 슬라이싱과 결합할 수 있다.

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
- Use Case 하나가 비즈니스 기능 하나를 담당 (예: CreateEntityUseCase)
- Router는 입력 검증과 위임만 하고, 비즈니스 로직은 Use Case에 집중

Q. Layered와 Clean Architecture의 차이는?
- Layered: 흔한 형태는 위→아래 호출이지만, 포트 적용 여부에 따라 의존 방향이 달라짐
- Clean: 바깥→안쪽 의존, Domain이 중심이고 Infrastructure가 바깥

## 호출 규칙과 배포 경계를 구분한다

엄격한 계층 구조는 바로 아래 계층만 호출하고, 완화된 구조는 합의한 범위에서 중간 계층을 건너뛴다. 공통 목표는 제한된 공개 계약을 통해 사용하고 내부 구현을 숨기는 것이다. 모든 계층이 아무 판단 없이 호출만 전달한다면 분리의 실익을 다시 확인한다.

단순 조회에 서비스의 의미 없는 위임만 남는다면 컨트롤러가 조회 Repository를 직접 쓰도록 정할 수도 있다. 권한 검사, 업무 규칙, 여러 조회의 일관성이 필요하면 애플리케이션 서비스 경계로 모은다. 직접 조회도 트랜잭션과 지연 로딩 범위를 정해야 한다([[JPA-API-OSIV]]).

MVC는 UI 구성의 역할을 설명하며 백엔드 전체의 계층 규칙을 대신하지 않는다. Layer는 논리적 책임 분리, Tier는 물리적 배치 구분이다. Clean의 의존성 규칙을 지켜도 독립 배포와 확장, 팀 소유권이 자동으로 생기지는 않는다. 모놀리스나 개별 마이크로서비스 내부에 적용하고, 기능별 변경을 모으려면 [[Modular-Monolith|수직 모듈 경계]]를 함께 설계한다.

헥사고날의 원래 초점은 UI와 실제 DB 없이도 애플리케이션을 구동하고 시험할 수 있게 하는 내부/외부 경계다. 육각형의 여섯 변, 정해진 패키지 수, `UseCase` 접미사, 내부 동심원은 필수가 아니다. 내부 모델 구조와 ORM 모델 분리 여부는 별도로 판단한다.

## 유스케이스로 경계를 드러낸다

패키지와 문서에서 주문 승인, 게시글 발행처럼 시스템의 목적을 먼저 읽을 수 있게 한다. 프레임워크 이름만 나열한 그림에는 업무 흐름이 빠지기 쉽다. 다만 배포, 성능, 보안과 데이터 일관성도 아키텍처 결정이므로 기술 구성을 무의미한 세부사항으로 치부하지 않는다.

- 유스케이스는 액터의 목표, 입력, 사전 조건, 정상 흐름, 실패/대안 흐름과 완료 후 상태를 기술한다. 버튼 이름이나 HTTP 경로보다 업무 결과를 먼저 정한다.
- **Boundary**는 입력과 출력의 계약, **Interactor**는 해당 유스케이스의 절차와 조정, **Entity**는 재사용할 업무 규칙을 맡는다. DTO는 경계를 넘는 데이터이며 boundary 인터페이스 자체와 같지는 않다.
- 주문 승인에서 HTTP 입력 해석은 어댑터, 주문 조회와 저장 조정은 interactor, 승인 가능한 상태인지는 도메인 객체가 맡을 수 있다. 대역 저장소로 흐름을 확인해도 실제 저장소의 트랜잭션, 잠금과 오류 계약은 별도로 검증한다.
- 결정 연기는 구현 선택을 바꿀 여지를 남기는 전략이다. 이미 필요한 일관성, 지연과 규제 조건까지 나중으로 미루지 않고, 위험한 가정은 작은 실험으로 먼저 확인한다. 임시 구현을 버릴지 발전시킬지도 품질과 변경 비용을 보고 판단한다.

## 출처

- [FastAPI, Bigger Applications - Multiple Files](https://fastapi.tiangolo.com/tutorial/bigger-applications/)
- [FastAPI, Response Model - Return Type](https://fastapi.tiangolo.com/tutorial/response-model/)
- [FastAPI, Return a Response Directly](https://fastapi.tiangolo.com/advanced/response-directly/)
- [Pydantic, Strict Mode](https://docs.pydantic.dev/latest/concepts/strict_mode/)
- [클린 코더스, Architecture](https://www.inflearn.com/courses/lecture?courseId=336905&unitId=279449)
- [클린 코더스, Architecture UseCase](https://www.inflearn.com/courses/lecture?courseId=336905&unitId=279450)
- [The Clean Architecture — Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Screaming Architecture — Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2011/09/30/Screaming-Architecture.html)

- [헥사고날 아키텍처의 사실과 오해 (1)](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=291178)
- [Entity vs DTO](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=264324)
- [헥사고날 아키텍처의 사실과 오해 (2)](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=300707)
- [패키지 구조](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=301373)
- [회원 애플리케이션 서비스 구현](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=301666)
- [JPA와 도메인 모델 패턴](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=312138)
- [엔티티 클래스와 JPA 매핑 정보 분리](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=312327)
- [아키텍처 개념 과 레이어드 아키텍처](https://www.inflearn.com/courses/lecture?courseId=328412&unitId=104421)
- [비지니스로직은 어디에? - 레이어드 아키텍처](https://www.inflearn.com/courses/lecture?courseId=328412&unitId=105077)
- [Clean Architecture 소개](https://www.inflearn.com/courses/lecture?courseId=332731&unitId=307060)
- [[실습 1] Clean Architecture 구현 에제](https://www.inflearn.com/courses/lecture?courseId=332731&unitId=307061)
- [Modular Monolithic Architecture 개요](https://www.inflearn.com/courses/lecture?courseId=332731&unitId=286772)
- [애플리케이션 아키텍처](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24287)
- [상품 서비스 개발](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24295)
- [상품 주문](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24310)
- [주문 목록 검색, 취소](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24311)
- [Alistair Cockburn — Hexagonal Architecture 원문](https://alistair.cockburn.us/hexagonal-architecture/)
- [우아한형제들 — 클린 아키텍처](https://techblog.woowahan.com/2647/)
- [coldpresso — 클린 아키텍처 정리](https://coldpresso.tistory.com/24)
- [당근 — 아키텍처에 대한 고민은 처음이라](https://medium.com/daangn/아키텍처에-대한-고민은-처음이라-b75dffd73eb0)
- [Clean Architecture 예제 (wikibook)](https://github.com/wikibook/clean-architecture)

## 관련 문서
- [[Monorepo-Architecture|모노레포 아키텍처 (SDP, 변화율 계층, 우연적 커플링)]]
- [[Hexagonal-In-Practice|Hexagonal 실전 적용 (Port/Adapter 디렉토리 구조와 NestJS 매핑)]]
- [[DDD|DDD (Aggregate, CQRS, 도메인 서비스)]]
- [[DDD-Hexagonal-In-Production|DDD + Hexagonal 프로덕션 패턴]]
- [[OOP|OOP / SOLID]]
- [[App-Architecture-OOP|애플리케이션 아키텍처와 객체지향]]
