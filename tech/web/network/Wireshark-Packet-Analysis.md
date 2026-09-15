---
tags: [web, network, wireshark, packet-capture, npcap, troubleshooting]
status: done
verified_at: 2026-09-15
category: "웹&네트워크(Web&Network)"
aliases: ["Wireshark", "와이어샤크", "Wireshark 구조와 패킷 분석", "패킷 수집기와 분석기"]
---

# Wireshark의 구조와 패킷 분석

Wireshark는 **캡처한 패킷을 프로토콜 규칙에 따라 해석하는 분석 도구**다. 구조를 이해할 때는 데이터를 얻는 수집 경로와, 수집한 바이트를 해석하는 분석 경로를 나눠 본다. 연결 장애, 프로토콜 구현 오류와 보안 문제를 조사하거나 네트워크를 학습할 때 사용한다.

## 수집 경로 — 캡처 드라이버와 dumpcap

일반적인 로컬 실시간 캡처는 `인터페이스의 캡처 경로 → dumpcap → 캡처 데이터/파일 → Wireshark 분석기`로 이어진다. 이 화살표는 관측 데이터의 흐름이며, 실제 통신이 분석기를 통과해야 한다는 뜻은 아니다.

| 구성 요소 | 역할 |
|---|---|
| Windows의 Npcap | 커널 드라이버와 사용자 영역 라이브러리를 통해 패킷 캡처 API 제공 |
| Linux/macOS 등의 libpcap | 각 OS의 패킷 캡처 기능에 접근하는 공통 라이브러리. 모든 OS가 Npcap 드라이버를 쓰는 것은 아님 |
| dumpcap | 인터페이스에서 패킷을 수집하고 캡처 파일에 기록하는 별도 프로세스 |
| Wireshark의 dissector와 UI | 수집된 데이터를 프로토콜별로 해석하고 필드, 흐름과 통계를 표시 |

Windows에서 과거에 쓰던 WinPcap은 레거시이며 현재 Wireshark의 일반적인 캡처 구성은 Npcap을 사용한다. Npcap 전체를 단순히 센서 드라이버 하나로 부르기보다 **드라이버와 라이브러리로 구성된 캡처 기반**으로 이해한다.

직접 인터페이스에 접근하는 데 필요한 권한은 dumpcap 쪽으로 분리한다. 분석기와 UI 전체를 관리자 권한으로 실행하는 것을 기본으로 삼지 않는다. 이미 저장된 pcap/pcapng 파일을 여는 분석에는 실시간 인터페이스 캡처가 필요하지 않다.

### 수동 캡처와 바이패스의 차이

일반적인 패킷 캡처는 원래 통신을 의도적으로 차단하거나 변형하는 대신, **캡처 경로가 제공하는 패킷 사본을 관찰**한다. Wireshark 자체가 패킷을 허용하거나 차단하는 방화벽은 아니다.

**바이패스(bypass)**는 특정 처리 경로나 검사를 우회한다는 뜻이다. 예를 들어 인라인 IPS의 바이패스는 검사 엔진을 거치지 않고 트래픽을 통과시키는 기능이다. 패킷 복제나 정상 통과를 모두 바이패스라고 부르면 수집과 제어를 혼동하게 된다.

장비의 배치 방식과 미러링 자원의 제약은 [[Inline-and-Out-of-Path|Inline, Out-of-path와 포트 미러링]]을 참고한다.

수동 관찰도 비용이 전혀 없는 것은 아니다. 복사, 버퍼링, 파일 기록과 분석은 CPU, 메모리와 디스크를 사용한다. 이름 해석 설정에 따라 DNS 조회 같은 별도 트래픽이 생길 수도 있다.

### 캡처에 보이는 범위

