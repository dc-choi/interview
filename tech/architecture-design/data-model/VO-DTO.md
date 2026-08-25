---
tags: [architecture, design, vo, dto]
status: done
category: "아키텍처&설계(Architecture&Design)"
aliases: ["VO DTO", "VO와 DTO"]
---

# VO와 DTO

## VO (Value Object)

도메인의 값 개념을 모델링하는 객체다. Money, Address, 기간처럼 식별자가 아니라 값 자체가 정체성이다.

- **값 동등성** — 동등성을 구성하는 값이 같으면 같은 객체로 판단한다. Java라면 해당 값들을 기준으로 equals/hashCode를 재정의한다. 식별자 기준으로 같음을 판단하는 Entity와 대비된다 ([[DDD]]의 Entity vs Value Object).
- **불변** — 생성 후 상태를 바꾸지 않고, 값을 바꾸려면 새 객체를 만든다. 공유돼도 안전하고 동등성 판단이 흔들리지 않는다.
- **도메인 표현** — 값에 밀접한 검증이나 부수 효과 없는 연산을 둘 수 있다. 예를 들어 Money가 음수 허용 여부를 검사하고 통화가 같은 금액끼리 합산할 수 있다. 이런 로직은 유용하지만 VO의 필수 판별 조건은 아니다.

## DTO (Data Transfer Object)

데이터 전송 객체는 계층이나 프로세스 경계를 넘어 데이터를 옮기기 위한 객체다. API에서는 일반적으로 Request와 Response로 나눠 사용한다. REST API 응답으로 엔티티를 직접 쓰면 엔티티 속성이 바뀔 때마다 API 명세도 바뀐다. 응답 DTO를 따로 두면 API 계약이 테이블 구조에 직접 의존하는 문제를 줄일 수 있다.

## VO vs DTO

| 축 | VO | DTO |
|---|---|---|
| 목적 | 도메인 값 개념 표현 | 계층과 프로세스 간 데이터 운반 |
| 위치 | 도메인 계층 | 경계 (API 요청과 응답, 계층 간 변환) |
| 로직 | 값에 밀접한 검증과 부수 효과 없는 연산을 둘 수 있음 | 입력 형식 검증과 단순 변환은 가능, 도메인 규칙은 두지 않음 |
| 가변성 | 불변 | 언어와 직렬화 프레임워크에 따라 가변 또는 불변 |
| 동등성 | 도메인 값을 구성하는 값 기준 | 도메인 정체성을 판단하는 기준이 아님 |

판별 한 줄: 메서드나 setter의 유무로 구분하지 않는다. 도메인 개념을 표현하고 값으로 동등성을 판단하면 VO, 경계를 넘어 데이터를 운반하는 것이 주책임이면 DTO다. DTO에 비즈니스 규칙이 스며들면 경계 객체가 도메인 로직을 삼키고 있다는 신호다.

## 출처

- [Implementing value objects — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/implement-value-objects)
- [Create Data Transfer Objects — Microsoft Learn](https://learn.microsoft.com/en-us/aspnet/web-api/overview/data/using-web-api-with-entity-framework/part-5)

## 관련 문서
- [[DTO-Layering|DTO 레이어 스코프, Entity 변환 위치]]
- [[DDD]] — Entity vs Value Object (식별자 기반 vs 값 기반)
- [[OOP]]
