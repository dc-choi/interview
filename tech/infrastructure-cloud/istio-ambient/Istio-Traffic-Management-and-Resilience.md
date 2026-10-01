---
tags: [istio, service-mesh, virtualservice, destinationrule, canary, resilience]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Istio Traffic Management", "Istio 트래픽 관리"]
verified_at: 2026-09-30
---

# Istio traffic management와 resilience

Istio는 Envoy data plane에 route와 traffic policy를 전달해 application code 밖에서 timeout, retry, traffic split과 fault injection을 적용한다. 이 기능은 application의 정합성 설계를 없애지 않으며 잘못 설정하면 오히려 retry 폭증, 503과 넓은 장애 반경을 만든다.

## data plane 배치와 주입

sidecar mode는 mutating admission webhook이 Pod 생성 직전 명세를 받아 `istio-init` init container와 `istio-proxy`(Envoy) container를 추가한다. app manifest를 고치지 않고 주입을 제어할 수 있지만 label은 Pod 생성 시점에만 영향을 주므로, 이미 실행 중인 Pod는 label만 바꿔도 자동 변환되지 않고 rollout이 필요하다.

- 주입 판정(Istio 1.31 문서 기준): namespace의 `istio-injection`과 Pod의 `sidecar.istio.io/inject` 중 하나라도 disabled면 주입하지 않고, 이 둘이나 `istio.io/rev` 중 하나가 enabled면 주입한다. namespace에 `istio-injection`과 `istio.io/rev`가 함께 있으면 `istio-injection`이 우선한다.
- namespace/workload label과 control plane revision이 의도한 주입 정책과 맞는지 확인한다. READY가 `1/1`이면 label 누락, workload 수준 opt-out, label을 붙이기 전에 만든 Pod, webhook 장애(webhook의 failurePolicy에 따라 생성 실패나 미주입) 순으로 본다.
- `kubectl get pod`의 container 수만 보지 말고 proxy readiness와 control plane 연결을 확인한다.
- `istio-init`은 Pod network의 traffic redirect 규칙을 설정하므로 배포 주체에 NET_ADMIN, NET_RAW capability 권한이 필요하다. Istio CNI node agent는 이 init container를 대체해 workload별 권한 요구를 없앤다. init/CNI traffic capture가 실패하면 proxy가 있어도 우회하거나 Pod가 시작하지 못할 수 있다.
- ambient mode는 Pod sidecar 대신 ztunnel과 선택적 waypoint를 사용한다. 차이는 [[Istio-Ambient-Mode]].

## 세 traffic resource의 책임

| resource | 질문 | 대표 책임 |
|---|---|---|
| Gateway | mesh edge에서 무엇을 listen할까 | port, protocol, host, TLS |
| VirtualService | 들어온 request를 어디로 보낼까 | match, route, rewrite, weight, timeout/retry/fault |
| DestinationRule | 실제 destination을 어떻게 호출할까 | subset, load balancing, connection pool, outlier, TLS |

VirtualService route가 선택된 뒤 DestinationRule의 subset과 traffic policy가 실제 upstream에 적용된다. subset label은 Kubernetes Service selector를 대신하지 않으며 Service가 발견한 endpoint를 version group으로 나눈다.

production에서는 short host name이 namespace에 따라 다르게 해석되는 혼동을 줄이기 위해 FQDN을 검토한다. config object가 namespaced여도 host scope에 따라 다른 workload traffic에 영향을 줄 수 있으므로 Istio resource 작성 권한을 제한한다.

### 라우팅은 호출하는 쪽 proxy에서 결정된다

