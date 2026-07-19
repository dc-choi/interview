---
tags: [infrastructure, kubernetes, service-mesh, istio, scheduling, reliability]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Partially Enrolled Pod", "Untaint Controller", "Istio Startup Taint"]
---

# Partially Enrolled Pod와 Untaint Controller

Kubernetes가 보는 준비 상태와 mesh가 보는 준비 상태는 다르다. Pod가 `Running`이고 readiness probe를 통과해 Service endpoint에 올라가도, ambient mesh 관점에서는 트래픽을 받을 준비가 안 된 **Partially Enrolled Pod**일 수 있다. sidecar가 사라진 대신 node-local 컴포넌트(istio-cni, ztunnel)의 준비 상태가 워크로드 가용성의 전제가 됐기 때문이다.

## mesh 관점의 준비 완료 조건

ambient에서 Pod가 온전히 mesh에 편입(enrolled)되려면 두 조건이 **모두** 만족돼야 한다.

1. Pod network namespace 안에 traffic redirection rule(iptables)이 설정될 것 — istio-cni 담당
2. ztunnel이 그 Pod를 workload로 인지하고 proxy를 준비할 것

상태는 Pod annotation으로 드러난다.

| `ambient.istio.io/redirection` | 의미 |
| --- | --- |
| `enabled` | redirection 구성 완료, Pod가 captured 상태 |
| `pending` | redirection은 일부 적용됐지만 ztunnel 등록 미완료 — ingress/egress 트래픽이 정상 동작하지 않는 상태 |
| (annotation 없음) | istio-cni가 개입하지 못함 — redirection rule 자체가 없음 |

## 발생 메커니즘 — 스케줄러는 DaemonSet을 기다리지 않는다

Kubernetes 스케줄러는 DaemonSet(istio-cni, ztunnel)의 준비 완료를 일반 workload Pod 스케줄링의 선행 조건으로 보장하지 않는다. 노드가 새로 뜨면 istio-cni Pod, ztunnel Pod, 일반 workload Pod가 거의 동시에 스케줄될 수 있고, 순서 경합(race)에서 두 가지 실패 시나리오가 나온다.

- **시나리오 1 — istio-cni가 늦음**: Pod 생성 시점에 istio-cni가 호출되지 않거나 ambient 판정에 실패. redirection rule이 없어서 트래픽이 **ztunnel을 우회**한다. 눈에 띄는 에러 없이 mTLS, AuthorizationPolicy, telemetry가 조용히 미적용되는 것이 더 위험하다.
- **시나리오 2 — ztunnel이 늦음**: redirection rule은 깔렸지만 ztunnel이 아직 workload를 등록하지 못함 (`pending`). 트래픽은 리다이렉트되는데 받아줄 프록시가 없어 커넥션이 실패한다.

## 증상과 로그 시그니처

- 노드 스케일아웃 직후 새 노드에 뜬 Pod로 향하는 트래픽이 간헐적으로 유실.
- 클라이언트(waypoint) 쪽 에러: upstream connect error or disconnect/reset before headers, reset reason은 connection failure 또는 connection termination.
- 애플리케이션 로그는 정상 — 트래픽이 앱까지 도달하지 못하니 당연하다.
- [[Istio-Ambient-Stale-Connection|stale connection 503]]과의 구별: 그쪽은 롤아웃 중 기존 커넥션 재사용(UC, connection_termination 단일 패턴)이고, 이쪽은 새 노드에서 커넥션 수립 자체가 실패(connection failure 포함)한다.

## 해결 — Startup Taint와 Untaint Controller

스케줄링 단계에서 순서를 강제하는 방식이다.

1. 인프라 레벨(Karpenter NodePool의 startupTaints, node group, ASG)에서 새 노드 생성 시 `cni.istio.io/not-ready` taint(NoSchedule)를 미리 부착한다.
2. 일반 workload Pod는 이 taint 때문에 스케줄되지 못한다.
3. istio-cni DaemonSet은 toleration이 있어 먼저 기동한다.
4. istio-cni Pod가 Ready가 되면 istiod 안의 **untaint controller**가 taint를 제거한다.
5. 그제서야 일반 workload가 스케줄된다 — CNI가 준비된 노드에만.

