---
tags: [web, network, troubleshooting, dns, bgp]
status: done
category: "Web - 네트워크"
aliases: ["Network Failure Cases", "네트워크 장애 사례", "사례로 보는 네트워크 기본 원리"]
---

# 네트워크 장애 사례로 보는 기본 원리

> 한 줄 요약: 네트워크 장애를 읽으려면 주소, 포트, 전송 방식(TCP와 UDP)과 이름 해석(DNS)의 네 가지 그림을 먼저 잡는다. 유명한 장애 사례는 이 그림이 실제로 어디에서 깨지는지 보여 준다.

근거 기준: 사례의 사실은 2026-11-17에 당사자와 관측 기관의 기록(RFC, Meta 엔지니어링 글, RIPE NCC 보고서, 당사자 회고)과 보도로 대조했다. Microsoft 글만 같은 날 다시 열지 못했다. 대조하지 못한 항목은 그 자리에 적었다.

## 먼저 잡을 네 가지

| 개념 | 한 문장 | 자세한 문서 |
|---|---|---|
| IP 주소 | 패킷이 도착할 건물의 주소다 | [[Network-Layer\|네트워크 계층]] |
| 포트 | 건물의 어느 창문으로 갈지 정한다. 관례상 443은 HTTPS, 22는 SSH, 445는 Windows 파일 공유(SMB)다 | [[Transport-Layer-Sockets\|소켓과 포트]] |
| TCP와 UDP | TCP는 연결을 맺고 도착을 확인하며 빠진 것을 다시 보낸다. UDP는 확인 없이 보낸다 | [[TCP-Handshake\|TCP 핸드셰이크]], [[Transport-Layer\|전송 계층]] |
| DNS | 이름을 주소로 바꿔 주는 분산 전화번호부다 | [[DNS]] |