- sidecar mode에서 VirtualService의 match, weight, timeout과 retry는 요청을 보내는 쪽 Envoy가 평가한다. A가 B를 부르면 A의 sidecar가 route weight로 B의 v1이나 v2 endpoint를 골라 직접 보내므로 중간 proxy를 한 번 더 거치지 않고, 같은 서비스라도 호출 주체마다 다른 규칙(`sourceLabels`, gateway별 route)을 줄 수 있다.
- `gateways`를 생략하면 예약어 `mesh`가 기본값이 되어 mesh의 모든 sidecar에 적용된다. gateway 이름을 적으면 그 gateway에만 적용되므로 외부 진입과 내부 호출 모두에 걸려면 목록에 `mesh`를 함께 넣는다. gateway로 들어온 요청에는 gateway에 bind된 VirtualService만 적용되므로 내부용 VirtualService의 subset 규칙을 gateway용 VirtualService에도 넣어야 한다.
- Ingress gateway는 sidecar와 같은 Envoy를 workload 없이 독립 실행한 Pod이고 보통 LoadBalancer Service로 외부 traffic을 받는다. Gateway resource는 label selector(예: `istio: ingressgateway`)로 그 Pod를 골라 listen할 port, protocol, host와 TLS만 정하고, 라우팅은 Gateway에 bind된 VirtualService가 한다. 인가는 AuthorizationPolicy 같은 별도 resource의 몫이다.
- VirtualService가 저장되면 istiod가 Envoy 설정으로 바꿔 xDS로 proxy에 push한다. 실제 반영은 호출자 proxy의 route 설정(아래 진단 흐름의 `proxy-config routes`)에서 `weightedClusters`로 확인한다.
- 규칙은 sidecar가 있는 호출자와 VirtualService가 bind된 gateway를 지나는 traffic에만 적용된다. 주입되지 않은 namespace의 client나 NodePort, Kubernetes Service로 직접 들어오는 요청은 kube-proxy 분산으로 모든 version에 닿아 canary 비율과 차단이 무력화된다(추론). ambient mode는 반대로 destination waypoint가 정책을 적용한다([[Istio-Ambient-Traffic-Internals]]).
- Istio best practice는 서비스마다 처음부터 기본 route를 가진 VirtualService를 두라고 권한다. DestinationRule subset의 traffic policy는 route가 그 subset으로 명시적으로 보낼 때만 적용된다.

## canary와 header routing

```text
stable/canary Deployment -> 하나의 Service endpoint 집합
DestinationRule subsets -> version label로 endpoint 분류
VirtualService -> stable 95, canary 5 또는 header match
```

- replica 비율과 traffic weight는 같은 것이 아니다. request 분배는 호출자 쪽 Envoy의 route weight가 결정한다.
- canary endpoint가 ready이고 schema/protocol이 양방향 호환되는지 먼저 확인한다.
- 신규 subset을 먼저 DestinationRule에 추가하고 전파를 기다린 뒤 VirtualService가 참조하게 한다. 제거는 반대 순서다. eventual propagation 중 없는 cluster를 가리키면 503이 날 수 있다.
- header canary는 신뢰할 수 있는 gateway가 header를 설정/검증하고 외부 client가 임의로 spoof하지 못하게 한다.
- sticky session, long-lived connection과 low traffic에서는 request weight가 기대한 표본 비율을 만들지 않을 수 있다. Istio troubleshooting 문서는 weight 분포가 보이기까지 요청이 최대 100개쯤 필요할 수 있다고 한다.

### header routing의 규칙 순서와 전파

weight canary는 무작위 비율이라 누가 v2를 볼지 정할 수 없다. 사내 QA나 베타 사용자에게 먼저 보이려면 header를 route 조건으로 쓴다.

- `http` 규칙은 위에서 아래로 평가되고 처음 맞는 규칙 하나만 쓴다. `x-user: test` 같은 조건 규칙을 위에, match 없는 fallback을 맨 아래에 둔다. fallback이 위에 있으면 아래 규칙은 쓰이지 않는다. 같은 match가 앞에 있거나 match 없는 규칙이 여럿이면 `istioctl analyze`가 IST0130(VirtualServiceUnreachableRule)을 경고한다.
- match는 header, `uri`, `method`, `queryParams`에 `exact`, `prefix`, `regex`(RE2)를 쓴다. weight와 header 조건을 함께 쓰려면 한 VirtualService 안에서 규칙 순서로 표현한다. 같은 이름으로 다시 apply하면 기존 weight 규칙이 새 규칙 목록으로 바뀌므로 전략 전환은 VirtualService 교체다.
- 두 번째 hop부터 header routing이 성립하려면 app이 받은 routing header를 outbound 요청에 다시 실어야 한다. sidecar는 app이 새로 만든 outbound 요청만 보므로 전파하지 않으면 match가 실패해 오류 없이 fallback(stable)으로 흘러 canary 검증이 무력화된다.
- trace header도 같다. Istio 문서는 모든 app이 `x-request-id`, W3C `traceparent`와 `tracestate`(Zipkin이면 B3 header)를 downstream 호출에 전달하라고 한다. routing header와 함께 공통 HTTP client middleware나 OpenTelemetry propagator로 일괄 전파한다([[OpenTelemetry]], [[Correlation-ID]]).

