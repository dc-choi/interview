---
tags: [architecture, ddd, hexagonal, bounded-context, spring, production]
status: done
category: "아키텍처&설계(Architecture&Design)"
aliases: ["당근페이 아키텍처 진화", "배민 POS 4-Hexagon"]
---

# DDD + Hexagonal — 프로덕션 사례 (당근페이, 배민 POS)

## 사례: 당근페이 4년 아키텍처 진화

금융 서비스가 **Layered → Hexagonal → Clean Architecture + 모노레포**로 단계적으로 진화한 사례. 각 단계 전환 시점과 배경이 실전 학습 자료.

### 1단계: Layered Architecture (초기)
- **Controller → Service → Repository** 기본 구조
- MVP, 초기 기능 출시에 유리
- 시간이 지나며 Service 간 **강한 결합**, 복잡한 의존성, 거대 서비스 클래스 발생
- 한 도메인 변경이 다른 도메인에 의도치 않게 전파

### 2단계: Hexagonal Architecture
- **Domain, UseCase, Adapter 모듈** 분리
- 도메인 계층이 외부 기술(DB, 외부 API)로부터 **독립**
- 테스트 용이성, 기술 스택 교체 유연성 확보
- 그러나 **여러 도메인이 한 프로젝트에 혼재** → 배포, 빌드가 한 덩어리

### 3단계: Clean Architecture + 모노레포 (현재)
- **bootstrap / core / infrastructure / library / platform / usecase** 6개 모듈 구조
- 도메인별 독립 배포 가능
- 코드 라인 수가 **192% 증가해도 빌드 속도 유지**
- 팀 간 책임 경계 명확 → 지식 공유, 리뷰 효율 상승

### 교훈
- **Conway의 법칙 실증** — 조직 구조가 시스템 설계에 그대로 반영됨. 팀이 커질수록 모듈 분리 필요
- **"과거 성공 방식이 미래 성공을 보장하지 않는다"** — 초기에 옳았던 Layered가 일정 규모에서 리팩토링 대상이 됨
- 아키텍처 전환은 **문제가 임계점에 도달하기 전** 결정이 이상적

## 사례: 배민 POS — Kotlin 4-Hexagon 멀티 모듈

Kotlin, Spring Boot로 POS 백엔드를 재구조화할 때 Port/Adapter를 **4개 모듈(Hexagon)** 로 분리한 구성. 위의 일반적 3층(domain, application, adapter)에 **Bootstrap**을 독립 모듈로 분리.

### 4-Hexagon 구성

| Hexagon | 역할 | 의존 |
|---|---|---|
| **Domain** | 순수 POJO, 정적 규칙, Entity, VO, Aggregate | 프레임워크 없음 |
| **Application** | Use Case 정의, Inbound Port 구현, Outbound Port 선언 | Domain |
| **Framework** | 기술 어댑터 (MongoDB, S3, Retrofit 등) — **각 기술별 독립 모듈** | Application |
| **Bootstrap** | 진입점 (REST Controller, Kafka Consumer, SQS Subscriber) | Application + 필요한 Framework 모듈 |

일반적 구조는 Bootstrap을 Application 안에 두지만, 별도 모듈로 뽑으면:
- **Framework 모듈별로 Component Scan 격리** — 필요한 기술만 로드
- Kafka 전용 배치 앱과 REST 전용 API 앱을 **같은 Application, Domain 모듈** 을 공유하며 **Bootstrap만 다르게** 패키징

### Kotlin 특화 기법

- **`init` 블록으로 도메인 검증** — Aggregate 생성 시점에 invariant 강제. 생성자 안에 if, require로 실패시 즉시 예외
- **`data class` VO** — equals/hashCode 자동, `copy`로 불변 업데이트
- **Sealed class로 도메인 이벤트** — 타입 안전 분기 (when 구문 모든 케이스 강제)

### 의도적 객체 중복

Hexagon 간 **DTO, Entity, VO를 공유하지 않고 각 층에서 재정의**하는 선택.

- 단기 비용: 매핑 코드, 보일러플레이트 증가 (Kotlin에는 MapStruct만큼 성숙한 매핑 도구가 적음 → 수동 확장 함수, 생성자 매핑)
- 장기 이익: 각 층이 **자기 층에 필요한 필드, 제약**을 독립 진화. 한 층 변경이 다른 층으로 번지지 않음
- 판단: 프로덕트 수명이 길고 모델이 자주 변하면 중복을 감수

### 감사 필드 분리 — AuditorApp 래퍼

관리자, 감사 목적의 `createdBy`, `updatedAt` 같은 필드가 **도메인 모델에 섞이면** 도메인의 본질(주문 규칙)이 가려진다. 해결:

- Domain Aggregate는 **순수 도메인 필드만** 가짐
- `AuditorApp<T>` 같은 제네릭 래퍼가 **감사 메타데이터 + T 도메인 객체**를 합성
- 영속 계층, API 응답에서만 래퍼 사용

### Lazy 초기화로 Bean 폭증 방지

Bootstrap이 여러 Framework 모듈을 함께 쓰면 실제로는 이번 앱이 사용하지 않는 어댑터 Bean까지 모두 초기화되어 **Cold Start, 메모리, 실수 가능성**이 증가.

- `@Lazy` + 명시적 주입 패턴으로 **실제 사용 시점**까지 생성 지연
- 프로파일별 Bean 선별 로딩

### Output Port 증식 관리

Use Case별로 Outbound Port를 만들면 인터페이스가 수십 개로 폭증. 대응:

- **구현 전 설계 리뷰**에서 포트 통합 여부 논의 — 동일 어댑터에 메서드 추가로 해결할 수 있는지
- 여러 Use Case가 같은 Adapter를 호출하면 **Adapter별로 포트 하나**로 묶기 (단, 의미가 다르면 분리)
- 읽기 전용은 **CQRS Read Port** 별도 통로로 분리
