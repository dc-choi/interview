---
tags: [security, network-security, proxy, residential-proxy, botnet, sdk, supply-chain]
status: done
verified_at: 2026-11-18
category: "Security - 네트워크 보안"
aliases: ["Residential Proxy", "주거용 프록시", "레지덴셜 프록시", "Proxy SDK", "프록시 SDK", "Proxyware", "Kimwolf"]
---

# 주거용 프록시 네트워크와 내부망 노출

주거용 프록시(residential proxy)는 일반 가정과 사무실의 휴대폰, PC, TV 박스 같은 기기를 출구로 빌려주는 프록시 서비스다. 구매자의 트래픽은 그 기기가 속한 네트워크의 IP로 나가므로, 목적지 서버에는 데이터센터가 아니라 평범한 가정이나 기관 네트워크에서 온 접속처럼 보인다. 프록시 일반의 신뢰 모델은 [[Proxy-Trust-and-Anonymity|중계 경로의 신뢰 모델]]에서 다룬다. 이 문서는 출구가 되는 기기 쪽의 위험을 다룬다.

## 기기가 출구가 되는 경로

- **앱에 내장된 SDK**: 프록시 사업자는 독립 앱이 아니라 기존 앱에 넣는 SDK를 배포하고, 앱 개발자는 다운로드 수 등에 따라 대가를 받는다. 사용자는 앱만 설치했다고 생각하지만 기기가 프록시 출구가 된다.
- **사전 설치와 트로이목마 앱**: 저가 Android TV 박스처럼 출고 시점부터 프록시 소프트웨어나 악성코드가 들어 있거나, 사용자가 모르고 내려받은 앱으로 네트워크에 합류한다. 펌웨어 영역에 백도어가 들어 있고 한 기기에 여러 프록시 SDK가 함께 실린 사례도 보고됐다.
- **대역폭 공유 보상**: 남는 대역폭을 팔아 돈을 벌라는 앱을 사용자가 직접 설치한다.

공통점은 기기 소유자가 아니라 **SDK와 펌웨어 공급자가 출구 여부를 정한다**는 점이다. 같은 네트워크의 관리자는 어떤 앱이 프록시 SDK를 포함하는지 설치 시점에 알기 어렵다.

## 출구 노출이 내부망 노출로 이어지는 이유

프록시 출구는 외부로 나가는 길이지만, 출구 기기는 같은 내부망의 다른 기기에도 닿을 수 있다. 사업자가 사설 대역(10/8, 172.16/12, 192.168/16) 접속을 막더라도 구현이 허술하면 우회된다.

- 2026년 1월 보도된 Kimwolf 봇넷의 확산 방식은 DNS 레코드가 RFC 1918 사설 주소를 가리키게 해 사업자의 사설 대역 차단을 우회했다. 프록시를 통해 같은 내부망의 기기에 접속한 것이다.
- 그 내부망에 ADB(Android Debug Bridge)가 열린 채 출고된 TV 박스가 있으면, 원격에서 관리자 권한을 얻을 수 있었다.
- Kimwolf 전체 감염 기기는 XLab이 최소 180만 대, Synthient가 200만 대 이상으로 추산했고, 이 내부망 접근 기법은 빠른 확산의 주된 경로로 보도됐다. 추정치는 집계 방법에 따라 다르며, IP 주소 수가 곧 감염 기기 수는 아니다.

즉 출구 기기 하나가 들어오면 그 기기가 접근할 수 있는 내부 자원이 프록시 구매자에게도 열릴 수 있다. 공격자가 내부 호스트를 직접 침해하지 않아도 내부 접근의 발판이 생긴다.

## 사례: 정부 기관 네트워크의 프록시 출구

2026-11-04 Layer3 Intel은 미국 대통령실(Executive Office of the President)에 등록된 AS2650에서 주거용 프록시 출구를 관측했다고 공개했다. 10월 5일부터 11월 3일까지 236번, 6개 주소에서 30일 중 26일, 28개 프록시 서비스를 통해 출구가 잡혔다. 다른 탐지 서비스도 같은 주소를 프록시 출구로 표시했다. 약 절반이 동부 시간 오후 5시에서 자정 사이였고 이른 아침에는 거의 없어, Layer3는 공용 게스트 Wi-Fi보다 한 사람의 기기를 시사한다고 해석했다.