## timeout과 retry budget

timeout은 caller가 기다릴 상한이고 retry는 새 부하다. 느린 upstream은 호출자의 thread와 connection을 점유해 장애를 위로 전파하고, 지연이 client retry를 부르면 부하와 지연이 서로를 키운다. 각 hop이 독립적으로 3회 retry하면 fan-out 경로에서 요청 수가 곱으로 늘 수 있다.

- end-to-end deadline 안에서 per-try timeout과 attempt 수를 배분한다.
- idempotent read나 idempotency key로 보호된 operation만 자동 retry한다.
- application client, gateway와 mesh 중 retry owner를 정하고 중복 retry를 피한다. VirtualService에 적지 않아도 동작하는 mesh 기본 retry도 이 계산에 넣는다.
- retry 대상 status/reset과 backoff를 명시하고 retry attempt/overflow metric을 본다.
- timeout을 늘려 성공률만 높이면 queue와 connection 점유가 누적될 수 있다.

Istio 1.31 VirtualService reference 기준 기본 동작이다.

| 항목 | 기본 동작 |
|---|---|
| route `timeout` | disabled. 걸면 초과 시 호출자 proxy가 504를 돌려준다 |
| retry | VirtualService에 없어도 `attempts: 2`, `retryOn: connect-failure,refused-stream,unavailable,cancelled`. MeshConfig `defaultHttpRetryPolicy`로 바꾼다 |
| 최대 요청 수 | `1 + attempts` |
| `perTryTimeout` | route timeout과 같은 값. route timeout이 없으면 시도별 제한도 없다 |
| 재시도 간격 | 최소 25ms 기반 지수 backoff. `backoff`로 조정 |
| `retryIgnorePreviousHosts` | true. 이미 시도한 host를 피한다 |

`retryOn`에는 `5xx`, `gateway-error` 같은 조건이나 status code를 쓰고, `retryRemoteLocalities`는 재시도 때 다른 locality endpoint를 허용할지 정한다.

## circuit breaking의 실제 범위

Istio DestinationRule은 connection pool limit과 outlier detection으로 overload와 불량 endpoint의 영향을 제한한다.

- pending request/connection 한도 초과는 빠른 503을 만들 수 있다. 성공률을 공짜로 높이는 기능이 아니다.
- outlier detection은 proxy가 관측한 endpoint를 일정 시간 load-balancing pool에서 eject한다.
- 각 proxy의 local 관측과 설정에 기반하므로 application library의 전역 상태 machine과 동일하지 않다.
- ejection 비율, 최소 healthy host와 locality/failover를 함께 설계하지 않으면 남은 endpoint에 부하가 몰린다.
- mTLS mode와 DestinationRule TLS policy가 충돌하면 policy 적용 직후 지속적인 503이 날 수 있다.

`trafficPolicy.outlierDetection` 기본값(Istio 1.31 DestinationRule reference)은 `consecutive5xxErrors` 5, `interval` 10s, `baseEjectionTime` 30s, `maxEjectionPercent` 10%, `minHealthPercent` 0%다.

