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
- [x] [[framework-testing|프레임워크 테스트 (프레임워크 DI 컨테이너 위의 테스트 경계, Jest mock과 matcher, Spring test context와 MockMvcTester, NestJS TestingModule override와 request-scoped, 쿠키 인증 E2E, 동적 모듈 스텁)]]
- [x] [[HTTP-API-Integration-Testing|HTTP API 통합 테스트 (검증 범위 구분, CRUD 계약 행렬, 전역 HTTP 설정 공유, 실제 DB와 migration 격리, 테스트 출력의 로그)]]
- [x] [[HTTP-API-Integration-Testing-Failure-Paths|HTTP API 실패 경로 테스트 (한 규칙만 위반, 400, 404, 409 판정 순서, 값 없음과 형식 오류, 라우팅 404 구분, 오류 본문 계약)]]
- [x] [[Test-Pyramid|Contract test (Consumer-Driven Contract, Pact, Spring Cloud Contract, CI 역할)]]
- [x] [[Test-Double-Strategy|Test fixture 전략, 테스트 대역 (Classicist vs Mockist, Mock 설계 전략, Test Double, 상태별 fixture와 시나리오 준비)]]
- [x] [[Test-Isolation|Test isolation (상태 초기화, Mock 격리, 컨텍스트 분리, 순차 실행 완화책)]]
- [x] [[Deterministic-Test|Deterministic test]] — 기존 보강: [[Test-Isolation|순서 독립, 상태 초기화, fake timer]], [[NestJS-Testing|NestJS 테스트 격리]]
- [x] [[Property-Based-Testing|속성 기반 테스트]] — 입력 생성과 판정 규칙, shrinking, 회귀 사례 보존과 명세 추적
- [x] [[NestJS-Testing-Transport-and-Contracts|NestJS transport와 계약 테스트]], [[NestJS-Testing-Durable-Processes|웹훅과 durable workflow의 실패 복구 검증]]
- [x] [[Load-Test-Automation|Load test automation]] — 기존 보강: [[performance|SLO 역산 threshold로 CI 판정 자동화]], [[Load-Test-K6|k6 도구와 실행 설정]], [[Test-Pyramid|성능 테스트의 파이프라인 위치]]
- [x] [[Chaos-Testing|Chaos testing (optional)]]
- [x] [[performance|성능 테스트 (유형별 종료 조건, 핵심 지표, open과 closed 부하 모델, 스파이크 설계와 종단 간 유실 측정, threshold CI 판정, 생성기 병목 확인, 실행 절차와 결과 리포트)]]
- [x] [[TDD-BDD|TDD, BDD (Red-Green-Refactor, 세 법칙의 적용 범위, 비용과 회수 시점, 집중 실행과 watch, Given-When-Then)]]
- [x] [[TDD-Refactoring-Practice|TDD 리팩토링 연습법 (다음 테스트 선택, Fake It과 삼각법, Getting Stuck, TPP 가설, Working Skeleton과 외부 연동)]]
- [x] [[Legacy-Code-Testing|레거시 테스트 (특성화와 승인 기준선, 조합 입력, 커버리지와 변이 테스트의 한계)]]
- [x] [[Test-Pyramid|Practical Test Pyramid (Unit, Integration, Component, Contract, E2E, 아이스크림 콘 안티패턴)]]
- [x] [[Test-Pyramid-Component-Test|컴포넌트 테스트와 서비스 가상화 (서비스 단위 격리, in-process와 out-of-process, 스텁 서버와 계약 연동)]]
- [x] [[Device-Farm|Device Farm (모바일 실기기 E2E 자원 풀, lease 기반 점유, 원격 제어, 운영과 구축 판단)]]
- [x] [[Test-Pyramid-Blind-Spots|초록불이 못 잡는 것 (배포/인프라 경계, 스모크 실행, 계약 부재의 죽은 코드)]]
- [x] [[Integration-Test-Environment|통합 테스트 환경 (Testcontainers, LocalStack, 테스트 @Transactional 안티패턴)]]
- [x] [[Test-Strategy-Layers|테스트 전략과 계층 폴더 인덱스 (피라미드 계층별 범위, 서비스 레이어 테스트 경계, 계층이 못 잡는 사각지대)]]
- [x] [[Natural-Language-E2E-Agent|자연어 E2E 테스트 에이전트 (접근성 트리 우선과 비전 폴백, 반응형 vs 계획형 프로파일, 결정성과 검증 게이트, CI 비용, ARTEMIS)]]

## 현장사례
- [[11st-Engineer-Seminar#테스트전략|11번가 테스트 전략]] — 컨트롤러→통합, 서비스→단위, Mock 최소화
- [[11st-Engineer-Seminar#코드리뷰Pn룰|코드리뷰 Pn룰]] — P1~P5 중요도 태그로 리뷰 효율화
- [[Kakao-Ent-Seminar#테스팅|카카오엔터 테스팅]] — 사전 과제에서 테스트 코드 없으면 탈락
- [[TS-Backend-Meetup-10#세션 1: AI 시대의 테스팅 (이세호, @D.Circle)|AI 시대의 테스팅]] — 구현 은닉, 고전파 vs 런던파, LLM-as-a-judge, 테스트 피라미드 재해석
- [x] [[Service-Layer-Testing|서비스 레이어와 테스트 경계]]
