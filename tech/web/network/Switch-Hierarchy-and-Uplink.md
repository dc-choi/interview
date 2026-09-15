---
tags: [web, network, switch, l2, access-layer, distribution-layer, core-layer, uplink, topology]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["Switch Hierarchy and Uplink", "스위치 계층과 업링크", "액세스 스위치", "디스트리뷰션 스위치", "코어 스위치", "Access Distribution Core", "Uplink", "Link Up Link Down", "계층적 네트워크 설계", "액세스와 디스트리뷰션", "업링크와 링크 업"]
verified_at: 2026-09-15
---

# 스위치 계층과 업링크: 액세스, 디스트리뷰션, 코어

LAN은 엔드포인트가 스위치에 붙고, 그 스위치들이 다시 상위 스위치로 모이며, 끝에서 라우터(게이트웨이)를 통해 밖으로 나가는 계층 구조로 짜인다. 스위치가 프레임을 어떻게 전달하는지는 [[Physical-DataLink-Layer#스위치|L2 스위치 동작]]에서 다루고, 여기서는 스위치를 어디에 두고 어떻게 잇는지를 다룬다.

한 줄 요약: **누구를 위한 스위치인가를 물으면 계층이 보인다. 엔드포인트를 받으면 액세스, 액세스 스위치를 모으면 디스트리뷰션, 디스트리뷰션을 잇는 백본이 코어다.**

## 엔드포인트와 L2 스위치

- **엔드포인트**: PC, 스마트폰, 서버, 프린터, IP 카메라처럼 네트워크를 이용하는 말단 장비. 데이터의 최종 출발지이자 목적지다. 유선 단말은 스위치 포트에 직접 붙고, 무선 단말은 보통 AP를 거쳐 액세스망에 들어온다.
- **L2 스위치**: 프레임의 목적지 MAC 주소를 보고 해당 포트로만 내보내는 장비. MAC 주소의 구조와 확인 명령, MAC 테이블 학습, 플러딩과 STP 같은 동작 원리는 [[Physical-DataLink-Layer#MAC 주소|MAC 주소]]와 [[Physical-DataLink-Layer#스위치|스위치]].

## 계층적 설계: 액세스, 디스트리뷰션, 코어

| 계층 | 누구를 연결하나 | 역할 | 대표 특성 |
|---|---|---|---|
| 액세스(Access) | 엔드포인트 (무선은 AP 경유) | 네트워크의 첫 진입점, 포트 제공 | 포트 밀도, PoE, 포트 보안 |
| 디스트리뷰션(Distribution) | 액세스 스위치들 | 액세스 스위치 집선, 정책 경계 | VLAN 집약, ACL, L2/L3 경계 |
| 코어(Core) | 디스트리뷰션 스위치들 | 고속 백본, 중단 없는 전달 | 단순한 구성, 고대역폭, 이중화 |

방 하나의 기기를 묶는 것이 액세스 스위치, 층이나 구역의 액세스 스위치를 묶는 것이 디스트리뷰션 스위치, 건물 전체의 디스트리뷰션을 잇는 것이 코어다. 전형적인 경로는 `PC → 액세스 스위치 → 디스트리뷰션 → 코어/외부망`이다. 다만 방이나 층은 배치 예시일 뿐 역할의 정의가 아니다. 역할은 연결 대상으로 정해지므로, 스위치끼리 이었다고 그 스위치가 곧 디스트리뷰션이 되는 것은 아니다. 디스트리뷰션은 엔드포인트가 아니라 스위치를 위한 스위치이므로 포트 수보다 집선 대역폭과 정책 처리 능력이 중요하다.

- **계층을 나누는 이유**: 장애 격리와 변경 범위 축소. 액세스 스위치 하나의 장애는 그 스위치의 엔드포인트에만 영향을 주고, ACL과 QoS 같은 정책은 디스트리뷰션에서 한 번 적용한다. 코어는 정책을 최소화하고 빠르게 넘기는 데 집중한다.
- **collapsed core**: 규모가 작으면 디스트리뷰션과 코어를 스위치 한 대(또는 한 장비군)에 합쳐 2계층으로 운영한다. 물리 장비는 줄지만 두 역할의 논리적 구분은 유지한다.
- **역할과 전달 기능은 다른 축**: 액세스와 디스트리뷰션은 설계상의 역할이고, L2와 L3는 전달 기능의 구분이다. 디스트리뷰션에 L2 집선만 맡길 수도 있지만, 캠퍼스 설계에서는 VLAN 간 라우팅과 ACL을 맡는 L2/L3 경계로 두는 구성이 일반적이다. 액세스 스위치까지 L3로 내리는 routed access 설계도 있으며, 이 경우 L2 루프가 없어져 STP 의존이 줄어든다.

## 업링크와 링크 상태

**업링크(Uplink)**는 하위 스위치에서 상위 스위치로 향하는 연결이다. 액세스 스위치의 여러 포트 트래픽이 한두 개 링크로 모이므로 보통 액세스 포트보다 대역폭이 크다. 액세스 포트가 1GbE면 업링크는 10GbE를 두는 식이다.

- **집선비(oversubscription)**: 액세스 포트 총 대역폭 대비 업링크 대역폭. 1GbE 48포트에 10GbE 업링크 2개면 48:20, 약 2.4:1이다. 모든 포트가 동시에 꽉 차지 않는다는 전제로 설계하고, 서버 구간처럼 동시 사용률이 높은 곳은 비율을 낮춘다. Cisco 캠퍼스 설계 가이드는 액세스와 디스트리뷰션 사이 최대 20:1, 디스트리뷰션과 코어 사이 4:1까지 구현된 사례를 소개하지만, 실제 비율은 단말과 업링크의 실제 속도로 계산해 정한다.
- **이중화**: 업링크를 둘 이상 두면 한 링크 장애를 견디지만 L2 루프가 생긴다. STP로 하나를 차단해 대기시키거나, 링크 집성(LACP)으로 하나의 논리 링크로 묶어 둘 다 쓴다. [[Physical-DataLink-Layer#중복 링크와 Spanning Tree|중복 링크와 STP]]

업링크와 혼동하기 쉬운 용어가 링크 업과 링크 다운이다. 업링크도 링크 다운일 수 있고, 단말 포트도 링크 업일 수 있다.

| 용어 | 뜻 | 성격 |
|---|---|---|
| 업링크(Uplink) | 상위 장비로 가는 연결의 역할 | 토폴로지 설계 용어 |
| 링크 업(Link Up) | 케이블이 연결돼 양쪽 포트가 신호를 주고받는 상태 | L1 물리 상태 |
| 링크 다운(Link Down) | 케이블 분리, 상대 포트 꺼짐이나 비활성화, 속도/듀플렉스 협상 실패로 신호가 없는 상태 | L1 물리 상태 |

링크 업은 케이블이 살아 있다는 뜻이지 통신이 된다는 뜻이 아니다. 대표적인 예가 STP다. 물리 링크는 올라왔어도 포트가 listening, learning 단계를 지나 forwarding 상태가 되기 전까지는 프레임이 전달되지 않는다. 이 구간에도 물리 인터페이스의 line protocol은 up으로 보여 인터페이스 상태만으로는 구분되지 않는다. Cisco 스위치에서는 해당 VLAN에 forwarding 상태의 L2 포트가 하나도 없는 동안 VLAN 인터페이스(SVI)의 line protocol이 down으로 남고, 포트 하나가 forwarding에 들어가면 올라온다(autostate). 링크는 올라왔는데 통신이 안 되면 VLAN 불일치와 STP 상태, 포트 보안, IP 주소와 게이트웨이 경로, DNS와 원격 서비스 순으로 범위를 넓혀 점검한다. 링크 상태 자체는 포트 LED, Linux의 `ip link`, 스위치의 인터페이스 상태 명령으로 확인한다.

## 포트 수와 용량 설계

- 포트는 케이블이나 광 모듈을 꽂는 물리 단자다. [[Transport-Layer|TCP/UDP의 포트 번호]]와는 이름만 같은 다른 개념이다.
- 16포트 스위치에서 1포트를 업링크로 쓰면 엔드포인트는 15개까지고, 업링크를 이중화하면 14개다.
- 많은 스위치가 업링크용 SFP/SFP+ 포트를 일반 포트와 별도로 둔다. 도입 전에 업링크가 일반 포트를 소비하는지, 전용 포트가 있는지 확인한다. RJ-45와 SFP 중 하나만 활성화되는 콤보(dual-purpose) 포트는 두 개의 독립 포트로 세지 않는다.
- 남은 포트 수는 직접 연결할 수 있는 장비 수다. AP나 하위 스위치 뒤에 매달린 단말까지 합친 전체 엔드포인트 수와는 다르다.
- 증설을 고려해 사용 포트에 여유를 남긴다. 포트가 모자라 액세스 스위치 아래에 스위치를 또 매다는 daisy chain은 경로가 길어지고 업링크 병목이 겹치므로 임시 대응으로만 쓴다.
- 포트 수와 업링크 대역폭은 따로 계산한다. 포트가 남아 있어도 단말들의 상위망 트래픽 합이 업링크 용량을 넘으면 병목이 생긴다.
- PoE 스위치는 포트 수뿐 아니라 총 전력 예산도 함께 계산한다. 포트가 남아도 전력이 모자라면 장비를 더 붙일 수 없다.

## 트러블슈팅 체크포인트

- 케이블을 꽂았으면 먼저 링크 업인지 본다. 다운이면 케이블, 상대 포트 상태, 속도와 듀플렉스 협상을 순서대로 의심한다.
- 링크 업인데 통신이 안 되면 STP 전달 상태와 VLAN, IP와 경로, DNS와 원격 서비스 순으로 넓혀 본다.
- 엔드포인트 하나만 끊기면 액세스 포트를, 구역 전체가 끊기면 그 구역 액세스 스위치의 업링크나 디스트리뷰션 포트를 본다.
- 업링크 사용률이 높으면 집선비를 다시 계산하고 링크 집성이나 더 큰 대역폭의 업링크를 검토한다.

## 면접 체크포인트

- L2 스위치가 MAC 기준으로 프레임을 전달한다는 점과 계층 구조에서의 위치
- 액세스, 디스트리뷰션, 코어의 역할 구분과 collapsed core
- 액세스/디스트리뷰션(설계 역할)과 L2/L3(전달 기능)가 서로 다른 축인 이유
- 업링크와 링크 업/다운의 차이, 링크 업이어도 통신이 실패하는 예 (STP 전달 상태, VLAN 불일치)
- 집선비 계산과 업링크 이중화에서 STP와 LACP의 차이
- 포트 수 계산에서 업링크 포트를 빼는 이유, 콤보 포트 계산과 daisy chain의 문제

## 출처

- [L2 스위치에 대해서 — 널널한 개발자 TV](https://www.youtube.com/watch?v=y8rPmcYRsrk&list=PLXvgR_grOs1BFH-TuqFsfHqbh-gpMbFoy&index=15)
- [Cisco, Enterprise Campus 3.0 Architecture: Overview and Framework](https://www.cisco.com/c/en/us/td/docs/solutions/Enterprise/Campus/campover.html)
- [Cisco, Campus LAN and Wireless LAN Solution Design Guide](https://www.cisco.com/c/en/us/td/docs/solutions/CVD/Campus/cisco-campus-lan-wlan-design-guide.html)
- [Cisco, Understanding and Troubleshooting the Autostate Feature in Catalyst Switches](https://www.cisco.com/c/en/us/support/docs/switches/catalyst-6500-series-switches/41141-188.html)
- [Cisco, Catalyst Express 500 Switches Getting Started Guide](https://www.cisco.com/c/dam/en/us/td/docs/switches/lan/catalystexpress500/release_12-2_25_seg/localized/getting/started/english/9340_bk.pdf)

## 관련 문서

- [[Physical-DataLink-Layer|L1/L2 물리와 데이터링크 (스위치 동작, MAC, STP)]]
- [[LAN-vs-WAN|LAN과 WAN 구분 기준]]
- [[Network-Layer|L3 네트워크 계층 (라우터와 게이트웨이)]]
- [[Transport-Layer|L4 전송 계층 (TCP/UDP 포트 번호)]]
- [[Network-Encapsulation|캡슐화와 데이터 단위 (프레임)]]
- [[OSI-7-Layer|OSI 7계층 전체 지도]]
- [[네트워크(Network)|네트워크 인덱스]]