- 격리 시간은 baseEjectionTime × 그 host가 격리된 횟수로 늘고 Envoy `max_ejection_time`(기본 300s)에서 멈춘다. 시간이 지나면 시험 요청 없이 pool로 돌아와 다시 관측되므로 library circuit breaker의 Closed, Open, Half-Open 모델과 그대로 대응하지 않는다.
- `minHealthPercent`가 0%라 healthy host가 줄어도 panic mode(healthy와 unhealthy 모두로 분산)로 돌아가지 않는다. 공식 설명은 service당 Pod가 적은 Kubernetes 환경에 panic threshold가 보통 맞지 않기 때문이다.
- 작은 subset 함정: Envoy 1.28부터 첫 격리도 `max_ejection_percent`를 지키고, 현재 Envoy는 (격리 중인 host + 1) / cluster host 수가 이 비율 이하일 때만 격리한다. Istio는 subset마다 별도 Envoy cluster를 만들므로 `maxEjectionPercent`를 생략한(10%) subset의 Pod가 10개 미만이면 한 host도 격리되지 않을 수 있다. 반대로 비율을 100%로 두면 replica가 적은 subset 전체가 격리되어 `503 no healthy upstream`이 난다. replica 수와 비율을 함께 정하고 격리 상태를 `istioctl proxy-config endpoints`로 확인한다.

## fault injection은 검증 도구다

VirtualService의 delay와 abort는 latency와 application error를 재현한다. 장애를 복구하는 정책 자체가 아니라 timeout, retry, fallback과 SLO alert가 실제로 작동하는지 검증하는 수단이다.

- `fault`는 호출자 쪽 proxy에서 적용된다. delay는 upstream으로 보내기 전에 지연을 넣고, abort는 upstream으로 보내지 않고 호출자 proxy가 지정한 status를 바로 돌려준다(Envoy fault filter는 router filter 앞에 놓인다).
- 공식 reference는 fault를 켠 route에서 timeout과 retry가 켜지지 않는다고 명시한다. A의 timeout과 retry를 검증하려면 B를 실제로 느리거나 실패하게 만들거나(test build, B가 부르는 C에 fault) 검증 대상이 아닌 hop에 fault를 둔다.
- abort는 upstream의 실제 응답이 아니므로 outlier detection을 발동시키지 않는다(추론). circuit breaking 실험은 B가 실제로 5xx를 내야 한다.
- abort된 요청은 B에 도달하지 않아 B의 metric과 log에는 흔적이 없다. 판정은 호출자 쪽 telemetry와 access log의 `FI`(abort), `DI`(delay) flag로 한다.

실험 절차는 다음과 같다.

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
| Pod READY `1/1`, sidecar 없음 | namespace label, `sidecar.istio.io/inject`, label 이전에 만든 Pod, webhook 상태 |
| `404`와 `NR` flag | 요청에 맞는 route가 없음. VirtualService host, `gateways` binding과 match |
| `503`과 `NC` flag | route가 가리키는 cluster가 없음. 참조한 subset의 DestinationRule 정의와 전파 순서 |
| `503`과 `UH` flag(no healthy upstream) | ready endpoint가 없거나 subset 전체가 격리됨 |
| `503`과 `UO` flag | connection pool 한도 초과 |
| `504`와 `UT` flag | route timeout 초과 |

response flag는 access log의 `%RESPONSE_FLAGS%`로 보고 의미는 Envoy access log 문서를 따른다. access log는 demo profile에서 기본으로 켜지고, 그 밖에는 Telemetry API나 `meshConfig.accessLogFile`로 켠다.

```bash
istioctl analyze -n NAMESPACE                                   # 없는 host와 selector, 도달 불가 규칙
istioctl proxy-config routes deploy/CALLER -n NAMESPACE -o json  # 호출자 route와 weightedClusters
istioctl proxy-config endpoints deploy/CALLER -n NAMESPACE       # endpoint 상태와 격리 여부
kubectl logs deploy/CALLER -c istio-proxy -n NAMESPACE           # response flag
```

- `istioctl analyze`는 live cluster와 local file을 함께 분석할 수 있어 apply 전 CI 검사로 돌린다. 결과 level은 Info, Warning, Error다.
- 한 host의 규칙을 여러 VirtualService로 나누면 gateway에 bind된 경우에만 merge되고 fragment 사이 평가 순서도 보장되지 않는다. sidecar용 규칙은 host당 VirtualService 하나에 모은다. DestinationRule은 merge되지만 같은 이름의 subset이 중복되면 첫 정의만 쓰고 나머지는 버린다.
- 학습용 `istioctl install --set profile=demo`는 tracing과 access log를 많이 켜 성능 시험에 맞지 않는다. 공식 문서는 production에 `default` profile을 권한다.

## 출처

