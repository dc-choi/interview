---
tags: [web, network, ethernet, osi, l2, switch, mac, wireless, diversity]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["Physical Data Link Layer", "물리 데이터링크 계층", "L1 L2", "허브 스위치 MAC 프레임", "L2 스위치"]
verified_at: 2026-09-30
---

# 물리 계층과 데이터링크 계층 (L1, L2)

OSI 하위 2계층은 같은 로컬 네트워크(LAN) 안에서 비트와 프레임을 실제로 주고받는 일을 맡는다. 전체 7계층 지도는 [[OSI-7-Layer]]. 두 계층의 한 줄 요약:

- L1 Physical: 어떻게 신호를 보낼까 (비트를 물리 신호로)
- L2 Data Link: 같은 네트워크 안에서 누구에게 보낼까 (프레임을 MAC 주소로)

## L1 Physical: 비트를 물리 신호로

데이터의 의미는 해석하지 않고, 0과 1의 비트 스트림을 물리 매체로 전송하는 방법만 정의한다. 구리선은 전압의 높낮이로, 광섬유는 빛으로, 무선은 전파의 변화로 비트를 표현한다. NIC(랜카드)는 프레임을 선로 신호로 바꿔 내보내고 받은 신호를 비트로 복원하면서 MAC 주소와 FCS도 처리하므로 L1과 L2에 걸쳐 있다.

대표 장비와 매체: 케이블, 광섬유, 안테나와 RF, 리피터, 허브.

### 통신 방향

| 방식 | 동작 | 예 |
|---|---|---|
| 단방향(simplex) | 한쪽에서 다른 쪽으로만 보낸다. 송신자는 수신 측 문제를 알 수 없다 | TV, 라디오 방송 |
| 반이중(half duplex) | 양방향이지만 한 번에 한쪽만 보낸다 | 무전기, 허브와 동축 버스 이더넷 |
| 전이중(full duplex) | 양쪽이 동시에 보내고 받는다 | 전화, 스위치 포트에 직접 연결한 이더넷 |

### 전송 매체와 거리 한계

| 매체 | 신호 | 특징과 비용 | 주 용도 |
|---|---|---|---|
| UTP(비차폐 꼬임쌍선) | 전기 | 싸고 배선이 쉽다. 10BASE-T와 100BASE-TX는 4쌍 중 송신 1쌍, 수신 1쌍을 쓰고, 1000BASE-T는 4쌍 모두로 동시에 양방향 전송한다(쌍마다 250Mb/s, 에코 제거) | 건물 안 단말 연결 |
| 동축 케이블 | 전기 | 중심 도체를 차폐로 감싸 간섭에 강하다. 10BASE2 같은 초기 이더넷은 동축 버스 하나를 여러 장치가 공유해 반이중만 썼다. 공유 버스 방식의 제약이지 동축 자체의 한계는 아니다 | 초기 LAN, 현재는 주로 방송과 케이블 인터넷 |
| 광케이블 | 빛 | 전자기 간섭을 받지 않아 더 멀리, 더 빠르게 보낸다. 구부림에 약하고 양끝에서 전기와 빛을 바꾸는 트랜시버(SFP 같은 광 모듈)가 필요하다 | 백본, 건물 간, 장거리 |

신호는 멀리 갈수록 약해지고(감쇠) 잡음이 섞여 왜곡되므로 매체마다 오류 없이 쓸 수 있는 길이가 있다. 10BASE-T, 100BASE-TX와 1000BASE-T의 트위스티드 페어 링크는 100m까지다. 리피터는 약해지고 일그러진 신호를 원래 모양으로 재생해 거리를 늘리는 L1 장비이고, 허브는 받은 신호를 나머지 모든 포트로 재생해 내보내는 멀티포트 리피터다. 오늘날에는 독립 리피터 대신 스위치가 프레임을 받아 새로 송신하고, 100m를 넘는 구간은 광 링크로 잇는다.

### 다중화: 한 링크를 여러 채널이 나눠 쓴다

