---
tags: [architecture, architecture-style, trade-off, distributed-system]
status: done
verified_at: 2026-10-01
category: "아키텍처&설계(Architecture&Design)"
aliases: ["Architecture Styles", "아키텍처 스타일", "아키텍처 스타일 카탈로그", "Service-Based Architecture", "서비스 기반 아키텍처", "Space-Based Architecture", "Microkernel Architecture"]
---

# 아키텍처 스타일 카탈로그

아키텍처 스타일은 경험으로 검증된 구조에 붙인 이름이고, 개별 설계 패턴보다 한 단계 큰 단위다. 스타일을 먼저 정하고 시스템을 끼워 맞추지 않는다. 시스템이 반드시 가져야 할 아키텍처 특성을 먼저 고르고, 그 특성을 가장 덜 해치는 스타일을 고른다.

## 특성, 결정, 설계 원칙

Mark Richards와 Neal Ford는 아키텍처를 네 차원으로 나눠 설명한다.

| 차원 | 뜻 | 예 |
|---|---|---|
| 아키텍처 특성 | 시스템의 성공 기준이 되는 품질 속성 | 가용성, 신뢰성, 시험성, 확장성, 탄력성, 내고장성, 복구성, 배포성, 보안 |
| 아키텍처 결정 | 시스템을 만드는 규칙. 해야 할 것과 하지 말아야 할 것을 정한 제약 | 표현 계층은 DB에 직접 접근하지 않는다 |
| 설계 원칙 | 결정을 따르도록 돕는 지침. 강제 규칙은 아니다 | 서비스 사이 통신은 가능한 곳에서 비동기 메시지를 쓴다 |
| 구조 | 위 특성을 만족하도록 고른 스타일 | 레이어드, 서비스 기반, 이벤트 기반 |

특성은 많이 고를수록 서로 충돌한다. 요구사항상 꼭 필요한 몇 개만 고르고, 측정 가능한 품질 시나리오로 바꾼다([[System-Design-Quality-Attribute-Decision|품질 시나리오]]). 결정이 지켜지는지는 [[Architecture-Fitness-Functions|fitness function]]으로 검증하고, 이유와 대안은 [[ADR]]로 남긴다.

아키텍트의 작업은 비즈니스 요구 분석, 특성 도출, 스타일과 패턴 선택, 구성 요소 정의, 개발팀에 결정과 원칙 전달, 컴포넌트 모듈화로 이어진다. 결정을 전달하는 데서 끝나지 않고 지켜지는지 확인하고 팀을 코칭하는 일까지 포함한다.

## 스타일 한눈에 보기

| 스타일 | 배포 형태 | 잘 맞는 상황 | 대가 |
|---|---|---|---|
| 레이어드 | 모놀리식 | 작은 팀, 단순한 업무, 빠른 시작 | 기능 변경이 모든 계층을 가로지르고 배포와 확장 단위가 하나다 |
| 파이프라인 | 모놀리식 | 단계형 데이터 처리, ETL, 배치 | 요청-응답이나 한 트랜잭션으로 묶여야 하는 처리에 맞지 않는다 |
| 마이크로커널 | 모놀리식 | 코어는 안정적이고 기능 확장이 잦은 제품 | 플러그인 계약과 레지스트리 관리 |
| 서비스 기반 | 분산 | 경계 일부가 안정된 실용적 분산 | 공유 DB 결합 |
| 이벤트 기반 | 분산 | 응답성, 확장성, 여러 소비자 | 일관성, 오류 처리, 흐름 추적 |
| 공간 기반 | 분산 | 갑자기 몰리는 대규모 동시 사용자 | 복잡도와 비용, DB 반영 지연 |
| 오케스트레이션 기반 SOA | 분산 | 전사 재사용을 노린 역사적 형태 | ESB 병목과 높은 결합 |
| 마이크로서비스 | 분산 | 독립 배포와 확장의 가치가 운영 비용을 넘을 때 | 운영, 데이터 분산, 관측 비용 |

## 모놀리식 스타일

### 레이어드

관심사별로 계층을 나누고 인접 계층만 호출하게 해 변경 영향을 계층 안에 가둔다. 가장 흔한 출발점이지만, 기능 하나를 바꿀 때 모든 계층을 함께 고치는 일이 잦다. 아무 로직 없이 호출만 통과시키는 계층이 늘면 계층 비용만 남는다. 상세는 [[Layered-Clean-Hexagonal|Layered, Clean, Hexagonal]]에서 다룬다.

### 파이프라인 (파이프와 필터)

필터를 파이프로 이어 데이터를 한 방향으로 흘린다. 필터는 자기 입력과 출력 형식만 알고 다른 필터를 모르며, 파이프는 라우팅이나 업무 로직을 갖지 않는다.