- [Istio Docs, traffic management](https://istio.io/latest/docs/concepts/traffic-management/)
- [Istio Docs, traffic management best practices](https://istio.io/latest/docs/ops/best-practices/traffic-management/)
- [Istio Docs, circuit breaking](https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/)
- [Istio Docs, VirtualService reference](https://istio.io/latest/docs/reference/config/networking/virtual-service/)
- [Istio Docs, DestinationRule reference](https://istio.io/latest/docs/reference/config/networking/destination-rule/)
- [Istio Docs, Gateway reference](https://istio.io/latest/docs/reference/config/networking/gateway/)
- [Istio Docs, architecture](https://istio.io/latest/docs/ops/deployment/architecture/)
- [Istio Docs, sidecar injection](https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/)
- [Istio Docs, Istio CNI node agent](https://istio.io/latest/docs/setup/additional-setup/cni/)
- [Istio Docs, installation configuration profiles](https://istio.io/latest/docs/setup/additional-setup/config-profiles/)
- [Istio Docs, istioctl analyze](https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/)
- [Istio Docs, IST0130 VirtualServiceUnreachableRule](https://istio.io/latest/docs/reference/config/analysis/ist0130/)
- [Istio Docs, traffic management problems](https://istio.io/latest/docs/ops/common-problems/network-issues/)
- [Istio Docs, Envoy access logs](https://istio.io/latest/docs/tasks/observability/logs/access-log/)
- [Istio Docs, debugging Envoy and Istiod](https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/)
- [Istio Docs, distributed tracing overview](https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/)
- [Istio Docs, waypoint proxy](https://istio.io/latest/docs/ambient/usage/waypoint/)
- [Istio Docs, AuthorizationPolicy reference](https://istio.io/latest/docs/reference/config/security/authorization-policy/)
- [Envoy Docs, outlier detection](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier)
- [Envoy Docs, OutlierDetection proto](https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/outlier_detection.proto)
- [Envoy Docs, fault injection filter](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/fault_filter)
- [Envoy Docs, access logging response flags (v1.36)](https://www.envoyproxy.io/docs/envoy/v1.36.0/configuration/observability/access_log/usage)
- [Envoy 1.28.0 version history — envoyproxy.io](https://www.envoyproxy.io/docs/envoy/v1.28.0/version_history/v1.28/v1.28.0)
- [outlier detection 격리 비율 계산 — envoyproxy/envoy](https://github.com/envoyproxy/envoy/blob/main/source/common/upstream/outlier_detection_impl.cc)
- [금융 인프라를 운영하는 Toss 개발자의 Kubernetes, sidecar 자동 주입](https://www.inflearn.com/courses/lecture?courseId=340716&unitId=441392)
- [금융 인프라를 운영하는 Toss 개발자의 Kubernetes, Gateway/VirtualService/DestinationRule](https://www.inflearn.com/courses/lecture?courseId=340716&unitId=441393)
- [금융 인프라를 운영하는 Toss 개발자의 Kubernetes, canary와 header routing](https://www.inflearn.com/courses/lecture?courseId=340716&unitId=441394)
- [금융 인프라를 운영하는 Toss 개발자의 Kubernetes, 헤더 기반 라우팅 분배 규칙](https://www.inflearn.com/courses/lecture?courseId=340716&unitId=441395)
- [금융 인프라를 운영하는 Toss 개발자의 Kubernetes, fault injection](https://www.inflearn.com/courses/lecture?courseId=340716&unitId=441396)
- [금융 인프라를 운영하는 Toss 개발자의 Kubernetes, timeout/retry/circuit breaker](https://www.inflearn.com/courses/lecture?courseId=340716&unitId=441397)

## 관련 문서

- [[Istio-Ambient-Mode|Istio Ambient Mode]]
- [[Istio-Ambient-Traffic-Internals|Istio Ambient traffic internals]]
- [[K8s-Traffic-Entry-Helm-and-GitOps|Kubernetes traffic entry, Helm과 GitOps]]
- [[Idempotency|Idempotency]]
- [[Canary|Canary 배포]]
- [[OpenTelemetry|OpenTelemetry]]
- [[Correlation-ID|Correlation ID]]
- [[Envoy-Retry-Buffer-507|Envoy Retry Buffer와 507]]