설정 주의점:

- Istio 쪽은 두 가지가 **모두** 필요하다: helm 값 `pilot.taint.enabled=true` 그리고 istiod env feature flag `PILOT_ENABLE_NODE_UNTAINT_CONTROLLERS=true`. 앞엣것만 켜면 controller가 동작하지 않는다.
- taint를 **부착**하는 것은 인프라(노드 프로비저너)의 몫이다. untaint controller는 제거만 담당한다.
- ztunnel 쪽 race는 CNI ADD 시점의 동기식 AddWorkload/ACK 경로가 대부분 막아준다.

잔존 리스크 (완전 해결이 아님): 기존 Pod 재등록, redirection 적용 후 ztunnel disconnect, `pending` 상태의 짧은 window는 여전히 남는다.

## 운영 교훈

- 모니터링 대상이 바뀐다: 애플리케이션 Pod readiness만 보던 것에서 **node-local dataplane(istio-cni, ztunnel)의 readiness까지** 함께 봐야 한다.
- `ambient.istio.io/redirection` annotation은 Pod 단위 mesh 편입 상태를 확인하는 일차 진단 포인트다.
- K8s의 Ready와 실제 트래픽 수신 가능 상태의 간극은 ambient 특유 문제가 아니라, 노드 레벨 의존성(CNI, 로그 수집기, CSI 등)이 있는 모든 DaemonSet 아키텍처의 일반 패턴이다. startup taint는 그 일반 해법.

## 면접 체크포인트

- Pod가 Ready인데 트래픽이 유실된다면? → readiness probe는 앱 관점일 뿐. 네트워크 경로의 전제 조건(CNI rule, 프록시 등록)이 별도로 준비됐는지 의심. ambient에선 redirection annotation 확인.
- 스케줄러와 DaemonSet의 순서 보장은? → 없다. 새 노드에서 DaemonSet과 workload는 동시에 스케줄될 수 있고, 순서가 필요하면 startup taint 같은 장치로 직접 강제해야 한다.
- 두 실패 시나리오 중 뭐가 더 위험한가? → istio-cni가 늦는 쪽. 에러가 나는 게 아니라 mTLS와 인가 정책이 조용히 빠진 채 트래픽이 흐른다. 실패는 시끄러운 것보다 조용한 것이 위험하다.

## 사례

- 채널코퍼레이션 (2026): 노드 스케일아웃 시 간헐적 트래픽 유실을 추적해 위 두 시나리오를 규명, Karpenter startupTaints + untaint controller로 해결. 당시 공식 문서에 untaint controller 설명이 없어 ambientmesh.io 가이드로 파악했고, 이후 istio/istio.io#17190으로 공식 CNI setup 문서에 반영됨.

## 관련 문서

- [[Istio-Ambient-Mode|Istio Ambient Mode]] — 개념과 컴포넌트 (istio-cni, ztunnel의 역할)
- [[Istio-Ambient-Traffic-Internals|Istio Ambient 트래픽 내부 구현]] — redirection rule이 실제로 무엇을 설치하는지
- [[Istio-Ambient-Stale-Connection|Stale Connection과 503]] — 같은 시리즈의 다른 장애 (커넥션 생명주기 vs 편입 순서 race)
- [[Istio-Ambient-Upgrade|Istio Ambient 업그레이드 전략]] — 업그레이드로 새 노드가 뜰 때마다 이 편입 순서 문제가 재현되는 맥락
- [[Graceful-Shutdown]] — 시작 순서 보장의 반대편 문제인 종료 순서 보장

## 출처

- [Istio Ambient Mode 3-2편: Partially Enrolled Pod와 Untaint Controller — 채널톡 테크 블로그](https://tech.channel.io/kr/articles/1f761f31)
