---
tags: [web, network, routing, rip, ospf, bgp, l3]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["Routing Protocols", "라우팅 프로토콜", "RIP OSPF BGP", "정적 동적 라우팅"]
verified_at: 2026-09-30
---

# 정적 라우팅과 RIP, OSPF, BGP

라우터가 패킷을 전달할 때 읽는 것은 **라우팅 테이블**이고, 라우팅 프로토콜은 그 테이블에 넣을 도달 가능성 정보를 교환하는 수단이다. 프로토콜이 경로를 학습하는 control plane과 실제 패킷을 next hop으로 보내는 data plane을 구분하면 구조가 선명해진다.

## 정적 라우팅과 동적 라우팅

| 방식 | 장점 | 비용과 위험 | 적합한 곳 |
|---|---|---|---|
| 정적 경로 | 예측 가능, 프로토콜 트래픽과 계산 부담 없음, 경로 정보를 밖으로 광고하지 않고 이웃의 위조 광고를 받을 통로도 없음 | 장애와 변경을 자동 반영하지 않음, 규모가 커지면 운영 부담 | 작은 고정망, 기본 경로, 의도적으로 고정한 예외 |
| 동적 라우팅 | 토폴로지 변화 전파, 큰 망에 확장 | 수렴 시간, 잘못된 광고 전파, 정책과 자원 관리 필요 | 여러 경로와 장애 우회가 필요한 망 |

라우터끼리 물리적으로 연결돼 있어도 라우팅 테이블에 경로가 없고 기본 경로도 없으면 그 목적지로 가는 패킷은 버려진다. 논리적으로는 끊긴 것과 같다. 정적 경로는 경로상의 라우터가 고장 나도 우회하지 못해 관리자가 경로를 바꾸거나 장비를 고쳐야 하지만, 소수의 라우터와만 연결된 작은 망에서는 정보 교환 부하가 없는 정적 경로가 더 나을 수 있다.

동적이라는 말이 언제나 더 안전하거나 더 빠르다는 뜻은 아니다. 장애를 감지하고 새 경로에 합의하는 **수렴** 전에는 일시적인 루프, black hole이나 비대칭 경로가 생길 수 있다.

## IGP와 EGP

Autonomous System(AS)은 하나의 관리 정책 아래 운영되는 라우팅 도메인이다.

- **IGP**: AS 내부 경로를 학습한다. RIP과 OSPF가 대표적이다.
- **EGP**: AS 사이의 도달 가능성과 정책을 교환한다. 오늘날 대표 프로토콜은 BGP다.

IGP는 내부 비용으로 빠르게 도달할 경로를 찾는 데 초점이 있고, BGP는 인터넷 규모에서 어떤 AS 경로를 받아들이고 광고할지 정책을 적용한다.

AS를 나눠 내부와 외부에 다른 프로토콜을 쓰는 이유는 둘이다.

- **정책**: AS 경계에서 어떤 경로를 받아들이고 광고할지, 다른 사업자의 트래픽을 대신 실어 줄지를 조직의 정책으로 정한다. RFC 1930은 AS를 하나의 명확한 라우팅 정책을 가진 IP 프리픽스 집합으로 정의한다.
- **규모 격리**: IGP는 내부 토폴로지만 다뤄 빠르게 수렴한다. 인터넷 전체 경로처럼 큰 외부 경로 집합을 IGP에 재분배하지 않고 BGP 라우터 사이에서만 다루면 외부 경로의 잦은 변화가 내부 IGP 재계산으로 번지지 않는다. OSPF에 외부 경로를 넣으면 AS 전체로 그대로 flooding된다.

경계에서는 두 체계가 맞물린다. 외부 AS와 붙은 라우터는 eBGP로 외부 경로를 받고, 같은 AS의 다른 BGP 라우터와는 iBGP로 외부 경로를 공유하며, 내부 경로의 일관성은 IGP가 맡는다(RFC 4271). BGP로 받은 경로의 next hop은 IGP 경로로 찾아가고, 그 IGP 비용이 바뀌면 BGP 경로 선택을 다시 한다. 라우팅 테이블에는 직접 연결, 정적, IGP와 BGP 경로가 함께 들어가며 같은 목적지에 어느 출처의 경로를 쓸지는 로컬 정책이다. OSPF는 외부 경로를 도메인 안으로 광고하는 라우터를 ASBR(AS boundary router)이라 부르고, BGP 쪽에서는 보통 BGP speaker나 eBGP 피어라고 부른다.

## RIP: distance vector

RIP v2는 목적지까지의 hop count를 metric으로 쓰며, 16을 unreachable로 취급한다. 인접 라우터가 전달한 거리 정보를 바탕으로 다음 hop을 고르는 방식이라 구성이 단순하지만 큰 망에는 metric 표현력과 수렴 속도가 부족하다.

