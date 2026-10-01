---
tags: [testing, component-test, microservice, service-virtualization, test-double]
status: done
verified_at: 2026-09-30
category: "테스트&품질(Testing&Quality)"
aliases: ["Component Test", "컴포넌트 테스트", "Service Virtualization", "서비스 가상화"]
---

# 마이크로서비스 컴포넌트 테스트와 서비스 가상화

[[Test-Pyramid|테스트 피라미드]]를 마이크로서비스에 적용할 때는 Unit, Integration, Component, Contract, E2E로 나누는 분류가 흔하다. 이 문서는 서비스 하나를 격리해 검증하는 Component Test의 범위와 구현 선택, 의존 서비스를 흉내 내는 서비스 가상화를 다룬다. 프론트엔드에서 UI 컴포넌트 하나를 렌더링해 검증하는 컴포넌트 테스트와는 다른 뜻이다.

## 정의와 다른 계층과의 경계

martinfowler.com의 Testing Strategies in a Microservice Architecture(2014)는 컴포넌트 테스트를 실행 범위를 시스템의 일부로 제한하고, 내부 코드 인터페이스로 조작하며, 다른 컴포넌트는 test double로 격리하는 테스트로 정의한다. 마이크로서비스에서는 서비스 자체가 컴포넌트다. 서비스 하나의 동작을 소비자 관점에서 깊게 검증하면서도 여러 서비스를 함께 띄우는 테스트보다 빠르고, 대역으로 의존 서비스의 오류를 반복해서 재현할 수 있다.

| 유형 | 범위와 대역 | 주로 잡는 결함 |
|---|---|---|
| Unit | 함수나 클래스. 필요하면 협력 객체를 대역으로 | 로직 분기 |
| Integration | 게이트웨이, 리포지토리 같은 통합 코드와 실제 외부 구성 요소(다른 서비스, DB, 캐시) | 누락된 HTTP 헤더, 요청과 응답 본문 불일치, 스키마와 ORM 매핑 불일치 |
| Component | 서비스 하나 전체. 다른 서비스는 대역, DB는 실제 또는 메모리 대체 | 서비스가 소비자에게 약속한 동작, 의존 서비스의 오류와 지연 처리 |
| Contract | 소비자가 실제로 쓰는 요청과 응답의 속성 | 제공자 변경이 깨뜨리는 소비자 기대. 동작을 깊게 보지 않으므로 Component Test가 아니다 |
| E2E | 배포된 시스템 전체. 의존 서비스는 대개 실제 | 서비스 사이 메시지, 방화벽이나 로드밸런서 같은 네트워크 설정, 핵심 사용자 여정 |

