---
tags: [security, network-security]
status: index
category: "Security - 네트워크 보안"
aliases: ["Network Security", "네트워크 보안"]
---

# 네트워크 보안(Network Security)

경계 장비의 배치와 공인 IP, 인라인과 아웃오브패스 구조, IDS와 IPS — 트래픽이 지나는 길 위에서 무엇을 막고 무엇을 볼지 정하는 설계.

## 목차

- [[Network-Perimeter-Security|네트워크 경계 보안]] — 공인 IP 배치 원칙, DNS 응답 IP와 실제 서버, UTM, 보안 장비가 로드밸런서보다 앞에 서는 순서, 프록시 방식 WAF와 SSL 종료, 클라우드의 퍼블릭/프라이빗 구분
- [[Inline-vs-Out-of-Path|인라인과 아웃오브패스 배치]] — 경로 위 제어 장비와 사본 관찰 센서, fail-open과 fail-closed, 소프트웨어와 하드웨어 bypass, 포트 미러링(SPAN)과 TAP, 미러 포트 대역폭 병목과 사본 유실, IDS와 IPS, 클라우드의 GWLB와 Traffic Mirroring
- [[Proxy-Trust-and-Anonymity|중계 경로의 신뢰 모델]] — 프락시 경유가 만드는 익명성과 그 대가, 중계자가 볼 수 있는 범위, Tor의 회로와 계층 암호화, 프락시/VPN/Tor의 신뢰 가정 비교, 아웃바운드 통제

## 관련 문서

- [[Packet-Capture-and-Wireshark|패킷 캡처와 Wireshark]] — 캡처 위치와 SPAN/TAP, 법적 범위
- [[Proxy-Internals|프락시 동작 구조]] — 두 연결 종단과 TLS 종료 지점
- [[Network-Encapsulation|캡슐화와 데이터 단위]] — DPI
- [[Shield-WAF-NetworkFirewall|AWS Shield, WAF, Network Firewall]]
- [[보안(Security)|보안 인덱스]]
