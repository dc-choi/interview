---
tags: [web, network, routing, rip, ospf, bgp, l3]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["Routing Protocols", "라우팅 프로토콜", "RIP OSPF BGP", "정적 동적 라우팅"]
verified_at: 2026-08-04
---

# 정적 라우팅과 RIP, OSPF, BGP

라우터가 패킷을 전달할 때 읽는 것은 **라우팅 테이블**이고, 라우팅 프로토콜은 그 테이블에 넣을 도달 가능성 정보를 교환하는 수단이다. 프로토콜이 경로를 학습하는 control plane과 실제 패킷을 next hop으로 보내는 data plane을 구분하면 구조가 선명해진다.

## 정적 라우팅과 동적 라우팅

| 방식 | 장점 | 비용과 위험 | 적합한 곳 |
|---|---|---|---|
| 정적 경로 | 예측 가능, 프로토콜 트래픽 없음 | 장애와 변경을 자동 반영하지 않음, 규모가 커지면 운영 부담 | 작은 고정망, 기본 경로, 의도적으로 고정한 예외 |
| 동적 라우팅 | 토폴로지 변화 전파, 큰 망에 확장 | 수렴 시간, 잘못된 광고 전파, 정책과 자원 관리 필요 | 여러 경로와 장애 우회가 필요한 망 |

동적이라는 말이 언제나 더 안전하거나 더 빠르다는 뜻은 아니다. 장애를 감지하고 새 경로에 합의하는 **수렴** 전에는 일시적인 루프, black hole이나 비대칭 경로가 생길 수 있다.

## IGP와 EGP

Autonomous System(AS)은 하나의 관리 정책 아래 운영되는 라우팅 도메인이다.

- **IGP**: AS 내부 경로를 학습한다. RIP과 OSPF가 대표적이다.
- **EGP**: AS 사이의 도달 가능성과 정책을 교환한다. 오늘날 대표 프로토콜은 BGP다.

IGP는 내부 비용으로 빠르게 도달할 경로를 찾는 데 초점이 있고, BGP는 인터넷 규모에서 어떤 AS 경로를 받아들이고 광고할지 정책을 적용한다.

## RIP: distance vector

RIP v2는 목적지까지의 hop count를 metric으로 쓰며, 16을 unreachable로 취급한다. 인접 라우터가 전달한 거리 정보를 바탕으로 다음 hop을 고르는 방식이라 구성이 단순하지만 큰 망에는 metric 표현력과 수렴 속도가 부족하다.

라우팅 루프를 줄이기 위해 split horizon, poisoned reverse, triggered update 같은 장치를 사용한다. 그래도 RIP을 현재 모든 내부망의 기본 선택으로 일반화하면 안 된다.

## OSPF: link state

OSPF는 링크 상태 광고(LSA)를 flooding해 같은 area의 라우터가 link-state database를 맞추고, 각 라우터가 shortest-path tree를 계산한다.

- 링크 비용을 metric으로 사용하므로 hop 수만 보는 RIP보다 토폴로지를 세밀하게 표현한다.
- area로 망을 계층화하며 backbone은 Area 0이다.
- 모든 라우터가 전체 인터넷을 아는 것이 아니라 OSPF 도메인과 area 범위의 상태를 관리한다.

장애 후 LSA 전파와 SPF 재계산 비용이 있으므로 timer와 area 설계를 임의로 조정하기보다 장비 구현과 운영 목표를 함께 검증한다.

## BGP: path vector와 정책

BGP는 TCP 연결 위에서 network reachability와 path attribute를 교환한다. 대표 속성인 AS_PATH는 경로가 거친 AS를 담고 loop 탐지에도 쓰인다.

BGP의 best path는 단순한 최단 hop 계산이 아니다. LOCAL_PREF, AS_PATH, MED, eBGP/iBGP 여부 등 여러 속성과 구현별 선택 절차가 관여한다. 따라서 BGP는 **정책 기반 inter-domain routing**으로 이해하는 편이 정확하다.

잘못된 prefix 광고는 넓게 전파될 수 있다. prefix filter, max-prefix, RPKI 기반 route-origin validation과 변경 절차 같은 운영 통제가 프로토콜 이해만큼 중요하다.

## 비교

| 항목 | RIP v2 | OSPF v2 | BGP-4 |
|---|---|---|---|
| 범위 | AS 내부 | AS 내부 | AS 사이, 대규모 정책 경계 |
| 방식 | distance vector | link state | path vector |
| 핵심 판단 | hop count | link cost와 SPF | path attributes와 정책 |
| 강점 | 단순한 소규모 구성 | 빠른 내부 수렴과 계층화 | 인터넷 규모 정책 제어 |
| 주의 | 15-hop 한계, 느린 수렴 | area와 LSDB 운영 복잡성 | 정책 오류의 큰 blast radius |

## 장애 분석 순서

1. 목적지 prefix가 라우팅 테이블에 있는지 본다.
2. longest prefix match로 실제 선택된 next hop을 확인한다.
3. 해당 경로가 static, connected, RIP, OSPF, BGP 중 어디서 왔는지 확인한다.
4. 프로토콜 인접 관계와 광고, 필터, metric 또는 attribute를 확인한다.
5. control plane에 경로가 있어도 data plane ACL, NAT, MTU와 return path가 막지 않는지 확인한다.

## 출처

- [RFC 2453 — RIP Version 2](https://www.rfc-editor.org/rfc/rfc2453.html)
- [RFC 2328 — OSPF Version 2](https://www.rfc-editor.org/rfc/rfc2328.html)
- [RFC 4271 — Border Gateway Protocol 4](https://www.rfc-editor.org/rfc/rfc4271.html)
- [그림으로 쉽게 배우는 네트워크 — 동적 라우팅, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160812)
- [그림으로 쉽게 배우는 네트워크 — RIP, OSPF와 BGP, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160813)

## 관련 문서

- [[Network-Layer|네트워크 계층, CIDR와 라우팅 테이블]]
- [[Physical-DataLink-Layer|L2 switching과 Spanning Tree]]
- [[IPv4-NAT-and-Traversal|IPv4 NAT와 NAT 통과]]
- [[네트워크(Network)|네트워크 인덱스]]