포트 번호는 IANA 등록부의 관례이고 설정으로 바꿀 수 있다(22는 ssh, 443은 https, 445는 microsoft-ds로 등록, 2026-11-17 확인). 포트 스캔 결과도 이 그림으로 읽는다. 열린 포트 목록은 그 위치에서 볼 때 어느 포트가 연결을 받는지를 알려 줄 뿐이다. 어떤 서비스인지는 번호의 관례와 응답으로 추정하며, 건물 밖에서 열린 창문을 적은 것이라 침투와는 다른 단계다([[Network-Security-Lab-Interpretation#탐색 결과는 취약점의 단서다|탐색 결과 해석]]).

## 사례와 원리

### 이름 해석은 도달 가능성에 기댄다 (2021년 Meta 장애)

2021-10-04 Meta(당시 사명 Facebook)의 정기 유지보수 중 전 세계 백본 용량을 점검하려던 명령이 백본의 연결을 모두 끊었다. 이런 명령을 걸러 내는 감사 도구가 있었지만 버그로 막지 못했다. 이어서 둘째 문제가 생겼다. DNS 서버는 데이터센터와 통신하지 못하면 자신을 가리키는 BGP 광고를 스스로 내리도록 설계돼 있었고, 백본이 사라지자 DNS 서버들이 광고를 철회했다. 서버는 살아 있었지만 인터넷에서 이름을 찾을 수 없게 됐다. DNS가 통째로 사라지면서 평소 조사와 복구에 쓰던 내부 도구 다수가 동작하지 않았고, 주 접속 경로와 대역 외(out-of-band) 접근도 내려가 엔지니어가 데이터센터에 직접 가야 했다. 물리 보안과 변경 방지 설계 때문에 접근에 시간이 더 걸렸다.

- 증상이 DNS로 보여도 원인은 그 아래 경로일 수 있다. 이름 조회는 [[DNS#트러블슈팅|DNS 트러블슈팅]]의 `dig +trace`와 `nslookup`으로, 주소 도달은 [[WiFi-Generations#연결 구간을 나눠 진단한다|연결 구간 진단]]의 IP 대상 ping과 traceroute로 가른다.
- 복구 수단이 장애가 난 망이나 DNS에 의존하면 함께 사라진다. 대역 외 관리 경로가 운영 망과 DNS에서 실제로 독립적인지 끊어 보고 확인한다.
- 안전장치도 코드다. 위험한 명령을 막는 도구의 실패를 가정한 훈련이 필요하다.

### 경로 광고는 서로를 믿는다 (2008년 YouTube 경로 탈취)

2008-02-24 18:47(UTC) Pakistan Telecom(AS17557)이 YouTube 주소 일부인 `208.65.153.0/24`를 자기 것으로 광고했다. 파키스탄이 YouTube 웹사이트를 차단하려던 조치였는데(RIPE NCC 보고서 기준) 상위 사업자 PCCW Global(AS3491)이 이 광고를 인터넷 전체로 전달했다. YouTube는 `208.65.152.0/22`를 광고하고 있었고 라우터는 더 구체적인 경로를 택하므로 세계 곳곳의 YouTube 트래픽이 파키스탄으로 향했다. YouTube는 약 80분 뒤 같은 /24를 직접 광고했지만, 길이가 같은 두 경로는 AS 경로 길이 같은 정책 규칙으로 갈려 일부 트래픽은 계속 파키스탄으로 갔다. 20:18에 /25 두 개를 광고했고, 이 광고를 받은 라우터는 더 구체적인 경로를 따라 트래픽을 YouTube로 보냈다. 다만 /25는 /24보다 훨씬 덜 퍼졌다(보고서 시점 RIS 피어 기준 /22는 112곳, /24는 105곳, /25는 21곳). 20:51에는 Pakistan Telecom발 광고의 AS 경로가 길어져 YouTube 경로를 택하는 라우터가 늘었고, 21:01에 PCCW Global이 Pakistan Telecom발 광고를 철회하면서 탈취가 끝났다(RIPE NCC의 경로 수집 자료 기준, 주요 사건 전체 약 2시간).

- BGP는 이웃이 알려 준 경로를 기본적으로 믿는다. 더 구체적인 prefix가 이긴다는 규칙은 잘못된 광고의 영향을 키우기도 하고 되찾는 수단이 되기도 한다. 다만 그 효과는 더 구체적인 광고가 퍼진 범위에 그친다.
- 이런 광고의 확산은 각 AS 운영자의 적절한 라우팅 설정으로 막을 수 있다(RIPE NCC 보고서의 결론). 그 수단인 prefix filter, max-prefix와 RPKI 기반 route-origin validation은 [[Routing-Protocols|라우팅 프로토콜]]에 이름이 올라 있다.

### 타임아웃은 거리가 된다 (500마일 이메일)

한 대학 통계학과의 메일 서버가 약 500마일보다 먼 곳으로는 메일을 보내지 못했다. 운영체제 업그레이드 과정에서 Sendmail이 옛 버전으로 내려갔다. 옛 버전은 새 버전용 설정 파일의 규칙 대부분은 읽었지만 긴 이름의 옵션을 알 수 없는 줄로 보고 건너뛰었고, 그 대부분은 컴파일된 기본값도 없어 0이 됐다. 그중 하나가 원격 SMTP 서버 연결 타임아웃이었다. 그 장비에서 0 타임아웃은 약 3밀리초 뒤 연결 시도를 끊었다. 저자가 계산한 3밀리초 동안의 빛의 진공 편도 거리는 약 558마일로, 관측된 한계(500마일 남짓)와 비슷했다(당사자 회고 기준). 다만 연결 수립에는 왕복이 필요하고 광섬유 속 빛은 더 느려서, 3밀리초를 그대로 넣으면 편도 한계는 훨씬 짧다(왕복을 반영하면 진공에서 약 279마일, 굴절률 약 1.5인 광섬유에서 약 186마일, 이 문서의 계산). 저자도 이야기를 일부 각색했다고 밝혔으므로 수치는 측정값보다 원리를 보여 주는 예로 읽는다.

- 말이 안 되는 증상도 먼저 재현한다. 재현되면 증상을 설명하는 물리량이나 설정값이 있다.
- 설정 파일과 실행 바이너리의 버전이 맞는지 확인한다. 인식하지 못해 건너뛴 옵션은 오류 없이 기본값이 되거나, 기본값이 없으면 0이 될 수 있다.
- 타임아웃은 지연 한도이고, 지연에는 전파 시간이 들어 있다.

### 로컬 이름 찾기는 공격 표면이다 (LLMNR과 NetBIOS)

Microsoft Networking Blog의 2022-04 글에 따르면 Windows는 NetBIOS 이름 해석과 LLMNR을 지원해 왔다(앞서 읽은 내용 기준, 2026-11-17 재대조 실패). 같은 글은 두 프로토콜이 거의 쓰이지 않고, 켜 두면 장치의 공격 표면을 불필요하게 넓히고 망 부하를 늘린다며 mDNS로 정리하는 방향을 밝혔다. 같은 망의 누구나 질의에 답할 수 있어 가짜 응답으로 접속을 가로채는 공격에 쓰인다는 설명은 널리 알려져 있으나 이 문서에서는 프로토콜 명세로 대조하지 않았다.

### 논리 계층이 멀쩡하면 물리 계층을 본다

- 웨일스의 Aberhosan 마을은 18개월 동안 매일 오전 7시에 광대역이 끊겼다. 케이블 교체로는 해결되지 않았고, 기술자가 탐지 장비를 들고 마을을 돌아 낡은 TV가 켜질 때 내는 전기 잡음(SHINE, single high-level impulse noise)을 찾아냈다(2020-09 BBC 보도 기준).
- 2011년 3월 조지아에서 75세 여성이 고철용 구리를 캐다가 삽으로 광케이블을 끊은 혐의로 조사받았고, 이웃 나라 아르메니아의 인터넷이 최대 5시간 끊겼다(조지아 내무부 발표를 전한 2011-04-06 Guardian 보도 기준).

같은 시각에 반복되는 장애는 그 시각에 켜지는 것을 찾는다. 인터넷의 90%를 이웃 나라를 지나는 경로에 기대는 구조(Guardian 보도 기준)는 경로 이중화의 문제다. 무선 구간도 공유 매체라서, 한 공간에 AP나 휴대용 핫스팟이 많으면 같은 채널을 두고 경쟁해 느려지고, 암호화하지 않은 통신은 전파가 닿는 범위의 누구나 받아 볼 수 있다([[WiFi-Generations#무선 구간이 하는 일|무선 구간이 하는 일]]).

### 풍자 RFC가 가리키는 것

- RFC 1149(1990-04-01)는 조류(전서구)로 IP 데이터그램을 나르는 방법을 적은 만우절 문서다. 2001-04-28 노르웨이 베르겐의 리눅스 사용자 모임이 실제로 구현해 패킷 9개 중 응답 4개를 받았고 왕복 시간은 약 3,212초에서 6,389초였다(모임이 공개한 ping 기록 기준). RFC는 스스로를 IP 데이터그램의 캡슐화 방법이라 적는다. IP는 아래 계층이 무엇이든 그 위에 얹힌다는 계층 분리의 예로 읽을 수 있다(이 문서의 해석).
- RFC 3514(2003-04-01)는 악의적인 패킷이 헤더의 한 비트를 스스로 켜야 한다는 풍자다. 공격자의 자기 신고에 기대는 보안은 성립하지 않는다는 점을 거꾸로 보여 준다.

## 학습 순서에 대한 제안

계층 이름을 외우는 것과 도구의 출력이 무엇을 뜻하는지 말할 수 있는 것은 다르다. OSI 모델과 실제 인터넷의 관계는 [[OSI-7-Layer#왜 OSI가 아니라 TCP/IP인가|왜 OSI가 아니라 TCP/IP인가]]에 있다. 위 네 가지 그림을 잡은 뒤 Wireshark로 자기 컴퓨터의 트래픽을 10분쯤 지켜보면 주소, 포트, 핸드셰이크와 DNS 질의가 실제로 보인다. 암호화 DNS를 쓰는 브라우저의 질의는 평문 DNS로 보이지 않는다. 캡처 방법은 [[Packet-Capture-and-Wireshark|패킷 캡처와 Wireshark]], 실습 순서는 [[Network-Lab-Practice|네트워크 실습]]에 있다.

## 점검 질문

- 이름 조회 실패와 주소 도달 실패를 각각 어떤 명령으로 가르는가.
- 복구에 쓰는 도구와 접근 경로가 장애가 난 망과 독립적인가.
- 잘못된 경로 광고를 받았을 때 우리 망은 무엇으로 거르는가.
- 타임아웃 값의 출처가 설정 파일인가 기본값인가, 그 값은 가장 먼 상대까지의 지연을 넘는가.
- 논리 계층 진단이 모두 정상일 때 볼 물리 계층 항목(전원, 간섭, 단일 케이블 경로)을 적어 두었는가.

## 출처

- [More details about the October 4 outage — Engineering at Meta](https://engineering.fb.com/2021/10/05/networking-traffic/outage-details/)
- [YouTube Hijacking: A RIPE NCC RIS case study — RIPE NCC](https://www.ripe.net/about-us/news/youtube-hijacking-a-ripe-ncc-ris-case-study/)
- [The case of the 500-mile email — Trey Harris](https://www.ibiblio.org/harris/500milemail.html)
- [Aligning on mDNS: ramping down NetBIOS name resolution and LLMNR — Microsoft Networking Blog](https://techcommunity.microsoft.com/blog/networkingblog/aligning-on-mdns-ramping-down-netbios-name-resolution-and-llmnr/3290816) — 2022-04 글(2026-11-17 재대조 못 함)
- [Internet: Old TV caused village broadband outages for 18 months — BBC News](https://www.bbc.com/news/uk-wales-54239180) — 2020-09-22 보도
- [Georgian woman cuts off web access to whole of Armenia — The Guardian](https://www.theguardian.com/world/2011/apr/06/georgian-woman-cuts-web-access) — 2011-04-06 보도
- [RFC Editor, RFC 1149 A Standard for the Transmission of IP Datagrams on Avian Carriers](https://www.rfc-editor.org/rfc/rfc1149.txt)
- [RFC Editor, RFC 3514 The Security Flag in the IPv4 Header](https://www.rfc-editor.org/rfc/rfc3514.txt)
- [IANA, Service Name and Transport Protocol Port Number Registry](https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml)
- [The informal report from the RFC 1149 event — Bergen Linux User Group](https://www.blug.linux.no/rfc1149/writeup/)
- [RFC 1149 ping log — Bergen Linux User Group](https://www.blug.linux.no/rfc1149/pinglogg.txt)
- [I'm begging you to learn networking — rootsh](https://www.youtube.com/watch?v=aKFHZ1JUaQ0) — 2026-11-11 영상. 사례 선정과 학습 순서 제안

## 관련 문서

- [[DNS]]
- [[Routing-Protocols|라우팅 프로토콜]]
- [[TCP-Handshake|TCP 핸드셰이크]]
- [[OSI-7-Layer|OSI 7계층]]
- [[Packet-Capture-and-Wireshark|패킷 캡처와 Wireshark]]
- [[Network-Lab-Practice|네트워크 실습]]
- [[Moravec-Paradox|모라벡의 역설]] — 논리 작업과 물리 환경 작업의 자동화 난도 차이에 대한 관찰과 그 한계
