---
tags: [architecture, ddd, hexagonal, bounded-context, spring, production]
status: done
category: "아키텍처&설계(Architecture&Design)"
aliases: ["DDD Hexagonal In Production", "DDD 헥사고날 실무", "멀티 바운디드 컨텍스트"]
---

# DDD + Hexagonal — 프로덕션 적용

DDD와 Hexagonal을 **함께** 도입할 때의 구조·디렉토리·트레이드오프 정리. 기본 개념은 [[DDD]]와 [[Hexagonal-In-Practice]]를 따로 본다.

## 왜 두 패턴을 함께 쓰는가

두 패턴은 해결하는 문제가 다르므로 **상호보완적**이다.

| 패턴 | 해결하는 문제 |
|---|---|
| **Hexagonal** | 외부 기술과 내부 비즈니스의 경계 — 기술 독립성 |
| **DDD** | 비즈니스 복잡성 — 도메인 모델 중심 설계 |

결합의 결과: **비즈니스 규칙이 프레임워크·프로토콜과 무관하게 유지된다.** 같은 비즈니스 로직을 REST, gRPC, CLI, Kafka consumer, cron에서 동일하게 재사용 가능.

## 적용 판단 — 소프트웨어의 두 가치

소프트웨어가 만드는 가치는 두 종류다.

1. **현재 요구사항 충족** — MVC 프레임워크가 최적화돼 있다
2. **미래 요구사항 대응** — DDD + Hexagonal이 비용을 투자하는 영역

일회성 프로젝트에는 1번만 있으면 되므로 헥사고날은 과한 구조다. 수년간 유지보수할 코어 서비스에서는 2번의 가치가 누적되어 회수가 크다.

## Port/Adapter 안에서 DDD 구성요소의 위치

```
domain/                     # 순수 도메인 (프레임워크 import 금지)
  Entity                    # 식별자로 동일성 판단
  Value Object              # 값으로 동일성 판단, 불변
  Aggregate Root            # 상태 변경 진입점, 트랜잭션 경계
  Domain Event              # 도메인 안에서 일어난 "사실"
application/                # 애플리케이션 서비스 (조율만)
  port/
    inbound/                # 유스케이스 인터페이스
    outbound/               # 리포지토리·외부 API 포트
  service/                  # 유스케이스 구현 = 도메인 모델 조율 + TX 경계
adapter/
  inbound/                  # REST, gRPC, CLI, Kafka consumer, Cron
  outbound/                 # JPA 구현, 외부 API 클라이언트, 메시지 발행자
```

**핵심 원칙**: 도메인 로직은 Entity/Aggregate **안**에, 서비스는 **조율만**. 서비스가 if/else 분기로 규칙을 전부 다루기 시작하면 "빈약한 도메인 모델(anemic model)" 증상.

## 멀티 바운디드 컨텍스트 디렉토리 구조

단일 모듈에 모든 도메인을 섞지 않고 **컨텍스트별 수직 슬라이스**로 나눈다.

```
bootstrap/
  CommerceApplication.java
  config/
order/                      # 바운디드 컨텍스트 1
  adapter/
  application/
  domain/
product/                    # 바운디드 컨텍스트 2
  ...
address/                    # 바운디드 컨텍스트 3
  ...
```

**컨텍스트 간 통신 규칙** (이게 무너지면 MSA를 해도 모놀리스):

- 같은 DB 테이블을 두 컨텍스트가 직접 쓰지 않는다
- 컨텍스트 간에는 **도메인 이벤트** 또는 **공개 API(포트)** 로만 통신
- 컨텍스트 내부 엔티티는 **외부로 노출 금지** (DTO/응답 캐리어로 변환)

## Tell, Don't Ask — 모델에게 메시지 보내기

서비스가 모델의 상태를 읽어 판단하고 setter로 바꾸는 패턴 대신, **모델이 스스로 상태를 바꾸게** 한다.

나쁜 패턴 (서비스에 규칙 누적):
```java
if (order.getStatus() == CREATED && order.getPaid() == true) {
  order.setStatus(CONFIRMED);
  order.setConfirmedAt(now);
}
```

좋은 패턴 (모델이 규칙을 안다):
```java
order.confirm();   // 내부에서 상태 검증 + 전환 + 이벤트 발행
```

서비스의 책임은 3단계로 축소된다:
1. DTO → 도메인 모델 매핑
2. 모델에 메시지 전달 (`confirm()`, `cancel()`, `decorate(visitor)`)
3. 리포지토리로 영속화 + 트랜잭션 커밋

## 외부 시스템 통합 — 보조 패턴

### Anti-Corruption Layer (ACL)

외부 API의 데이터 구조를 도메인에 직접 들이지 않고, **우리 도메인 언어로 번역하는 어댑터**를 둔다. 외부 API 스키마 변경이 도메인을 흔들지 않게 하는 방어막.

### 다중 프로바이더 + 폴백 (Circuit Breaker)