RIP 라우터는 30초마다 자기 라우팅 테이블 전체를 이웃에게 보내고(동기화를 피하려 0~5초 무작위 편차), 이웃이 알려 준 거리에 링크 비용(보통 1)을 더해 더 짧으면 그 이웃을 다음 홉으로 갱신한다. 처음에는 직접 연결된 네트워크만 알고, 정보는 갱신 한 번에 한 홉씩 퍼진다. 주기 갱신만으로는 변화가 망 끝까지 퍼지는 데 대략 홉 수 × 30초가 걸리므로, metric이 바뀌면 주기를 기다리지 않고 바뀐 경로만 보내는 triggered update(1~5초 무작위 지연)로 앞당긴다. 180초 동안 갱신이 없으면 경로를 만료시키고, 120초의 garbage-collection 동안 metric 16으로 광고한 뒤 지운다.

라우터가 이웃의 거리와 다음 홉만 알면 돼 메모리와 계산이 적다. 대신 변화가 없어도 전체 테이블을 주기적으로 보내 트래픽이 생기고(변화가 생길 때 알리는 인터럽트보다 주기적으로 확인하는 폴링에 가깝다), 망이 클수록 수렴이 느리며, 전체 경로를 모르는 distance vector라 수렴 중 루프가 생길 수 있다.

라우팅 루프를 줄이기 위해 split horizon, poisoned reverse, triggered update 같은 장치를 사용한다. 그래도 RIP을 현재 모든 내부망의 기본 선택으로 일반화하면 안 된다.

## OSPF: link state

OSPF는 링크 상태 광고(LSA)를 flooding해 같은 area의 라우터가 link-state database를 맞추고, 각 라우터가 shortest-path tree를 계산한다.

- 링크 비용을 metric으로 사용하므로 hop 수만 보는 RIP보다 토폴로지를 세밀하게 표현한다.
- area로 망을 계층화하며 backbone은 Area 0이다.
- 모든 라우터가 전체 인터넷을 아는 것이 아니라 OSPF 도메인과 area 범위의 상태를 관리한다.

각 라우터는 자기 라우터 ID와 연결된 링크, 링크 비용을 담은 LSA를 만들어 이웃에게 보내고, 이웃은 이를 다시 다른 이웃에게 전달한다. 같은 LSA의 어느 인스턴스가 최신인지는 도착 순서가 아니라 LS sequence number, checksum과 age로 판단하고, 이미 가진 인스턴스는 다시 퍼뜨리지 않는다. 그 결과 같은 area의 라우터는 같은 link-state database를 갖고, 각자 자신을 루트로 다익스트라 알고리즘을 돌려 최단 경로 트리를 만든다.

- 링크 비용 산정은 구현과 설정에 달려 있다. Cisco 기본값은 참조 대역폭 100Mb/s를 인터페이스 대역폭으로 나눈 값이라 100Mb/s 이상 링크가 모두 비용 1이 된다. 빠른 링크를 구분하려면 도메인 전체에서 참조 대역폭을 같은 값으로 올린다.
- 변화가 있을 때 LSA를 보내므로 RIP처럼 전체 테이블을 주기적으로 주고받지 않지만 주기 교환이 전혀 없는 것은 아니다. Hello로 이웃 생존을 확인하고(LAN 예시 값 10초), 각 LSA를 30분(LSRefreshTime)마다 다시 광고한다.
- 홉 수 제한이 없고 수렴이 빠르지만, 전체 link-state database를 저장할 메모리와 SPF 계산을 위한 CPU가 들고 설정과 학습 비용이 크다.

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
| 보유 정보 | 이웃이 알려 준 거리와 다음 홉 | area의 전체 link-state database | AS 경로와 경로 속성 |
| 갱신 방식 | 30초마다 전체 테이블, triggered update | 변화 시 LSA flooding, 30분 refresh | 변화 시 UPDATE, KEEPALIVE로 연결 유지 |
| 자원 | 메모리와 CPU 적음 | LSDB 메모리와 SPF 계산 CPU | 큰 경로 테이블의 메모리 |
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
- [RFC 1930 — Guidelines for creation, selection, and registration of an Autonomous System](https://www.rfc-editor.org/rfc/rfc1930.html)
- [Review OSPF Frequently Asked Questions — Cisco](https://www.cisco.com/c/en/us/support/docs/ip/open-shortest-path-first-ospf/9237-9.html)
- [그림으로 쉽게 배우는 네트워크 — 라우팅 프로토콜, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160809)
- [그림으로 쉽게 배우는 네트워크 — 스태틱 라우팅, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160811)
- [그림으로 쉽게 배우는 네트워크 — 다이내믹 라우팅, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160812)
- [그림으로 쉽게 배우는 네트워크 — RIP, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160813)
- [그림으로 쉽게 배우는 네트워크 — OSPF, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160814)
- [그림으로 쉽게 배우는 네트워크 — BGP, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160815)

## 관련 문서

- [[Network-Layer|네트워크 계층, CIDR와 라우팅 테이블]]
- [[Routing-Table-and-Interface-Selection|호스트 라우팅 테이블과 인터페이스 선택]]
- [[Physical-DataLink-Layer|L2 switching과 Spanning Tree]]
- [[IPv4-NAT-and-Traversal|IPv4 NAT와 NAT 통과]]
- [[네트워크(Network)|네트워크 인덱스]]
