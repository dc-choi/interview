---
tags: [istio, service-mesh, virtualservice, destinationrule, canary, resilience]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Istio Traffic Management", "Istio 트래픽 관리"]
verified_at: 2026-08-04
---

# Istio traffic management와 resilience

Istio는 Envoy data plane에 route와 traffic policy를 전달해 application code 밖에서 timeout, retry, traffic split과 fault injection을 적용한다. 이 기능은 application의 정합성 설계를 없애지 않으며 잘못 설정하면 오히려 retry 폭증, 503과 넓은 장애 반경을 만든다.

## data plane 배치와 주입

sidecar mode는 mutating admission webhook이 Pod 생성 시 Envoy container와 관련 설정을 추가한다. 이미 실행 중인 Pod는 label만 바꿔도 자동 변환되지 않으므로 rollout이 필요하다.

- namespace/workload label과 control plane revision이 의도한 주입 정책과 맞는지 확인한다.
- `kubectl get pod`의 container 수만 보지 말고 proxy readiness와 control plane 연결을 확인한다.
- init/CNI traffic capture가 실패하면 proxy가 있어도 우회하거나 Pod가 시작하지 못할 수 있다.
- ambient mode는 Pod sidecar 대신 ztunnel과 선택적 waypoint를 사용한다. 차이는 [[Istio-Ambient-Mode]].

## 세 traffic resource의 책임

| resource | 질문 | 대표 책임 |
|---|---|---|
| Gateway | mesh edge에서 무엇을 listen할까 | port, protocol, host, TLS |
| VirtualService | 들어온 request를 어디로 보낼까 | match, route, rewrite, weight, timeout/retry/fault |
| DestinationRule | 실제 destination을 어떻게 호출할까 | subset, load balancing, connection pool, outlier, TLS |

VirtualService route가 선택된 뒤 DestinationRule의 subset과 traffic policy가 실제 upstream에 적용된다. subset label은 Kubernetes Service selector를 대신하지 않으며 Service가 발견한 endpoint를 version group으로 나눈다.

production에서는 short host name이 namespace에 따라 다르게 해석되는 혼동을 줄이기 위해 FQDN을 검토한다. config object가 namespaced여도 host scope에 따라 다른 workload traffic에 영향을 줄 수 있으므로 Istio resource 작성 권한을 제한한다.

## canary와 header routing

```text
stable/canary Deployment -> 하나의 Service endpoint 집합
DestinationRule subsets -> version label로 endpoint 분류
VirtualService -> stable 95, canary 5 또는 header match
```

- replica 비율과 traffic weight는 같은 것이 아니다. request 분배는 Envoy route weight가 결정한다.
- canary endpoint가 ready이고 schema/protocol이 양방향 호환되는지 먼저 확인한다.
- 신규 subset을 먼저 DestinationRule에 추가하고 전파를 기다린 뒤 VirtualService가 참조하게 한다. 제거는 반대 순서다. eventual propagation 중 없는 cluster를 가리키면 503이 날 수 있다.
- header canary는 신뢰할 수 있는 gateway가 header를 설정/검증하고 외부 client가 임의로 spoof하지 못하게 한다.
- sticky session, long-lived connection과 low traffic에서는 request weight가 기대한 표본 비율을 만들지 않을 수 있다.

## timeout과 retry budget

timeout은 caller가 기다릴 상한이고 retry는 새 부하다. 각 hop이 독립적으로 3회 retry하면 fan-out 경로에서 요청 수가 곱으로 늘 수 있다.

- end-to-end deadline 안에서 per-try timeout과 attempt 수를 배분한다.
- idempotent read나 idempotency key로 보호된 operation만 자동 retry한다.
- application client, gateway와 mesh 중 retry owner를 정하고 중복 retry를 피한다.
- retry 대상 status/reset과 backoff를 명시하고 retry attempt/overflow metric을 본다.
- timeout을 늘려 성공률만 높이면 queue와 connection 점유가 누적될 수 있다.

## circuit breaking의 실제 범위

Istio DestinationRule은 connection pool limit과 outlier detection으로 overload와 불량 endpoint의 영향을 제한한다.

- pending request/connection 한도 초과는 빠른 503을 만들 수 있다. 성공률을 공짜로 높이는 기능이 아니다.
- outlier detection은 proxy가 관측한 endpoint를 일정 시간 load-balancing pool에서 eject한다.
- 각 proxy의 local 관측과 설정에 기반하므로 application library의 전역 상태 machine과 동일하지 않다.
- ejection 비율, 최소 healthy host와 locality/failover를 함께 설계하지 않으면 남은 endpoint에 부하가 몰린다.
- mTLS mode와 DestinationRule TLS policy가 충돌하면 policy 적용 직후 지속적인 503이 날 수 있다.

## fault injection은 검증 도구다

VirtualService의 delay와 abort는 latency와 application error를 재현한다. 장애를 복구하는 정책 자체가 아니라 timeout, retry, fallback과 SLO alert가 실제로 작동하는지 검증하는 수단이다.

1. production과 분리된 namespace나 명확한 header/percentage scope로 시작한다.
2. blast radius, duration과 자동 중단 기준을 정한다.
3. steady-state SLO와 rollback path를 먼저 검증한다.
4. retry amplification, queue 증가와 downstream effect를 함께 관측한다.
5. 실험 resource가 남지 않도록 TTL/cleanup owner를 둔다.

## 진단 흐름

| 증상 | 확인점 |
|---|---|
| route가 적용되지 않음 | Gateway/VirtualService host binding, match order, 실제 ingress path |
| subset 적용 후 503 | label/endpoints, config propagation, DestinationRule TLS mode |
| canary 비율이 이상함 | long-lived connection, 표본 수, sticky behavior, weight 합계 |
| retry 뒤 latency/부하 폭증 | 중복 retry layer, per-try timeout, attempt metric |
| proxy는 ready지만 policy가 오래됨 | xDS connection/config dump, [[Envoy-XDS-Disconnected-Detection]] |

## 출처

- [Istio Docs, traffic management](https://istio.io/latest/docs/concepts/traffic-management/)
- [Istio Docs, traffic management best practices](https://istio.io/latest/docs/ops/best-practices/traffic-management/)
- [Istio Docs, circuit breaking](https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/)
- [금융 인프라를 운영하는 Toss 개발자의 Kubernetes, sidecar 자동 주입](https://www.inflearn.com/courses/lecture?courseId=340716&unitId=441392)
- [금융 인프라를 운영하는 Toss 개발자의 Kubernetes, Gateway/VirtualService/DestinationRule](https://www.inflearn.com/courses/lecture?courseId=340716&unitId=441393)
- [금융 인프라를 운영하는 Toss 개발자의 Kubernetes, canary와 header routing](https://www.inflearn.com/courses/lecture?courseId=340716&unitId=441394)
- [금융 인프라를 운영하는 Toss 개발자의 Kubernetes, fault injection](https://www.inflearn.com/courses/lecture?courseId=340716&unitId=441396)
- [금융 인프라를 운영하는 Toss 개발자의 Kubernetes, timeout/retry/circuit breaker](https://www.inflearn.com/courses/lecture?courseId=340716&unitId=441397)

## 관련 문서

- [[Istio-Ambient-Mode|Istio Ambient Mode]]
- [[Istio-Ambient-Traffic-Internals|Istio Ambient traffic internals]]
- [[K8s-Traffic-Entry-Helm-and-GitOps|Kubernetes traffic entry, Helm과 GitOps]]
- [[Idempotency|Idempotency]]
