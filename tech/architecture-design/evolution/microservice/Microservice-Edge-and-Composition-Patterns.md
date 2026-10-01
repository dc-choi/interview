---
tags: [architecture, microservices, api-gateway, bff, aggregation, service-discovery]
status: done
verified_at: 2026-08-04
category: "Architecture - 진화"
aliases: ["Microservice Edge Patterns", "BFF and Gateway", "마이크로서비스 경계 패턴"]
---

# 마이크로서비스 경계와 조합 패턴

클라이언트가 서비스의 위치와 분해 구조를 모두 알게 하면 한 화면이 많은 네트워크 호출, 인증 지점과 장애 모드를 떠안는다. 경계 계층은 이를 숨기지만, 역할을 한 곳에 몰면 새로운 거대 모놀리스가 된다.

## 패턴별 책임

| 패턴 | 해결하는 문제 | 맡길 책임 | 주요 위험 |
|---|---|---|---|
| API Gateway | 외부 진입점과 공통 정책이 흩어짐 | routing, TLS, 인증 검증, rate limit, 관측 | 병목, 단일 장애점, 비즈니스 로직 누적 |
| Gateway Aggregation | 한 화면이 여러 backend 호출을 요구 | 병렬 fan-out, 결과 조합, 부분 실패 정책 | tail latency, 부하 증폭, 결합 증가 |
| BFF | 웹, 모바일 등 client별 요구가 충돌 | client 전용 DTO, 조합, pagination과 release cadence | BFF 중복, 도메인 로직 복제 |
| Service Registry/Discovery | instance 주소가 동적으로 변함 | 등록, health와 logical name을 instance로 해석 | 오래된 등록 정보, control plane 의존 |

이들은 배타적이지 않다. 공통 perimeter gateway 뒤에 client별 BFF를 두고, BFF가 discovery를 거쳐 내부 서비스를 조합할 수 있다.

## API Gateway 경계

게이트웨이에 두기 좋은 것은 여러 서비스에 동일하게 적용되고 요청 경계에서 끝나는 정책이다.

- TLS 종료와 routing
- 토큰 형식과 서명 검증
- 공통 rate limit, request size와 protocol 변환
- correlation ID와 access telemetry

도메인 권한과 상태 전이는 소유 서비스가 판단한다. 게이트웨이가 토큰을 검증했다고 해서 결제 취소 권한이나 주문 소유권까지 증명되는 것은 아니다. 내부 우회 경로와 service-to-service 호출도 별도 신뢰 경계가 필요하다.

## 공통 관심사의 구현 위치

| 위치 | 잘 맞는 관심사 | 남는 비용 |
|---|---|---|
| Gateway | 외부 진입 정책과 routing | 내부 우회 경로와 도메인 권한은 별도 검증 |
| Microservice chassis | 공통 build, 설정, health와 instrumentation을 라이브러리로 제공 | 언어/프레임워크 결합, 서비스별 의존성 갱신과 재배포 |
| Sidecar | 애플리케이션 옆에서 proxy나 로그 수집 실행 | 인스턴스별 자원 비용, 수명주기와 배포 결합 |
| Service mesh | 서비스 간 통신 정책을 공통 data plane에 적용 | 운영 복잡도, control plane과 proxy 장애 영향 |

chassis는 복사한 템플릿만을 뜻하지 않는다. 재사용 라이브러리와 build 규칙을 버전 관리해 서비스들이 갱신하도록 하는 방식이다. Sidecar는 배치 패턴이고 메시의 필수 구현은 아니다([[Istio-Ambient-Mode|사이드카 없는 메시]]).

Kubernetes에서는 같은 Pod의 컨테이너가 네트워크를 공유하며, 명시적으로 공유한 volume을 함께 쓸 수 있다. 같은 Kubernetes namespace에 속했다는 이유만으로 파일 시스템을 공유하지는 않는다. Sidecar의 별도 프로세스는 어느 정도 격리를 주지만 Pod 단위 자원과 배포의 결합은 남는다([[Container-Monitoring|로그 수집 배치]]).

프록시가 span을 만들어도 호출 관계를 잇는 trace context는 애플리케이션이 전파해야 한다. 공통 기능을 밖으로 옮겼다고 모든 서비스 코드 변경이 사라지는 것은 아니다. 같은 통신에 라이브러리와 메시의 retry를 중첩하면 호출 수가 증폭될 수 있어 책임을 한 번씩 배정한다.

## Gateway Aggregation

```text
Client -> Aggregator -> Order
                    -> Payment
                    -> Delivery
       <- composed response
```

client round trip은 줄지만 server-side fan-out은 사라지지 않는다. 한 dependency가 느리면 전체 p99가 끌려가고 호출 수만큼 실패 기회가 늘어난다.

