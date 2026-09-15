---
tags: [web, network, ethernet, osi, l2, switch, mac]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["Physical Data Link Layer", "물리 데이터링크 계층", "L1 L2", "허브 스위치 MAC 프레임", "L2 스위치", "액세스와 디스트리뷰션", "업링크와 링크 업"]
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

MAC은 같은 L2 구간에서 인터페이스를 식별하고, IP는 네트워크 사이의 전달에 쓰는 논리 주소다. 고정 여부보다 **어느 범위에서 무엇을 식별하는지**로 구분한다. Windows에서는 `ipconfig /all` 출력의 어댑터별 물리적 주소(Physical Address) 항목에서 MAC을 확인할 수 있다.

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

스위치에서 분석용 사본을 만드는 포트 미러링과 센서 배치는 [[Inline-and-Out-of-Path]]를 참고한다.

### 액세스와 디스트리뷰션 — 네트워크 안의 역할

**엔드포인트(endpoint)**는 PC, 스마트폰, 서버처럼 데이터를 주고받는 종단 장치다. 계층형 캠퍼스 네트워크에서는 연결 대상을 기준으로 다음 역할을 구분한다.

| 역할 | 연결 대상과 주요 기능 |
|---|---|
| 액세스(access) | 엔드포인트가 네트워크에 진입하는 지점. 유선 단말을 연결하고, 무선 단말은 보통 AP를 거쳐 액세스망에 연결된다 |
| 디스트리뷰션(distribution) | 여러 액세스 스위치를 집계하고 상위망에 연결한다. 설계에 따라 L3 라우팅과 정책 적용도 담당한다 |
| 코어(core) | 규모가 큰 구성에서 여러 디스트리뷰션 구간을 연결하는 백본 역할 |

전형적인 연결 예는 `PC → 액세스 스위치 → 디스트리뷰션 → 코어/외부망`이다. 방이나 층은 배치 예시일 뿐 역할의 정의가 아니며, 스위치끼리 연결했다고 모두 디스트리뷰션은 아니다.

**액세스와 디스트리뷰션은 설계상 역할이고, L2와 L3는 전달 기능의 구분이다.** 디스트리뷰션을 L2로 구성할 수도 있지만 L3 기능을 맡기는 설계도 흔하며, 액세스에서 라우팅하는 구성도 있다. 작은 망에서는 디스트리뷰션과 코어를 한 장비군으로 합칠 수 있다.

### 업링크, 링크 상태와 포트 수

| 용어 | 의미 |
|---|---|
| 업링크(uplink) | 액세스에서 디스트리뷰션처럼 상위망으로 연결하는 링크의 역할 |
| 링크 업(link up) | 해당 인터페이스의 링크가 동작 상태라는 뜻 |
| 링크 다운(link down) | 링크가 동작하지 않는 상태. 케이블 분리 외에도 상대 장비 전원, 포트 비활성화나 협상 문제 등이 원인일 수 있다 |

업링크도 링크 다운일 수 있고 단말 연결 포트도 링크 업일 수 있다. **링크 업만으로 실제 통신이 보장되지는 않는다.** STP가 전달을 막거나 VLAN 설정이 맞지 않을 수 있다. 링크 상태 다음에 VLAN과 STP, IP 주소와 경로, DNS와 원격 서비스 순으로 범위를 넓혀 점검한다.

스위치의 물리적 포트는 케이블이나 광 모듈을 연결하는 인터페이스다. [[Transport-Layer|TCP/UDP의 포트 번호]]와는 다른 개념이다.

