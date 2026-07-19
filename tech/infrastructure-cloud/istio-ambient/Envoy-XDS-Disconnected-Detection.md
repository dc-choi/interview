---
tags: [infrastructure, service-mesh, istio, envoy, observability, kubernetes]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Envoy xDS Disconnected", "istiod Disconnected 탐지", "control_plane connected_state"]
---

# Envoy xDS 단절 탐지 (istiod Disconnected)

readiness probe가 통과한다고 control plane과 연결돼 있다는 뜻이 아니다. Envoy의 기본 readiness는 **최초 xDS config 수신 여부**에 가까워서, 한 번 ready가 된 gateway/waypoint가 이후 istiod와 장시간 끊겨 있어도 Ready로 남는다. 단절 동안 기존 config로 트래픽은 흐르지만 새 라우팅, 정책, endpoint 변경이 반영되지 않는 조용한 drift 상태가 된다.

## 연결 구조와 에러 전파

xDS 연결은 3단 구조다: Envoy → pilot-agent (Pod 내부 UDS, cluster 이름 `xds-grpc`) → istiod (TCP/TLS, Kubernetes DNS로 lookup).

pilot-agent가 istiod 연결에 실패하면 Envoy까지 전파된다: istiod stream의 Recv() 에러 → error channel → handler 에러 반환 → Envoy의 downstream xDS stream 닫힘 → `control_plane.connected_state`가 0으로 변경 → backoff 후 재연결.

- 로그 시그니처: gRPC code 14 (Unavailable), lookup istiod.istio-system.svc: i/o timeout, closed since NNNNs ago의 장기 반복.
- **flapping 함정**: 장애가 지속돼도 재연결 시도마다 UDS stream이 잠깐 열려 `connected_state`가 0과 1을 오간다. 순간 조회로는 1이 보일 수 있어 시계열로 봐야 한다.
- 표면 원인이 DNS timeout이어도 cluster 전반 DNS는 정상이고 특정 Pod만 겪는 경우가 있다 — 근본 원인을 못 찾더라도 탐지와 완화 체계를 먼저 갖추는 것이 실용적 대응이다.

## 탐지 메트릭

| 메트릭 | 의미 | 정상 |
| --- | --- | --- |
| `envoy_control_plane_connected_state` | xDS gRPC stream 열림 여부 | 1 유지 |
| `envoy_cluster_upstream_cx_active{cluster_name="xds-grpc"}` | Envoy가 pilot-agent UDS에 맺은 커넥션 수 | 보통 1 (0이거나 시계열 소실 시 이상) |

- **proxyStatsMatcher 함정**: 노출 허용 목록은 Prometheus 메트릭 이름이 아니라 **Envoy 내부 stat 이름** 기준이다. `envoy_control_plane_connected_state`로 등록하면 매칭되지 않고, `control_plane\.connected_state` 정규식으로 등록해야 한다.
- flapping 때문에 알람은 순간값이 아니라 일정 기간의 지속 조건(예: N분간 0 비율)으로 건다.

## readinessProbe 개선

기본 `/healthz/ready`(port 15021)는 receivedFirstUpdate, atleastOnceReady 성격이라 최초 수신 이후의 단절을 감지하지 못한다. probe를 강화한다면:

- `failureThreshold: 3` + `successThreshold: 3` (periodSeconds 10, timeoutSeconds 5) — 연속 3회 기준으로 Ready/NotReady를 전환해, 재연결 루프의 일시적 성공으로 인한 rapid cycling(endpoint flapping)을 막는다.
- `/stats` 파싱 기반 probe는 거칠어서 설정 오류 시 startup 지연이나 endpoint flapping을 유발할 수 있다. gateway/waypoint 같은 중요 진입점은 probe에 다 싣기보다 control plane 연결 상태를 **readiness와 독립된 모니터링**으로 두는 쪽이 안전하다.

## 일반화 — liveness/readiness가 못 보는 것

애플리케이션 관점의 교훈과 같은 축이다: probe는 시작 시점 조건 확인에 치우치기 쉽고, 런타임 중 의존성 단절(control plane, config 서버, 구독 스트림)은 별도 신호로 감시해야 한다. 데이터 플레인이 당장 동작한다는 것과 제어 플레인 변경을 반영할 수 있다는 것은 다른 상태다. 이 이슈는 ambient 고유가 아니라 sidecar mode, ingress gateway를 포함한 Istio/Envoy 공통 문제다.

## 면접 체크포인트

- Ready인데 설정 변경이 반영 안 되는 Envoy는? → xDS 단절 의심. 기본 readiness는 최초 config 수신만 보장. `control_plane.connected_state`와 xds-grpc 커넥션 메트릭으로 확인.
- 이 상태가 왜 위험한가? → 트래픽은 흘러서 조용하다. 하지만 endpoint 변경이 반영되지 않아, 롤아웃과 겹치면 죽은 Pod로 라우팅하는 장애로 발화한다.
- 탐지 알람 설계 시 주의점은? → 재연결 루프의 flapping. 순간값이 아니라 지속 조건으로, probe에 태우기보다 독립 모니터링으로.

## 관련 문서

- [[Istio-Ambient-Mode|Istio Ambient Mode]] — istiod, waypoint 구조
- [[Istio-Ambient-Partially-Enrolled-Pod|Partially Enrolled Pod와 Untaint Controller]] — 같은 축의 교훈 (K8s가 보는 상태 ≠ mesh의 실제 상태)
- [[Metric-Layer-Mismatch|메트릭 측정 레이어의 함정]] — 순간 조회와 시계열이 다르게 보이는 일반 패턴
- [[Alert-Fatigue|Alert fatigue 방지]] — 지속 조건 기반 알람 설계
- [[Prometheus]] — 메트릭 수집과 알람 룰

## 출처

- [Istio Ambient Mode 3-4편: 507 status code와 istiod disconnected 탐지 — 채널톡 테크 블로그](https://tech.channel.io/kr/articles/e92ce438)
