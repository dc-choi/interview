---
tags: [network, wireless, wpan, iot, ipv6, bluetooth, zigbee, 6lowpan]
status: done
verified_at: 2026-11-19
category: "Web - 네트워크"
aliases: ["WPAN", "Wireless Personal Area Network", "무선 개인 통신망", "6LoWPAN", "LoWPAN", "IEEE 802.15.4", "BLE", "Bluetooth Low Energy", "L2CAP", "Logical Link Control and Adaptation Protocol", "UWB", "Ultra-Wideband", "초광대역", "IEEE 802.15.4z", "Zigbee PRO", "Many-to-One Routing", "Zigbee Trust Center", "BLE Beacon", "iBeacon", "비콘", "Channel Sounding"]
---

# WPAN과 6LoWPAN

WPAN(무선 개인 통신망)은 사람이나 기기 주변의 짧은 거리에서 이어폰, 시계, 센서 같은 소형 기기를 무선으로 묶는 네트워크다. 하나의 프로토콜 이름이 아니라 쓰임새를 가리키는 분류이며, Bluetooth, IEEE 802.15.4 기반의 Zigbee와 6LoWPAN 같은 서로 다른 기술이 이 범주에 들어간다. UWB도 IEEE 802.15.4a(Low-Rate WPAN의 대체 PHY 개정)에 UWB Impulse Radio PHY로 들어가 있다. 6LoWPAN은 그중 IEEE 802.15.4 위에서 IPv6 패킷을 보내기 위한 IETF의 적응 계층이다.

## WPAN을 이해하는 mental model

- AP를 거치는 Wi-Fi 인프라 모드와 달리 기기끼리 직접 붙는 구성이 흔하다. 다만 연결 형태는 기술마다 다르다. Bluetooth Classic(BR/EDR)은 점대점 연결이고, Bluetooth LE는 점대점에 더해 브로드캐스트와 메시를 지원한다. IEEE 802.15.4 기반 LoWPAN은 스타와 메시 토폴로지를 쓴다.
- 핵심 제약은 전력이다. 배터리로 오래 버텨야 하므로 낮은 전송률, 작은 프레임과 짧은 송신 시간을 받아들인다. 그래서 같은 IP를 쓰더라도 이더넷이나 Wi-Fi의 가정을 그대로 가져올 수 없다.
- 거리는 고정값이 아니다. 시험 요약에서 흔히 쓰는 10m는 대략의 기준일 뿐이다. Bluetooth SIG는 실효 거리를 1km 이상부터 1m 미만까지로 들고, 대역, PHY, 수신 감도, 송신 출력, 안테나 이득과 경로 손실에 따라 달라진다고 설명한다. CSA의 Zigbee FAQ도 출력과 환경에 따라 10~100m, Sub-GHz 무선에서는 1km 이상을 든다.

## 대표 기술의 구분

| 기술 | 기반 | 특징 |
|---|---|---|
| Bluetooth Classic (BR/EDR) | Bluetooth Core | 2.4GHz 대역 79개 채널, 점대점, 최대 3Mb/s(SIG 기술 개요 표 기준). 무선 오디오 스트리밍에 주로 쓴다 |
| Bluetooth LE | Bluetooth Core | 40개 채널, 아주 낮은 전력, LE 1M/2M/Coded PHY 기준 125Kb/s~2Mb/s. 점대점, 브로드캐스트(비콘), 메시. SIG는 2026-11-04 HDT(High Data Throughput) 채택을 발표했고, HDT는 최근 채택된 Core 7.0의 선택 기능이다. HDT의 새 LE PHY는 최대 비트율을 7.5Mb/s로 올리지만 HDT 필수 rate는 2/3/4Mb/s이고 6과 7.5Mb/s는 선택이다 |
| Zigbee | IEEE 802.15.4 무선 표준(CSMA-CA 포함) 위의 CSA 규격 | 2.4GHz와 Sub-GHz(915MHz, 868MHz) 대역. 스마트홈 기기 |
| 6LoWPAN | IEEE 802.15.4 위의 IETF 적응 계층 | IPv6 패킷을 단편화와 헤더 압축으로 802.15.4 프레임에 싣는다 |

같은 IEEE 802.15.4 무선을 써도 Zigbee와 6LoWPAN은 그 위가 다르다. Zigbee는 CSA의 자체 상위 규격을 두고, 6LoWPAN은 IPv6를 그대로 올리는 쪽을 택한다. 6LoWPAN 기법은 RFC 7668로 Bluetooth LE 위의 IPv6에도 쓰인다.

## Zigbee PRO의 주소, 라우팅과 보안

Zigbee 2007 릴리스에는 Zigbee와 Zigbee PRO라는 두 기능 집합이 있었다. Zigbee 기능 집합은 코디네이터를 중심으로 트리 주소를 나눠 망을 만들고, Zigbee PRO는 트리의 제약을 피하려고 확률적(stochastic) 주소 할당을 쓰며 테이블 라우팅을 항상 쓴다고 Silicon Labs Zigbee Fundamentals 8.2.0은 적는다. 다만 같은 문서의 라우팅 설명에서 아래의 소스 라우팅 프레임은 라우팅 테이블 대신 망 헤더의 경로를 따르므로, 테이블 라우팅을 기본으로 이해한다. TI의 ZBOSS 문서는 Zigbee PRO 스택 프로파일(ID 2)이 Zigbee 3.0에 쓰인다고 적는다.

