---
tags: [web, network, packet-capture, wireshark, tcpdump, libpcap, npcap, troubleshooting, security]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["Packet Capture and Wireshark", "패킷 캡처와 Wireshark", "Wireshark", "와이어샤크", "tcpdump", "libpcap", "Npcap", "Promiscuous Mode", "포트 미러링", "패킷 스니핑"]
verified_at: 2026-09-15
---

# 패킷 캡처와 Wireshark: 센서, 분석기, 캡처 위치와 법적 범위

패킷 캡처는 NIC를 지나는 프레임을 복제해 기록하는 일이다. Wireshark는 프레임을 복제하는 캡처 라이브러리(센서)와 복제된 바이트를 계층별 규칙으로 해석하는 분석기(analyzer)를 합친 도구다. 헤더를 읽는 법과 필터 문법은 [[IPv4-Header#캡처로 헤더 읽기|IPv4 헤더 구조와 패킷 읽기]], 캡처 단위가 프레임인 이유는 [[Network-Encapsulation]].

한 줄 요약: **센서는 흐름을 바꾸지 않고 복제만 하고, 분석기는 계층별 규칙을 대입해 바이트를 의미로 바꾼다. 무엇을 볼 수 있는지는 캡처 위치가, 무엇을 봐도 되는지는 법과 허가가 정한다.**

## 구조: 센서와 분석기

| 구성 요소 | 역할 | 구현 |
|---|---|---|
| 캡처 라이브러리(센서) | NIC 드라이버와 프로토콜 스택 사이에서 프레임을 복제해 유저 공간으로 넘기고 캡처 필터를 적용 | Unix 계열 libpcap, Windows Npcap(WinPcap 후속) |
| 캡처 엔진 | 캡처 라이브러리를 호출해 파일이나 파이프로 기록. 권한 상승이 필요한 유일한 부분 | dumpcap |
| 분석 엔진(analyzer) | 프레임을 계층별 dissector로 해석해 프로토콜 트리로 표시 | Epan (Wireshark GUI와 TShark가 공유) |

- **센서의 본질은 bypass다.** 원래 프레임은 그대로 프로토콜 스택으로 흘러가고 사본만 분석기로 간다. 캡처는 통신을 차단하거나 변형하지 않는 관찰이다. 다만 트래픽이 많으면 복제와 기록에 CPU와 디스크가 들고, 캡처 엔진이 따라가지 못하면 캡처 통계에 dropped로 표시된다.
- **캡처 필터는 센서 단계에서 적용된다.** BPF 문법의 조건에 맞지 않는 패킷은 기록 전에 버려지므로 트래픽이 많을 때 캡처 필터로 먼저 줄인다. 디스플레이 필터는 기록이 끝난 뒤 화면에서 거른다.
- **분석기는 헤더의 다음 프로토콜 표시를 따라간다.** EtherType으로 IP dissector를, IP의 Protocol로 TCP dissector를, 포트로 HTTP dissector를 고른다. 표준 포트가 아닌 서비스는 Decode As로 dissector를 지정한다.
- **권한은 캡처 엔진에만 준다.** Wireshark GUI 자체는 일반 권한으로 돌고 dumpcap만 캡처 권한을 갖는다. 해석기의 버그가 있어도 권한 상승된 코드의 범위를 줄이는 구조다.
- Npcap은 캡처뿐 아니라 패킷 주입도 지원하고 loopback 캡처도 제공한다. 이전 WinPcap용 프로그램을 위한 호환 모드도 있다.

## 무엇이 보이는가: 캡처 위치

캡처 도구를 켰다고 네트워크의 모든 트래픽이 보이는 것은 아니다. NIC와 스위치가 각각 한 번씩 거른다.

- **기본 모드**: NIC는 자기 MAC 앞으로 온 유니캐스트와 브로드캐스트, 멀티캐스트만 스택으로 올린다. 자기 호스트가 주고받는 트래픽만 보인다.
- **promiscuous 모드**: NIC의 MAC 필터를 끄고 도착한 모든 프레임을 올린다. 그러나 스위치는 목적지 MAC이 있는 포트로만 유니캐스트를 보내므로, 스위치 환경에서는 promiscuous 모드로도 다른 호스트의 유니캐스트가 내 포트에 오지 않는다. [[Physical-DataLink-Layer#스위치|스위치의 MAC 기반 전달]]

다른 호스트의 트래픽을 봐야 하면 캡처 지점을 옮긴다. 아래 방법은 모두 사본을 보는 아웃오브패스 배치이며, 경로 위에 장비를 두는 인라인 배치와의 비교는 [[Inline-vs-Out-of-Path|인라인과 아웃오브패스 배치]].

| 방법 | 원리 | 특징 |
|---|---|---|
| 포트 미러링(SPAN) | 스위치가 감시 대상 포트의 트래픽을 미러 포트로 복제 | 스위치 설정만으로 가능, 스위치 부하와 미러 포트 대역폭 한계 |
| 네트워크 TAP | 회선 사이에 끼우는 수동 장비가 양방향을 복제 | 트래픽에 영향 없음, 전이중 양방향 모두 확보 |
| 허브 | 모든 포트로 복제하는 구형 장비를 회선에 삽입 | 반이중으로 떨어지고 충돌 도메인이 생김 |
| 대상 호스트에서 캡처 | 그 호스트의 NIC에서 직접 tcpdump | 가장 흔한 실무 방식, 그 호스트 트래픽만 보임 |

클라우드에서는 물리 포트가 없으므로 VPC 수준의 트래픽 미러링 기능을 쓴다. loopback 트래픽은 Linux와 macOS에서 `lo` 인터페이스를 캡처하면 되고 Windows는 Npcap이 loopback 캡처를 지원한다. [[Loopback-And-Localhost|loopback 인터페이스]]

## 방향과 처리 용어

| 용어 | 뜻 |
|---|---|
| inbound | 기준점 밖에서 안으로 들어오는 트래픽 |
| outbound | 기준점 안에서 밖으로 나가는 트래픽 |
| drop | 필터나 정책에 걸려 버려짐. 캡처 필터의 drop은 기록만 안 하고, 방화벽의 drop은 전달 자체를 막는다 |
| bypass, allow | 검사 지점을 통과. 센서의 bypass는 복제 뒤 원본이 그대로 지나가는 것, 방화벽에서는 정책이 통과시킨 것 |
| stream, conversation | TCP 연결 하나의 양방향 바이트 흐름. Wireshark는 연결마다 stream 번호를 붙이고 Follow TCP Stream으로 재조립한 대화를 방향별 색으로 보여 준다 |

inbound와 outbound는 기준점이 호스트인지, 서브넷인지, 방화벽인지에 따라 뒤집힌다. 같은 패킷이 서버 기준으로는 inbound, 클라이언트 기준으로는 outbound다. 방향을 말할 때는 기준점을 먼저 정한다. 경계 장비의 배치는 [[Network-Perimeter-Security|네트워크 경계 보안]].

## 암호화된 트래픽

TLS로 보호된 payload는 캡처해도 읽을 수 없다. IP와 TCP 헤더, TLS handshake의 일부 메타데이터만 보인다. 복호화가 필요하면 두 방법이 있다.

- **키 로그 파일**: 애플리케이션이 `SSLKEYLOGFILE` 환경 변수가 가리키는 파일에 세션 비밀을 기록하고, Wireshark에 그 파일을 지정한다. Firefox, Chrome, curl과 OpenSSL 3.4 이상 기반 프로그램이 지원하며 Diffie-Hellman 키 교환이어도 동작한다.
- **서버 RSA 개인키**: 키 교환이 RSA인 TLS 1.2 이하에서만 동작한다. (EC)DHE 스위트와 TLS 1.3에서는 세션 키가 개인키로 복원되지 않아 쓸 수 없다. 현대 트래픽에는 사실상 키 로그 방식만 남는다.

키 로그는 세션 비밀 그 자체라 프로덕션에서 켜면 유출 경로가 된다. 개발과 테스트 환경에서만 쓰고 파일을 남기지 않는다. [[HTTPS-TLS|TLS handshake와 forward secrecy]]

## 캡처 운영 체크포인트

- 목적과 범위를 먼저 정한다. 어느 호스트, 어느 포트, 얼마나 오래 캡처할지 정하고 그 범위만 캡처 필터로 수집한다.
- 장시간 캡처는 ring buffer로 파일 수와 크기를 제한한다. 트래픽이 많으면 dropped 수치를 확인해 캡처가 완전한지 판단한다.
- 서버에서 tcpdump로 pcap을 남기고 로컬 Wireshark로 여는 흐름이 실무 기본이다.

```bash
tcpdump -i eth0 -n -w capture.pcap 'host 10.0.0.5 and port 443'
```

- 송신 호스트에서 캡처하면 NIC offload 때문에 체크섬과 세그먼트 크기가 실제 회선과 다르게 보일 수 있다. [[Network-Encapsulation#커널 안의 송신 경로|offload와 캡처 해석]]
- 캡처 파일에는 자격 증명, 세션 토큰, 개인정보가 그대로 들어간다. 공유 전에 마스킹하고 보관 기간과 접근 권한을 정한다.

## 법과 윤리

캡처 도구와 도청 도구는 같은 도구다. 차이는 누구의 트래픽을 어떤 권한으로 보느냐에 있다.

- 허용 범위는 자기 호스트, 자기가 운영하는 시스템과 네트워크, 소유자의 명시적 허가를 받은 범위다.
- 타인 간 통신을 동의 없이 수집하고 해석하는 행위는 한국의 통신비밀보호법을 비롯한 각국 감청 관련 법의 처벌 대상이 될 수 있다. 공용 Wi-Fi에서 promiscuous 모드로 캡처하는 것이 대표적인 위험 사례다.
- 회사 네트워크라도 개인의 통신 내용을 보는 캡처는 보안 정책, 고지와 승인 절차를 따른다. 장애 분석이 목적이면 헤더 수준 캡처와 필터로 범위를 좁힌다.
- 캡처를 열기 전에 자문한다. 이 데이터는 적법한 경로와 권한으로 수집됐는가.

## 면접 체크포인트

- Wireshark를 이루는 캡처 라이브러리, dumpcap, dissector의 역할과 권한을 분리하는 이유
- 캡처 필터와 디스플레이 필터가 적용되는 단계의 차이
- promiscuous 모드로도 스위치 환경에서 다른 호스트 트래픽이 안 보이는 이유와 SPAN, TAP의 차이
- inbound와 outbound가 기준점에 상대적이라는 점, drop과 bypass의 층위 구분
- TLS 복호화의 두 방법과 RSA 개인키 방식이 forward secrecy 환경에서 실패하는 이유
- 캡처의 법적 허용 범위와 캡처 파일의 민감정보 취급

## 출처

- [Wireshark의 내부구조와 작동원리 — 널널한 개발자 TV](https://www.youtube.com/watch?v=5Dku-vX3w-c&list=PLXvgR_grOs1BFH-TuqFsfHqbh-gpMbFoy&index=17)
- [Wireshark, Developer's Guide: Overview](https://www.wireshark.org/docs/wsdg_html_chunked/ChWorksOverview.html)
- [Wireshark, User's Guide: Prerequisites](https://www.wireshark.org/docs/wsug_html_chunked/ChCapPrerequisitesSection.html)
- [Wireshark, User's Guide: Following Protocol Streams](https://www.wireshark.org/docs/wsug_html_chunked/ChAdvFollowStreamSection.html)
- [Wireshark, Wiki: CaptureSetup/Ethernet](https://wiki.wireshark.org/CaptureSetup/Ethernet)
- [Wireshark, Wiki: TLS](https://wiki.wireshark.org/TLS)
- [Npcap, User's Guide](https://npcap.com/guide/npcap-users-guide.html)

## 관련 문서

- [[IPv4-Header|IPv4 헤더 구조와 패킷 읽기 (16진수 덤프, 캡처 필터와 디스플레이 필터)]]
- [[Network-Encapsulation|캡슐화와 데이터 단위 (프레임, 커널 송신 경로, offload)]]
- [[Physical-DataLink-Layer|L1/L2 물리와 데이터링크 (스위치, promiscuous의 한계)]]
- [[HTTPS-TLS|HTTPS와 TLS Handshake]]
- [[Loopback-And-Localhost|Loopback 인터페이스 캡처]]
- [[Network-Perimeter-Security|네트워크 경계 보안 (inbound/outbound 기준점)]]
- [[Inline-vs-Out-of-Path|인라인과 아웃오브패스 배치 (SPAN/TAP의 한계, IDS와 IPS)]]
- [[Network-Traffic-Monitoring|네트워크 트래픽 모니터링 (흐름 단위 관측)]]
- [[네트워크(Network)|네트워크 인덱스]]