다중화(multiplexing)는 여러 신호를 하나의 전송로에 함께 싣는 일이다. 송신 측 멀티플렉서가 합치고 수신 측 디멀티플렉서가 다시 나누며, 무엇으로 채널을 구분하느냐에 따라 방식이 갈린다. 같은 자원 분할을 여러 단말이 매체를 나눠 쓰는 데 적용하면 FDMA, TDMA, CDMA, OFDMA 같은 다중접속이 된다. OFDMA 자원 배분과 공간 다중화는 [[Wireless-Multiple-Access|무선 다중접속]]에서 다룬다. L4의 포트 기반 다중화와 역다중화는 신호가 아니라 데이터를 애플리케이션별로 나누는 다른 층위다([[Transport-Layer]]).

| 방식 | 채널을 나누는 기준 | 표준의 예 |
|---|---|---|
| FDM(주파수 분할) | 주파수 대역 | OFDM(직교 주파수 분할 다중화)은 서로 직교하는 여러 부반송파에 데이터를 나눠 싣는다. 5G NR은 연속한 부반송파 12개를 PRB 하나로 묶는다(3GPP TS 38.300) |
| TDM(시분할) | 시간 슬롯 | ITU-T G.704가 1544, 2048 kbit/s 등 디지털 계위의 동기 프레임 구조를 정한다 |
| WDM(파장 분할) | 광섬유 안의 빛의 파장 | ITU-T G.694.1이 DWDM 주파수 격자, G.694.2가 CWDM 파장 격자를 정한다 |
| CDM(코드 분할) | 확산 코드 | 3G UMTS의 무선 접속(UTRA)은 DS-CDMA이며 물리 채널을 코드로 정의하고, TDD 모드에서는 타임슬롯 순서를 더한다(3GPP TS 25.201) |

이동통신 세대의 방식을 한 계보로 단정하지 않는다. 3G UTRA는 DS-CDMA를 쓰지만 5G NR의 하향 전송 파형은 CP를 쓰는 OFDM이고, 상향은 transform precoding(DFT 확산)을 켜거나 끌 수 있는 CP-OFDM이다. 이 DFT 확산은 표의 CDM 확산 코드와 다른 처리다. NR은 부반송파 12개를 묶은 PRB 단위로 자원을 나누고 하향 공유 채널에서 DMRS 기반 공간 다중화도 지원하므로, 5G의 다중화를 CDM의 발전형으로 요약하지 않는다. NR에 코드를 쓰는 요소가 전혀 없다는 뜻은 아니며, 세부 신호 설계는 이 절의 확인 범위 밖이다. 2026-11-08 이 절의 표준 예만 TS 38.300 V19.4.0, TS 25.201 V19.0.0과 ITU-T 권고 목록으로 대조했다.

### 무선의 다중경로 페이딩과 안테나 다이버시티

전파는 직접 경로뿐 아니라 벽이나 금속에 반사된 경로로도 수신기에 도착한다. 도착 시간과 위상이 달라 신호가 합쳐질 때 진폭이 커지거나 작아질 수 있고, 지연된 신호가 심벌 해석을 방해할 수도 있다. 따라서 수신 신호가 강하다는 사실만으로 품질이 좋다고 판단하지 않는다.

안테나 다이버시티는 서로 다른 위치에서 받은 신호를 활용해 다중경로로 생기는 약한 수신 지점의 영향을 줄인다. Cisco의 기존 Aironet 설명은 두 안테나를 비교해 하나를 선택하는 방식이다. 여러 신호를 늘 동시에 합치는 기술로 한정하거나 이 구현을 모든 무선 장비의 동작으로 일반화하지 않는다. 해당 선택 방식의 안테나는 같은 영역을 약간 다른 위치에서 덮도록 배치하며, 서로 다른 두 영역을 각각 서비스하는 용도로 쓰지 않는다.

다이버시티는 서로 독립적으로 페이딩되는 신호 경로(분기, branch)를 여러 개 확보해 한 분기가 약해져도 다른 분기로 보완하는 방식이다. 분기는 다음 축에서 얻을 수 있다.