- 총 16개 포트 중 1개를 업링크로 쓰면 단말을 직접 연결할 포트는 15개 남는다. 같은 조건에서 업링크에 2개를 쓰면 14개다.
- 16개 액세스 포트 외에 전용 업링크가 별도로 있으면 16개를 그대로 쓸 수 있다. RJ-45와 SFP 중 하나만 활성화되는 콤보 포트는 두 개의 독립 포트로 세지 않는다.
- 남은 포트 수는 직접 연결 가능한 장비 수다. AP나 하위 스위치 뒤의 여러 단말까지 합친 전체 엔드포인트 수와는 다르다.
- 포트 수와 업링크 대역폭은 별도로 계산한다. 여러 단말의 상위망 트래픽이 업링크 용량을 넘으면 포트가 남아 있어도 병목이 생길 수 있다.

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
- 액세스와 디스트리뷰션이 L2/L3와 다른 구분이며, 연결 대상과 설계 역할로 결정되는 이유
- 업링크 vs 링크 업, 링크 업이어도 통신이 실패하는 예
- 업링크를 뺀 직접 연결 포트 수와 업링크 대역폭을 따로 계산하는 이유
- L2의 로컬 한계 → L3(IP, 라우터)와 ARP로 넘어가는 지점

## 출처

- [OSI 7 Layer 기초: Physical Layer와 Data Link Layer — YouTube](https://www.youtube.com/watch?v=DufRXdDF9zI&list=PLfth0bK2MgIYuFahPhXTpTomkwVx5Fl-v)
- [IEEE 802.1w — Rapid Reconfiguration of Spanning Tree](https://www.ieee802.org/1/pages/802.1w.html)
- [그림으로 쉽게 배우는 네트워크 — 스위치, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160797)
- [그림으로 쉽게 배우는 네트워크 — 스패닝 트리 프로토콜, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160799)
- [L2 스위치와 네트워크 구성 강의 — YouTube](https://www.youtube.com/watch?v=y8rPmcYRsrk) — 사용자 제공 학습 메모를 바탕으로 정리. 영상 자막은 직접 대조하지 못했으며, 기술 설명은 공식 자료로 보완했다.
- [Guidelines for Use of EUI, OUI, and CID — IEEE](https://standards.ieee.org/wp-content/uploads/import/documents/tutorials/eui.pdf) — 전역 할당과 로컬 관리 주소의 범위
- [Use private Wi-Fi addresses on Apple devices — Apple](https://support.apple.com/en-us/102509)
- [Campus LAN and Wireless LAN Solution Design Guide — Cisco](https://www.cisco.com/c/en/us/td/docs/solutions/CVD/Campus/cisco-campus-lan-wlan-design-guide.html) — 액세스, 디스트리뷰션과 코어의 역할, routed access와 업링크 용량
- [System Management Configuration Guide, IOS XE 16.12.x, Administering the Device — Cisco](https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9500/software/release/16-12/configuration_guide/sys_mgmt/b_1612_sys_mgmt_9500_cg/administering_the_device.html) — MAC 테이블의 학습과 전달
- [Understanding and Troubleshooting the Autostate Feature in Catalyst Switches — Cisco](https://www.cisco.com/c/en/us/support/docs/switches/catalyst-6500-series-switches/41141-188.html) — 물리 링크 상태와 STP 전달 상태의 차이
- [TCP/IP Fundamentals for Microsoft Windows — Microsoft](https://download.microsoft.com/download/9/4/6/946958ef-7b86-4ddc-bfdb-c7ed2af4ce51/tcpip_fund.pdf) — Using the Ipconfig Tool
- [Catalyst Express 500 Getting Started Guide — Cisco](https://www.cisco.com/c/dam/en/us/td/docs/switches/lan/catalystexpress500/release_12-2_25_seg/localized/getting/started/english/9340_bk.pdf) — 둘 중 하나만 쓰는 dual-purpose 업링크 포트의 예

## 관련 문서

- [[OSI-7-Layer]] — 7계층 전체 지도와 Internet vs Ethernet
- [[LAN-vs-WAN]] — LAN의 경계가 브로드캐스트 도메인인 이유와 WAN과의 구분
- [[Network-Layer]] — VLAN 사이와 외부망으로 나가는 IP 라우팅
- [[Transport-Layer]] — 물리 포트와 TCP/UDP 포트 번호의 구분
- [[Browser-URL-Flow]] — DNS와 ARP, TCP/TLS 흐름에서 L2와 L3 연결
- [[TCP-Handshake]] — 상위 L4 전송 신뢰성
- [[네트워크(Network)]] — 카테고리 인덱스