버전은 2026-11-19 CSA 자료 기준이다. CSA FAQ는 Zigbee PRO 2023(TI 문서 표기로 R23)이 2023년 3월에 나왔다고 적는다. CSA는 2025-11-18 Zigbee 4.0을 발표하며 Zigbee Core R23.2, Base Device Behavior v3.1 등을 규격 문서로 들고 Zigbee 3.0과 완전히 하위 호환된다고 밝혔다. 같은 발표는 Sub-GHz 메시 기능의 새 이름을 Suzi로 정했다.

- **확률적 주소:** 새로 붙는 기기는 합류하는 상대 기기에게서 무작위로 정한 16비트 주소를 받고, 망 계층 메시지로 주소 충돌을 검사한다. 부모가 바뀌어도 주소는 유지되며, 주소는 스택이 정하게 두는 것이 권장된다.
- **Many-to-one과 소스 라우팅:** 게이트웨이처럼 많은 기기의 트래픽이 모이는 중앙 기기(concentrator)가 경로 탐색을 한 번 보내 모든 라우터에 자기 쪽으로 가는 경로 항목 하나씩을 만든다. 라우터마다 중앙 기기로 일대일 경로 요청을 보내는 대신 요청 하나와 라우터당 경로 항목 하나로 끝난다. 중앙 기기로 가는 메시지는 먼저 route record로 거친 홉을 기록하고, 중앙 기기는 이를 역순으로 source route table에 저장해 기기 쪽으로 보내는 메시지의 망 헤더에 경로를 싣는다. 그 대가는 구현에 따라 다르다. TI Z-Stack 문서 기준으로 경로를 캐시하는 중앙 기기는 메모리를 더 쓰고 각 기기는 route record를 한 번만 보내면 되지만, 캐시하지 않으면 기기가 데이터 패킷마다 route record를 함께 보낸다. 경로가 실패하면 기본적으로 many-to-one 경로 탐색을 다시 하며, 탐색과 경로 유지 시점은 애플리케이션이 정한다.
- **Trust Center와 키:** TI 문서(Zigbee 3.0 기준)에 따르면 중앙 집중형 보안 망에서는 코디네이터가 Trust Center로서 키를 배포하고 합류를 허가하는 유일한 기기다. 라우터가 만든 분산형 망에는 이런 보안 관리자가 없고 어느 라우터든 합류 기기에 망 키를 전달할 수 있다. 이하 TI Z-Stack 문서(R22 인증 스택 기준)의 설명이다. 망 계층 보안은 필수이며 끌 수 없다. 링크 키는 APS 계층 키이고, 망 키를 보내는 Transport Key 명령은 모든 기기가 공유하는 기본 전역 Trust Center 링크 키나 설치 코드에서 유도한 링크 키로 APS 암호화된다. 설치 코드 사용 강제는 정책 설정이며 기본값은 꺼져 있다. 분산형 망은 별도의 분산형 기본 전역 키를 쓴다. 이를 정리하면(이 문서의 요약) 망 키는 모든 기기의 망 계층 프레임을, 링크 키는 합류 때의 키 전달을 맡으며, TI는 애플리케이션 데이터 보안을 중앙 집중형 보안 망에서만 제공하는 기능으로 따로 든다. 모든 프레임을 두 키로 이중 암호화한다는 설명은 이 자료에서 확인되지 않는다. R23 이후는 다를 수 있다. CSA는 Zigbee PRO 2023과 Zigbee 4.0의 보안 기능으로 ECC 기반 Dynamic Link Key를 들며, 그 세부는 규격 원문으로 확인하지 못했다. CSA는 무선 구간 암호화를 AES-128-CCM으로 적는다.

망 규모는 CSA 자료 안에서도 기준에 따라 표현이 다르다. FAQ는 주소 체계가 망당 수백 노드를 지원한다고 하면서, 메시의 확장성은 Zigbee 소개 페이지와 같이 수천 노드로 적는다. 한 노드가 죽어도 다른 경로로 우회하는 자가 치유(self-healing) 메시가 장점이지만, 실제 규모는 스택과 기기의 메모리, 트래픽 형태로 확인한다.

## UWB와 정밀 거리 측정

UWB(Ultra-Wideband, 초광대역)는 아주 넓은 대역에 낮은 출력 밀도로 신호를 퍼뜨리는 무선이다. 지금 스마트폰과 차량 키에서 쓰는 주된 용도는 대용량 전송보다 두 기기 사이의 거리와 방향을 정밀하게 재는 것이다.

