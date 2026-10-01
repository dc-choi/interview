---
tags: [architecture, microservices, platform, outer-architecture]
status: done
verified_at: 2026-10-01
category: "Architecture - 진화"
aliases: ["Microservice Outer Architecture", "MSA 외부 아키텍처", "아우터 아키텍처"]
---

# 마이크로서비스 외부 아키텍처

내부 아키텍처는 서비스 안의 도메인 모델, 계층과 의존 방향을 다룬다. 외부 아키텍처는 여러 서비스를 배포하고 연결하며 운영하는 기반을 다룬다. 이 구분은 제품 세대의 순위가 아니라 서로 다른 책임을 놓치지 않기 위한 지도다.

## 문제에서 운영 패턴으로

| 문제 | 필요한 패턴 | 상세 문서 |
|---|---|---|
| 실행 환경과 배포가 매번 다름 | image, orchestration, CI/CD, IaC | [[CICD-Basics]], [[IaC]] |
| 인스턴스 주소가 계속 바뀜 | discovery, routing, load balancing | [[Microservice-Edge-and-Composition-Patterns]], [[K8s-Core-Workloads-and-Service]] |
| 채널마다 호출과 응답 모양이 다름 | Gateway, BFF, composition | [[Microservice-Edge-and-Composition-Patterns]] |
| 환경별 설정과 secret을 코드에서 분리 | 외부 설정과 주입 | [[K8s-Configuration-Storage-and-Probes]] |
| 로그와 호출 관계가 분산됨 | 중앙 로그, trace, metric | [[Container-Monitoring]], [[OpenTelemetry]] |
| 부분 장애가 호출 사슬로 전파됨 | timeout, 제한된 retry, circuit breaker, bulkhead | [[External-Service-Resilience]] |
| 서비스 간 통신 정책이 파편화됨 | service mesh와 identity 정책 | [[Istio-Ambient-Mode]] |
| 서로 다른 소유자가 데이터를 변경함 | 소유권, Saga, outbox와 조회 projection | [[Microservice-Data-Ownership-and-Queries]], [[Saga-Pattern]] |

discovery는 이름을 현재 endpoint로 찾고, routing은 목적지로 보내며, load balancing은 여러 endpoint 사이에 부하를 배분한다. 서로 함께 쓰이지만 같은 책임은 아니다.

## 패턴마다 구현 위치를 고른다

| 구현 위치 | 얻는 것 | 받아들이는 비용 |
|---|---|---|
| 서비스 라이브러리와 chassis | 언어 기능과 업무 맥락에 가까운 처리 | 의존성 갱신, 재빌드와 언어별 지원 |
| 배포 플랫폼 | Service/DNS, 실행 자원과 배포의 공통 관리 | 플랫폼 구성과 운영 전문성 |
| Gateway와 mesh data plane | 서비스 밖에서 routing과 통신 정책 적용 | proxy 비용, control plane과 장애 분석 |
| CSP 관리형 서비스 | 구축과 일부 운영 부담 위임 | 비용, quota, 접근 정책과 이전 비용 |

이들은 대체 관계와 보완 관계를 함께 가진다. Kubernetes Service의 endpoint 관리가 업무 fallback을 결정해 주지는 않으며, mesh의 통신 보안이 주문 소유권 검증을 대신하지 않는다. 메시도 sidecar만으로 구성되는 것은 아니다. 관심사별 owner를 정하고 retry나 timeout을 여러 위치에 중복 설정할 때의 총 비용을 확인한다.

## 인증 배치도 신뢰 경계를 따른다

서비스별 인증 라이브러리는 가까운 검증 대신 반복 갱신 비용이 있다. 중앙 인증 서비스의 매 요청 호출은 정책을 모으지만 지연과 가용성 의존을 만든다. Gateway에서 토큰이나 세션을 검증하면 진입 정책을 통일할 수 있지만 내부 호출, 우회 경로와 도메인 권한 검증은 서비스에 남는다. 세션 상태를 둘지 토큰을 검증할지는 별도 결정이다([[Auth-Method-Selection]]).

## 밖으로 옮겨도 남는 애플리케이션 책임

- mesh proxy가 span을 만들어도 애플리케이션은 수신 요청의 trace context를 후속 호출에 전파해야 한 trace로 연결된다.
- 중앙 로그 수집만으로 업무 성공과 실패를 알 수 없다. 애플리케이션이 의미 있는 사건, 오류와 상관 식별자를 남겨야 한다.
- 플랫폼 health와 연결 성공은 업무 불변식의 성립을 보장하지 않는다.
- retry, fallback과 비동기 처리가 안전한지는 멱등성, 기한과 업무 상태로 정한다.

## 아키텍처 결정으로 남길 것

먼저 실제 문제와 필요한 품질 속성을 정하고 패턴을 고른다. 그 뒤 각 패턴의 구현 위치, 제품, 책임자, 실패 시 동작과 검증 지표를 [[ADR]]에 남긴다. 라이브러리에서 플랫폼이나 메시로 이동한다면 이전 정책 제거와 혼합 배포도 검증한다.

운영 도구가 많아지는 것이 목표는 아니다. 플랫폼, 메시와 관리형 서비스를 조합한 뒤에도 필요한 역량을 팀이 실제로 운영할 수 있는지는 [[Microservice-Readiness-and-Maturity|준비도]]로 판단한다.

## 출처

- [Kubernetes, Service](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Istio, Distributed tracing overview](https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/)
- [Chris Richardson, Microservice chassis](https://microservices.io/patterns/microservice-chassis.html)
- [han jeong heon 강사, MSA 패턴 유형](https://www.inflearn.com/courses/lecture?courseId=328412&unitId=104424)
- [han jeong heon 강사, 인프라 패턴: VM과 컨테이너](https://www.inflearn.com/courses/lecture?courseId=328412&unitId=104425)
- [han jeong heon 강사, CSP](https://www.inflearn.com/courses/lecture?courseId=328412&unitId=113594)
- [han jeong heon 강사, 컨테이너 오케스트레이션](https://www.inflearn.com/courses/lecture?courseId=328412&unitId=106689)
- [han jeong heon 강사, MSA생태계의 발전과 패턴의 탄생](https://www.inflearn.com/courses/lecture?courseId=328412&unitId=106690)
- [han jeong heon 강사, Spring Cloud , BFF, API GW](https://www.inflearn.com/courses/lecture?courseId=328412&unitId=104428)
- [han jeong heon 강사, 라우팅, 로드밸런싱, 서비스 탐색](https://www.inflearn.com/courses/lecture?courseId=328412&unitId=104429)
- [han jeong heon 강사, 인증/인가](https://www.inflearn.com/courses/lecture?courseId=328412&unitId=113671)
- [han jeong heon 강사, Config Management](https://www.inflearn.com/courses/lecture?courseId=328412&unitId=113672)
- [han jeong heon 강사, 중앙화된 로깅, 추적 ,매트릭, 서킷브레이크](https://www.inflearn.com/courses/lecture?courseId=328412&unitId=113673)
- [han jeong heon 강사, 서비스 메시](https://www.inflearn.com/courses/lecture?courseId=328412&unitId=113674)

## 관련 문서

- [[Microservice-Edge-and-Composition-Patterns|공통 관심사의 구현 위치]]
- [[Microservice-Readiness-and-Maturity|마이크로서비스 준비도]]
- [[Layered-Clean-Hexagonal|서비스 내부 구조]]
