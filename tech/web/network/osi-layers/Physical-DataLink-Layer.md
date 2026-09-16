---
tags: [web, network, ethernet, osi, l2, switch, mac]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["Physical Data Link Layer", "물리 데이터링크 계층", "L1 L2", "허브 스위치 MAC 프레임", "L2 스위치"]
verified_at: 2026-09-15
---

# 물리 계층과 데이터링크 계층 (L1, L2)

OSI 하위 2계층은 같은 로컬 네트워크(LAN) 안에서 비트와 프레임을 실제로 주고받는 일을 맡는다. 전체 7계층 지도는 [[OSI-7-Layer]]. 두 계층의 한 줄 요약:

- L1 Physical: 어떻게 신호를 보낼까 (비트를 물리 신호로)
- L2 Data Link: 같은 네트워크 안에서 누구에게 보낼까 (프레임을 MAC 주소로)

## L1 Physical: 비트를 물리 신호로

데이터의 의미는 해석하지 않고, 0과 1의 비트 스트림을 물리 매체로 전송하는 방법만 정의한다. 구리선은 전압의 높낮이로, 무선은 전파의 변화로 비트를 표현한다.

대표 장비와 매체: 케이블, 광섬유, 안테나와 RF, 리피터, 허브.

### 허브와 충돌 도메인

허브는 한 포트로 받은 신호를 나머지 모든 포트로 그대로 복제해 내보낸다(확성기처럼 방 전체에 외침). 특정 대상만 지정할 수 없고 MAC 주소를 이해하지 못한다.

문제는 충돌(collision)이다. 허브에 연결된 모든 장치는 하나의 통신 매체를 공유하므로 하나의 충돌 도메인에 묶인다. 두 장치가 동시에 전송하면 신호가 겹쳐 둘 다 깨진다. 허브는 충돌을 감지하거나 조정하지 못하고 받은 신호를 전달만 한다.

### CSMA/CD

반이중(half-duplex) 공유 매체에서 충돌을 줄이는 규칙.

1. Carrier Sense: 보내기 전 매체가 비었는지 확인
2. Multiple Access: 비었으면 전송
3. Collision Detection: 그래도 두 장치가 동시에 보내 충돌하면 감지하고 전송 중단
4. Backoff: 각자 랜덤한 시간을 기다렸다가 재시도 (회의실에서 말이 겹치면 멈췄다 서로 다른 타이밍에 다시 말하기)

오늘날 스위치 기반 전이중(full-duplex) 링크에는 충돌 자체가 없어 CSMA/CD는 사실상 유물이다. WiFi는 충돌 감지가 불가능해 회피 방식인 CSMA/CA를 쓴다.

## L2 Data Link: 프레임과 MAC

같은 로컬 네트워크 안에서 장치 간 통신을 안정화한다. 데이터를 비트가 아니라 프레임 단위로 다루고, 누가 누구에게 보내는지를 MAC 주소로 구분한다. 도로 자체가 L1이면, 같은 동네의 교통 규칙이 L2다.

### MAC 주소

Ethernet과 Wi-Fi에서 사용하는 MAC 주소는 네트워크 인터페이스를 식별하는 48비트 주소다. 16진수 6묶음으로 표기하며, 한 컴퓨터도 유선과 무선 인터페이스마다 다른 MAC 주소를 가질 수 있다.

- 전역 할당 주소의 대표적인 MA-L 방식: 앞 3바이트는 IEEE가 조직에 할당한 OUI, 뒤 3바이트는 해당 조직이 할당한 값이다. 모든 MAC 주소가 이 방식인 것은 아니다.
- 로컬 관리 주소: 관리자나 OS가 설정할 수 있으며 전 세계 고유성을 보장하지 않는다. `02:00:00:12:34:56`은 로컬 관리 주소 형식의 예다.
- Wi-Fi의 비공개 주소 기능은 네트워크마다 다른 MAC을 사용하거나 주기적으로 변경할 수 있다. 따라서 MAC을 장치의 영구적인 신원으로 취급하면 안 된다.

MAC은 같은 L2 구간에서 인터페이스를 식별하고, IP는 네트워크 사이의 전달에 쓰는 논리 주소다. 고정 여부보다 **어느 범위에서 무엇을 식별하는지**로 구분한다. 자기 인터페이스의 MAC은 Windows `ipconfig /all`의 어댑터별 물리적 주소(Physical Address), macOS `ifconfig en0`의 `ether`, Linux `ip link show`의 `link/ether` 항목에서 확인한다.

### 프레임 구조