- **정의(미국 FCC 47 CFR 15.503, Cornell LII 재게시본 2026-11-18 조회 기준):** 최고 방사 지점보다 10dB 낮은 두 지점 사이를 UWB 대역폭으로 보고, 이 대역폭이 500MHz 이상이거나 분수 대역폭 2(fH−fL)/(fH+fL)이 0.20 이상이면 UWB 송신기다.
- **대역과 출력:** 실내 시스템(15.517)과 휴대 시스템(15.519)은 UWB 대역폭이 3100~10600MHz 안에 있어야 하고, 이 구간의 평균 EIRP는 1MHz 분해능 대역폭 기준 −41.3dBm으로 제한된다. 휴대 시스템은 고정 인프라를 쓰지 않아야 한다. 간섭이 원래 없다기보다 이렇게 낮은 출력 밀도 제한 안에서 다른 무선과 대역을 나눠 쓰도록 규제된다. 다른 나라의 대역과 허용 조건은 각 규제를 따로 확인한다.
- **표준:** IEEE 802.15.4z-2020은 802.15.4의 UWB PHY에 코딩 옵션을 더해 거리 측정의 무결성과 정확도를 높이고, MAC이 비행 시간(time-of-flight) 측정 절차를 제어하고 측정 정보를 주고받도록 보강한 개정이다. IEEE 사이트에는 Superseded 상태로 표시되므로 구현 근거는 현행 802.15.4 개정판을 확인한다.
- **측정 방식:** TWR(Two-Way Ranging)은 두 기기가 주고받은 메시지의 왕복 시간으로 비행 시간과 거리를 구한다. TDoA(Time Difference of Arrival)는 도착 시각의 차이로 위치를 구하며 방향이 둘이다. UL-TDoA는 태그가 보낸 신호를 시간이 맞춰진 여러 앵커가 받고 시스템이 위치를 계산한다. DL-TDoA는 앵커들이 보낸 메시지를 기기가 엿듣고 스스로 위치를 계산하므로 사용자 기기가 송신하지 않는다. FiRa 인증 프로그램도 OWR(One-Way Ranging) UL TDoA와 DL TDoA를 따로 둔다.
- **상호 운용:** FiRa Consortium은 IEEE가 정한 MAC과 PHY 위에 프로파일을 만들고 제품을 인증해 UWB 기기 간 상호 운용을 맞추려는 단체다. 따라서 UWB가 본질적으로 제조사 간 호환되지 않는다고 외우기보다, 기기와 프로파일이 같은 규격과 인증을 지원하는지로 판단한다.

| 사례 | 확인한 범위 |
|---|---|
| Apple 기기의 UWB | Apple은 iPhone 11 이후 일부 모델, Apple Watch, AirTag 등을 1세대와 2세대 UWB 칩으로 나눠 안내하고, 국가와 지역 규제에 따라 UWB를 쓸 수 없는 곳이 있다고 밝힌다. AirTag의 정밀 탐색(Precision Finding)에는 UWB를 지원하는 iPhone이 필요하며, 2026-09 Apple 안내는 Find(Find Nearby)를 iPhone 15 이후에서 쓸 수 있다고 적는다 |
| 차량 디지털 키 | 2021-04 CCC 발표 기준 Digital Key Release 3.0은 UWB와 Bluetooth LE를 함께 써서 휴대폰을 꺼내지 않는 패시브 출입과 시동을 지원하고, NFC를 필수 예비 수단으로 유지한다. 후속 버전(v3.1.x, v4.x)의 변경은 확인하지 않았다 |

시험 요약에서 UWB에 함께 붙는 480Mbps 전송률, MAC의 OFDMA 같은 수치와 구성은 위 802.15.4z 자료에서 확인되지 않았다. UWB라는 이름의 서로 다른 고속 전송 규격과 섞였을 수 있으므로 규격 원문으로 확인하기 전에는 쓰지 않는다.

## BLE 비콘과 실내 근접 판단

BLE 비콘은 정해진 Bluetooth LE 광고(advertising) 데이터를 주기적으로 내보내기만 하는 기기다. 매장에 들어서면 쿠폰이 뜨는 장면에서 쿠폰을 보내는 쪽은 비콘이 아니다. 휴대폰의 운영체제가 광고를 감지해 앱에 알리고, 앱이 준비한 내용(앱에 담았거나 서버에서 받은)을 보여 준다.