| 종류 | 분기를 얻는 방법 | 특징과 비용 |
| --- | --- | --- |
| 공간 | 안테나를 떨어뜨려 배치 | 높은 탑의 기지국은 산란체가 멀어 파장의 10배 이상 간격이 필요할 수 있다. 이동 단말은 산란체가 가까워 파장의 일부 간격으로도 되지만 기기가 작아 효과가 줄고, 태블릿과 노트북처럼 큰 기기에서는 흔하다 |
| 주파수 | 간격을 둔 여러 주파수로 같은 신호 전송 | 분기 수에 비례해 대역폭이 늘어난다. 다중 반송파나 대역 확산처럼 coherence bandwidth보다 넓은 대역에 FEC를 결합하면 비슷한 이점을 얻는다 |
| 시간 | 페이딩 간격 이상 떨어뜨려 같은 정보를 다시 전송 | 채널 용량이 줄어든다. 재전송이 필요할 때 hybrid ARQ로 여러 전송을 합쳐 이점을 얻는다 |
| 편파 | 수직과 수평, 또는 좌우 원편파에 각각 민감한 안테나 사용 | 반사와 회절로 편파가 바뀌는 성질을 이용하므로 안테나 이격이 필요하지 않다 |

분기를 쓰는 방식도 다르다. 선택 다이버시티는 가장 좋은 분기를 고르고, 최대비 합성(MRC)은 분기들의 위상을 맞추고 각 분기의 신호 전압 대 잡음 전력 비로 가중해 더한다. 이때 합성 출력의 SNR은 분기 SNR의 합이 된다. 스위칭 다이버시티는 수신 신호가 임계값 아래로 떨어지면 다음 분기로 넘어간다. 앞의 두 방식은 분기마다 수신기가 필요하고, 스위칭은 RF 스위치 하나로 구현할 수 있어 저렴하다. 위의 Aironet 방식은 무선부 하나가 두 안테나의 신호를 표본으로 받아 하나를 고르고 두 안테나를 동시에 듣지 못하므로, 분기마다 수신기를 두는 선택 다이버시티와 같은 구조로 보지 않는다.

ARQ 재전송만으로는 경로 변화가 느린 페이딩 채널에서 상태가 바뀔 때까지 오래 걸려 효과가 떨어질 수 있다. 다이버시티를 재전송과 별도로 쓰는 이유다.

ITU-R의 지상 가시선(LOS) 고정 링크 설계 권고는 공간, 각도, 주파수 다이버시티를 다룬다. 각도 다이버시티는 안테나를 서로 다른 상향 각도로 기울여 얻는다. 이 기법들의 개선 폭은 분기 신호가 서로 얼마나 상관되지 않는지에 달려 있고, 광대역 디지털 시스템에서는 대역 내 왜곡 통계에도 좌우된다. 같은 권고는 공간 다이버시티가 빔 확산 손실로 생기는 평탄 페이딩과 주파수 선택적 페이딩 모두에 도움이 되지만 주파수 다이버시티는 주파수 선택적 페이딩에만 도움이 된다고 본다. 그래서 스펙트럼을 더 효율적으로 쓰고 대체로 성능도 낫다는 이유로 주파수 다이버시티보다 공간, 각도 다이버시티를 우선하라고 권한다. 이 권고는 고정 마이크로파 링크 기준이라 이동통신 단말의 설계 순위로 그대로 옮기지 않는다.

MIMO 장비가 여러 안테나를 쓴다는 사실만으로 다이버시티를 쓴다고 단정하지 않는다. 같은 안테나 구조를 공간 다중화나 빔포밍에 쓸 수도 있으며, 그 구분은 [[Wireless-Multiple-Access]]에서 다룬다.

2026-11-04 Cisco의 Multipath and Diversity 문서로 안테나 다이버시티 문단을 대조했다. 2026-11-09 다이버시티 종류, 결합 방식과 ARQ의 한계는 ELEX 7860 강의 노트로, 개선 조건과 고정 링크의 기법 선택은 ITU-R P.530-19(09/2025) §6.2로 대조했다. 다이버시티는 왜곡 완화 수단이지 끊김 없는 통신의 보장이 아니며, 기존 유선 계층 설명의 검증일은 유지한다.