- 인터페이스 선택: 유선, Wi-Fi, VPN과 루프백 중 어느 지점을 보는지에 따라 데이터가 달라진다.
- 스위치의 전달 범위: promiscuous mode도 NIC에 도착하지 않은 다른 호스트의 유니캐스트를 가져오지는 못한다. 다른 구간을 보려면 권한이 있는 미러 포트나 TAP 등 적절한 관측 지점이 필요하다.
- 필터와 길이 제한: capture filter에서 제외되거나 snaplen(패킷별 최대 캡처 길이) 뒤에서 잘린 데이터는 파일에 없다.
- 처리 용량: 캡처 버퍼가 넘치면 수집 과정에서 패킷 사본이 누락될 수 있다. 캡처 누락과 실제 네트워크의 패킷 유실은 구분한다.
- 오프로딩: 커널이나 NIC의 처리 시점 때문에 캡처가 선로의 패킷 형태와 다르게 보일 수 있다. 크기 해석 예시는 [[IPv4-Header-and-Fragmentation#Wireshark로 확인하기|IPv4 캡처 해석]]을 참고한다.

따라서 캡처 파일에 패킷이 없다는 사실만으로 상대가 보내지 않았거나 방화벽이 버렸다고 단정하지 않는다.

## 분석 경로 — 디코딩과 프로토콜 해석

**Dissector**는 바이트를 각 프로토콜의 필드로 해석하는 분석 모듈이다. Ethernet이라면 EtherType, IPv4라면 Protocol과 헤더 길이 등을 따라 다음 계층을 해석한다. 링크 유형과 사용 프로토콜에 따라 구성은 달라지며, 모든 캡처가 Ethernet에서 시작하는 것은 아니다.

| 화면 | 확인하는 내용 |
|---|---|
| Packet List | 캡처된 패킷의 시간, 주소, 프로토콜과 요약 |
| Packet Details | Ethernet, IP, TCP와 응용 프로토콜의 계층별 필드 |
| Packet Bytes | 선택한 데이터의 실제 바이트를 16진수 등으로 표시 |

디코딩은 바이트의 구조를 해석하는 것이고 복호화는 암호문을 평문으로 되돌리는 것이다. **TLS 트래픽을 캡처하거나 TCP 스트림을 모았다는 이유만으로 본문이 평문으로 보이지는 않는다.** 복호화에는 지원되는 방식의 키 자료 등 별도 조건이 필요하다. [[HTTPS-TLS]]

## 패킷과 TCP 스트림

TCP는 애플리케이션에 순서 있는 바이트 스트림을 제공하며 메시지 경계는 보존하지 않는다. 한 응용 메시지가 여러 TCP 세그먼트에 걸칠 수도 있고, 한 세그먼트에 여러 메시지의 데이터가 담길 수도 있다. [[Transport-Layer#소켓과 바이트 스트림|소켓과 스트림]]

**Follow TCP Stream**은 선택한 TCP 연결의 데이터를 방향별로 모아 스트림 관점에서 보여 준다. 패킷별 헤더를 보는 것과, 그 패킷들이 운반한 바이트 흐름을 보는 것은 서로 다른 관찰이다.

- 캡처 중간에 시작했거나 일부 세그먼트를 놓쳤다면 완전한 메시지를 복원하지 못할 수 있다.
- TCP 스트림의 바이트를 모으는 일과 HTTP 같은 상위 프로토콜의 메시지 경계를 해석하는 일은 구분한다.
- Wireshark는 UDP 등에도 Follow 기능을 제공한다. UI에서 흐름을 모아 보여 준다고 UDP가 TCP처럼 연결 지향 바이트 스트림을 제공하는 것은 아니다.

## 방향과 처리 용어

인바운드와 아웃바운드는 **어느 호스트나 인터페이스를 기준으로 하는지**를 먼저 정한다. 클라이언트의 요청은 클라이언트 기준 아웃바운드이고 서버 기준 인바운드다. 응답은 반대다.

| 용어 | 의미 |
|---|---|
| Inbound | 기준 지점으로 들어오는 트래픽 |
| Outbound | 기준 지점에서 나가는 트래픽 |
| Drop | 패킷을 폐기하는 처리. 정책 차단 외에 큐 부족 같은 자원 문제도 원인이 될 수 있음 |
| Forward / Allow | 다음 구간으로 전달 / 정책상 통과를 허용. 허용만으로 최종 전달 성공까지 보장하지는 않음 |
| Bypass | 특정 검사나 처리 경로를 우회. 무엇을 우회했는지 함께 명시해야 함 |

Display filter로 패킷을 숨기는 것은 화면의 선택이며 네트워크의 Drop이 아니다. Capture filter로 수집 대상에서 빼는 것도 원래 통신을 차단하는 것과 다르다.

## 캡처 필터와 디스플레이 필터

| 구분 | 적용 대상 | 예시 |
|---|---|---|
| Capture filter | 캡처할 패킷을 미리 제한. 제외된 패킷은 캡처 파일에 저장되지 않음 | `tcp port 80` |
| Display filter | 캡처된 패킷 중 화면에 보이는 대상을 선택. 숨겨도 캡처 데이터는 유지 | `tcp.port == 80` |

두 필터는 문법이 다르다. 헤더 분석에는 필드 비교와 논리 연산으로 충분하며 정규표현식이 필수는 아니다. 문자열 필드의 패턴을 찾을 때 display filter의 `matches` 연산자를 선택적으로 쓴다. 구체적인 필터와 16진수 실습은 [[IPv4-Header-and-Fragmentation#Wireshark로 확인하기|IPv4 패킷 분석]]으로 이어진다.

## 수집 권한과 데이터 취급

진단이나 학습이라는 목적만으로 수집 권한이 생기지는 않는다. 타인의 통신 내용을 다룰 때는 통신비밀보호법 등 관련 법령과 조직의 정책을 확인하며, 수집 대상과 방식에 대한 권한을 먼저 확인한다.

- 실습은 자신의 테스트 트래픽이나 명시적으로 허가된 환경을 대상으로 한다.
- 수집할 인터페이스, 대상과 시간을 필요한 범위로 한정한다.
- 캡처에는 주소, 쿠키, 인증 정보와 본문이 들어갈 수 있다. 공유 전 민감정보를 제거하고 파일 접근 범위와 보관 기간을 정한다.
- 분석을 위해 수집할 권한과 원본 캡처를 다른 사람에게 공유할 권한은 따로 확인한다.

## 확인 포인트

- Npcap/libpcap, dumpcap, dissector가 각각 담당하는 일
- 수동 캡처와 바이패스, 네트워크 Drop과 캡처 누락의 차이
- 관측 인터페이스와 스위치 전달 범위가 결과에 미치는 영향
- 패킷 디코딩, TCP 스트림 재구성과 TLS 복호화의 차이
- 수집 목적과 별개로 확인해야 하는 권한과 캡처 파일의 민감정보

## 출처

- [YouTube, Wireshark 구조와 패킷 분석 강의](https://www.youtube.com/watch?v=5Dku-vX3w-c) — 사용자 제공 학습 메모를 바탕으로 정리. 영상 자막은 직접 대조하지 못했으며, 기술 설명은 공식 자료로 보완했다.
- [Npcap, Npcap Users' Guide](https://npcap.com/guide/) — 드라이버와 라이브러리, WinPcap과의 관계
- [Wireshark, How Wireshark Captures Packets](https://www.wireshark.org/docs/wsdg_html_chunked/ChWorksCapturePackets) — dumpcap과 권한 분리
- [Wireshark, libpcap or Npcap](https://www.wireshark.org/docs/wsdg_html_chunked/ChLibsPcap.html) — 운영체제별 캡처 기반
- [Wireshark, User's Guide](https://www.wireshark.org/docs/wsug_html/) — 수집 범위, 필터, 캡처 버퍼와 화면 구성
- [Wireshark, Ethernet Capture Setup](https://wiki.wireshark.org/CaptureSetup/Ethernet) — 스위치 환경과 promiscuous mode의 한계
- [Wireshark, Packet Reassembly](https://www.wireshark.org/docs/wsug_html_chunked/ChAdvReassemblySection.html) — TCP 스트림과 상위 프로토콜 재조립
- [Wireshark, Following Protocol Streams](https://www.wireshark.org/docs/wsug_html_chunked/ChAdvFollowStreamSection.html) — Follow 기능과 TLS 키 조건
- [Cisco, Security Manager 4.24 User Guide: Managing IPS Device Interface](https://www.cisco.com/c/en/us/td/docs/security/security_management/cisco_security_manager/security_manager/424/User/csm-user-guide-424/chapter37-managing-ips-device-interface.html) — 인라인 IPS 바이패스의 의미

## 관련 문서

- [[Inline-and-Out-of-Path]] — 직접 제어와 사본 관찰, 포트 미러링의 한계
- [[IPv4-Header-and-Fragmentation]] — 헤더 필드, TTL, 단편화와 Wireshark 실습
- [[Transport-Layer]] — 소켓, 바이트 스트림과 캡슐화
- [[Physical-DataLink-Layer]] — 프레임, MAC과 스위치의 전달 범위
- [[HTTPS-TLS]] — 암호화된 전송과 TLS 종료 지점
- [[네트워크(Network)]] — 네트워크 문서 지도