- **생산자**: 처리의 시작점이다.
- **변환기**: 데이터의 일부나 전부를 바꿔 다음 단계로 넘긴다. 함수형의 `map`에 해당한다.
- **테스터**: 조건을 검사해 다음 단계로 넘길지 정한다. 입력을 줄이기는 하지만 집계(`reduce`)가 아니라 조건부 통과라서 `filter`에 가깝다.
- **소비자**: 처리의 종착점이다.

셸 명령의 파이프, ETL, 배치, 이미지 변환처럼 단계를 재조합할 일이 많은 처리에 맞는다. 단계를 별도 프로세스나 큐로 분산하면 필터 실패 뒤 재실행으로 같은 메시지가 두 번 올 수 있으므로 필터를 멱등하게 만들고 중복을 거른다([[Idempotency-Key|멱등성 키]]). 가장 느린 필터가 전체 처리 시간을 정하므로 그 필터만 병렬로 늘릴 수 있게 둔다.

### 마이크로커널 (플러그인)

최소 기능의 코어 시스템에 독립 플러그인을 붙여 기능을 넓힌다. 기본 차량에 옵션을 붙이는 방식과 같다. IDE, 브라우저 확장, CI 서버, 이슈 트래커처럼 제품 형태로 배포하는 소프트웨어에서 흔하다. Eclipse는 플랫폼 전체를 플러그인과 확장 지점(extension point)으로 구성한다.

- 코어는 플러그인 레지스트리와 확장 지점의 계약만 알고, 플러그인끼리는 서로 의존하지 않게 한다.
- 계약 버전, 플러그인 장애의 격리와 코어가 점점 비대해지는 것을 관리 대상으로 둔다.
- 한 애플리케이션 안에서도 같은 구조를 만들 수 있다. NestJS 예는 [[NestJS-Plugin-System|NestJS 플러그인 시스템]].

## 분산 스타일

### 서비스 기반 아키텍처

사용자 인터페이스, 소수의 거친 도메인 서비스와 대개 하나의 공유 DB로 이뤄진 분산 스타일이다. 도메인 서비스는 보통 한 자릿수에서 십여 개 수준이며 각자 독립 배포된다. Richards는 이를 마이크로서비스의 혼합형으로 설명한다. 마이크로서비스와의 차이는 서비스가 더 크고 DB를 공유한다는 점이다.

- **장점**: 한 업무 흐름이 도메인 서비스 하나 안에서 끝나는 경우가 많아 분산 트랜잭션 없이 로컬 ACID transaction을 쓸 수 있다. 서비스 사이 호출이 적으므로 경계를 잘 잡으면 내고장성과 신뢰성을 얻기 쉽다.
- **공유 DB의 실패 모드**: 서비스 사이 table join이 생기고, 한 서비스가 column 이름을 바꾸면 다른 서비스가 장애를 낸다. 마이크로서비스는 다른 서비스 데이터의 직접 join을 금지하고 저장소를 격리해 이 결합을 끊는다([[Microservice-Data-Ownership-and-Queries|데이터 소유권]]).

| 결정 | 선택지 | 판단 기준 |
|---|---|---|
| UI 분할 | 하나의 UI, 도메인별 UI, 서비스별 UI | 팀 경계와 배포 독립성. 극단은 마이크로 프론트엔드([[Module-Federation]]) |
| DB 토폴로지 | 단일 공유 DB, 도메인별 DB, 조회용 DB 분리, 서비스별 DB | 허용할 결합 범위와 조회 패턴 |
| 서비스 내부 구조 | 기술 분할(API facade, 비즈니스, persistence 계층) 또는 도메인 분할(하위 도메인 패키지 안에 계층) | 변경이 기능 단위로 들어오는가([[Modular-Monolith]]) |
| 데이터 소유 | 공유 DB 안에서도 schema나 table 묶음을 서비스별로 나누고 쓰기 소유권을 준다 | schema 변경의 영향 범위 |

조회용 DB를 따로 두면 원본과의 동기화 지연을 허용하는 결과적 일관성이 된다. 지연 상한과 재구축 절차를 함께 정한다([[Clean-Architecture-NestJS-CQRS|CQRS]]). 경계 일부는 안정됐지만 서비스별 데이터 분리와 운영 비용을 아직 감당하기 어려울 때의 중간 단계로 쓸 수 있다([[Microservice-Readiness-and-Maturity|마이크로서비스 준비도]]).

서비스 기반 아키텍처는 아래의 오케스트레이션 기반 SOA와 다르다. 재사용을 위해 전사 서비스를 조합하는 구조가 아니라, 큰 도메인 경계를 독립 배포 단위로 나누는 구조다.