### 허브와 충돌 도메인

허브는 한 포트로 받은 신호를 나머지 모든 포트로 그대로 복제해 내보낸다(확성기처럼 방 전체에 외침). 특정 대상만 지정할 수 없고 MAC 주소를 이해하지 못한다. 공유기의 랜 포트를 늘리려고 사는 장비를 스위칭 허브나 그냥 허브라고 부르는 경우가 많지만, 동작으로는 프레임의 목적지 MAC으로 포트를 고르는 스위치다. 이름보다 신호를 모든 포트로 복제하는지, MAC 주소로 골라 보내는지로 구분한다.

문제는 충돌(collision)이다. 허브에 연결된 모든 장치는 하나의 통신 매체를 공유하므로 하나의 충돌 도메인에 묶인다. 두 장치가 동시에 전송하면 신호가 겹쳐 둘 다 깨진다. 허브는 충돌을 감지하거나 조정하지 못하고 받은 신호를 전달만 한다.

### CSMA/CD

반이중(half-duplex) 공유 매체에서 충돌을 줄이는 규칙. 여러 장치가 동축 케이블 하나에 버스로 붙던 초기 이더넷에서 나왔다.

1. Carrier Sense: 보내기 전 매체에 신호가 흐르는지 확인
2. Multiple Access: 비었으면 전송한다. 두 장치가 동시에 비었다고 판단할 수 있다
3. Collision Detection: 충돌을 감지하면 곧바로 멈추지 않고 32비트 jam 신호를 더 보내 다른 송신자도 충돌을 확실히 알아채게 한 뒤 전송을 멈춘다
4. Backoff: n번째 재시도 전에 0 이상 2^k 미만(k = min(n, 10))의 정수를 무작위로 골라 그만큼 slot time을 기다린다. 충돌이 반복될수록 대기 범위가 두 배씩 넓어져 혼잡한 매체에서 스스로 물러난다. 전송 시도 16번(attemptLimit)이 모두 충돌로 끝나면 프레임을 버리고 오류(excessive collision)로 보고한다 (회의실에서 말이 겹치면 멈췄다 서로 다른 타이밍에 다시 말하기)

**허브가 반이중에 머문 이유.** 1990년 10BASE-T(IEEE 802.3i)의 UTP는 송신 쌍과 수신 쌍이 따로 있지만, 802.3의 전이중은 링크에 장치가 정확히 둘인 점대점 연결에서만 쓸 수 있다. 허브에 셋 이상이 붙으면 두 장치가 동시에 보낸 신호를 허브가 둘 다 세 번째 장치의 수신 쌍으로 내보내 신호가 겹친다. 허브는 신호를 저장했다가 나중에 보낼 버퍼와 판단 장치가 없는 멀티포트 리피터라 공유 매체로 남고, 그래서 CSMA/CD가 필요하다.

**브리지와 스위치가 연 전이중.** 브리지는 프레임을 버퍼에 받아 MAC 주소 테이블을 보고 목적지 포트로만 내보내므로 포트마다 충돌 도메인이 나뉜다. 포트에 장치 하나만 연결하면 그 링크는 두 장치만의 점대점이 되어 CSMA/CD 없이 전이중으로 쓸 수 있고, 802.3도 브리지(스위치)의 각 포트에 장치 하나를 잇는 구성을 전이중의 대표 구성으로 든다. 스위치는 같은 기능을 많은 포트와 전용 하드웨어로 빠르게 처리하는 브리지라 지금은 주로 스위치라 부른다. 전이중 동작은 1997년 IEEE 802.3x로 표준화됐다.

오늘날 스위치 기반 전이중(full-duplex) 링크에는 충돌 자체가 없어 CSMA/CD는 사실상 유물이다. 전이중 MAC은 충돌 신호를 무시하고 jam이나 backoff를 하지 않는다. WiFi는 충돌 감지가 불가능해 회피 방식인 CSMA/CA를 쓴다.

## L2 Data Link: 프레임과 MAC