계층 이름이 가리키는 범위는 자료마다 다르다. 서비스 안 여러 모듈의 연계(컨트롤러부터 DB까지)를 통합 테스트로 부르는 자료도 있으므로, 팀 안에서는 이름보다 실행 범위와 대역을 명시해 합의한다. 통합 테스트에 H2 같은 메모리 DB를 권하는 자료도 있지만 DB 특화 기능이 빠지므로 실제 엔진을 우선한다([[Test-Pyramid#Integration Test|Integration Test]]).

## in-process와 out-of-process

| 방식 | 구성 | 강점 | 대가 |
|---|---|---|---|
| in-process | 서비스를 테스트 프로세스 안에서 띄운다. 게이트웨이는 메모리 대역으로, DB는 필요하면 메모리 구현으로 바꾼다 | 외부 네트워크가 없어 빠르고 움직이는 부품이 적다. 의존 서비스의 중단, 지연, 잘못된 응답을 반복해서 재현한다 | 테스트 모드로 기동하도록 배선을 바꿔야 한다(DI 설정). 메모리 DB를 쓰면 실제 저장소가 경계 밖으로 빠지므로 영속성 통합 테스트가 따로 필요하다 |
| out-of-process | 배포 산출물을 별도 프로세스로 띄우고 실제 네트워크로 호출한다. 의존 서비스는 프로세스 밖 스텁 서버가 대신한다 | 산출물을 바꾸지 않고 네트워크 설정과 클라이언트, 영속 모듈까지 검증한다 | 스텁 기동과 종료, 포트와 설정 조율이 테스트 하네스로 넘어가고 실행이 느려진다 |

통합, 영속성, 기동 로직이 복잡한 서비스일수록 out-of-process가 맞는다. NestJS로 옮기면 in-process는 `Test.createTestingModule`로 앱 모듈을 올리고 외부 서비스 클라이언트 provider를 `overrideProvider`로 대역에 바꾼 뒤 HTTP 요청을 보내는 형태다([[NestJS-Testing-E2E-and-Scope|NestJS E2E와 테스트 범위]]). out-of-process는 빌드한 이미지를 띄우고 의존 서비스 URL을 스텁 서버로 향하게 설정하며, DB와 스텁 서버를 컨테이너로 함께 올린다([[TestContainers-Integration|Testcontainers]]).

## 서비스 가상화

의존 서비스의 동작을 흉내 내는 스텁 서버를 테스트 환경에 두는 기법이다. 응답은 API로 동적으로 설정하거나, 손으로 쓴 fixture 데이터로 주거나, 실제 서비스의 요청과 응답을 기록해 재생해서 만든다.

- 쓰는 곳: out-of-process 컴포넌트 테스트의 의존 서비스, 아직 없거나 느리고 불안정한 외부 API. E2E에서는 의존 서비스를 경계 안에 두는 것이 기본이다. 제3자 서비스라 반복 가능하고 부작용 없는 호출이 어렵거나 불안정해 실패가 잦을 때만 스텁으로 뺀다. E2E 신뢰도 일부를 안정성과 바꾸는 선택이므로 뺀 서비스는 다른 테스트로 검증한다.
- 실패 양상: 손으로 쓰거나 기록한 스텁이 실제 서비스의 변경을 따라가지 못하면 테스트는 통과하고 운영은 깨진다. 스텁을 계약에 묶어 제공자 쪽에서 검증한다. Spring Cloud Contract는 계약에서 제공자 검증 테스트와 소비자가 쓸 WireMock 스텁을 함께 만들고, 소비자는 Stub Runner로 그 스텁을 띄운다(5.0 문서 기준). 계약 테스트 자체는 [[Test-Pyramid#Contract Test|Contract Test]]에 있다.
- 부하 테스트: 의존 서비스를 가상화하면 공유 환경이나 의존 서비스의 용량에 막히지 않고 대상 서비스만 측정할 수 있다. 가상 응답의 지연은 실제와 다르므로 결과는 대상 서비스에 한정해 해석하고, 부하 중 지표 수집과 판정은 [[performance|성능 테스트]]를 따른다.

도구(2026-09-30 공식 문서와 GitHub 릴리스 기준):

- WireMock: HTTP API 목 서버. JUnit에 내장하거나 독립 JAR, Docker로 띄우고 record and playback과 장애, 지연 주입을 지원한다. 안정판은 3.x이고 4.0은 beta다.
- Hoverfly: 서비스 가상화, API 시뮬레이션 도구. 프록시로 동작하며 capture 모드로 실제 호출을 기록하고 simulate 모드로 재생한다. spy 모드는 기록에 없는 요청만 실제 API로 넘긴다.
- in-process 대역은 Mockito나 Jest mock 같은 프로세스 안의 test double로 충분하다([[Classicist-vs-Mockist-Testing|Test Double]]).

## 출처

- [Testing Strategies in a Microservice Architecture — martinfowler.com](https://martinfowler.com/articles/microservice-testing/)
- [Component Test — martinfowler.com](https://martinfowler.com/bliki/ComponentTest.html)
- [WireMock, Documentation](https://wiremock.org/docs/)
- [WireMock Releases — GitHub](https://github.com/wiremock/wiremock/releases)
- [Hoverfly, Documentation](https://docs.hoverfly.io/en/latest/)
- [Hoverfly, Capture Mode](https://docs.hoverfly.io/en/latest/pages/keyconcepts/modes/capture.html)
- [Hoverfly, Spy Mode](https://docs.hoverfly.io/en/latest/pages/keyconcepts/modes/spy.html)
- [Hoverfly Releases — GitHub](https://github.com/SpectoLabs/hoverfly/releases)
- [Spring Cloud Contract, Introducing Spring Cloud Contract](https://docs.spring.io/spring-cloud-contract/reference/getting-started/introducing-spring-cloud-contract.html)
- [인프런, Dowon Lee, Testing Strategies](https://www.inflearn.com/courses/lecture?courseId=332731&unitId=290729)
- [인프런, Dowon Lee, Testing Pyramid](https://www.inflearn.com/courses/lecture?courseId=332731&unitId=290730)

## 관련 문서

- [[Test-Pyramid|Practical Test Pyramid]]
- [[Test-Pyramid-Blind-Spots|초록불이 못 잡는 것]]
- [[Mock-Testing-Strategy|Mock 테스트 설계 전략]]
- [[NestJS-Testing|NestJS Testing]]
- [[TestContainers-Integration|Testcontainers 통합 테스트]]
- [[Load-Test-Automation|부하 테스트 자동화]]
