---
tags: [web, network, osi]
status: study
category: "웹&네트워크(Web&Network)"
aliases: ["OSI 7계층"]
---

# OSI7계층과Internet/Ethernet

## OSI7계층

| 계층 | 이름 | 역할 | 프로토콜/장비 예시 |
|------|------|------|------------------|
| 7 | 응용(Application) | 사용자와 직접 상호작용 | HTTP, FTP, SMTP, DNS |
| 6 | 표현(Presentation) | 데이터 형식 변환, 암호화 | SSL/TLS, JPEG, JSON |
| 5 | 세션(Session) | 연결 설정/유지/해제 | NetBIOS, RPC |
| 4 | 전송(Transport) | 신뢰성 있는 데이터 전송 | TCP, UDP |
| 3 | 네트워크(Network) | 경로 설정(라우팅) | IP, ICMP, 라우터 |
| 2 | 데이터링크(Data Link) | 물리 주소 지정, 오류 검출 | Ethernet, MAC, 스위치 |
| 1 | 물리(Physical) | 전기 신호 전송 | 케이블, 허브, 리피터 |

### 외우는법
- 상위(7→5): 애플리케이션이 데이터를 만들고
- 중간(4): 전송 방식(TCP/UDP) 결정
- 하위(3→1): 네트워크를 통해 물리적으로 전달

## InternetvsEthernet

| 구분 | Internet | Ethernet |
|------|----------|----------|
| 범위 | 전 세계 네트워크의 네트워크 (WAN) | 근거리 통신망 (LAN) |
| 계층 | OSI 3계층(네트워크) - IP 기반 | OSI 2계층(데이터링크) - MAC 기반 |
| 주소 | IP 주소 (논리적) | MAC 주소 (물리적) |
| 프로토콜 | TCP/IP | IEEE 802.3 |
| 예시 | 웹 브라우징, 이메일 | 사무실 내 PC 연결 |

- Ethernet은 LAN 내 장비 간 통신 기술
- Internet은 여러 LAN을 IP로 연결한 거대 네트워크