- **식별자(Apple iBeacon 기준):** 128비트 proximity UUID(조직이나 비콘 종류), 16비트 major(같은 UUID 안의 묶음, 예: 매장), 16비트 minor(같은 major 안의 개별 비콘)를 광고한다. UUID는 필수이고 major와 minor는 선택이다. 앱은 UUID만, UUID와 major, 세 값 모두로 감시 범위를 넓히거나 좁힌다.
- **감시와 거리 추정(2016 Apple 보관 가이드 기준):** 감시(monitoring)는 비콘 영역에 들어오고 나간 사건만 알려 주고, 거리 추정(ranging)은 주변 비콘을 대략의 거리 순으로 돌려준다. 근접 값은 상대적인 거리감이다. 벽, 문과 물(사람의 몸 포함)이 신호를 약하게 만들고, 거리 추정은 포그라운드에서만 쓰라고 권한다. 비콘 영역 감시는 iOS 7.0 이후 기능이다. Android는 4.3(API 18)에서 BLE API를 추가했고, 현행 문서는 central 역할의 플랫폼 지원으로 설명한다. 스캔 결과로 위치를 추정하는 Android 앱은 `ACCESS_FINE_LOCATION`을 선언해야 한다.
- **RSSI 거리의 한계:** iBeacon 광고에는 1m 거리에서 기대되는 신호 세기(TX Power)가 들어 있고, 수신 쪽은 TX Power와 수신 세기(RSSI)의 차이로 경로 손실을 셈해 거리를 짐작한다. 경로 손실이 장애물과 환경에 따라 달라지므로 1세대 방식인 이 추정은 근접 판정용으로 보고 정확한 좌표로 쓰지 않는다.
- **정밀 측위로 가는 기능:** Bluetooth SIG는 존재는 광고, 방향은 Direction Finding(AoA/AoD, 2019 Core 5.1), 거리는 RSSI와 Channel Sounding으로 나눈다. Channel Sounding은 2024년에 채택된 Core 6.0의 기능이며 연결된 두 기기가 1:1로 거리를 잰다. 주 측정은 위상 기반 측정(PBR)이고 왕복 시간(RTT)은 보안용 교차 확인으로 함께 쓴다. 위 UWB의 TWR과 닮은 쪽은 RTT다.
- **채널:** SIG 기술 개요 표 기준 Bluetooth LE의 40개 채널 중 3개가 광고 채널, 37개가 데이터 채널이다. iBeacon 같은 레거시 광고는 광고 채널 37, 38, 39만 차례로 쓴다. 채널을 바꿔 가는 동작은 연결의 주파수 도약과 Bluetooth 5 이후 주기적 광고의 채널 선택에 해당하므로 레거시 광고만 하는 비콘의 혼선 회피 원리로 옮기지 않는다.

누가 신호를 보내고 누가 위치를 계산하는지로 구성을 나눈다(이 문서의 정리). 고정 비콘이 광고하고 휴대폰 앱이 듣는 구성은 사용자 기기가 계산하며 앱 설치, Bluetooth와 위치 권한이 전제다. 자산 태그가 신호를 보내고 고정 수신기가 받는 RTLS 구성은 시스템 쪽이 계산한다. SIG는 AoA에서 안테나 하나로 보내는 송신 쪽 예로 RTLS의 자산 태그를 든다. 송신과 계산의 방향은 UWB의 UL-TDoA와 같지만 측정 원리는 다르다.

## Bluetooth의 L2CAP

L2CAP(Logical Link Control and Adaptation Protocol)은 Bluetooth Host 스택에서 ATT, SMP 같은 상위 프로토콜과 Controller의 논리 링크 사이를 잇는 계층이다. 상위 계층에 연결형과 비연결형 데이터 서비스를 주고 최대 64KB의 SDU를 다룬다(Bluetooth Core 6.2 Vol 3 Part A 기준, 아래 내용은 Core 7.0의 같은 Part에서도 같다). 한 LE 링크 위에서 ATT와 SMP가 함께 동작하는 것처럼 여러 상위 프로토콜이 두 기기 사이의 한 논리 링크를 나눠 쓰는 일은 L2CAP의 채널 다중화가 맡는다. 서로 다른 기기와의 동시 연결은 링크가 따로 있으므로 이 다중화와 구분한다.

| 기능 | 하는 일 |
|---|---|
| 프로토콜, 채널 다중화 | 채널 수립 때 연결을 맞는 상위 프로토콜로 보내고, 데이터 전송 때 채널 ID(CID)로 여러 상위 엔티티를 구분한다 |
| 분할(segmentation)과 재조립 | 모드에 따라 SDU를 segment로 나눠 PDU 길이를 제어하고, 여러 애플리케이션의 데이터를 끼워 보내 지연 요구를 맞춘다 |
| 채널별 흐름 제어 | 한 Controller 위의 여러 스트림을 채널마다 따로 조절한다 |
| 오류 제어와 재전송 | PDU의 오류를 검사하고 재전송한다. 흐름 제어가 첫 전송과 재전송을 함께 제한한다 |
| 단편화(fragmentation)와 재결합 | L2CAP PDU를 하위 전송에 맞는 fragment로 나누고 수신 측에서 PDU로 되돌린다. HCI 드라이버나 Controller에서도 일어날 수 있다 |
| Streaming, QoS | flush timeout으로 송신을 이어 가고, 연결 설정 때 기대 QoS를 교환한다 |

