---
tags: [network, sdn, openflow, wan, traffic-engineering]
status: done
verified_at: 2026-11-14
category: "Web - 네트워크"
aliases: ["SDN", "Software-Defined Networking", "소프트웨어 정의 네트워킹", "OpenFlow", "B4"]
---

# 소프트웨어 정의 네트워킹(SDN)

SDN(Software-Defined Networking)은 장비마다 들어 있던 제어 평면(경로 계산과 정책 결정)을 데이터 평면(패킷 전달)에서 떼어 내, 범용 서버에서 도는 소프트웨어 컨트롤러가 표준 인터페이스로 여러 스위치의 전달 규칙을 프로그래밍하는 구조다. 스위치는 받은 규칙대로 패킷을 처리하는 데 집중하고, 네트워크 전체 상태를 보는 판단은 컨트롤러가 맡는다. 아래 설명은 OpenFlow 제안 글(2008)과 Google B4 논문(2013)을 기준으로 하며, 이후 OpenFlow 규격 판과 상용 SDN 제품은 대조하지 않았다.

## 등장 배경

- 상용 스위치와 라우터는 외부에 패킷 전달 같은 좁은 인터페이스만 열고 내부 유연성은 감춘다. 내부 구조는 벤더마다 다르고 연구자가 실험할 표준 플랫폼이 없었다.
- 새 라우팅 프로토콜이나 IP 대안을 실제 트래픽 규모에서 시험할 방법이 사실상 없어 새 아이디어가 검증되지 못했다. 2008 글은 이 상황을 네트워크 인프라가 경직(ossified)됐다는 통념과 연결했다.
- PC 기반 소프트웨어 라우터는 프로그래밍은 자유롭지만 포트 수와 처리 성능이 배선실 스위치에 못 미쳤다. 그래서 고성능과 저비용 구현, 폭넓은 연구 지원, 실험 트래픽과 운영 트래픽의 격리, 벤더의 폐쇄 플랫폼 유지라는 네 목표를 함께 만족하려는 절충으로 OpenFlow가 제안됐다. 이 2008 글은 동료 심사를 거치지 않은 CCR editorial note(백서)다.

## OpenFlow 스위치의 구성

OpenFlow는 대부분의 이더넷 스위치와 라우터가 방화벽, NAT, QoS와 통계 수집을 위해 이미 가진 flow table(보통 TCAM)의 공통 기능을 외부에서 프로그래밍하는 개방 프로토콜이다. OpenFlow 스위치는 최소 세 부분으로 이뤄진다.

1. **Flow Table**: flow entry마다 그 flow를 어떻게 처리할지 정한 action이 붙는다.
2. **Secure Channel**: 스위치와 원격 제어 프로세스(컨트롤러)를 잇고 명령과 패킷을 주고받는다. 논문 그림은 이 연결에 SSL을 표시한다.
3. **OpenFlow Protocol**: 컨트롤러가 스위치와 통신하는 개방된 표준 방법이다. 연구자가 스위치 자체를 프로그래밍하지 않고 flow entry를 외부에서 정의하게 한다.

Flow entry는 flow를 정의하는 패킷 헤더, 처리 방법인 action, 패킷과 바이트 수와 마지막 일치 이후 시간을 세는 통계의 세 필드를 가진다. 첫 세대(Type 0) 헤더는 입력 포트, VLAN ID, 이더넷 출발지/목적지/타입, IP 출발지/목적지/프로토콜, TCP 출발지/목적지 포트의 10-tuple이며 각 필드는 wildcard로 묶을 수 있다. 예를 들어 VLAN ID만 지정하면 그 VLAN 전체 트래픽이 하나의 flow다.

전용 OpenFlow 스위치가 반드시 지원하는 기본 action은 세 가지다.

| Action | 쓰임 |
| --- | --- |
| 지정 포트로 전달 | 네트워크 경로 전달. 대부분 스위치에서 라인 레이트로 예상 |
| 캡슐화해 컨트롤러로 전달 | 주로 새 flow의 첫 패킷을 보내 컨트롤러가 table에 넣을지 결정. 일부 실험은 모든 패킷을 컨트롤러로 보냄 |
| 폐기 | 보안, 서비스 거부 공격 억제, 불필요한 broadcast discovery 트래픽 감소 |

기존 L2/L3 처리를 유지하는 OpenFlow 지원 상용 스위치는 실험 트래픽을 운영 트래픽과 격리해야 한다. 이를 위해 네 번째 action으로 스위치의 일반 처리 파이프라인에 넘기거나, 실험용과 운영용 VLAN을 나눈다. 컨트롤러는 실험 기간 동안 flow를 정적으로 설정하는 단순 애플리케이션일 수도, 실험 진행에 따라 flow를 동적으로 더하고 지우는 프로그램일 수도 있다. 하나의 스위치를 둘 이상의 컨트롤러가 제어해 성능과 견고성을 높일 수도 있다.

## 사례: Google B4

B4는 Google 데이터센터 사이를 잇는 사설 WAN이다. 사용자 요청을 처리하고 다른 인터넷 도메인과 peering하는 user-facing WAN과는 별도 네트워크이며, 2013 논문 시점에 약 3년간 운영 중이었다. 데이터 복제, 원격 스토리지 접근, 대규모 상태 동기화처럼 대역폭은 많이 쓰지만 일시적 감소를 견디는 트래픽이 주를 이룬다. 중앙 제어 대상은 데이터센터 사이 WAN이며, 기본 라우팅(BGP/IS-IS) 위에 중앙 TE(Traffic Engineering)가 경로와 대역폭 배분을 얹는 구조로 읽는다(해석).

