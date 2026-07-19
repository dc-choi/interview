---
tags: [infrastructure, kubernetes, service-mesh, istio, envoy, network]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Istio Ambient Traffic Internals", "HBONE 구현", "Envoy Internal Listener"]
---

# Istio Ambient Mode 트래픽 내부 구현

[[Istio-Ambient-Mode]]가 개념과 트레이드오프를 다룬다면, 이 문서는 Gateway에서 Pod까지 HTTP 요청이 실제로 어떻게 전달되는지를 Envoy 설정 수준에서 본다. HBONE, ztunnel, traffic redirection 같은 개념이 결국 Envoy의 기존 기능(internal listener, tunneling config, transport socket)과 iptables REDIRECT의 조합으로 구현되어 있다는 것이 핵심이다.

## Envoy 요청 처리 기본 체인

Envoy는 요청을 네 단계로 처리한다. ambient의 모든 경로 분석은 이 체인 위에서 읽으면 된다.

| 단계 | 역할 |
| --- | --- |
| Listener | 포트에서 트래픽 수신, 필터 체인 결정 |
| Route | 호스트명과 경로로 가상호스트 매칭 |
| Cluster | 요청을 보낼 서비스 그룹(upstream) 결정 |
| Endpoint | 클러스터 안에서 최종 대상 인스턴스 선택 |

## Endpoint의 3가지 경로

Gateway(또는 waypoint)의 Envoy가 endpoint를 고를 때, 대상 Pod의 mesh 소속 여부에 따라 경로가 갈린다.

1. **Out-of-mesh**: 대상이 mesh 밖이면 Pod IP로 직접 연결한다 (plaintext).
2. **In-mesh**: 대상이 mesh 안이면 endpoint가 실제 IP가 아니라 `envoy_internal_address`로 표현된다. 내부 listener를 거쳐 HBONE 터널로 캡슐화된 뒤 대상 노드의 ztunnel로 전달된다.
3. **Waypoint 지정**: 대상 서비스에 waypoint가 붙어 있으면 waypoint를 경유하도록 라우팅되고, waypoint가 L7 정책을 적용한 뒤 다시 대상으로 보낸다.

## HBONE의 실제 구현

HBONE은 새 프로토콜이 아니라 Envoy 기존 기능의 조합이다.

- **internal listener** (`connect_originate`): 네트워크 포트가 아닌 Envoy 프로세스 내부에서 트래픽을 받는 listener. in-mesh endpoint로 향하는 트래픽이 여기로 들어온다.
- **tcp_proxy 필터 + `tunneling_config`**: 들어온 TCP 스트림을 HTTP/2 CONNECT 요청으로 감싼다. `:authority` 헤더에 실제 destination 정보를 실어 보낸다.
- **`UpstreamTlsContext` (transport socket)**: CONNECT 터널 바깥을 mTLS로 암호화한다.
- 터널의 종착지는 대상 Pod가 있는 노드 ztunnel의 **15008 포트**(HBONE inbound)다.

즉 HBONE 터널 수립 = internal listener로 우회 → HTTP/2 CONNECT 캡슐화 → mTLS transport socket → 상대 ztunnel 15008.

## ztunnel 트래픽 리다이렉션 내부

- istio-cni가 Pod 생성 시점에 **Pod의 네트워크 네임스페이스 안에** iptables REDIRECT 규칙을 설치한다.
- ztunnel은 노드에서 실행되지만 **크로스 네임스페이스 소켓**으로 각 Pod 네임스페이스 내부의 15001(egress), 15006(plaintext inbound), 15008(HBONE inbound) 포트에 직접 listening한다. 그래서 리다이렉트가 노드 네트워크를 거치지 않고 Pod 안에서 완결된다.
- **packet mark로 무한루프 방지**: 리다이렉트 규칙이 ztunnel 자신이 보낸 패킷까지 다시 잡으면 루프가 생긴다. 이를 mark로 구분한다.

| mark | 의미 | 효과 |
| --- | --- | --- |
| `0x539` | ztunnel이 보낸 패킷 | REDIRECT 규칙 우회 |
| `0x111` | ztunnel 커넥션의 응답 패킷 | 재리다이렉트 방지 |

## Gateway와 Waypoint의 역할 분리 설계

기본 ambient 구성은 Gateway가 Pod로 직접 라우팅하는 경로도 허용하지만, Gateway → Waypoint → Pod로 고정하는 설계 선택지가 있다.

- **문제**: 공개 트래픽(north-south)은 Gateway에서, 내부 트래픽(east-west)은 waypoint에서 라우팅 정책을 관리하면 같은 서비스의 정책이 두 곳에 중복되어 인지 부하가 생긴다.
- **해법**: Gateway는 호스트명 매칭만 하고, 라우팅과 L7 정책은 waypoint 한 곳에서 통합 관리한다.
- **트레이드오프**: 정책 관리는 단순해지지만 모든 인입 트래픽에 waypoint hop이 추가되어 경로가 길어진다.

## 면접 체크포인트

- HBONE은 어떻게 구현되나? → 새 프로토콜이 아니라 Envoy의 internal listener + HTTP/2 CONNECT(tunneling_config) + mTLS transport socket 조합. 터널 종착지는 상대 노드 ztunnel의 15008.
- ztunnel은 노드에 하나인데 어떻게 Pod별 트래픽을 잡나? → istio-cni가 Pod 네임스페이스 안에 iptables 규칙을 깔고, ztunnel이 크로스 네임스페이스 소켓으로 Pod 내부 포트에 직접 listening.
- 리다이렉트 무한루프는 왜 안 생기나? → ztunnel 발신 패킷에 packet mark를 찍어 REDIRECT 규칙에서 제외.
- north-south와 east-west 정책 중복은 어떻게 푸나? → Gateway는 호스트명 매칭만, 정책은 waypoint로 일원화. 대가는 waypoint hop 추가.

## 관련 문서

- [[Istio-Ambient-Mode|Istio Ambient Mode]] — 개념, 컴포넌트, sidecar 대비 트레이드오프 (이 문서의 상위 개념 편)
- [[Istio-Ambient-Stale-Connection|Stale Connection과 503]] — connect_originate pool에서 실제 벌어진 프로덕션 장애 사례
- [[Forward-vs-Reverse-Proxy|Forward vs Reverse Proxy]] — 프록시 기본 개념
- [[Load-Balancer|Load Balancer]] — L4/L7 로드밸런싱 기초

## 출처

- [Istio Ambient Mode 2편: Envoy Config 분석 — 채널톡 테크 블로그](https://tech.channel.io/kr/articles/c5193569)