- segmentation은 SDU를 나누는 절차이고 Basic 모드에는 없다. fragmentation은 PDU를 하위 계층 전송용으로 나누는 절차이며 모든 모드에 적용될 수 있다. 6LoWPAN의 링크 단편화와 이름이 비슷하지만 계층과 대상이 다르다.
- 비연결형 채널(CID 0x0002)은 BR/EDR의 ACL-U와 APB-U CID 표에만 있고 LE-U 표에는 없다. 따라서 Bluetooth LE가 비연결형만 지원한다는 설명은 틀렸다. LE에는 링크가 서자마자 쓸 수 있는 고정 채널(0x0004 ATT, 0x0005 LE Signaling, 0x0006 SMP)과 동적 연결형 채널(0x0040~0x007F)이 있다.
- 모드는 링크에 따라 다르다. Basic은 필수이자 기본값이며 LE에서는 일부 고정 채널에만 쓴다. Flow Control, Retransmission, Enhanced Retransmission, Streaming은 BR/EDR 전용, LE Credit Based Flow Control은 LE 전용, Enhanced Credit Based Flow Control은 BR/EDR과 LE에 모두 쓴다. LE의 연결형 채널은 credit 방식으로 흐름을 조절하며, LE에서 쓸 수 있는 모드에는 L2CAP 재전송 모드가 없다.
- LE 물리 링크의 모든 채널은 best effort로 하나의 LE-U 논리 링크에 매핑된다. 채널별 QoS 보장을 LE에서 기대하지 않는다.

## IEEE 802.15.4의 제약

RFC 4919(2007)가 IEEE 802.15.4-2003을 기준으로 정리한 LoWPAN의 특성은 다음과 같다.

- 물리 계층 최대 패킷은 127바이트이고, MAC 계층의 최대 프레임은 102옥텟이다. 링크 계층 보안을 쓰면 데이터에 남는 공간이 81옥텟까지 줄 수 있다.
- 주소는 16비트 short 주소와 IEEE 64비트 확장 주소를 모두 지원한다. RFC 4944에 따르면 16비트 주소는 연결(association) 뒤 PAN 안에서만 유일하다.
- 전송률은 2.4GHz 250kbps, 915MHz 40kbps, 868MHz 20kbps다. 2.4GHz만 있는 기술이 아니다. 이 수치는 2003년 표준 기준이며, CSA의 Zigbee FAQ는 Sub-GHz 대역에 다른 전송률을 제시하므로 표준 개정과 PHY를 확인한다.
- 스타와 메시 토폴로지를 지원하고, 장치의 일부나 전부가 배터리로 동작한다.

## 6LoWPAN이 IPv6를 싣는 방법

IPv6는 링크 MTU로 최소 1280옥텟을 요구하는데 802.15.4 물리 계층 패킷은 최대 127옥텟(MAC 오버헤드 최대 25옥텟을 빼면 102옥텟)이다. 그래서 RFC 4944는 IP 아래에 적응 계층을 두고 802.15.4 위의 IPv6 MTU를 1280옥텟으로 정한다.

1. **단편화와 재조립.** 한 프레임에 들어가지 않는 데이터그램은 링크 단편으로 나눈다. 단편 헤더에 datagram_size(11비트)와 datagram_tag(16비트)를 두고, 둘째 단편부터는 8옥텟 단위의 datagram_offset(8비트)을 더한다. 재조립 시간 제한은 최대 60초이고, 만료되면 모은 단편을 버린다.
2. **헤더 압축.** 40바이트 IPv6 헤더를 그대로 실으면 남는 페이로드가 너무 작아 압축이 사실상 필수다. RFC 4944의 HC1/HC2는 RFC 6282가 IPHC와 NHC로 대체했고, RFC 4944의 압축 절은 이제 구현을 권장하지 않는다(NOT RECOMMENDED). 링크 계층 주소에서 유도할 수 있는 IPv6 주소 부분을 생략하는 것이 압축의 핵심이다.
3. **메시 주소 헤더.** 링크 계층에서 여러 홉을 거칠 때 원 발신지와 최종 목적지 주소, 홉마다 줄어드는 Hops Left를 둔다. 헤더 순서는 Mesh Addressing, Broadcast, Fragmentation이다.
4. **주소 자동 구성.** 인터페이스 식별자는 64비트 확장 주소에서 universal/local 비트를 뒤집어 만든다. 16비트 short 주소에서는 RFC 4944 6절이 16비트 PAN ID와 16개의 0, short 주소를 이은 pseudo 48비트 주소로 만들고 universal/local 비트를 0으로 둔다. RFC 6282의 IPHC 주소 압축(3.1.1절, 3.2.2절)에서 short 주소로 유도하는 식별자는 `0000:00ff:fe00:XXXX` 형태다. 링크 로컬 주소는 `FE80::/64`에 인터페이스 식별자를 붙인다.

## 인터넷과의 연결과 Neighbor Discovery

일반 IPv6 Neighbor Discovery는 멀티캐스트에 기대므로 저전력 손실 네트워크에서 비효율적이다. RFC 6775(2012)는 잠자는 호스트 지원, 호스트의 멀티캐스트 주소 해석 제거, ARO(Address Registration Option)를 통한 주소 등록과 멀티홉 중복 주소 탐지를 더한다. 이후 RFC 8505가 ARO를 EARO로 갱신했으므로 구현은 갱신된 RFC를 함께 본다.