같은 기능(예: 신주소 조회)을 여러 외부 프로바이더로 분산할 때 패턴:
- 각 프로바이더는 `adapter/outbound`에 독립 구현
- 호출 순서를 클라이언트가 선택하거나 설정으로 정함 (`providers=KAKAO,NAVER,SKT`)
- 각 호출에 **Circuit Breaker** 두어 장애 전파 차단
- 모두 실패 시 graceful degradation (캐시된 값 / 기본값)

## 실용주의 — 과잉 설계를 피하는 판단

순수주의를 그대로 따르면 보일러플레이트가 폭발한다. 상황별 타협 기준:

| 원칙 | 현실적 타협 |
|---|---|
| 모든 유스케이스는 인터페이스 | **구현체가 하나뿐이면 생략** — Service만 두기 |
| 프레임워크 종속 금지 | `@Transactional` 같은 선언적 TX는 사용 — 실무 가치가 더 큼 |
| DTO는 application 바깥 | 단순 케이스에선 엔티티를 컨트롤러까지 노출하기도 |
| 모든 외부 호출에 port | 교체 가능성·테스트 필요성이 분명한 곳에만 |

**원칙보다 중요한 건 팀이 합의한 기준을 일관되게 적용하는 것.**

## 적용 / 비적용 매트릭스

| 적합한 경우 | 부적합한 경우 |
|---|---|
| 수년간 유지보수할 코어 서비스 | 일회성 프로젝트·PoC |
| 도메인 규칙이 복잡하고 자주 변함 | CRUD 위주 단순 API |
| 다양한 채널(REST·gRPC·Kafka) 동시 지원 | 단일 채널만 쓰는 작은 서비스 |
| 팀이 DDD 개념에 익숙하거나 학습 의지 있음 | 팀 숙련도 낮고 일정 타이트 |
| 외부 API가 여러 개·자주 바뀜 | 외부 의존성 단순 |

작게 시작한 서비스가 도메인 복잡도를 넘으면 헥사고날로 이주. **처음부터 다 만들지 말고, 통증이 보일 때 적용**.

## 면접 체크포인트