설계할 항목:

- 각 호출의 latency budget과 전체 deadline
- 제한된 동시성, circuit breaker와 bulkhead
- 필수/선택 필드와 partial response 계약
- stale cache를 반환할 수 있는 조건
- backend별 span과 correlation ID
- response 크기와 aggregation 자체의 CPU/메모리 한도

집계가 복잡하거나 독립 확장이 필요하면 routing gateway 안에 넣지 않고 별도 composition service로 분리한다.

## BFF

BFF는 client 화면과 상호작용 방식에 맞춘 backend다. 모바일은 적은 payload와 연결 비용을, 데스크톱은 풍부한 데이터와 넓은 화면을 우선할 수 있다.

도입 기준:

- client별 데이터 모양과 release cadence가 실제로 다른가
- 각 frontend 팀이 자기 BFF를 소유할 수 있는가
- 공통 backend 변경을 기다리는 시간이 반복적으로 병목인가

피해야 할 것:

- 모든 client가 같은 요구인데 이름만 다른 BFF 복제
- 가격, 주문 상태 전이 같은 domain rule을 BFF마다 구현
- 여러 backend 응답을 무제한으로 fan-out
- BFF가 source of truth가 되어 원본 서비스와 상태가 갈라짐

GraphQL은 client가 응답 모양을 고르게 해 BFF endpoint 폭증을 줄일 수 있지만, authorization, 비용 제한, backend 조합과 장애 처리는 여전히 필요하다. GraphQL이 BFF를 자동으로 제거하는 것은 아니다.

## Service Discovery

- **client-side discovery**: 호출자가 registry에서 instance를 고른다. 호출 library와 retry/load balancing 정책이 client에 들어간다.
- **server-side discovery**: gateway, proxy나 platform service가 instance를 고른다. client는 logical address만 안다.
- **platform-native discovery**: Kubernetes Service/DNS처럼 배포 플랫폼이 stable name과 routing을 제공한다.

registry의 health는 애플리케이션 요청이 반드시 성공한다는 보장이 아니다. connection draining, readiness, cache TTL, stale entry와 zone 분산을 함께 설계한다.

## 통신 방식 선택

외부/내부라는 위치만으로 REST, GraphQL이나 gRPC를 자동 결정하지 않는다. browser 지원, streaming, schema evolution, payload, latency, debugging과 팀 역량을 [[API-Comparison|API 방식 비교]]로 판단한다. 즉시 응답이 필요 없는 협력은 [[Event-Driven-Architecture|event-driven]]으로 동기 critical path를 줄일 수 있지만 전달 보장과 일관성 비용이 생긴다.

## 검증 체크리스트

- gateway 없이 내부 서비스에 닿는 경로도 같은 보안 정책을 지키는가
- backend 한 곳의 지연과 실패가 전체 응답에 미치는 영향이 정의됐는가
- client별 계약의 owner와 호환성 검사가 있는가
- fan-out 수와 전체 deadline이 부하 테스트에 포함되는가
- discovery가 오래된 instance를 돌려줄 때 빠르게 회복하는가
- gateway와 BFF가 domain service로 비대해지는 것을 검사하는가

## 출처

- [Microsoft, Gateway Aggregation pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/gateway-aggregation)
- [Microsoft, Backends for Frontends pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/backends-for-frontends)
- [Dowon Lee 강사, API Gateway 패턴](https://www.inflearn.com/courses/lecture?courseId=332731&unitId=289999)
- [Dowon Lee 강사, BFF 패턴](https://www.inflearn.com/courses/lecture?courseId=332731&unitId=290000)
- [Dowon Lee 강사, Aggregator와 Service Discovery](https://www.inflearn.com/courses/lecture?courseId=332731&unitId=290001)
- [현대적 아키텍처 설계 6단계 — Threads, richardlee0202](https://www.threads.com/@richardlee0202/post/DMWifLXT7CP)
- [Chris Richardson, Microservice chassis](https://microservices.io/patterns/microservice-chassis.html)
- [Microsoft, Sidecar pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/sidecar)
- [Istio, Distributed tracing overview](https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/)
- [Dowon Lee 강사, Sidecar 패턴과 Service Mesh 패턴](https://www.inflearn.com/courses/lecture?courseId=332731&unitId=290739)

## 관련 문서

- [[API-Gateway|Amazon API Gateway]]
- [[API-Comparison|API 방식 비교]]
- [[Rate-Limiting|Rate Limit 정책 설계]]
- [[External-Service-Resilience|외부 서비스 회복성]]
- [[OpenTelemetry|OpenTelemetry와 분산 트레이싱]]