- **6LBR(6LoWPAN Border Router):** 서로 다른 6LoWPAN의 접점이나 6LoWPAN과 다른 IP 네트워크의 경계에 있는 라우터이며, 자기가 맡은 6LoWPAN에 IPv6 prefix를 배포하는 책임 주체다. 외부와 연결되지 않은 LoWPAN에도 6LBR이 있으며, 이때 6LBR은 ULA prefix를 만든다(SHOULD).
- **6LR(6LoWPAN Router):** route-over 토폴로지에서 IPv6 패킷을 전달하는 중간 라우터다.

그러므로 6LoWPAN 센서가 별도의 변환 장치 없이 인터넷과 직접 통신한다는 설명은 경계 라우터를 빼면 오해를 부른다. 애플리케이션 프로토콜을 바꿔 주는 게이트웨이 없이 IPv6 종단 간 주소 체계를 쓸 수 있다는 뜻이지, 경계 라우터가 필요 없다는 뜻은 아니다. 주소의 전역 유일성도 6LBR이 배포한 전역 prefix와 그 prefix 안에서 유일한 인터페이스 식별자(EUI-64 기반 또는 RFC 6775의 등록과 중복 주소 탐지)가 함께 있어야 성립한다. short 주소에서 만든 인터페이스 식별자 자체는 전역 유일한 값이 아니라고 RFC 4944가 명시한다.

## 트레이드오프와 선택 기준

아래 표는 위 출처의 특성에서 끌어낸 일반 판단 기준이며 출처가 직접 권하는 선택은 아니다. 실제 선택은 대상 단말의 지원 버전과 생태계를 확인한다.

| 질문 | 먼저 검토할 후보 |
|---|---|
| 스마트폰과 별도 허브 없이 붙어야 하는가 | Bluetooth LE |
| 많은 배터리 센서를 메시로 운용하는가 | IEEE 802.15.4 기반(Zigbee 또는 6LoWPAN)과 Bluetooth Mesh |
| 기존 IP 주소 체계와 도구를 그대로 쓰고 싶은가 | 6LoWPAN과 경계 라우터 |
| 오디오처럼 연속 스트리밍이 필요한가 | Bluetooth Classic(BR/EDR) Audio 또는 LE Audio |

- 6LoWPAN은 IP 연동이 쉽지만 한 프레임에 들어가지 않는 데이터그램은 단편화가 필요하다. RFC 4944의 적응 계층에는 선택적 복구가 없어 단편 하나가 재조립 종단에 닿지 않으면 데이터그램 전체가 실패한다(RFC 8931). RFC 4944는 링크 계층 복구를 돕도록 ACK를 요청하는 프레임에 IPv6 패킷을 싣기를 권하지만, 손실이 큰 링크에서는 애플리케이션 페이로드를 프레임 크기에 맞게 줄이는 설계가 여전히 중요하다. RFC 8931(2020)은 RFRAG와 RFRAG-ACK로 선택적 단편 복구를 더했으며, 구현 지원은 스택마다 확인한다.
- Sub-GHz 대역은 CSA FAQ 기준 1km 이상의 거리를 낼 수 있다. 전송률은 기준에 따라 다르다. RFC 4919의 2003년 표준 기준으로는 915MHz 40kbps, 868MHz 20kbps이고, CSA FAQ는 915~921MHz 500kbps, 868MHz 100kbps를 든다. 지역별로 쓰는 대역(CSA FAQ 기준 미주 915MHz, 유럽 868MHz)도 다르다.

## 면접과 운영 체크포인트

- WPAN을 10m 이내 네트워크로 외웠다면 거리는 PHY와 출력, 환경에 따라 달라진다는 점을 덧붙인다.
- 6LoWPAN이 필요한 이유를 MTU 1280과 127바이트 프레임의 차이로 설명할 수 있는가.
- 6LoWPAN과 Zigbee의 차이를 같은 802.15.4 무선 위에 IPv6를 올리는지, CSA 자체 상위 규격을 쓰는지로 나눠 말할 수 있는가.
- Zigbee PRO의 many-to-one 라우팅에서 route record와 소스 라우팅이 각각 어느 방향의 트래픽에 쓰이는지 말할 수 있는가.
- 인터넷 연결에 6LBR이 하는 일(prefix 배포, 경계 라우팅)을 말할 수 있는가.
- L2CAP의 segmentation과 fragmentation을 나누고, 비연결형 채널이 BR/EDR에만 있다는 점을 CID 표로 설명할 수 있는가.
- UWB를 대역폭 정의(500MHz 또는 분수 대역폭 0.20)와 낮은 출력 밀도 제한으로 설명하고, TWR과 TDoA의 차이를 말할 수 있는가.

## 출처

