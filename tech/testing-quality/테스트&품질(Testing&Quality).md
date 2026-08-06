---
tags: [testing]
status: index
category: "테스트&품질(Testing&Quality)"
aliases: ["테스트&품질(Testing&Quality)", "Testing & Quality"]
---

# 테스트&품질(Testing&Quality)

## Checklist
- [x] [[Test-Pyramid#Unit Test|Unit test (단위 범위, AAA 구조, 격리와 실행 비용)]]
- [x] [[Test-Pyramid#Integration Test|Integration test (외부 의존과의 상호작용 검증 범위)]]
- [x] [[framework-testing|프레임워크 테스트 (프레임워크 DI 컨테이너 위의 테스트 경계, Jest mock, Spring test context, NestJS TestingModule override와 request-scoped, 동적 모듈 스텁)]]
- [x] [[HTTP-API-Integration-Testing|HTTP API 통합 테스트 (검증 범위 구분, CRUD 계약 행렬, 전역 HTTP 설정 공유, 실제 DB와 migration 격리)]]
- [x] [[Test-Pyramid|Contract test (Consumer-Driven Contract, Pact, Spring Cloud Contract, CI 역할)]]
- [x] [[Test-Double-Strategy|Test fixture 전략, 테스트 대역 (Classicist vs Mockist, Mock 설계 전략, Test Double)]]
- [x] [[Test-Isolation|Test isolation (상태 초기화, Mock 격리, 컨텍스트 분리, 순차 실행 완화책)]]
- [ ] Deterministic test (작성 예정: `Deterministic-Test`) — 기존 보강: [[Test-Isolation|순서 독립, 상태 초기화, fake timer]], [[NestJS-Testing|NestJS 테스트 격리]]
- [ ] Load test automation (작성 예정: `Load-Test-Automation`) — 기존 보강: [[performance|SLO 역산 threshold로 CI 판정 자동화]], [[Load-Test-K6|k6 도구와 시나리오]], [[Test-Pyramid|성능 테스트의 파이프라인 위치]]
- [ ] Chaos testing (optional) (작성 예정: `Chaos-Testing`)
- [x] [[performance|성능 테스트 (유형별 종료 조건, 핵심 지표, open과 closed 부하 모델, threshold CI 판정, 생성기 병목 확인)]]
- [x] [[TDD-BDD|TDD, BDD (Red-Green-Refactor, Given-When-Then, 조합 전략)]]
- [x] [[TDD-Refactoring-Practice|TDD 리팩토링 연습법 (의식적인 연습, 정량적 제약, 장난감 프로젝트, 학습 테스트, 원시값 포장, 팀 전파)]]
- [x] [[Test-Pyramid|Practical Test Pyramid (Unit, Integration, Contract, E2E, 아이스크림 콘 안티패턴)]]
- [x] [[Test-Pyramid-Blind-Spots|초록불이 못 잡는 것 (배포/인프라 경계, 스모크 실행, 계약 부재의 죽은 코드)]]
- [x] [[Integration-Test-Environment|통합 테스트 환경 (Testcontainers, LocalStack, 테스트 @Transactional 안티패턴)]]

## 현장사례
- [[11st-Engineer-Seminar#테스트전략|11번가 테스트 전략]] — 컨트롤러→통합, 서비스→단위, Mock 최소화
- [[11st-Engineer-Seminar#코드리뷰Pn룰|코드리뷰 Pn룰]] — P1~P5 중요도 태그로 리뷰 효율화
- [[Kakao-Ent-Seminar#테스팅|카카오엔터 테스팅]] — 사전 과제에서 테스트 코드 없으면 탈락
- [[TS-Backend-Meetup-10#세션 1: AI 시대의 테스팅 (이세호, @D.Circle)|AI 시대의 테스팅]] — 구현 은닉, 고전파 vs 런던파, LLM-as-a-judge, 테스트 피라미드 재해석
- [x] [[Service-Layer-Testing|서비스 레이어와 테스트 경계]]