L2가 프레임을 만들고, L1이 이를 다시 비트 스트림으로 바꿔 전송한다. 이더넷 프레임의 핵심 필드:

| 필드 | 역할 |
|---|---|
| 목적지 MAC | 받는 인터페이스 |
| 출발지 MAC | 보내는 인터페이스 |
| EtherType / Length | 상위 프로토콜 종류(예: IPv4, ARP) |
| Payload | 실제 데이터(상위 계층 패킷) |
| FCS (CRC) | 오류 검출용 체크값 |

택배 상자에 비유하면 겉면이 출발지와 목적지 MAC, 내용물이 Payload, 봉인 검사가 FCS다.

### 스위치

L2 스위칭은 프레임이 속한 VLAN과 목적지 MAC 주소를 기준으로 출력 포트를 결정한다. MAC 주소 테이블에는 해당 VLAN에서 어느 MAC이 어느 포트 방향에 있는지 기록한다.

테이블은 수신 프레임의 **출발지 MAC**으로 학습하고, 전달할 때는 **목적지 MAC**으로 조회한다. 목적지를 모르는 유니캐스트(unknown unicast)는 같은 VLAN의 전달 가능한 다른 포트로 플러딩한다. 응답이 와야만 학습하는 것은 아니며, 각 수신 프레임의 출발지를 관찰한다.

포트마다 충돌 도메인을 분리하며, 전이중 링크에서는 충돌이 발생하지 않는다. 기본 스위칭 동작은 다섯 가지다.

- **Learning**: 수신 프레임의 VLAN, 출발지 MAC과 들어온 포트를 테이블에 기록한다.
- **Forwarding**: 목적지 MAC이 다른 포트에 있으면 그 포트로만 보낸다.
- **Filtering**: 목적지 MAC이 들어온 포트와 같으면 다시 내보내지 않는다.
- **Flooding**: 목적지 MAC을 모르거나 브로드캐스트이면 입력 포트를 제외한 같은 VLAN의 전달 가능한 포트로 복제한다. STP가 차단한 포트로는 보내지 않는다.
- **Aging**: 오래 관찰되지 않은 동적 항목을 지워 이동한 장치와 토폴로지 변화에 적응한다.

