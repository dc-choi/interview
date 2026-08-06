---
tags: [architecture, microservices, decomposition, ddd, bounded-context, service-boundary]
status: done
verified_at: 2026-08-04
category: "Architecture - 진화"
aliases: ["Microservice Decomposition", "서비스 분해", "마이크로서비스 경계 설계"]
---

# 마이크로서비스 서비스 분해

서비스 분해의 목표는 작은 서비스를 많이 만드는 것이 아니라 **변경이 한 경계 안에서 끝나게 하는 것**이다. 경계를 잘못 나누면 한 기능을 출시할 때 여러 팀, API와 데이터베이스가 함께 바뀌어 모놀리스보다 느린 분산 모놀리스가 된다.

## 좋은 경계의 조건

| 조건 | 확인 질문 |
|---|---|
| 높은 응집도 | 같은 비즈니스 규칙 때문에 바뀌는 코드와 데이터가 함께 있는가 |
| 낮은 결합도 | 내부 구현을 바꿔도 다른 서비스의 계약이 유지되는가 |
| 독립 전달 | 다른 서비스의 동시 배포 없이 변경을 출시할 수 있는가 |
| 데이터 소유권 | 쓰기 권한과 기준 시스템이 하나로 정해져 있는가 |
| 팀 소유권 | 한 팀이 개발부터 운영까지 책임질 수 있는가 |
| 비즈니스 완결성 | 기술 계층이 아니라 사용자 가치의 한 조각을 제공하는가 |

서비스 크기는 결과다. 이름의 길이, 코드 줄 수, 테이블 개수나 팀 인원만으로 경계를 정하지 않는다.

## 네 가지 입력을 함께 본다

### 1. 비즈니스 역량

회사가 가치를 만들기 위해 하는 일에서 출발한다. 주문 관리, 재고 관리, 배송처럼 비교적 안정적인 역량은 기술 계층보다 오래가는 경계 후보가 된다.

### 2. 하위 도메인과 Bounded Context

같은 단어가 다른 규칙과 모델을 갖는 지점을 찾는다. 상품이라는 말이 카탈로그에서는 설명과 탐색의 대상이고, 재고에서는 수량과 예약의 대상이라면 모델을 분리할 근거가 된다. [[DDD|DDD의 Bounded Context]]는 언어와 모델의 경계이며 서비스와 항상 1:1일 필요는 없다.

### 3. 변경과 런타임 증거

- 같은 PR이나 릴리스에서 반복해 함께 바뀌는 파일과 테이블
- 팀 사이 handoff와 동시 배포 횟수
- 호출 깊이, 지연과 장애 전파 경로
- 독립 확장이 필요한 hot spot
- 한 트랜잭션에서 반드시 지켜야 하는 불변식

추상적인 도메인 그림과 실제 변경 기록이 다르면 경계를 다시 검토한다.

### 4. 조직 경계

서비스는 운영 책임의 단위다. 한 팀이 여러 작은 서비스를 계속 조율해야 하거나 한 서비스에 여러 팀이 상시 승인해야 한다면 경계와 조직이 어긋난다. Conway 법칙은 조직도를 그대로 복제하라는 규칙이 아니라, 의사소통 비용을 설계 입력으로 보라는 경고다.

## 분해 절차

1. **핵심 사용자 흐름을 적는다**: 주문 생성처럼 시작, 성공, 실패와 보상까지 end-to-end로 본다.
2. **command, event, 데이터와 불변식을 찾는다**: 누가 상태를 바꾸고 어떤 사실을 외부에 알리는지 표시한다.
3. **같은 이유로 변하는 것을 묶는다**: capability와 subdomain 후보를 세운다.
4. **공개 계약을 먼저 그린다**: API, event, 오류, timeout과 일관성 기대를 정의한다.
5. **결합 비용을 시뮬레이션한다**: 대표 변경이 몇 서비스와 팀을 건드리는지, 한 장애가 어디까지 번지는지 확인한다.
6. **모듈 경계로 검증한다**: 가능하면 [[Modular-Monolith|모듈러 모놀리스]]에서 의존성과 데이터 접근을 먼저 강제한다.
7. **독립 가치가 큰 경계부터 추출한다**: 변화율, 부하, 규제나 팀 독립성이 실제로 다른 부분을 우선한다.
8. **운영 결과로 재평가한다**: lead time과 복구 시간이 나빠지면 더 나누지 않고 경계를 이동하거나 합친다.

## 경계 검증 시나리오

후보 경계마다 다음 변경을 대입해 본다.

- 가격 정책 하나를 바꿀 때 몇 서비스를 동시에 배포하는가
- 주문 취소 시 어느 서비스가 최종 결정을 내리고 어떤 보상을 지시하는가
- 재고 서비스가 멈췄을 때 상품 조회는 어떤 품질로 계속되는가
- 고객 데이터 삭제 요청을 어느 소유자가 끝까지 증명하는가
- 특정 기능만 열 배 확장할 때 상태와 병목도 함께 분리되는가

답이 여러 경계에 흩어지면 서비스가 너무 작거나 불변식이 잘린 것일 수 있다. 한 서비스가 서로 무관한 변화 이유를 너무 많이 가지면 너무 클 수 있다.

## 피해야 할 분해 기준

- **기술 계층별 서비스**: controller, business, data를 원격 호출로 나누면 모든 기능이 전 계층을 횡단한다.
- **엔티티 하나당 서비스**: CRUD 모델은 비즈니스 규칙과 트랜잭션 경계를 설명하지 못한다.
- **명사/동사 자동 추출**: 도메인 탐색의 시작점일 뿐 소유권과 불변식을 증명하지 않는다.
- **재사용을 위한 공통 서비스 남발**: 변경이 다른 기능까지 묶이고 중앙 병목이 될 수 있다.
- **독립 배포 없는 프로세스 분리**: 네트워크 비용만 추가한 분산 모놀리스가 된다.
- **초기부터 최대 세분화**: 학습 전 경계를 굳혀 기능 이동과 데이터 분리를 비싸게 만든다.

## 운영 지표로 보는 경계 품질

- 한 기능의 cross-service change ratio
- coordinated deployment와 contract break 횟수
- 동기 호출 fan-out과 critical path 깊이
- 서비스 간 직접 DB 접근과 임시 데이터 복제 수
- 팀 간 handoff 시간과 owner 불명확 incident 수
- 서비스별 변경 실패율과 복구 시간

경계가 좋다는 주장은 다이어그램이 아니라 변경과 장애가 실제로 국소화되는지로 검증한다.

## 출처

- [Chris Richardson, Decompose by business capability](https://microservices.io/patterns/decomposition/decompose-by-business-capability.html)
- [Chris Richardson, Decompose by subdomain](https://microservices.io/patterns/decomposition/decompose-by-subdomain.html)
- [Dowon Lee 강사, Decomposition 개요](https://www.inflearn.com/courses/lecture?courseId=332731&unitId=286782)
- [Dowon Lee 강사, Service Decomposition 실습](https://www.inflearn.com/courses/lecture?courseId=332731&unitId=286783)
- [Dowon Lee 강사, 서비스 분해 시 고려사항](https://www.inflearn.com/courses/lecture?courseId=332731&unitId=286784)

## 관련 문서

- [[Microservice-Readiness-and-Maturity|마이크로서비스 준비도와 성숙도]]
- [[DDD|DDD]]
- [[Modular-Monolith|모듈러 모놀리스]]
- [[Saga-Pattern|Saga 패턴]]
- [[Architecture-Fitness-Functions|아키텍처 Fitness Function]]