### 이벤트 기반

비동기 이벤트로 컴포넌트를 잇는 분산 스타일이다. 호출자가 응답을 기다리며 자원을 붙잡지 않으므로 응답성, 확장성과 성능에 유리하다. 주문 완료 이벤트를 배송과 알림이 각자 받아 처리하는 식이다. 주문받는 일과 만드는 일을 나눠 바쁜 쪽만 사람을 늘리는 매장 운영과 같다. 대가는 나뉜 트랜잭션의 일관성, 이벤트 유실과 오류 처리, 흐름 추적이다.

| 토폴로지 | 흐름 제어 | 강점 | 대가 |
|---|---|---|---|
| broker | 중앙 조정 없이 각 컴포넌트가 이벤트에 반응하고 다음 이벤트를 발행한다 | 낮은 결합, 확장성, 응답성, 컴포넌트 장애 격리 | 다단계 업무의 상태를 아는 곳이 없어 재시작과 오류 처리가 어렵고 불일치의 원인이 되기 쉽다 |
| mediator | 이벤트 mediator가 흐름과 상태를 관리하고 지정 채널로 command를 보낸다 | 흐름 통제, 분산 오류 처리, 재시작 | 컴포넌트가 mediator에 결합되고 mediator가 병목이나 신뢰성 위험이 된다 |

mediator는 Apache Camel, Spring Integration 같은 통합 프레임워크나 workflow engine으로 구현할 수 있다. 둘의 선택 기준은 [[Saga-Pattern|Saga]]의 Choreography와 Orchestration 기준과 같고, 한 시스템 안에서도 흐름마다 다르게 고를 수 있다. 발행과 소비의 신뢰성, 순서와 재시도는 [[Event-Driven-Architecture|EDA 결정 프레임워크]], [[MQ-Kafka-Retry-DLT|Kafka 재시도와 DLT]], [[Delivery-Semantics|전달 보장]]에서 다룬다.

### 공간 기반

예매나 경매처럼 동시 사용자가 갑자기 몰리는 상황에서는 DB가 먼저 병목이 된다. 공간 기반 스타일은 처리 단위마다 메모리 데이터 그리드에 데이터를 복제해 두고 DB를 요청 처리 경로에서 뺀다. Richards는 tuple space 개념으로 캐시를 써서 DB 접근을 피하는 스타일이며 가장 탄력적인 스타일 가운데 하나라고 설명한다.

- **처리 단위**: 애플리케이션 코드와 메모리 데이터를 함께 가진 실행 단위다. 몰리는 기능의 처리 단위만 늘린다.
- **가상화 미들웨어**: 요청 분배(messaging grid), 처리 단위 사이 데이터 복제(data grid), 여러 처리 단위에 걸친 요청 조정(processing grid), 부하에 따른 처리 단위 기동과 종료(deployment manager)를 맡는다.
- **data pump, writer, reader**: 처리 단위의 변경을 data pump가 비동기로 보내고 data writer가 DB에 반영한다. 처리 단위가 비어 있는 상태에서 시작할 때는 data reader가 DB에서 읽어 채운다.

DB는 나중에 맞춰지므로 확정 통지나 후속 처리가 늦을 수 있다. 처리 단위 사이 복제 지연 동안 같은 데이터를 동시에 바꾸면 충돌이 생긴다. 메모리 용량과 비용, 테스트와 운영 난도가 높고, write-behind처럼 DB 반영 전 장애에는 손실 위험이 있다([[Cache-Strategies|캐시 쓰기 전략]]). IMDG 제품도 같은 선택을 설정으로 노출한다. Hazelcast 5.7은 `write-delay-seconds`가 0이면 write-through, 0보다 크면 write-behind로 동작한다. 폭주 구간만 줄 세우면 되는 문제라면 [[Virtual-Waiting-Room-Architecture|가상 대기열]]이 더 단순할 수 있다.

### 오케스트레이션 기반 SOA와 마이크로서비스

오케스트레이션 기반 SOA는 전사 재사용을 목표로 서비스를 계층으로 나누고 ESB와 orchestration 엔진이 업무 흐름을 조합했다. 재사용을 늘릴수록 공유 서비스와 ESB에 결합이 몰려 독립 변경과 확장이 어려워졌다. Fowler와 Lewis는 SOA라는 이름이 너무 많은 것을 뜻하고, 실제 구현은 대개 모놀리식 애플리케이션을 ESB로 통합하는 데 집중했다고 지적한다.

마이크로서비스는 반대로 재사용보다 경계 안의 독립성을 택한다. 중복을 허용하고, 서비스가 데이터를 소유하며, 로직은 서비스에 두고 통신 경로는 단순하게 유지한다. 상세는 [[Monolith-vs-Microservice|Monolith vs Microservice]]와 [[Microservice-Readiness-and-Maturity|마이크로서비스 준비도]]에서 다룬다.