스위치에서 분석용 사본을 만드는 포트 미러링과 센서 배치는 [[Inline-vs-Out-of-Path#사본을 만드는 방법|인라인과 아웃오브패스의 사본 생성 방법]]을 참고한다.

스위치를 엔드포인트용 액세스, 스위치 집선용 디스트리뷰션, 백본용 코어로 배치하는 계층 설계와 업링크, 링크 업/다운, 포트 용량 계산은 [[Switch-Hierarchy-and-Uplink|스위치 계층과 업링크]].

### 중복 링크와 Spanning Tree

가용성을 높이려고 스위치 사이에 중복 링크를 두면 L2 프레임의 TTL이 없다는 점이 문제가 된다. 브로드캐스트나 unknown unicast가 순환하면서 같은 프레임이 계속 복제되고, MAC 테이블이 흔들리며 링크가 포화될 수 있다.

Spanning Tree Protocol은 브리지끼리 BPDU를 교환해 루트 브리지를 선출하고 루트까지의 경로 비용을 비교한다. 중복 경로 중 일부 포트를 논리적으로 막아 하나의 loop-free forwarding topology만 남기고, 장애가 생기면 다시 계산해 대체 링크를 연다. 단순히 그래프의 최소 신장 트리를 구한다기보다 **브리지 ID, 포트 비용과 역할에 따라 전달 토폴로지를 합의하는 프로토콜**로 이해해야 정확하다.

고전 STP는 재수렴이 느릴 수 있어 Rapid Spanning Tree가 빠른 재구성을 보완했다. 실제 환경에서는 VLAN별 또는 여러 VLAN을 묶은 spanning tree, 링크 집성 같은 설계도 함께 고려한다.

### 브로드캐스트와 유니캐스트, 그리고 도메인

- 유니캐스트: 특정 대상 하나에게
- 브로드캐스트: 같은 네트워크의 모든 장치에게(목적지 MAC FF:FF:FF:FF:FF:FF)

스위치는 충돌 도메인을 포트별로 나눈다. 브로드캐스트의 범위는 VLAN이므로 같은 VLAN의 포트들은 하나의 브로드캐스트 도메인에 속하고, VLAN을 나누면 도메인도 나뉜다. 서로 다른 VLAN 사이의 일반적인 IP 통신에는 라우터나 L3 스위치의 라우팅이 필요하다.

## L2의 한계와 L3로의 확장

L2는 같은 로컬 네트워크 안에서만 동작한다. 서로 다른 네트워크 사이의 통신은 L2만으로 안 되고, Network Layer(L3)의 IP 주소와 라우터가 필요하다.

연결 고리는 ARP다. 같은 LAN에서 목적지 IP에 대응하는 MAC을 모를 때 ARP로 IP를 MAC으로 해석한 뒤 프레임을 만든다. 다른 네트워크로 나갈 때는 목적지 MAC을 게이트웨이(라우터)의 MAC으로 채워 보낸다.

## 면접 체크포인트

- 허브 vs 스위치: 허브는 L1 단순 복제(하나의 충돌 도메인), 스위치는 L2 MAC 기반 선택 전송(포트별 충돌 도메인 분리)
- 충돌 도메인 vs 브로드캐스트 도메인: 포트별 충돌 도메인과 VLAN별 브로드캐스트 도메인의 차이
- 스위치의 Learning, Forwarding, Filtering, Flooding, Aging과 unknown unicast 처리
- 중복 L2 링크가 broadcast storm과 MAC table instability를 만들며 STP가 일부 경로를 차단하는 이유
- CSMA/CD가 반이중 공유 매체용이고 현대 전이중 스위치 환경에선 불필요해진 이유
- MAC과 IP의 식별 범위, 로컬 관리 주소와 비공개 Wi-Fi 주소가 영구 신원 가정을 깨는 이유
- 액세스, 디스트리뷰션, 코어 계층과 업링크, 링크 업/다운의 구분은 [[Switch-Hierarchy-and-Uplink]]
- L2의 로컬 한계 → L3(IP, 라우터)와 ARP로 넘어가는 지점

## 출처

- [OSI 7 Layer 기초: Physical Layer와 Data Link Layer — YouTube](https://www.youtube.com/watch?v=DufRXdDF9zI&list=PLfth0bK2MgIYuFahPhXTpTomkwVx5Fl-v)
- [IEEE 802.1w — Rapid Reconfiguration of Spanning Tree](https://www.ieee802.org/1/pages/802.1w.html)
- [그림으로 쉽게 배우는 네트워크 — 스위치, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160797)
- [그림으로 쉽게 배우는 네트워크 — 스패닝 트리 프로토콜, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160799)
- [L2 스위치에 대해서 — 널널한 개발자 TV](https://www.youtube.com/watch?v=y8rPmcYRsrk&list=PLXvgR_grOs1BFH-TuqFsfHqbh-gpMbFoy&index=15)
- [Guidelines for Use of EUI, OUI, and CID — IEEE](https://standards.ieee.org/wp-content/uploads/import/documents/tutorials/eui.pdf)
- [Use private Wi-Fi addresses on Apple devices — Apple](https://support.apple.com/en-us/102509)
- [System Management Configuration Guide, IOS XE 16.12.x, Administering the Device — Cisco](https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9500/software/release/16-12/configuration_guide/sys_mgmt/b_1612_sys_mgmt_9500_cg/administering_the_device.html)
- [TCP/IP Fundamentals for Microsoft Windows — Microsoft](https://download.microsoft.com/download/9/4/6/946958ef-7b86-4ddc-bfdb-c7ed2af4ce51/tcpip_fund.pdf)

## 관련 문서

- [[OSI-7-Layer]] — 7계층 전체 지도와 Internet vs Ethernet
- [[LAN-vs-WAN]] — LAN의 경계가 브로드캐스트 도메인인 이유와 WAN과의 구분
- [[Unicast-Broadcast-Multicast]] — 유니캐스트, 브로드캐스트, 멀티캐스트의 주소와 도달 범위, IGMP
- [[Network-Layer]] — VLAN 사이와 외부망으로 나가는 IP 라우팅
- [[Transport-Layer]] — 상위 L4 세그먼트와 포트 번호
- [[Network-Encapsulation]] — 스트림에서 프레임까지의 캡슐화와 MTU
- [[Switch-Hierarchy-and-Uplink]] — 액세스, 디스트리뷰션, 코어 계층과 업링크, 포트 용량 설계
- [[Inline-vs-Out-of-Path]] — 인라인과 아웃오브패스 배치, 포트 미러링과 TAP
- [[Browser-URL-Flow]] — DNS와 ARP, TCP/TLS 흐름에서 L2와 L3 연결
- [[TCP-Handshake]] — 상위 L4 전송 신뢰성
- [[네트워크(Network)]] — 카테고리 인덱스
