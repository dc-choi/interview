---
tags: [security, network-security]
status: index
category: "Security - 네트워크 보안"
aliases: ["Network Security", "네트워크 보안"]
---

# 네트워크 보안(Network Security)

경계 장비의 배치와 공인 IP, 인라인과 아웃오브패스 구조, IDS와 IPS, L2 주소 해석을 노린 공격과 방어, 망분리와 망연계 — 트래픽이 지나는 길 위에서 무엇을 막고 무엇을 볼지 정하는 설계.

## 목차

- [[Network-Security-Lab-Interpretation|네트워크 보안 시연을 해석하는 기준]] — HTTP Basic과 TLS/VPN 경계, 탐색과 취약 조건, 셸과 권한, WEP 결함과 802.11i, WPA/WPA2 인증의 구분, WPA2 오프라인 추측과 WPA3 SAE/PMF, ARP MITM과 Evil Twin
- [[Public-WiFi-Trust-Boundaries|공공 Wi-Fi의 신뢰 경계]] — HTTPS, 서비스 신뢰와 기기 제어 권한, 미러링 시연의 사전 인증 조건
- [[SSH-Authentication|SSH 인증]] — 서버 호스트 키, 사용자 인증 키와 세션 키, 첫 접속의 신뢰와 호스트 키 변경, 하드웨어에 묶은 사용자 키(FIDO, TPM, Secure Enclave)와 복구, Tailscale 포워딩의 권한 경계, musl 환경의 비밀번호 인증 우회와 salt 차용의 배경
- [[Network-Perimeter-Security|네트워크 경계 보안]] — 공인 IP 배치 원칙, DNS 응답 IP와 실제 서버, UTM, 보안 장비가 로드밸런서보다 앞에 서는 순서, 프록시 방식 WAF와 SSL 종료, 클라우드의 퍼블릭/프라이빗 구분
- [[Next-Generation-Firewall|차세대 방화벽(NGFW)]] — 포트 기반 통제가 놓치는 응용, 사용자와 기기, 볼 수 없는 암호화 트래픽의 처리 규칙과 TLS 검사의 대가, AI 에이전트 사이 트래픽과 내부 정책 집행 지점, 평면 분리와 전용 프로세서, RFC 9411로 성능 수치 읽기
- [[Inline-vs-Out-of-Path|인라인과 아웃오브패스 배치]] — 경로 위 제어 장비와 사본 관찰 센서, fail-open과 fail-closed, 소프트웨어와 하드웨어 bypass, 포트 미러링(SPAN)과 TAP, 미러 포트 대역폭 병목과 사본 유실, IDS와 IPS, 클라우드의 GWLB와 Traffic Mirroring, AI 검사 API의 판정과 실제 차단
- [[Network-Separation|망분리와 망연계]] — 막는 경로와 못 막는 경로, 물리적 분리와 서버 기반(VDI), 단말 기반 논리적 분리, 가상화 탈출과 공유 기능, 스냅샷 복원의 한계, 망연계와 data diode, 금융과 개인정보 규정의 요구 범위, N2SF, 경계 모델과 제로 트러스트
- [[Financial-Network-Separation-Easing|금융권 망분리 완화와 자율보안 전환]] — 2013년 의무화에서 2024 로드맵의 자율보안-결과책임까지, 보안 목적 AI 망분리 특례의 1차와 2차 요건, 상시 제도화와 전면해제 TF, CSF 2.0 기반 수준진단, Security for AI와 AI for Security
- [[Air-Gap-Covert-Channels|에어갭 은닉 채널]] — 내부 감염과 근거리 수신기라는 두 전제, RAMBO의 메모리 버스 전자기 송신과 OOK, 거리별 전송률과 오류율, 가상 머신 안 송신, 구역 분리와 탐지, 재밍, 차폐의 비용
- [[ARP-Spoofing|ARP 스푸핑]] — 검증 없는 ARP 캐시 갱신, 양방향 위조와 중계로 만드는 MITM, 경로 위 공격자와 TLS, HSTS의 경계, 같은 원리를 쓰는 ARP 기반 NAC 차단의 트레이드오프, DHCP snooping과 DAI, 탐지 신호, 공용망과 VPC와 컨테이너의 위협 모델, IPv6 ND와 RA Guard
- [[5G-Security-Architecture|5G 보안 구조]] — SUPI와 SUCI 은닉, null-scheme의 경계, 5G AKA 상호 인증과 가짜 기지국 해석, K에서 K_gNB까지의 키 계층과 갱신 시점, SBA의 TLS와 OAuth 2.0, SEPP, 슬라이스 인증(NSSAA)
- [[Proxy-Trust-and-Anonymity|중계 경로의 신뢰 모델]] — 프락시 경유가 만드는 익명성과 그 대가, 중계자가 볼 수 있는 범위, Tor의 회로와 계층 암호화, 프락시/VPN/Tor의 신뢰 가정 비교, 아웃바운드 통제
- [[Residential-Proxy-Networks|주거용 프록시 네트워크와 내부망 노출]] — 앱 내장 SDK와 사전 설치 펌웨어로 출구가 되는 기기, DNS로 사설 대역 차단을 우회한 내부망 접근, 정부 기관 네트워크 출구 관측 사례, 관측과 침해의 구분, 게스트와 IoT 분리
- [[Access-Policy-Change-Safety|접근 정책의 변경 안전성과 실효 검증]] — 정책 변경을 배포로 다루기, 발행 대상 급감 보류, 집행과 같은 판정 코드로 후보 평가, head 포인터 복구와 변경 보존, 연쇄 순위 감사 로그, 복호화 예외와 hit count 0의 함정, 정책 밖 변화 점검, NRD 차단, 직접 만든 ZTNA의 운영 비용
- [[Host-Outbound-Firewall|호스트의 앱별 아웃바운드 통제]] — 네트워크 egress 통제와 판정 단위의 차이, Windows 기본 방화벽 위의 질문형 규칙(PacketHound), 서명된 기본 도구의 예외, 첫 연결 차단과 경로 기반 규칙의 제약, 알림 피로

## 관련 문서

- [[Packet-Capture-and-Wireshark|패킷 캡처와 Wireshark]] — 캡처 위치와 SPAN/TAP, 법적 범위
- [[Proxy-Internals|프락시 동작 구조]] — 두 연결 종단과 TLS 종료 지점
- [[Network-Encapsulation|캡슐화와 데이터 단위]] — DPI
- [[Shield-WAF-NetworkFirewall|AWS Shield, WAF, Network Firewall]]
- [[보안(Security)|보안 인덱스]]