- DDD와 Hexagonal이 **각각 해결하는 문제**를 구분해 설명할 수 있는가
- **Aggregate가 트랜잭션 경계**임을 설명할 수 있는가
- **빈약한 도메인 모델**의 증상과 해소 방법 (Tell, Don't Ask)
- **바운디드 컨텍스트 간 통신**의 원칙 (직접 DB 공유 금지, 이벤트/공개 API)
- **Anti-Corruption Layer**가 왜 필요한가
- 언제 **Usecase 인터페이스를 생략**해도 되는가 — 과잉 설계 판단 기준
- 이 구조가 **맞지 않는 상황**도 분명히 말할 수 있는가 (성숙도 시그널)

## 사례: 당근페이 4년 아키텍처 진화

금융 서비스가 **Layered → Hexagonal → Clean Architecture + 모노레포**로 단계적으로 진화한 사례. 각 단계 전환 시점과 배경이 실전 학습 자료.

### 1단계: Layered Architecture (초기)
- **Controller → Service → Repository** 기본 구조
- MVP·초기 기능 출시에 유리
- 시간이 지나며 Service 간 **강한 결합**·복잡한 의존성·거대 서비스 클래스 발생
- 한 도메인 변경이 다른 도메인에 의도치 않게 전파

### 2단계: Hexagonal Architecture
- **Domain·UseCase·Adapter 모듈** 분리
- 도메인 계층이 외부 기술(DB·외부 API)로부터 **독립**
- 테스트 용이성·기술 스택 교체 유연성 확보
- 그러나 **여러 도메인이 한 프로젝트에 혼재** → 배포·빌드가 한 덩어리

### 3단계: Clean Architecture + 모노레포 (현재)
- **bootstrap / core / infrastructure / library / platform / usecase** 6개 모듈 구조
- 도메인별 독립 배포 가능
- 코드 라인 수가 **192% 증가해도 빌드 속도 유지**
- 팀 간 책임 경계 명확 → 지식 공유·리뷰 효율 상승

### 교훈
- **Conway의 법칙 실증** — 조직 구조가 시스템 설계에 그대로 반영됨. 팀이 커질수록 모듈 분리 필요
- **"과거 성공 방식이 미래 성공을 보장하지 않는다"** — 초기에 옳았던 Layered가 일정 규모에서 리팩토링 대상이 됨
- 아키텍처 전환은 **문제가 임계점에 도달하기 전** 결정이 이상적

## 사례: 배민 POS — Kotlin 4-Hexagon 멀티 모듈

Kotlin·Spring Boot로 POS 백엔드를 재구조화할 때 Port/Adapter를 **4개 모듈(Hexagon)** 로 분리한 구성. 위의 일반적 3층(domain·application·adapter)에 **Bootstrap**을 독립 모듈로 분리.

### 4-Hexagon 구성

| Hexagon | 역할 | 의존 |
|---|---|---|
| **Domain** | 순수 POJO·정적 규칙·Entity·VO·Aggregate | 프레임워크 없음 |
| **Application** | Use Case 정의·Inbound Port 구현·Outbound Port 선언 | Domain |
| **Framework** | 기술 어댑터 (MongoDB·S3·Retrofit 등) — **각 기술별 독립 모듈** | Application |
| **Bootstrap** | 진입점 (REST Controller·Kafka Consumer·SQS Subscriber) | Application + 필요한 Framework 모듈 |

일반적 구조는 Bootstrap을 Application 안에 두지만, 별도 모듈로 뽑으면:
- **Framework 모듈별로 Component Scan 격리** — 필요한 기술만 로드
- Kafka 전용 배치 앱과 REST 전용 API 앱을 **같은 Application·Domain 모듈** 을 공유하며 **Bootstrap만 다르게** 패키징

### Kotlin 특화 기법

- **`init` 블록으로 도메인 검증** — Aggregate 생성 시점에 invariant 강제. 생성자 안에 if·require로 실패시 즉시 예외
- **`data class` VO** — equals/hashCode 자동, `copy`로 불변 업데이트
- **Sealed class로 도메인 이벤트** — 타입 안전 분기 (when 구문 모든 케이스 강제)

### 의도적 객체 중복

Hexagon 간 **DTO·Entity·VO를 공유하지 않고 각 층에서 재정의**하는 선택.

- 단기 비용: 매핑 코드·보일러플레이트 증가 (Kotlin에는 MapStruct만큼 성숙한 매핑 도구가 적음 → 수동 확장 함수·생성자 매핑)
- 장기 이익: 각 층이 **자기 층에 필요한 필드·제약**을 독립 진화. 한 층 변경이 다른 층으로 번지지 않음
- 판단: 프로덕트 수명이 길고 모델이 자주 변하면 중복을 감수

### 감사 필드 분리 — AuditorApp 래퍼

관리자·감사 목적의 `createdBy`·`updatedAt` 같은 필드가 **도메인 모델에 섞이면** 도메인의 본질(주문 규칙)이 가려진다. 해결:

- Domain Aggregate는 **순수 도메인 필드만** 가짐
- `AuditorApp<T>` 같은 제네릭 래퍼가 **감사 메타데이터 + T 도메인 객체**를 합성
- 영속 계층·API 응답에서만 래퍼 사용

### Lazy 초기화로 Bean 폭증 방지

Bootstrap이 여러 Framework 모듈을 함께 쓰면 실제로는 이번 앱이 사용하지 않는 어댑터 Bean까지 모두 초기화되어 **Cold Start·메모리·실수 가능성**이 증가.

- `@Lazy` + 명시적 주입 패턴으로 **실제 사용 시점**까지 생성 지연
- 프로파일별 Bean 선별 로딩

### Output Port 증식 관리

Use Case별로 Outbound Port를 만들면 인터페이스가 수십 개로 폭증. 대응:

- **구현 전 설계 리뷰**에서 포트 통합 여부 논의 — 동일 어댑터에 메서드 추가로 해결할 수 있는지
- 여러 Use Case가 같은 Adapter를 호출하면 **Adapter별로 포트 하나**로 묶기 (단, 의미가 다르면 분리)
- 읽기 전용은 **CQRS Read Port** 별도 통로로 분리

## 출처
- [appkr — 내가 경험한 DDD, Hexagonal](https://blog.appkr.dev/work-n-play/learn-n-think/ddd-hexagonal/)
- [당근페이 — 백엔드 아키텍처가 걸어온 여정 (Layered → Hexagonal → Clean + 모노레포)](https://medium.com/daangn/%EB%8B%B9%EA%B7%BC%ED%8E%98%EC%9D%B4-%EB%B0%B1%EC%97%94%EB%93%9C-%EC%95%84%ED%82%A4%ED%85%8D%EC%B2%98%EA%B0%80-%EA%B1%B8%EC%96%B4%EC%98%A8-%EC%97%AC%EC%A0%95-98615d5a6b06)
- [우아한형제들 — 배민 POS 헥사고날 적용 사례](https://techblog.woowahan.com/12720)
- [SK DEVOCEAN — DDD for MSA](https://devocean.sk.com/blog/techBoardDetail.do?ID=165765)

## 관련 문서
- [[Hexagonal-In-Practice|Hexagonal 실전 적용 (Port/Adapter 일반화 가이드)]]
- [[Layered-Clean-Hexagonal|Layered / Clean / Hexagonal 비교]]
- [[DDD|DDD 기본 개념 (Aggregate, CQRS, 도메인 서비스)]]
- [[Elegant-OOP-Design|우아한 객체지향]]
- [[Aggregate-Boundary|Aggregate 경계와 데이터 접근]]
- [[Monolith-vs-Microservice|Monolith vs Microservice]]
