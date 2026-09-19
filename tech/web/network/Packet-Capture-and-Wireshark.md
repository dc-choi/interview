---
tags: [web, network, packet-capture, wireshark, tcpdump, libpcap, npcap, troubleshooting, security]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["Packet Capture and Wireshark", "패킷 캡처와 Wireshark", "Wireshark", "와이어샤크", "Wireshark 구조와 패킷 분석", "패킷 수집기와 분석기", "tcpdump", "libpcap", "Npcap", "Promiscuous Mode", "포트 미러링", "패킷 스니핑"]
verified_at: 2026-09-16
---

# 패킷 캡처와 Wireshark: 센서, 분석기, 캡처 위치와 법적 범위

패킷 캡처는 NIC를 지나는 프레임을 복제해 기록하는 일이다. Wireshark는 프레임을 복제하는 캡처 라이브러리(센서)와 복제된 바이트를 계층별 규칙으로 해석하는 분석기(analyzer)를 합친 도구다. 헤더를 읽는 법은 [[IPv4-Header#캡처로 헤더 읽기|IPv4 헤더 구조와 패킷 읽기]], 캡처 단위가 프레임인 이유는 [[Network-Encapsulation]].

한 줄 요약: **센서는 흐름을 바꾸지 않고 사본만 관찰하고 분석기는 계층별 규칙을 대입해 바이트를 의미로 바꾼다. 무엇을 볼 수 있는지는 캡처 위치가, 무엇을 봐도 되는지는 법과 허가가 정한다.**

## 구조: 센서와 분석기

| 구성 요소 | 역할 | 구현 |
|---|---|---|
| 캡처 라이브러리(센서) | NIC 드라이버와 프로토콜 스택 사이에서 프레임을 복제해 유저 공간으로 넘기고 캡처 필터를 적용 | Unix 계열 libpcap, Windows Npcap(Windows 커널의 네트워킹 부분에 설치되는 장치 드라이버와 DLL 몇 개로 구성) |
| 캡처 엔진 | 캡처 라이브러리를 호출해 파일이나 파이프로 기록. 권한 상승이 필요한 유일한 부분 | dumpcap |
| 분석 엔진(analyzer) | 프레임을 계층별 dissector로 해석해 프로토콜 트리로 표시 | Epan (Wireshark GUI와 TShark가 공유) |

- **센서는 사본을 관찰할 뿐 흐름을 바꾸지 않는다.** 원래 프레임은 그대로 프로토콜 스택으로 흘러가고 사본만 분석기로 간다. `인터페이스 → dumpcap → 캡처 파일 → 분석기`라는 화살표는 관측 데이터의 흐름이지, 실제 통신이 분석기를 거쳐야 한다는 뜻이 아니다. 강의는 이 성질을 바이패스라고 부르지만, 벤더 용어의 bypass는 검사 경로를 건너뛰어 트래픽을 그대로 통과시키는 제어 개념이라 수집과 제어가 섞인다. 이 문서는 센서를 복제(사본) 관찰로 쓰고 bypass는 [[#방향과 처리 용어]]의 뜻으로만 쓴다.
- **수동 관찰에도 비용은 있다.** 복제, 버퍼링, 기록과 해석에 CPU, 메모리와 디스크가 들고, 이름 해석 설정에 따라 DNS 조회 트래픽이 추가로 생길 수 있다. 캡처 엔진이 따라가지 못하면 캡처 통계에 dropped로 표시된다.
- **캡처 필터는 센서 단계에서 적용된다.** 조건에 맞지 않는 패킷은 기록 전에 버려지므로 트래픽이 많을 때 캡처 필터로 먼저 줄인다. 디스플레이 필터는 기록이 끝난 뒤 화면에서 거른다. 문법 차이는 [[#캡처 필터와 디스플레이 필터]].
- **분석기는 헤더의 다음 프로토콜 표시를 따라간다.** EtherType으로 IP dissector를, IP의 Protocol로 TCP dissector를, 포트로 HTTP dissector를 고른다. 표준 포트가 아닌 서비스는 Decode As로 dissector를 지정한다. 첫 dissector는 캡처 파일의 링크 유형이 정하므로 모든 캡처가 이더넷에서 시작하지는 않는다.
- **디코딩과 복호화는 다르다.** 디코딩은 바이트 구조를 필드로 해석하는 일이고 복호화는 암호문을 평문으로 되돌리는 일이다. TLS 트래픽을 캡처하거나 TCP 스트림을 모았다는 이유만으로 본문이 평문으로 보이지는 않는다. [[#암호화된 트래픽]]
- **권한은 캡처 엔진에만 준다.** 원시 인터페이스 접근에 필요한 권한은 dumpcap으로 분리하고 Wireshark GUI와 dissector는 일반 권한으로 돈다. 해석기에 버그가 있어도 권한 상승된 코드의 범위를 줄이는 구조다. 저장된 pcap/pcapng 파일을 여는 분석에는 캡처 권한이 필요 없다.
- Npcap 문서는 자신을 소프트웨어 라이브러리와 네트워크 드라이버로 이루어진 패킷 캡처 아키텍처로 소개하고, raw 패킷 캡처와 전송, loopback 캡처와 주입을 기능으로 든다. 설치 시 WinPcap API 호환 모드를 고르면 기존 WinPcap용 프로그램도 그대로 쓸 수 있고, 문서는 Npcap을 대부분의 애플리케이션에서 WinPcap을 대신할 수 있는 최신 구현으로 설명한다.
- WinPcap 쪽은 2018년 9월 15일 공지에서 4.1.3이 여전히 내려받을 수 있지만 오랫동안 업그레이드가 없었고 갱신 계획도 없으며 Riverbed의 기술 지원과 버그 접수도 더는 제공되지 않는다고 밝히면서 Npcap을 대체재로 안내했다 (winpcap.org 공지, 2018-09-15 기준).

| 화면 | 확인하는 내용 |
|---|---|
| Packet List | 캡처된 패킷의 시간, 주소, 프로토콜과 요약 |
| Packet Details | Ethernet, IP, TCP와 응용 프로토콜의 계층별 필드 |
| Packet Bytes | 선택한 데이터의 실제 바이트를 16진수로 표시 |

## 캡처 필터와 디스플레이 필터

| 구분 | 적용 단계 | 예시 |
|---|---|---|
| 캡처 필터 | 센서 단계, BPF 문법. 제외된 패킷은 캡처 파일에 기록되지 않음 | `tcp port 80`, `host 10.0.0.5 and port 443` |
| 디스플레이 필터 | 기록 뒤 화면 단계, 필드 비교 문법. 숨겨도 캡처 데이터는 유지 | `tcp.port == 80`, `ip.addr == 10.0.0.5 && tcp.flags.syn == 1` |

- 두 필터는 문법이 다르다. 헤더 분석에는 필드 비교와 논리 연산으로 충분하고 정규표현식이 필수는 아니다. 문자열 필드의 패턴을 찾을 때만 디스플레이 필터의 `matches` 연산자를 선택적으로 쓴다.
- 디스플레이 필터로 숨기는 것은 화면의 선택이지 네트워크의 drop이 아니고, 캡처 필터로 수집에서 빼는 것도 통신을 차단하는 것이 아니다.
- 16진수 덤프와 헤더 읽기 실습은 [[IPv4-Header#캡처로 헤더 읽기|IPv4 헤더 구조와 패킷 읽기]].

## 무엇이 보이는가: 캡처 위치

캡처 도구를 켰다고 네트워크의 모든 트래픽이 보이는 것은 아니다. NIC와 스위치가 각각 한 번씩 거른다.

- **기본 모드**: NIC는 자기 MAC 앞으로 온 유니캐스트와 브로드캐스트, 멀티캐스트만 스택으로 올린다. 자기 호스트가 주고받는 트래픽만 보인다.
- **promiscuous 모드**: NIC의 MAC 필터를 끄고 도착한 모든 프레임을 올린다. 그러나 스위치는 목적지 MAC이 있는 포트로만 유니캐스트를 보내므로, 스위치 환경에서는 promiscuous 모드로도 다른 호스트의 유니캐스트가 내 포트에 오지 않는다. [[Physical-DataLink-Layer#스위치|스위치의 MAC 기반 전달]]

다른 호스트의 트래픽을 봐야 하면 캡처 지점을 옮긴다. 아래 방법은 모두 사본을 보는 아웃오브패스 배치이며 경로 위에 장비를 두는 인라인 배치와의 비교는 [[Inline-vs-Out-of-Path|인라인과 아웃오브패스 배치]].

| 방법 | 원리 | 특징 |
|---|---|---|
| 포트 미러링(SPAN) | 스위치가 감시 대상 포트의 트래픽을 미러 포트로 복제 | 스위치 설정만으로 가능, 스위치 부하와 미러 포트 대역폭 한계로 고부하에서 캡처 유실 |
| 네트워크 TAP | 회선 사이에 끼우는 전용 장비가 양방향을 복제 | Wireshark 위키는 전이중 트래픽을 모두 캡처하면서 이더넷 트래픽에는 영향을 주지 않는다고 설명한다. 브레이크아웃 TAP은 양방향이 각각 별도 출력으로 나오므로 둘 다 캡처해야 하고, 집선(aggregation) TAP은 한 출력으로 합쳐 주되 합친 트래픽이 모니터 포트를 초과하지 않는 동안에만 전부를 내보낸다 |
| 허브 | 모든 포트로 복제하는 구형 장비를 회선에 삽입 | 반이중으로 떨어지고 충돌 도메인이 생김 |
| 대상 호스트에서 캡처 | 그 호스트의 NIC에서 직접 tcpdump | 가장 흔한 실무 방식, 그 호스트 트래픽만 보임 |

클라우드에서는 물리 포트가 없으므로 VPC 수준의 트래픽 미러링 기능을 쓴다. loopback 트래픽은 Linux와 macOS에서 `lo` 인터페이스를 캡처하면 되고 Windows는 Npcap이 loopback 캡처를 지원한다. [[Loopback-And-Localhost|loopback 인터페이스]]

### 캡처에서 빠지는 것

- 인터페이스 선택: 유선, Wi-Fi, VPN, loopback 중 어느 지점을 보는지에 따라 보이는 데이터가 달라진다.
- 필터와 길이 제한: 캡처 필터에서 제외되거나 snaplen(패킷별 최대 캡처 길이) 뒤로 잘린 데이터는 파일에 없다.
- 처리 용량: 캡처 버퍼가 넘치면 수집 과정에서 사본이 누락된다. 캡처 누락(dropped)과 실제 네트워크의 패킷 유실은 구분한다.
- 오프로딩: NIC와 커널의 처리 시점 때문에 캡처가 회선 위의 프레임 형태와 다르게 보일 수 있다.

따라서 캡처 파일에 패킷이 없다는 사실만으로 상대가 보내지 않았거나 방화벽이 버렸다고 단정하지 않는다.

## 방향과 처리 용어

| 용어 | 뜻 |
|---|---|
| inbound | 기준점 밖에서 안으로 들어오는 트래픽 |
| outbound | 기준점 안에서 밖으로 나가는 트래픽 |
| drop | 패킷을 버림. 정책 차단 외에 큐 부족 같은 자원 고갈도 원인이 된다. 캡처 필터의 제외는 기록만 안 하는 것이고 방화벽의 drop은 전달 자체를 막는다 |
| forward, allow | 다음 구간으로 전달, 정책상 통과를 허용. 허용이 종단 간 전달 성공까지 보장하지는 않는다 |
| bypass | 특정 검사나 처리 경로를 건너뛰어 트래픽을 그대로 통과시킴. 소프트웨어 bypass와 하드웨어 bypass는 적용 범위가 다르다. 무엇을 우회했는지 함께 말한다 |
| stream, conversation | TCP 연결 하나의 양방향 바이트 흐름. Wireshark는 연결마다 stream 번호를 붙이고 Follow TCP Stream으로 재조립한 대화를 방향별 색으로 보여 준다 |

bypass는 구현 층위를 함께 봐야 한다. Cisco IPS의 inline bypass는 소프트웨어로 구현돼 운영체제가 돌고 있을 때만 동작하고 모드를 Off, On, Auto로 두며, Auto는 센서의 감시 프로세스가 내려간 동안만 분석 엔진을 건너뛴다. 전원 차단처럼 소프트웨어가 살아 있지 않은 상황까지 흘려보내려면 Firepower의 FTW 네트워크 모듈 같은 하드웨어 bypass가 따로 필요하며, Cisco 문서는 Snort Fail Open을 부르는 소프트웨어 장애가 하드웨어 bypass를 부르지는 않는다고 구분한다. 배치 관점의 비교는 [[Inline-vs-Out-of-Path|인라인과 아웃오브패스 배치]].

inbound와 outbound는 기준점이 호스트인지, 서브넷인지, 방화벽인지에 따라 뒤집힌다. 같은 패킷이 서버 기준으로는 inbound, 클라이언트 기준으로는 outbound다. 방향을 말할 때는 기준점을 먼저 정한다. 경계 장비의 배치는 [[Network-Perimeter-Security|네트워크 경계 보안]].

- TCP는 순서 있는 바이트 스트림을 제공할 뿐 메시지 경계를 보존하지 않는다. 한 응용 메시지가 여러 세그먼트에 걸칠 수도 있고 한 세그먼트에 여러 메시지의 데이터가 담길 수도 있다. [[Network-Encapsulation#소켓과 스트림: 유저 모드의 출발점|소켓과 바이트 스트림]]
- 패킷별 헤더를 보는 것과 그 패킷들이 나른 바이트 흐름을 보는 것은 다른 관찰이다. 캡처 중간에 시작했거나 세그먼트를 놓쳤으면 Wireshark는 순서 뒤바뀜과 캡처 유실을 구분하지 못해 재조립이 실패할 수 있다.
- TCP 바이트를 모으는 일과 HTTP 같은 상위 프로토콜의 메시지 경계를 해석하는 일은 별개다. Follow는 UDP, QUIC, HTTP/2 등에도 있지만 UI가 흐름을 모아 보여 준다고 UDP가 연결 지향 바이트 스트림이 되는 것은 아니다.

## 암호화된 트래픽

TLS로 보호된 payload는 세션 비밀이나 서버 개인키 같은 키 자료 없이는 캡처해도 읽을 수 없다. 내용 대신 IP와 TCP 헤더, TLS handshake의 일부 메타데이터, 패킷 길이와 타이밍이 보이며, 이 관측값만으로도 트래픽 종류를 어느 정도 추정할 수 있다. [[Network-Encapsulation#DPI(Deep Packet Inspection): 내용물까지 검사|암호화 트래픽의 관측 한계]] 복호화가 필요하면 두 방법이 있다.

- **키 로그 파일**: 애플리케이션이 `SSLKEYLOGFILE` 환경 변수가 가리키는 파일에 세션 비밀을 기록하고, Wireshark에 그 파일을 지정한다. Firefox, Chrome, curl이 지원하고, OpenSSL은 3.5.0부터 `enable-sslkeylog` 빌드 옵션을 켠 경우에만 이 환경 변수를 직접 읽는다 (OpenSSL CHANGES.md 3.5.0 항목 기준, 배포판 빌드마다 옵션 여부가 다를 수 있다). Diffie-Hellman 키 교환이어도 동작한다.
- **서버 RSA 개인키**: Wireshark 위키는 서버가 고른 스위트가 (EC)DHE를 쓰지 않고, 세션이 재개된 연결이 아니며, 핸드셰이크의 ClientKeyExchange 메시지가 캡처에 들어 있을 때만 이 방식이 동작하고 TLS 1.3에서는 동작하지 않는다고 정리한다. 그래서 (EC)DHE 스위트나 TLS 1.3을 쓰는 연결에는 키 로그 방식만 남는다.

키 로그는 세션 비밀 그 자체라 프로덕션에서 켜면 유출 경로가 된다. 개발과 테스트 환경에서만 쓰고 파일을 남기지 않는다. [[HTTPS-TLS|TLS handshake와 forward secrecy]]

## 캡처 운영 체크포인트

- 목적과 범위를 먼저 정한다. 어느 호스트, 어느 포트, 얼마나 오래 캡처할지 정하고 그 범위만 캡처 필터로 수집한다.
- 장시간 캡처는 ring buffer로 파일 수와 크기를 제한한다. 트래픽이 많으면 dropped 수치를 확인해 캡처가 완전한지 판단하고 본문까지 필요하면 snaplen이 패킷을 자르지 않는지 본다.
- 서버에서 tcpdump로 pcap을 남기고 로컬 Wireshark로 여는 흐름이 실무 기본이다.

```bash
tcpdump -i eth0 -n -w capture.pcap 'host 10.0.0.5 and port 443'
```

- 송신 호스트에서 캡처하면 NIC offload 때문에 체크섬과 세그먼트 크기가 실제 회선과 다르게 보일 수 있다. [[Network-Encapsulation#커널 안의 송수신 경로|offload와 캡처 해석]]
- 캡처 파일에는 자격 증명, 세션 토큰, 개인정보가 그대로 들어간다. 공유 전에 마스킹하고 보관 기간과 접근 권한을 정한다. 수집할 권한과 원본 캡처를 다른 사람에게 공유할 권한은 따로 확인한다.

## 법과 윤리

캡처 도구와 도청 도구는 같은 도구다. 차이는 누구의 트래픽을 어떤 권한으로 보느냐에 있다. 진단이나 학습이라는 목적만으로 수집 권한이 생기지는 않는다.

- 허용 범위는 자기 호스트, 자기가 운영하는 시스템과 네트워크, 소유자의 명시적 허가를 받은 범위다.
- 타인 간 통신을 동의 없이 수집하고 해석하는 행위는 한국의 통신비밀보호법을 비롯한 각국 감청 관련 법의 처벌 대상이 될 수 있다. 공용 Wi-Fi에서 promiscuous 모드로 캡처하는 것이 대표적인 위험 사례다.
- 회사 네트워크라도 개인의 통신 내용을 보는 캡처는 보안 정책, 고지와 승인 절차를 따른다. 장애 분석이 목적이면 헤더 수준 캡처와 필터로 범위를 좁힌다.
- 캡처를 열기 전에 자문한다. 이 데이터는 적법한 경로와 권한으로 수집됐는가.

## 면접 체크포인트

- Wireshark를 이루는 캡처 라이브러리, dumpcap, dissector의 역할과 권한을 분리하는 이유
- 캡처 필터와 디스플레이 필터가 적용되는 단계와 문법의 차이, 필터로 숨긴 것이 네트워크 drop이 아닌 이유
- promiscuous 모드로도 스위치 환경에서 다른 호스트 트래픽이 안 보이는 이유와 SPAN, TAP의 차이
- 캡처 누락(dropped)과 실제 패킷 유실을 구분해야 하는 이유
- inbound와 outbound가 기준점에 상대적이라는 점, drop과 bypass의 층위 구분, 센서의 사본 관찰과 bypass의 차이
- 패킷 디코딩, TCP 스트림 재조립과 TLS 복호화의 차이
- TLS 복호화의 두 방법과 RSA 개인키 방식이 forward secrecy 환경에서 실패하는 이유
- 캡처의 법적 허용 범위, 수집 권한과 공유 권한의 구분, 캡처 파일의 민감정보 취급

## 출처

- [Wireshark의 내부구조와 작동원리 — 널널한 개발자 TV](https://www.youtube.com/watch?v=5Dku-vX3w-c&list=PLXvgR_grOs1BFH-TuqFsfHqbh-gpMbFoy&index=17)
- [Wireshark, Developer's Guide: Overview](https://www.wireshark.org/docs/wsdg_html_chunked/ChWorksOverview.html)
- [Wireshark, Developer's Guide: Capturing packets](https://www.wireshark.org/docs/wsdg_html_chunked/ChWorksCapturePackets.html)
- [Wireshark, Developer's Guide: libpcap or Npcap](https://www.wireshark.org/docs/wsdg_html_chunked/ChLibsPcap.html)
- [Wireshark, User's Guide: Following Protocol Streams](https://www.wireshark.org/docs/wsug_html_chunked/ChAdvFollowStreamSection.html)
- [Wireshark, User's Guide: Packet Reassembly](https://www.wireshark.org/docs/wsug_html_chunked/ChAdvReassemblySection.html)
- [Wireshark, Wiki: CaptureSetup/Ethernet](https://wiki.wireshark.org/CaptureSetup/Ethernet)
- [Wireshark, Wiki: TLS](https://wiki.wireshark.org/TLS)
- [The 101 Series: A Primer On Network TAPs — Garland Technology](https://www.garlandtechnology.com/2014/01/17/a-test-access-point-tap-primer)
- [Npcap, Reference Guide: Introduction](https://npcap.com/guide/)
- [Npcap, User's Guide](https://npcap.com/guide/npcap-users-guide.html)
- [WinPcap News And Releases (15 September 2018) — winpcap.org](https://www.winpcap.org/news.htm)
- [Cisco, Security Manager 4.24 User Guide: Managing IPS Device Interface](https://www.cisco.com/c/en/us/td/docs/security/security_management/cisco_security_manager/security_manager/424/User/csm-user-guide-424/chapter37-managing-ips-device-interface.html)
- [Cisco, Firepower Management Center Configuration Guide 7.0: Inline Sets and Passive Interfaces for Firepower Threat Defense](https://www.cisco.com/c/en/us/td/docs/security/firepower/70/configuration/guide/fpmc-config-guide-v70/inline_sets_and_passive_interfaces_for_firepower_threat_defense.html)
- [OpenSSL CHANGES.md — openssl/openssl](https://github.com/openssl/openssl/blob/master/CHANGES.md)

## 관련 문서

- [[IPv4-Header|IPv4 헤더 구조와 패킷 읽기 (16진수 덤프, 캡처 필터와 디스플레이 필터)]]
- [[Network-Encapsulation|캡슐화와 데이터 단위 (프레임, 커널 송신 경로, offload)]]
- [[Transport-Layer|전송 계층 (소켓, 바이트 스트림, 세그먼트)]]
- [[Physical-DataLink-Layer|L1/L2 물리와 데이터링크 (스위치, promiscuous의 한계)]]
- [[HTTPS-TLS|HTTPS와 TLS Handshake]]
- [[Loopback-And-Localhost|Loopback 인터페이스 캡처]]
- [[Network-Perimeter-Security|네트워크 경계 보안 (inbound/outbound 기준점)]]
- [[Inline-vs-Out-of-Path|인라인과 아웃오브패스 배치 (SPAN/TAP의 한계, IDS와 IPS)]]
- [[Network-Traffic-Monitoring|네트워크 트래픽 모니터링 (흐름 단위 관측)]]
- [[네트워크(Network)|네트워크 인덱스]]
