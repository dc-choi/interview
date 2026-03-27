---
tags: [testing]
status: index
category: "테스트&품질(Testing&Quality)"
aliases: ["테스트&품질(Testing&Quality)", "Testing & Quality"]
---

# 테스트&품질(Testing&Quality)

## Checklist
- [x] Unit test
- [x] Integration test
- [ ] [[E2E-Test|E2E test (supertest)]]
- [ ] [[Contract-Test|Contract test]]
- [x] [[Test-Fixture|Test fixture 전략]]
- [x] [[Test-Isolation|Test isolation]]
- [ ] [[Deterministic-Test|Deterministic test]]
- [ ] [[Load-Test-Automation|Load test automation]]
- [ ] [[Chaos-Testing|Chaos testing (optional)]]
- [x] [[performance|성능 테스트 유형]]

## 현장사례
- [[11st-Engineer-Seminar#테스트전략|11번가 테스트 전략]] — 컨트롤러→통합, 서비스→단위, Mock 최소화
- [[11st-Engineer-Seminar#코드리뷰Pn룰|코드리뷰 Pn룰]] — P1~P5 중요도 태그로 리뷰 효율화
- [[Kakao-Ent-Seminar#테스팅|카카오엔터 테스팅]] — 사전 과제에서 테스트 코드 없으면 탈락
- [x] [[Service-Layer-Testing|서비스 레이어와 테스트 경계]]

## 단위 테스트
1. 개별 소프트웨어 구성 요소를 테스트하는 소프트웨어 테스트의 한 유형
2. 모듈 단위로 완전히 분리해서 테스트를 진행
3. 다른 시스템의 개입 없이 테스트를 진행

## 통합 테스트
1. 모듈간의 인터페이스를 테스트하기에 광범위한 유형의 테스트
2. 각 인터페이스의 연결을 확인하기에 다른 시스템과의 연결을 테스트를 진행

## [[performance|성능 테스트]]
1. 시스템의 성능을 측정하는 테스트이며 시스템의 성능을 측정하고, 성능을 최적화하는데 사용함.
2. 시스템의 응답 시간, 처리량, 안정성, 확장성, 리소스 사용량 등을 측정

## Stub
1. 가짜 객체를 인스턴스화하여 실제로 동작하는 것처럼 보이게 만드는 객체
2. 해당 인터페이스나 클래스를 최소한으로 구현
3. 호출된 요청에 대해서 미리 프로그래밍된 것 외에 응답하지 않음

## Mock
1. 호출에 대한 기대를 명세하고, 내용에 따라 동작하도록 프로그래밍 된 객체입니다.
2. 테스트 작성을 위한 환경 구축이 어려울 때, 테스트하고자 하는 코드와 엮인 객체들을 대신하기 위해 만들어진 객체입니다.

## Stub과 Mock의 차이
- Stub은 상태 검증을 사용하고 Mock은 행위 검증을 사용합니다.
- 상태 검증: 메서드가 수행된 후, 객체의 상태를 확인하여 올바르게 동작했는지를 확인하는 검증법
- 행위 검증: 메서드의 리턴 값으로 판단할 수 없는 경우, 특정 동작을 수행하는지 확인하는 검증법
