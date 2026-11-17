---
tags: [network, wireless, wpan, iot, ipv6, bluetooth, zigbee, 6lowpan]
status: done
verified_at: 2026-11-18
category: "Web - 네트워크"
aliases: ["WPAN", "Wireless Personal Area Network", "무선 개인 통신망", "6LoWPAN", "LoWPAN", "IEEE 802.15.4", "BLE", "Bluetooth Low Energy", "L2CAP", "Logical Link Control and Adaptation Protocol"]
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
- 인터넷 연결에 6LBR이 하는 일(prefix 배포, 경계 라우팅)을 말할 수 있는가.
- L2CAP의 segmentation과 fragmentation을 나누고, 비연결형 채널이 BR/EDR에만 있다는 점을 CID 표로 설명할 수 있는가.

## 출처

- [RFC Editor, RFC 4919 IPv6 over Low-Power Wireless Personal Area Networks (6LoWPANs): Overview, Assumptions, Problem Statement, and Goals](https://www.rfc-editor.org/rfc/rfc4919)
- [RFC Editor, RFC 4944 Transmission of IPv6 Packets over IEEE 802.15.4 Networks](https://www.rfc-editor.org/rfc/rfc4944)
- [RFC Editor, RFC 6282 Compression Format for IPv6 Datagrams over IEEE 802.15.4-Based Networks](https://www.rfc-editor.org/rfc/rfc6282)
- [RFC Editor, RFC 6775 Neighbor Discovery Optimization for IPv6 over Low-Power Wireless Personal Area Networks (6LoWPANs)](https://www.rfc-editor.org/rfc/rfc6775)
- [RFC Editor, RFC 8505 Registration Extensions for IPv6 over Low-Power Wireless Personal Area Network (6LoWPAN) Neighbor Discovery](https://www.rfc-editor.org/rfc/rfc8505)
- [RFC Editor, RFC 8931 IPv6 over Low-Power Wireless Personal Area Network (6LoWPAN) Selective Fragment Recovery](https://www.rfc-editor.org/rfc/rfc8931)
- [RFC Editor, RFC 7668 IPv6 over BLUETOOTH(R) Low Energy](https://www.rfc-editor.org/rfc/rfc7668)
- [IEEE 802.15, WPAN Low Rate Alternative PHY Task Group 4a (TG4a)](https://www.ieee802.org/15/pub/TG4a.html)
- [Bluetooth SIG, Bluetooth Technology Overview](https://www.bluetooth.com/learn-about-bluetooth/tech-overview/)
- [Bluetooth SIG, Understanding Bluetooth Range](https://www.bluetooth.com/learn-about-bluetooth/key-attributes/range/)
- [Bluetooth SIG, Bluetooth Core 7.0 Feature Overview](https://www.bluetooth.com/bluetooth-core-7-0-feature-overview/)
- [Bluetooth High Data Throughput Opens a New Chapter in Wireless Performance — Bluetooth SIG](https://www.bluetooth.com/press/bluetooth-high-data-throughput-opens-a-new-chapter-in-wireless-performance/) — 2026-11-04 HDT 채택 발표
- [Bluetooth SIG, Bluetooth Core 6.2 Vol 3 Part A Logical Link Control and Adaptation Protocol Specification](https://www.bluetooth.com/wp-content/uploads/Files/Specification/HTML/Core-62/out/en/host/logical-link-control-and-adaptation-protocol-specification.html)
- [Bluetooth SIG, Bluetooth Core 7.0 Vol 3 Part A Logical Link Control and Adaptation Protocol (L2CAP) Specification](https://www.bluetooth.com/wp-content/uploads/Files/Specification/HTML/Core_v7.0/out/en/host/logicallinkcontrol-andadaptationprotocol-l2cap--specification.html)
- [Bluetooth SIG, LE Audio](https://www.bluetooth.com/learn-about-bluetooth/feature-enhancements/le-audio/)
- [Connectivity Standards Alliance, Zigbee FAQ](https://csa-iot.org/all-solutions/zigbee/zigbee-faq/)
- [#NW 0045 - 무선 이어폰은 어떻게 연결될까? WPAN 90초 완벽 정리 — 길리랩](https://www.youtube.com/watch?v=bn3J-xodWY0) — 학습 계기, 거리와 기술 분류는 위 1차 출처로 교정
- [#NW 0046 - 쌀알만 한 센서에도 IP 주소를? 6LoWPAN 90초 완벽 정리 — 길리랩](https://www.youtube.com/watch?v=Wn4p_EbybAg) — 학습 계기, 주소 유일성과 인터넷 연결 설명은 RFC로 교정
- [#NW 0048 - 블루투스의 숨은 영웅 L2CAP, 90초 완벽 정리! — 길리랩](https://www.youtube.com/watch?v=70o03jLh7EM) — 학습 계기, LE의 비연결형 설명과 다중화 예시는 Core 6.2로 교정

## 관련 문서

- [[WiFi-Direct|Wi-Fi Direct]]
- [[WiFi-Generations|Wi-Fi 세대와 연결 구간 진단]]
- [[Mobile-Network-Continuity|이동 환경의 통신 연속성]]
- [[Network-Encapsulation|캡슐화와 데이터 단위]]
- [[ICMP|ICMP와 Neighbor Discovery]]
- [[IoT-Device-and-Firmware-Security|IoT 기기와 펌웨어 보안]]
