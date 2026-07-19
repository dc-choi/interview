---
tags: [infrastructure, kubernetes, service-mesh, istio, deployment, blue-green]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Istio Ambient Upgrade", "ztunnel Blue-Green", "Ambient 업그레이드"]
---

# Istio Ambient Mode 업그레이드 전략

ambient mode 업그레이드는 세 컴포넌트를 서로 다른 방식으로 다뤄야 한다. 핵심 판단은 **ztunnel의 업그레이드 단위는 Pod가 아니라 노드**라는 것 — 노드 단위 data plane은 같은 노드 안에서 in-place 교체하는 순간 그 노드의 모든 커넥션이 위험해지므로, rolling update 대신 blue-green node pool로 옮긴다.

## 컴포넌트별 업그레이드 방식

| 순서 | 컴포넌트 | 역할 | 방식 |
| --- | --- | --- | --- |
| 1 | istiod | control plane, Envoy config 전파 | in-place |
| 2 | istio-cni | Pod 감지, iptables 설정 | in-place (DaemonSet rollout) |
| 3 | ztunnel | 노드 단위 L4 data plane | **blue-green node pool** |
| 4 | 구 NodeGroup | — | 정리(제거) |

호환성 규칙: istio-cni와 ztunnel의 v1.x는 control plane v1.x와 v1.x+1에 호환된다. 그래서 control plane을 먼저 올리고 data plane이 따라가는 순서가 성립한다.

## Step 1 — istiod: in-place

- 일반적인 control plane 업그레이드. Gateway controller가 관리하는 Envoy 워크로드(gateway, waypoint)도 함께 자동 rollout된다.
- 확인: 새 revision 정상 기동, gateway/waypoint가 의도한 revision을 쓰는지, xDS sync, control plane 에러 로그 추이.

## Step 2 — istio-cni: in-place

- DaemonSet rollout으로 충분한 근거: 이미 실행 중인 Pod는 network namespace 안에 redirection rule과 ztunnel 경로가 완성돼 있어 CNI 교체의 영향을 받지 않는다. CNI는 Pod **생성 시점**에만 개입한다.
- rollout 중 새 Pod 생성이 겹치면 FailedCreatePodSandBox가 날 수 있지만, CNI가 준비되면 재시도로 회복되는 일시 현상이다.
- 확인: rollout 완료, redirection 누락 Pod 없음, `pending` annotation으로 남은 Pod 없음 ([[Istio-Ambient-Partially-Enrolled-Pod]]의 진단 포인트 재사용).

## Step 3 — ztunnel: blue-green node pool (핵심)

### rolling update가 부적합한 이유

- ztunnel은 노드의 모든 mesh 트래픽이 지나는 L4 프록시다. 같은 노드에서 old/new를 교체하면 graceful shutdown 시간(기본 30초)을 넘는 long-lived connection이 강제 종료된다.
- Istio 공식 스탠스도 ztunnel의 in-place hitless upgrade를 지원 범위 밖에 둔다. 노드 단위 컴포넌트의 안전한 교체 단위는 결국 노드다.

### 절차

1. **green ztunnel 리소스 생성**: 기존 버전을 ztunnel-a, 새 버전을 ztunnel-b로 이름을 나누고, 버전별 nodeSelector로 각자 자기 노드에서만 뜨게 한다.
2. **함정 — `trustedZtunnelName`**: istiod 설정에 ztunnel-a와 ztunnel-b를 **모두** 등록해야 한다. 빠뜨리면 green ztunnel이 istiod와 신뢰 관계를 맺지 못한다.
3. **green node pool 구성**: 노드 template에 istio 버전 label을 넣어(예: `node.channel.io/istio-version`) 기존 노드는 blue, 신규 노드는 green ztunnel을 쓰게 한다 (Karpenter NodePool 등).
4. **blue 노드를 점진적으로 cordon/drain**: stateless workload부터 옮긴다. stateful workload와 long-running job은 PDB, local storage, connection 특성 때문에 오래 남을 수 있어 ztunnel-a 제거 시점은 계획보다 늦어진다.
5. **지표 감시**: 이동 중 5xx, TCP reset, latency를 본다.
6. ztunnel-a가 뜬 노드가 0이 되면 ztunnel-a 리소스를 제거한다.

## Step 4 — NodeGroup 정리

모든 workload가 green으로 이동하고 blue ztunnel이 제거됐으면 구 NodeGroup을 삭제한다.

## 면접 체크포인트

- ztunnel만 왜 blue-green인가? → 업그레이드의 안전한 단위는 컴포넌트의 장애 반경과 같다. ztunnel의 장애 반경이 노드 전체이므로 교체 단위도 노드여야 하고, 그것이 곧 node pool 교체다.
- istio-cni는 왜 in-place로 안전한가? → CNI는 Pod 생성 시점에만 개입하고 기존 Pod의 데이터 경로에는 없다. 교체 중 리스크는 신규 Pod 생성뿐이고 그건 재시도로 회복된다. 컴포넌트가 데이터 경로에 상주하는지 여부가 업그레이드 전략을 가른다.
- 업그레이드 순서의 근거는? → version skew 정책 (data plane v1.x ↔ control plane v1.x/v1.x+1). control plane을 먼저 올려도 구 data plane이 호환되므로 istiod → cni → ztunnel 순서가 성립.
- blue-green node pool의 비용은? → 전환 기간 동안 노드 이중 운영 비용과, stateful workload 때문에 blue가 오래 남는 꼬리. 속도보다 안전을 사는 트레이드오프.

## 관련 문서

- [[Istio-Ambient-Mode|Istio Ambient Mode]] — ztunnel의 장애 반경(노드 전체)이 이 전략의 근거
- [[Istio-Ambient-Partially-Enrolled-Pod|Partially Enrolled Pod와 Untaint Controller]] — 업그레이드로 새 노드가 뜰 때마다 걸리는 편입 순서 문제
- [[Istio-Ambient-Stale-Connection|Stale Connection과 503]] — long-lived connection이 왜 민감한지의 실증
- [[Blue-Green|Blue-Green 배포]] — 애플리케이션 배포 관점의 blue-green (여기선 노드 풀 단위로 응용)
- [[Graceful-Shutdown]] — graceful shutdown 시간과 long-lived connection의 일반론

## 출처

- [Istio Ambient Mode 3-3편: Ambient mode 안전하게 업그레이드하기 — 채널톡 테크 블로그](https://tech.channel.io/kr/articles/b004fdb9)