같은 로컬 네트워크 안에서 장치 간 통신을 안정화한다. 데이터를 비트가 아니라 프레임 단위로 다루고, 누가 누구에게 보내는지를 MAC 주소로 구분한다. 도로 자체가 L1이면, 같은 동네의 교통 규칙이 L2다.

### MAC 주소

Ethernet과 Wi-Fi에서 사용하는 MAC 주소는 네트워크 인터페이스를 식별하는 48비트 주소다. 16진수 6묶음으로 표기하며 한 컴퓨터도 유선과 무선 인터페이스마다 다른 MAC 주소를 가질 수 있다.

- 전역 할당 주소의 대표적인 MA-L 방식: 앞 3바이트는 IEEE가 조직에 할당한 OUI, 뒤 3바이트는 해당 조직이 할당한 값이다. 모든 MAC 주소가 이 방식인 것은 아니다.
- 로컬 관리 주소: 관리자나 OS가 설정할 수 있으며 전 세계 고유성을 보장하지 않는다. `02:00:00:12:34:56`은 로컬 관리 주소 형식의 예다.
- Wi-Fi의 비공개 주소 기능은 네트워크마다 다른 MAC을 사용하거나 주기적으로 변경할 수 있다. 따라서 MAC을 장치의 영구적인 신원으로 취급하면 안 된다.

MAC은 같은 L2 구간에서 인터페이스를 식별하고, IP는 네트워크 사이의 전달에 쓰는 논리 주소다. 고정 여부보다 **어느 범위에서 무엇을 식별하는지**로 구분한다. 자기 인터페이스의 MAC은 Windows `ipconfig /all`의 어댑터별 물리적 주소(Physical Address), macOS `ifconfig en0`의 `ether`, Linux `ip link show`의 `link/ether` 항목에서 확인한다.

### 프레임 구조

L2가 프레임을 만들고, L1이 이를 다시 비트 스트림으로 바꿔 전송한다. 이더넷 프레임의 핵심 필드:

| 필드 | 크기 | 역할 |
|---|---|---|
| 프리앰블, SFD | 7바이트, 1바이트 | 수신 측 비트 동기와 프레임 시작 표시. 프레임 크기에 넣지 않는다 |
| 목적지 MAC | 6바이트 | 받는 인터페이스. 모든 비트가 1이면 브로드캐스트 |
| 출발지 MAC | 6바이트 | 보내는 인터페이스 |
| EtherType / Length | 2바이트 | 1536(`0x0600`) 이상이면 상위 프로토콜 종류(`0x0800` IPv4, `0x0806` ARP, `0x86DD` IPv6), 1500(`0x05DC`) 이하면 데이터 길이. 그 사이 값은 쓰지 않는다 |
| Payload | 46~1500바이트 | 실제 데이터(상위 계층 패킷). 46바이트보다 짧으면 패딩을 붙인다 |
| FCS (CRC-32) | 4바이트 | 오류 검출용 체크값 |

목적지 MAC부터 FCS까지의 프레임 크기는 64~1518바이트이고, 802.1Q VLAN 태그(4바이트)가 붙으면 최대 1522바이트다. 최소 64바이트(512비트)는 10/100Mb/s의 slot time과 같아서, 송신자가 프레임을 다 보내기 전에 반대편 끝에서 난 충돌을 감지할 수 있게 한다. 이보다 짧은 수신 프레임은 충돌 조각으로 보고 버린다. FCS가 맞지 않는 프레임도 손상 프레임으로 판정해 버리고 오류 카운터에 남길 뿐 재전송을 요청하지 않으므로, 복구는 TCP 같은 상위 계층의 몫이다. 계층별 헤더 크기 합산은 [[Network-Encapsulation]].

택배 상자에 비유하면 겉면이 출발지와 목적지 MAC, 내용물이 Payload, 봉인 검사가 FCS다.

### 스위치

L2 스위칭은 프레임이 속한 VLAN과 목적지 MAC 주소를 기준으로 출력 포트를 결정한다. MAC 주소 테이블에는 해당 VLAN에서 어느 MAC이 어느 포트 방향에 있는지 기록한다.