## 스타일을 고르는 순서

1. **모놀리식인가 분산인가**: 시스템 전체가 한 묶음의 특성으로 충분하면 레이어드, [[Modular-Monolith|모듈러 모놀리스]], 마이크로커널부터 본다. 일부 기능만 다른 특성(예: 특정 기능만 탄력성)이 필요할 때 분산을 검토한다.
2. **서비스 입도**: 거친 도메인 서비스(서비스 기반)로 충분한가, 작은 서비스(마이크로서비스)의 독립성이 필요한가.
3. **데이터 위치**: 공유 DB, 논리 분리(schema와 쓰기 소유권), 물리 분리 중 무엇인가.
4. **통신 방식**: 동기 호출을 기본으로 두고 응답성, 확장성이나 결합 해소가 필요한 흐름만 비동기로 바꾸면 비동기 오류 처리 비용을 필요한 곳에만 낸다.
5. **함께 볼 입력**: 도메인 특성, 특성의 우선순위, 데이터 요구, 조직 구조와 역량, 개발과 운영 프로세스를 함께 본다.

스타일은 섞인다. 서비스 내부는 레이어드, 서비스 사이는 이벤트 기반처럼 층마다 다른 스타일을 쓰는 구성이 흔하다.

## 판단 태도

- Richards와 Ford의 첫째 법칙은 아키텍처의 모든 것이 트레이드오프라는 것이다. 트레이드오프가 없어 보이면 아직 찾지 못한 것이다. 완벽한 조합이 아니라 가장 덜 나쁜 조합을 고른다.
- 둘째 법칙은 어떻게보다 왜가 중요하다는 것이다. 구조는 코드에서 다시 읽을 수 있지만 선택의 이유는 기록하지 않으면 사라진다.
- 최신 스타일이라는 이유나 고객 요구를 그대로 따르는 것은 근거가 아니다. 비즈니스 요건, 도메인과 조직 역량을 근거로 더 나은 선택을 설명하고 설득하는 것도 엔지니어의 책임이다.

## 출처

- [Fundamentals of Software Architecture — O'Reilly, Mark Richards, Neal Ford](https://www.oreilly.com/library/view/fundamentals-of-software/9781492043447/)
- [Software Architecture: From Fundamentals to the Hard Parts — Tech Lead Journal, Neal Ford](https://techleadjournal.dev/episodes/120/)
- [Lesson 163 Service-Based Architecture — Software Architecture Monday, Mark Richards](https://www.developertoarchitect.com/lessons/lesson163.html)
- [Lesson 166 Space-Based Architecture — Software Architecture Monday, Mark Richards](https://www.developertoarchitect.com/lessons/lesson166.html)
- [Microservices — martinfowler.com, James Lewis, Martin Fowler](https://martinfowler.com/articles/microservices.html)
- [Microsoft Azure Architecture Center, Event-driven architecture style](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/event-driven)
- [Microsoft Azure Architecture Center, Pipes and Filters pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/pipes-and-filters)
- [Eclipse Platform Plug-in Developer Guide, Platform architecture](https://help.eclipse.org/latest/topic/org.eclipse.platform.doc.isv/guide/arch.htm)
- [Hazelcast Platform 5.7, Configuring a MapStore](https://docs.hazelcast.com/hazelcast/5.7/mapstore/configuration-guide)
- [인프런, han jeong heon, 아키텍처 개념 과 레이어드 아키텍처](https://www.inflearn.com/courses/lecture?courseId=328412&unitId=104421)
- [인프런, han jeong heon, 서비스기반 아키텍처 스타일](https://www.inflearn.com/courses/lecture?courseId=328412&unitId=104422)
- [인프런, han jeong heon, 이벤트기반 아키텍처 스타일등](https://www.inflearn.com/courses/lecture?courseId=328412&unitId=113002)

## 관련 문서

- [[Why-Architecture-Matters|소프트웨어 아키텍처의 중요성]]
- [[Architecture-Decision-Making|아키텍처 의사결정]]
- [[Layered-Clean-Hexagonal|Layered, Clean, Hexagonal]]
- [[Modular-Monolith|모듈러 모놀리스]]
- [[Event-Driven-Architecture|EDA 결정 프레임워크]]
- [[Reactive-Systems-Principles|리액티브 시스템 원칙]]
- [[Monolith-vs-Microservice|Monolith vs Microservice]]
- [[Microservice-Data-Ownership-and-Queries|마이크로서비스 데이터 소유권과 교차 서비스 조회]]