- [RFC Editor, RFC 4919 IPv6 over Low-Power Wireless Personal Area Networks (6LoWPANs): Overview, Assumptions, Problem Statement, and Goals](https://www.rfc-editor.org/rfc/rfc4919)
- [RFC Editor, RFC 4944 Transmission of IPv6 Packets over IEEE 802.15.4 Networks](https://www.rfc-editor.org/rfc/rfc4944)
- [RFC Editor, RFC 6282 Compression Format for IPv6 Datagrams over IEEE 802.15.4-Based Networks](https://www.rfc-editor.org/rfc/rfc6282)
- [RFC Editor, RFC 6775 Neighbor Discovery Optimization for IPv6 over Low-Power Wireless Personal Area Networks (6LoWPANs)](https://www.rfc-editor.org/rfc/rfc6775)
- [RFC Editor, RFC 8505 Registration Extensions for IPv6 over Low-Power Wireless Personal Area Network (6LoWPAN) Neighbor Discovery](https://www.rfc-editor.org/rfc/rfc8505)
- [RFC Editor, RFC 8931 IPv6 over Low-Power Wireless Personal Area Network (6LoWPAN) Selective Fragment Recovery](https://www.rfc-editor.org/rfc/rfc8931)
- [RFC Editor, RFC 7668 IPv6 over BLUETOOTH(R) Low Energy](https://www.rfc-editor.org/rfc/rfc7668)
- [IEEE 802.15, WPAN Low Rate Alternative PHY Task Group 4a (TG4a)](https://www.ieee802.org/15/pub/TG4a.html)
- [IEEE SA, IEEE 802.15.4z-2020 Amendment 1: Enhanced Ultra Wideband (UWB) Physical Layers (PHYs) and Associated Ranging Techniques](https://standards.ieee.org/ieee/802.15.4z/10230/)
- [eCFR (Cornell LII), 47 CFR 15.503 Definitions](https://www.law.cornell.edu/cfr/text/47/15.503)
- [eCFR (Cornell LII), 47 CFR 15.517 Technical requirements for indoor UWB systems](https://www.law.cornell.edu/cfr/text/47/15.517)
- [eCFR (Cornell LII), 47 CFR 15.519 Technical requirements for hand held UWB systems](https://www.law.cornell.edu/cfr/text/47/15.519)
- [FiRa Consortium, Technical Specifications](https://www.firaconsortium.org/certifications/technical-specifications)
- [FiRa Consortium, Certification Program](https://www.firaconsortium.org/certifications/certification-program)
- [Untracked Indoor Navigation — FiRa Consortium](https://www.firaconsortium.org/resource-hub/blog/untracked-indoor-navigation)
- [Apple, Ultra Wideband availability](https://support.apple.com/en-us/109512)
- [Apple, Use AirTag and Find My to keep track of your personal items](https://support.apple.com/en-us/109021)
- [Car Connectivity Consortium Delivers Digital Key Release 3.0 Specification — Car Connectivity Consortium](https://carconnectivity.org/car-connectivity-consortium-delivers-digital-key-release-3-0-specification-businesswire/)
- [Bluetooth SIG, Bluetooth Technology Overview](https://www.bluetooth.com/learn-about-bluetooth/tech-overview/)
- [Bluetooth SIG, Understanding Bluetooth Range](https://www.bluetooth.com/learn-about-bluetooth/key-attributes/range/)
- [Bluetooth SIG, Bluetooth Core 7.0 Feature Overview](https://www.bluetooth.com/bluetooth-core-7-0-feature-overview/)
- [Bluetooth High Data Throughput Opens a New Chapter in Wireless Performance — Bluetooth SIG](https://www.bluetooth.com/press/bluetooth-high-data-throughput-opens-a-new-chapter-in-wireless-performance/) — 2026-11-04 HDT 채택 발표
- [Bluetooth SIG, Bluetooth Core 6.2 Vol 3 Part A Logical Link Control and Adaptation Protocol Specification](https://www.bluetooth.com/wp-content/uploads/Files/Specification/HTML/Core-62/out/en/host/logical-link-control-and-adaptation-protocol-specification.html)
- [Bluetooth SIG, Bluetooth Core 7.0 Vol 3 Part A Logical Link Control and Adaptation Protocol (L2CAP) Specification](https://www.bluetooth.com/wp-content/uploads/Files/Specification/HTML/Core_v7.0/out/en/host/logicallinkcontrol-andadaptationprotocol-l2cap--specification.html)
- [Bluetooth SIG, LE Audio](https://www.bluetooth.com/learn-about-bluetooth/feature-enhancements/le-audio/)
- [Bluetooth SIG, Bluetooth Channel Sounding Technical Overview](https://www.bluetooth.com/channel-sounding-tech-overview/) — 2026-11-19 조회, iBeacon의 TX Power와 경로 손실, PBR 주 측정과 RTT 보안 확인, Direction Finding의 Core 5.1
- [Bluetooth SIG introduces true distance awareness — Bluetooth SIG](https://www.bluetooth.com/press/bluetooth-channel-sounding/) — 2024-09-03 Core 6.0의 Channel Sounding 발표
- [Bluetooth SIG, Bluetooth Low Energy Primer](https://www.bluetooth.com/bluetooth-le-primer/) — 레거시 광고 채널 37, 38, 39와 주기적 광고의 채널 선택
- [Bluetooth SIG, Direction Finding](https://www.bluetooth.com/learn-about-bluetooth/feature-enhancements/direction-finding/)
- [Apple, Location and Maps Programming Guide: Region Monitoring and iBeacon](https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/LocationAwarenessPG/RegionMonitoring/RegionMonitoring.html) — 보관 문서(2016-03-21 갱신)
- [Android Developers, Bluetooth Low Energy](https://developer.android.com/guide/topics/connectivity/bluetooth-le.html)
- [Android Developers, Android 4.3 APIs](https://developer.android.com/about/versions/android-4.3)
- [Android Developers, Bluetooth permissions](https://developer.android.com/develop/connectivity/bluetooth/bt-permissions)
- [#NW 0052 - 매장에 들어오자마자 쿠폰이 뜨는 이유? 비콘(Beacon) 90초 완전정리 — 길리랩](https://www.youtube.com/watch?v=3dJpXmbCzg0) — 학습 계기, 비콘의 주파수 도약 설명은 SIG 채널 구성으로 교정하고 신호 종류별 비콘 분류는 확인하지 못해 쓰지 않음
- [Connectivity Standards Alliance, Zigbee FAQ](https://csa-iot.org/all-solutions/zigbee/zigbee-faq/)
- [Connectivity Standards Alliance, Zigbee](https://csa-iot.org/all-solutions/zigbee/)
- [The Connectivity Standards Alliance Announces Zigbee 4.0 and Suzi — Connectivity Standards Alliance](https://csa-iot.org/newsroom/the-connectivity-standards-alliance-announces-zigbee-4-0-and-suzi-empowering-the-next-generation-of-secure-interoperable-iot-devices/) — 2025-11-18 발표, 2026-11-19 규격 문서 목록과 하위 호환 대조
- [Silicon Labs, Zigbee Fundamentals: Zigbee Routing Concepts](https://docs.silabs.com/zigbee/8.2.0/zigbee-fundamentals/04-zigbee-routing-concepts) — Zigbee 8.2.0 문서
- [Silicon Labs, Zigbee Fundamentals: The Zigbee Stack](https://docs.silabs.com/zigbee/8.2.0/zigbee-fundamentals/05-the-zigbee-stack) — Zigbee 8.2.0 문서
- [Silicon Labs, Zigbee Fundamentals: Network Node Types](https://docs.silabs.com/zigbee/8.2.0/zigbee-fundamentals/03-network-node-types) — Zigbee 8.2.0 문서
- [Texas Instruments, ZBOSS Overview](https://dev.ti.com/tirex/explore/content/simplelink_lowpower_f3_sdk_8_20_00_119/docs/zigbee/html/zboss/zboss-overview.html) — Zigbee PRO 2023(R23) 인증 스택 문서
- [Texas Instruments, Z-Stack Overview](https://dev.ti.com/tirex/content/simplelink_cc13x2_26x2_sdk_5_10_00_48/docs/zigbee/html/zigbee/z-stack-overview.html) — Zigbee PRO 2017(R22) 인증 스택 문서
- [#NW 0045 - 무선 이어폰은 어떻게 연결될까? WPAN 90초 완벽 정리 — 길리랩](https://www.youtube.com/watch?v=bn3J-xodWY0) — 학습 계기, 거리와 기술 분류는 위 1차 출처로 교정
- [#NW 0046 - 쌀알만 한 센서에도 IP 주소를? 6LoWPAN 90초 완벽 정리 — 길리랩](https://www.youtube.com/watch?v=Wn4p_EbybAg) — 학습 계기, 주소 유일성과 인터넷 연결 설명은 RFC로 교정
- [#NW 0048 - 블루투스의 숨은 영웅 L2CAP, 90초 완벽 정리! — 길리랩](https://www.youtube.com/watch?v=70o03jLh7EM) — 학습 계기, LE의 비연결형 설명과 다중화 예시는 Core 6.2로 교정
- [#NW 0049 - 에어태그의 비밀, UWB 90초 완벽 정리! — 길리랩](https://www.youtube.com/watch?v=QDF6ETP7pLw) — 학습 계기, 간섭과 호환성 설명은 FCC 규정과 FiRa 자료로 교정하고 전송률과 MAC 구성은 확인하지 못해 쓰지 않음
- [#NW 0051 - 수천 개 센서를 하나로 묶는 무선 기술! ZigBee PRO 90초 완전 정리 — 길리랩](https://www.youtube.com/watch?v=IAywvVXZ8Ww) — 학습 계기, 수만 노드 확장 설명은 CSA 자료와 맞지 않아 쓰지 않음. CSA Zigbee 규격 원문은 접근이 막혀 대조하지 못했고 벤더 스택 문서로 확인

## 관련 문서

- [[WiFi-Direct|Wi-Fi Direct]]
- [[WiFi-Generations|Wi-Fi 세대와 연결 구간 진단]]
- [[Mobile-Network-Continuity|이동 환경의 통신 연속성]]
- [[Network-Encapsulation|캡슐화와 데이터 단위]]
- [[ICMP|ICMP와 Neighbor Discovery]]
- [[IoT-Device-and-Firmware-Security|IoT 기기와 펌웨어 보안]]