테이블은 수신 프레임의 **출발지 MAC**으로 학습하고 전달할 때는 **목적지 MAC**으로 조회한다. 목적지를 모르는 유니캐스트(unknown unicast)는 같은 VLAN의 전달 가능한 다른 포트로 플러딩한다. 응답이 와야만 학습하는 것은 아니며, 각 수신 프레임의 출발지를 관찰한다.

포트마다 충돌 도메인을 분리하며 전이중 링크에서는 충돌이 발생하지 않는다. 기본 스위칭 동작은 다섯 가지다.

- **Learning**: 수신 프레임의 VLAN, 출발지 MAC과 들어온 포트를 테이블에 기록한다.
- **Forwarding**: 목적지 MAC이 다른 포트에 있으면 그 포트로만 보낸다.
- **Filtering**: 목적지 MAC이 들어온 포트와 같으면 다시 내보내지 않는다.
- **Flooding**: 목적지 MAC을 모르거나 브로드캐스트이면 입력 포트를 제외한 같은 VLAN의 전달 가능한 포트로 복제한다. STP가 차단한 포트로는 보내지 않는다.
- **Aging**: 오래 관찰되지 않은 동적 항목을 지워 이동한 장치와 토폴로지 변화에 적응한다.

스위치에서 분석용 사본을 만드는 포트 미러링과 센서 배치는 [[Inline-vs-Out-of-Path#사본을 만드는 방법|인라인과 아웃오브패스의 사본 생성 방법]]을 참고한다.

스위치를 엔드포인트용 액세스, 스위치 집선용 디스트리뷰션, 백본용 코어로 배치하는 계층 설계와 업링크, 링크 업/다운, 포트 용량 계산은 [[Switch-Hierarchy-and-Uplink|스위치 계층과 업링크]].

### 중복 링크와 Spanning Tree

가용성을 높이려고 스위치 사이에 중복 링크를 두면 L2 프레임의 TTL이 없다는 점이 문제가 된다. 브로드캐스트나 unknown unicast가 순환하면서 같은 프레임이 계속 복제되고 MAC 테이블이 흔들리며 링크가 포화될 수 있다.

Spanning Tree Protocol은 브리지끼리 BPDU를 교환해 루트 브리지를 선출하고 루트까지의 경로 비용을 비교한다. 중복 경로 중 일부 포트를 논리적으로 막아 하나의 loop-free forwarding topology만 남기고, 장애가 생기면 다시 계산해 대체 링크를 연다. 단순히 그래프의 최소 신장 트리를 구한다기보다 **브리지 ID, 포트 비용과 역할에 따라 전달 토폴로지를 합의하는 프로토콜**로 이해해야 정확하다.

고전 STP는 재수렴이 느릴 수 있어 Rapid Spanning Tree가 빠른 재구성을 보완했다. 실제 환경에서는 VLAN별 또는 여러 VLAN을 묶은 spanning tree, 링크 집성 같은 설계도 함께 고려한다.

### 브로드캐스트와 유니캐스트, 그리고 도메인

- 유니캐스트: 특정 대상 하나에게
- 브로드캐스트: 같은 네트워크의 모든 장치에게(목적지 MAC FF:FF:FF:FF:FF:FF)

스위치는 충돌 도메인을 포트별로 나눈다. 브로드캐스트의 범위는 VLAN이므로 같은 VLAN의 포트들은 하나의 브로드캐스트 도메인에 속하고 VLAN을 나누면 도메인도 나뉜다. 서로 다른 VLAN 사이의 일반적인 IP 통신에는 라우터나 L3 스위치의 라우팅이 필요하다.

## L2의 한계와 L3로의 확장

L2는 같은 로컬 네트워크 안에서만 동작한다. 서로 다른 네트워크 사이의 통신은 L2만으로 안 되고 Network Layer(L3)의 IP 주소와 라우터가 필요하다.

연결 고리는 ARP다. 같은 LAN에서 목적지 IP에 대응하는 MAC을 모를 때 ARP로 IP를 MAC으로 해석한 뒤 프레임을 만든다. 다른 네트워크로 나갈 때는 목적지 MAC을 게이트웨이(라우터)의 MAC으로 채워 보낸다.

## 면접 체크포인트

- 허브 vs 스위치: 허브는 L1 단순 복제(하나의 충돌 도메인), 스위치는 L2 MAC 기반 선택 전송(포트별 충돌 도메인 분리)
- 충돌 도메인 vs 브로드캐스트 도메인: 포트별 충돌 도메인과 VLAN별 브로드캐스트 도메인의 차이
- 스위치의 Learning, Forwarding, Filtering, Flooding, Aging과 unknown unicast 처리
- 중복 L2 링크가 broadcast storm과 MAC table instability를 만들며 STP가 일부 경로를 차단하는 이유
- CSMA/CD가 반이중 공유 매체용이고 현대 전이중 스위치 환경에선 불필요해진 이유, jam과 지수 backoff, 허브가 반이중에 머문 이유
- UTP, 동축, 광케이블의 거리와 비용 트레이드오프, 리피터와 허브가 L1 장비인 이유
- 이더넷 프레임 크기(64~1518바이트), EtherType과 Length를 가르는 값, FCS 오류 프레임을 재전송 없이 버리는 이유
- MAC과 IP의 식별 범위, 로컬 관리 주소와 비공개 Wi-Fi 주소가 영구 신원 가정을 깨는 이유
- 액세스, 디스트리뷰션, 코어 계층과 업링크, 링크 업/다운의 구분은 [[Switch-Hierarchy-and-Uplink]]
- L2의 로컬 한계 → L3(IP, 라우터)와 ARP로 넘어가는 지점

## 출처

- [Cisco, Multipath and Diversity](https://www.cisco.com/c/en/us/support/docs/wireless-mobility/wireless-lan-wlan/27147-multipath.html) — 2026-11-04 다중경로 왜곡과 Aironet 안테나 선택 방식의 적용 범위 대조
- [P.530-19, Propagation data and prediction methods required for the design of terrestrial line-of-sight systems — ITU-R](https://www.itu.int/dms_pubrec/itu-r/rec/p/R-REC-P.530-19-202509-I!!PDF-E.pdf) — 2026-11-09 §6.2 다이버시티 기법의 종류, 분기 상관도와 개선 폭, 공간과 주파수 다이버시티의 대응 페이딩 대조
- [ELEX 7860 Wireless System Design — Diversity, 2021 Winter Term](https://people.ece.ubc.ca/edc/7860.jan2021/lec4.pdf) — 2026-11-09 공간, 주파수, 시간, 편파 다이버시티와 선택, 최대비, 스위칭 결합 방식 대조
- [무선 통신이 끊기는 진짜 이유? 페이딩을 이기는 기술 다이버시티 총정리 — YouTube, 길리랩 - 실전 구현 랩](https://www.youtube.com/watch?v=SIOA4b31UpI) — 2026-10-28 공개 쇼츠, 학습 계기. 사실은 위 ITU-R과 강의 노트로 대조했고, MIMO 전체를 다이버시티 응용으로 본 설명은 따르지 않음
- [NR and NG-RAN Overall description; Stage-2, 3GPP TS 38.300 V19.4.0 — ETSI](https://www.etsi.org/deliver/etsi_ts/138300_138399/138300/19.04.00_60/ts_138300v190400p.pdf) — 5.1절 NR 하향과 상향 파형, PRB 구성과 5.2.1절 DMRS 기반 공간 다중화
- [UMTS Physical layer - general description, 3GPP TS 25.201 V19.0.0 — ETSI](https://www.etsi.org/deliver/etsi_ts/125200_125299/125201/19.00.00_60/ts_125201v190000p.pdf) — 4.2.1절 UTRA의 DS-CDMA 접속과 코드 기반 물리 채널
- [G.704, Synchronous frame structures used at 1544, 6312, 2048, 8448 and 44 736 kbit/s hierarchical levels — ITU-T](https://www.itu.int/rec/T-REC-G.704) — 권고 제목과 현행판(10/98)만 대조
- [G.694.1, Spectral grids for WDM applications: DWDM frequency grid — ITU-T](https://www.itu.int/rec/T-REC-G.694.1) — 권고 제목과 현행판(10/20)만 대조
- [G.694.2, Spectral grids for WDM applications: CWDM wavelength grid — ITU-T](https://www.itu.int/rec/T-REC-G.694.2) — 권고 제목과 현행판(12/03)만 대조
- [OSI 7 Layer 기초: Physical Layer와 Data Link Layer — YouTube](https://www.youtube.com/watch?v=DufRXdDF9zI&list=PLfth0bK2MgIYuFahPhXTpTomkwVx5Fl-v)
- [IEEE 802.1w — Rapid Reconfiguration of Spanning Tree](https://www.ieee802.org/1/pages/802.1w.html)
- [IEEE P802.3as Draft 0.1, IEEE Std 802.3-2005 Clause 4 CSMA/CD MAC 개정안 — IEEE 802.3 Working Group](https://www.ieee802.org/3/as/public/0503/4d0_1_CMP.pdf)
- [IEEE 802.3x-1997, Full Duplex Operation — IEEE SA](https://standards.ieee.org/standard/802_3x-1997.html)
- [802.3ab A Tutorial Presentation — IEEE 802.3 Working Group](https://grouper.ieee.org/groups/802/3/tutorial/march98/mick_170398.pdf)
- [Specifications for Ethernet 100BaseTX and 10BaseT Cables — Cisco](https://www.cisco.com/c/en/us/support/docs/routers/10000-series-routers/46792-ethbase.html)
- [Troubleshooting Ethernet Collisions — Cisco](https://www.cisco.com/c/en/us/support/docs/interfaces-modules/port-adapters/12768-eth-collisions.html)
- [IEEE 802 Numbers, EtherType — IANA](https://www.iana.org/assignments/ieee-802-numbers/ieee-802-numbers.xhtml)
- [그림으로 쉽게 배우는 네트워크 — 단방향, 반이중, 전이중 통신, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160784)
- [그림으로 쉽게 배우는 네트워크 — 물리 계층과 데이터링크 계층, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160786)
- [그림으로 쉽게 배우는 네트워크 — 케이블, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160787)
- [그림으로 쉽게 배우는 네트워크 — 랜카드, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160788)
- [그림으로 쉽게 배우는 네트워크 — 리피터, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160791)
- [그림으로 쉽게 배우는 네트워크 — 허브, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160792)
- [그림으로 쉽게 배우는 네트워크 — 이더넷과 이더넷 헤더, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160794)
- [그림으로 쉽게 배우는 네트워크 — CSMA/CD, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160795)
- [그림으로 쉽게 배우는 네트워크 — 브리지, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160796)
- [그림으로 쉽게 배우는 네트워크 — 스위치, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160797)
- [그림으로 쉽게 배우는 네트워크 — 스패닝 트리 프로토콜, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160799)
- [L2 스위치에 대해서 — 널널한 개발자 TV](https://www.youtube.com/watch?v=y8rPmcYRsrk&list=PLXvgR_grOs1BFH-TuqFsfHqbh-gpMbFoy&index=15)
- [Guidelines for Use of EUI, OUI, and CID — IEEE](https://standards.ieee.org/wp-content/uploads/import/documents/tutorials/eui.pdf)
- [Use private Wi-Fi addresses on Apple devices — Apple](https://support.apple.com/en-us/102509)
- [System Management Configuration Guide, IOS XE 16.12.x, Administering the Device — Cisco](https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9500/software/release/16-12/configuration_guide/sys_mgmt/b_1612_sys_mgmt_9500_cg/administering_the_device.html)
- [TCP/IP Fundamentals for Microsoft Windows — Microsoft](https://download.microsoft.com/download/9/4/6/946958ef-7b86-4ddc-bfdb-c7ed2af4ce51/tcpip_fund.pdf)
- [네트워크와 인터넷 개념, 인터넷 동작 방식과 ISP — YouTube, 쉬운코드](https://www.youtube.com/watch?v=oFKYzp6gGfc)

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