Layer3의 데이터가 보여 주는 것은 출구 관측뿐이며 기기와 사용자는 확인되지 않았다. KrebsOnSecurity는 Synthient가 이 활동을 Infatica라는 서비스가 설치된 여러 Windows 11 기기와 연결했다고 전했는데, 이는 한 사람의 기기라는 Layer3의 해석과 다를 수 있는 제3자 주장이며 이 문서에서 확인하지 않았다. 보도 시점에 백악관은 응답하지 않았다. 내부 시스템 침해가 확인된 것도 아니다. 다만 그 네트워크의 SDK에 같은 결함이 있으면 프록시 구매자가 내부에 닿을 수 있다는 것이 위험의 요지다. 출구 관측은 서비스를 통해 전 세계 회전 출구를 요청하다 우연히 발견된 것이다.

## 방어 점검

공식 보고서가 제시한 권고와 이를 조직 운영에 옮긴 제안을 구분한다.

| 대상 | 권고(출처) | 조직 적용 제안 |
|---|---|---|
| 개인 사용자 | 미사용 대역폭 보상 앱을 경계하고 공식 스토어와 Play Protect를 사용(GTIG) | 업무망 단말에 이런 앱 설치를 금지 정책에 넣는다 |
| 기기 구매 | 평판 있는 제조사의 셋톱박스를 사용(GTIG, KrebsOnSecurity가 인용한 HUMAN Security) | 회의실, 사무실 TV 박스와 IoT 기기를 자산 목록에 넣고 출처를 확인한다 |
| 앱 개발자 | 넣는 수익화 SDK를 검증(GTIG) | 의존성 검토에 수익화와 대역폭 공유 SDK 항목을 둔다 |
| 가정과 방문자 | 방문자를 다른 기기와 통신하지 못하게 하는 게스트 Wi-Fi에 둔다(KrebsOnSecurity) | 게스트와 IoT를 업무망과 분리한 VLAN에 둔다. [[Network-Separation|망분리]] |
| 보안 운영 | 공개된 프록시 SDK 제어 도메인 등 침해 지표(IOC)(GTIG) | DNS와 egress 로그에서 IOC를 대조한다. 앱 단위 통제는 [[Host-Outbound-Firewall|호스트 아웃바운드 통제]] |

조직 적용 제안 열은 이 문서의 해석이며 출처가 직접 권고한 목록은 아니다. 탐지 서비스에 자사 IP를 조회해 프록시 출구로 표시되는지 확인하는 방법도 있다. 다만 표시되지 않는다고 해서 출구가 없다는 증거는 아니다.

## 면접 체크포인트

- 주거용 프록시가 데이터센터 프록시보다 차단하기 어려운 이유(평범한 가정과 기관 IP로 보인다)
- 기기 소유자가 아니라 SDK와 펌웨어 공급자가 출구 여부를 정하는 공급망 문제
- 출구 기기가 내부망 접근의 발판이 되는 과정과 DNS를 이용한 사설 대역 차단 우회
- 관측된 출구와 확인된 침해를 구분해 보고하는 법
- 게스트와 IoT 망 분리, 자산 목록과 egress 관측의 역할

## 출처

- [Residential Proxies Detected on White House Network — Layer3 Intel](https://layer3intel.com/blog/residential-proxies-white-house-network)
- [What is a Residential Proxy? — Layer3 Intel](https://layer3intel.com/what-is-a-residential-proxy)
- [No Place Like Home Network: Disrupting the World's Largest Residential Proxy Network — Google Threat Intelligence Group](https://cloud.google.com/blog/topics/threat-intelligence/disrupting-largest-residential-proxy-network)
- [Shutting the Door on the XCPE Botnet — Google Threat Intelligence Group](https://cloud.google.com/blog/topics/threat-intelligence/shutting-the-door-on-the-xcpe-botnet)
- [The Kimwolf Botnet is Stalking Your Local Network — KrebsOnSecurity](https://krebsonsecurity.com/2026/01/the-kimwolf-botnet-is-stalking-your-local-network/)
- [Kimwolf Botnet Lurking in Corporate, Govt. Networks — KrebsOnSecurity](https://krebsonsecurity.com/2026/01/kimwolf-botnet-lurking-in-corporate-govt-networks/)
- [Want to Rent an Internet Address at the White House? — KrebsOnSecurity](https://krebsonsecurity.com/2026/11/want-to-rent-an-internet-address-at-the-white-house/)
- [Anyone Could Route Traffic Through the White House — Better Stack](https://www.youtube.com/watch?v=JaLHbGGN4hw)

## 관련 문서

- [[Proxy-Trust-and-Anonymity|중계 경로의 신뢰 모델]]
- [[Forward-vs-Reverse-Proxy|Forward vs Reverse Proxy]]
- [[IoT-Device-and-Firmware-Security|IoT 기기와 펌웨어 보안]]
- [[Network-Separation|망분리와 망연계]]
- [[Host-Outbound-Firewall|호스트의 앱별 아웃바운드 통제]]
- [[네트워크보안(NetworkSecurity)|네트워크 보안 인덱스]]