- **동기**: 논문은 전통적 WAN이 장애를 가리려고 링크를 평균 30~40% 사용률로 과잉 설비해 왔고, 이는 완전 활용 대비 2~3배 비용이라고 설명한다. B4는 애플리케이션과 사이트 네트워크를 직접 통제하고 사이트 수가 많아야 수십 개로 예상돼(2012년 9~11월 실제 16개) 중앙 대역폭 제어가 가능했다.
- **구조**: 스위치 하드웨어 계층은 merchant silicon으로 만든 자체 스위치가 주로 패킷을 전달한다. 사이트 컨트롤러 계층은 Network Control Server에서 OpenFlow Controller와 제어 애플리케이션을 돌리며, 사이트별 Paxos가 여러 복제본 중 주 인스턴스를 고른다. 전역 계층의 SDN Gateway와 중앙 TE 서버가 사이트 컨트롤러를 통해 전체를 제어하고, 이 전역 애플리케이션도 여러 사이트에 복제한다.
- **라우팅과 TE의 분리**: 기존 BGP/IS-IS 라우팅을 서버에서 먼저 돌리고 TE를 그 위의 overlay로 얹었다. TE에 문제가 생기면 TE를 끄고 최단 경로 전달로 되돌리는 장치가 있다. 중앙 제어를 하더라도 분산 프로토콜을 대체 경로로 남겨 둔 설계다.
- **결과**: 논문은 TE와 다중 경로 분산으로 많은 링크를 100%에 가깝게, 전체 링크를 장기 평균 70% 사용률로 운영해 표준 방식 대비 2~3배 효율을 냈다고 보고한다. 대신 용량이 크게 줄어드는 링크나 스위치 장애에서는 패킷 손실이 불가피해지는 것을 감수했다. 측정된 손실 시간은 단일 링크 장애 4ms, encap 스위치에 이웃한 transit 스위치 장애 3,300ms처럼 장애 유형마다 크게 다르다.

## 트레이드오프

| 얻는 것 | 치르는 것 |
| --- | --- |
| 네트워크 전체 상태를 보고 경로와 대역폭을 결정 | 제어 경로 자체의 용량과 버그가 새 위험이 됨. B4에서 OFC나 TE 서버 장애가 다른 장애와 겹치지 않으면 장애 조치는 설계상 무손실로 측정됐다. 그러나 2013 논문의 장애 사례에서는 OFC와 스위치 사이 제어 경로에 프로토콜 패킷이 쌓여 TE가 그 사이트를 지나는 새 터널을 만들지 못했고, 복구하려고 OFC 서버를 재시작하자 고부하에서 드러난 OFC 버그가 복구를 막았다 |
| 범용 서버에서 제어 소프트웨어를 빠르게 바꾸고 시험 | 이전에 검증되지 않은 개발 모델, 하드웨어와 소프트웨어 사이 운명 공유(fate sharing)의 단절 |
| 장비 벤더와 무관한 표준 인터페이스 | 스위치가 지원하는 match 필드와 action 범위에 묶임 |
| 높은 링크 사용률 | 여유 용량이 줄어 장애 시 손실과 우선순위 정책이 필요 |

## 체크포인트

- SDN과 NFV를 구분한다. NFV 소개 백서(2012)는 둘이 서로 보완하지만 의존하지는 않는다고 설명한다([[Network-Functions-Virtualization|NFV]]). SDN은 전달 동작을 어떻게 제어하는지, NFV는 네트워크 기능을 무엇(범용 서버의 소프트웨어)으로 구현하는지의 문제로 나눠 읽는다(해석).
- 제어 평면을 중앙화해도 컨트롤러가 하나뿐이라는 뜻은 아니다. B4처럼 사이트별 복제와 주 선출, 전역 계층의 복제를 함께 설계한다.
- 링크 사용률 수치는 애플리케이션이 대역폭 감소를 견디고 엣지에서 송신률을 조절할 수 있다는 전제에서 나온다. 일반 WAN의 목표치로 그대로 옮기지 않는다.

## 출처

- [OpenFlow: Enabling Innovation in Campus Networks — ACM SIGCOMM Computer Communication Review 38(2), 2008, McKeown 외](https://www.cs.princeton.edu/courses/archive/fall17/cos561/papers/OpenFlow08.pdf)
- [B4: Experience with a Globally-Deployed Software Defined WAN — SIGCOMM 2013, Jain 외 (Google)](https://www.cs.princeton.edu/courses/archive/fall13/cos597E/papers/b4.pdf)
- [Network Functions Virtualisation, Introductory White Paper (Issue 1, 2012-10) — ETSI portal](https://portal.etsi.org/NFV/NFV_White_Paper.pdf)

## 관련 문서

- [[Network-Functions-Virtualization|네트워크 기능 가상화(NFV)]]
- [[Routing-Protocols|정적 라우팅과 RIP, OSPF, BGP]]
- [[Switch-Hierarchy-and-Uplink|스위치 계층과 업링크]]
- [[네트워크(Network)|네트워크 인덱스]]
