---
tags: [network, wireless, wifi, mesh, manet]
status: done
verified_at: 2026-11-25
category: "Web - 네트워크"
aliases: ["Wireless Mesh Network", "무선 메시 네트워크", "무선 매쉬 네트워크", "WMN", "IEEE 802.11s", "802.11s", "HWMP", "MANET", "Mobile Ad hoc Network", "모바일 애드혹 네트워크", "Wi-Fi EasyMesh", "EasyMesh", "메시 와이파이"]
---

# 무선 메시 네트워크

무선 메시 네트워크(WMN)는 노드가 서로의 트래픽을 무선으로 중계해 여러 홉(multi-hop)으로 목적지까지 전달하는 망이다. 유선 백본에 붙은 AP 하나가 모든 단말을 직접 맡는 대신, 중계 노드들이 그물처럼 이어져 경로가 여럿 생긴다. 노드 하나가 꺼져도 다른 경로로 우회할 수 있다는 점이 핵심 이점이고, 홉마다 무선 구간을 다시 지나야 한다는 점이 핵심 비용이다.

## 같은 말로 묶이는 세 가지

메시라는 이름 아래 서로 다른 규격과 제품이 섞여 쓰인다. 어느 것을 말하는지부터 구분한다.

| 구분 | 무엇인가 | 경로를 정하는 곳 |
|---|---|---|
| IEEE 802.11s | 802.11 MAC 계층에 메시 기능을 더한 IEEE 개정 | 링크 계층(MAC 주소 기반 다중 홉 전달) |
| MANET | 이동하는 라우터들이 기반 시설 없이 스스로 망을 이루는 IETF의 문제 영역 | IP 계층 라우팅 프로토콜(AODV, OLSR 등) |
| 가정용 메시 Wi-Fi(EasyMesh 등) | 여러 AP를 컨트롤러가 묶어 관리하는 Multi-AP 시스템 | 컨트롤러와 에이전트의 관리 규격, 백홀은 유선 또는 무선 |

## IEEE 802.11s

- 802.11s(Amendment 10: Mesh Networking)는 2011-09-10에 발행됐고, 2008~2011년의 개정 1~10을 통합한 802.11-2012부터 본 규격에 들어갔다. 단독 개정판 802.11s-2011은 지금 superseded 상태다.
- 경로를 IP 주소가 아니라 MAC 주소로 정하는 링크 계층 메시다. Linux mac80211 구현 기준으로 메시 안에서 생긴 unicast 프레임은 4주소 802.11 헤더의 Address 3과 4에 메시 목적지와 발신지를 담는다. 최종 발신지나 목적지가 메시 밖에 있을 때만 Mesh Control의 확장 주소(Address 5, 6)를 더한다. 메시 밖 외부 망과 잇는 메시 노드를 mesh gate라 부른다.
- 기본 경로 선택 프로토콜은 HWMP(Hybrid Wireless Mesh Protocol)다. AODV를 바탕으로 필요할 때 경로를 찾는 on-demand 방식과, 루트 노드를 중심으로 트리를 미리 유지하는 proactive 방식을 함께 둔다. 기본 경로 비용은 링크를 지나는 데 드는 무선 시간을 반영한 airtime 메트릭이다.
- 보안 메시에서는 SAE(Simultaneous Authentication of Equals)로 서로를 인증하고, 그 뒤 AMPE(Authenticated Mesh Peering Exchange)로 키를 유도하고 암호 방식을 협상한다.
- Linux에서는 mac80211 위의 open80211s가 802.11s를 구현한다. 초안 기반 메시 지원은 Linux 2.6.26(2008)에 들어갔고, open80211s HOWTO는 2011년 9월 이후 나온 커널에 확정 규격의 구현이 들어 있다고 적는다. `iw`로 mesh 인터페이스를 만들고 `iw dev <인터페이스> mesh join <mesh ID>`로 참여하며, `mpath dump`로 경로 표를 본다.
- 이 절은 IEEE SA의 규격 정보 페이지, Linux 커널과 open80211s 문서로 대조했다. 규격 원문(유료)은 대조하지 않아 mesh STA, MBSS 같은 규격 본문 용어와 필수 여부는 적지 않았다.

## MANET

RFC 2501(1999, Informational)은 MANET을 이동 노드들이 이루는 자율 시스템으로 설명한다. 노드는 여러 호스트를 거느린 라우터 같은 이동 플랫폼일 수 있고, 시스템은 고립된 채 동작하거나 게이트웨이로 고정망에 붙을 수 있다. 노드가 움직이면 토폴로지가 바뀌므로 경로는 IP 계층의 MANET 라우팅 프로토콜이 계속 다시 정한다.

| 방식 | 대표 프로토콜 | 특징 |
|---|---|---|
| 반응형 | AODV(RFC 3561, Experimental) | 보낼 데이터가 생길 때 경로를 찾는다. 평소 제어 트래픽이 적지만 첫 전송이 늦다 |
| 사전형 | OLSR(RFC 3626, Experimental), OLSRv2(RFC 7181, Proposed Standard) | 주기적으로 토폴로지를 교환해 경로를 미리 둔다. 첫 전송이 빠르지만 제어 트래픽이 상시 든다 |

반응형과 사전형의 장단점은 두 방식의 동작에서 나오는 일반적인 경향이며 실제 비용은 망 크기와 이동 빈도로 측정한다. 802.11s와 MANET은 다중 홉이라는 생각을 공유하지만 경로를 정하는 층이 다르다. 802.11s 메시는 MAC 주소로 전달하므로 상위 IP 계층에는 하나의 링크처럼 보이고, MANET 라우팅은 IP 라우터들이 경로를 정한다. 802.11s의 HWMP on-demand 모드는 AODV를 바탕으로 한다.

## 구조: 메시 라우터와 메시 클라이언트

Akyildiz 등의 2005년 서베이는 WMN을 이동이 거의 없어 백본을 이루는 메시 라우터와 메시 클라이언트로 나누고, 구조를 셋으로 분류한다.

- **인프라(백본) 메시:** 메시 라우터끼리 백본을 이루고 일부가 게이트웨이로 인터넷에 붙는다. 클라이언트는 라우터에 접속만 한다.
- **클라이언트 메시:** 단말끼리 직접 중계해 망을 이룬다. 단말이 라우팅과 설정까지 맡아야 해 단말 부담이 크다.
- **하이브리드:** 백본 메시에 클라이언트 메시가 더해진 형태다.

자가 구성(self-configuring)과 자가 치유(self-healing)는 이 구조의 장점으로 꼽힌다. 새 노드는 이웃을 찾아 스스로 붙고, 노드나 링크가 끊기면 경로 프로토콜이 다른 경로를 고른다. 다만 우회 경로가 실제로 존재해야 하므로, 노드가 한 줄로 늘어선 배치에서는 중간 노드 하나가 곧 단일 장애점이 된다.

## 가정용 메시 Wi-Fi

여러 AP를 집 안에 두고 하나의 망처럼 쓰는 제품도 메시라 불린다. Wi-Fi Alliance가 2018년에 시작한 Wi-Fi CERTIFIED EasyMesh는 Wi-Fi EasyMesh 규격을 바탕으로 Multi-AP Controller가 여러 Multi-AP Agent를 관리하고, AP 사이 연결에는 유선과 Wi-Fi를 모두 쓸 수 있다. 관리 메시지는 IEEE 1905.1 메시지를 쓴다. Wi-Fi Alliance 자료는 802.11s를 언급하지 않으며, 컨트롤러가 망을 관리하는 이 구조는 802.11s의 HWMP 경로 선택과 다른 설계다. 그래서 제품의 메시 표기만 보고 802.11s 호환을 가정하지 않는다. EasyMesh Technology Overview는 기존 메시 시스템 대부분이 제조사 고유 기술을 쓴다고 적으므로, 서로 다른 제조사의 AP를 섞을 때는 EasyMesh 인증 여부부터 확인한다.

## 트레이드오프와 체크포인트

- **홉이 늘수록 처리량이 떨어진다.** 위 서베이는 노드나 홉 수가 늘면 처리량이 크게 떨어지고, 802.11 기반 다중 홉은 홉이 4개 이상이면 적정 처리량을 내기 어렵다고 정리한다. 이 예는 802.11b 시절(TCP 처리량 1Mbps 미만)의 2005년 수치라 현재 Wi-Fi에 그대로 옮기지 않고 경향으로만 읽는다. 단일 채널에서는 성능이 떨어지고 여러 무선 장치(radio)를 쓰면 용량이 크게 는다고도 적는다. 홉당 정확히 절반이 된다는 식의 고정 비율은 확인하지 못했으니 실제 배치에서 측정한다. 가능하면 첫 홉을 유선 백홀로 두거나 백홀 전용 무선 대역을 쓰는 장비를 고른다.
- **지연과 변동이 늘어난다.** 홉마다 매체 접근 대기([[WiFi-Generations#무선 구간이 하는 일|CSMA/CA]])가 더해진다. 실시간 통화나 게임은 홉 수를 줄인다.
- **경로 프로토콜의 제어 트래픽은 공짜가 아니다.** 사전형은 상시, 반응형은 경로를 찾을 때 비용을 낸다. 이동이 잦은 망과 고정 배치 망에서 유리한 방식이 다르다.
- **장애 우회는 경로가 둘 이상일 때만 성립한다.** 배치도에서 각 노드에 이웃이 둘 이상인지, 게이트웨이가 하나뿐이지 않은지 확인한다.
- 유선 망의 메시 토폴로지 비용(풀 메시 링크 수 n(n-1)/2)은 [[Switch-Hierarchy-and-Uplink|스위치 계층과 업링크]]에서, 저전력 센서 메시(Zigbee, 6LoWPAN, Bluetooth Mesh)는 [[WPAN-and-6LoWPAN|WPAN과 6LoWPAN]]에서 다룬다.

## 출처

- [IEEE SA, IEEE 802.11s-2011 Amendment 10: Mesh Networking](https://standards.ieee.org/ieee/519/3955/)
- [IEEE SA, IEEE 802.11-2012](https://standards.ieee.org/ieee/802.11/4523/)
- [Linux Wireless, 802.11s](https://wireless.docs.kernel.org/en/latest/en/developers/documentation/ieee80211/802.11s.html)
- [Linux Wireless, iw](https://wireless.docs.kernel.org/en/latest/en/users/documentation/iw.html)
- [Linux kernel, include/linux/ieee80211-mesh.h](https://github.com/torvalds/linux/blob/master/include/linux/ieee80211-mesh.h)
- [Linux kernel, net/mac80211/mesh.c](https://github.com/torvalds/linux/blob/master/net/mac80211/mesh.c)
- [Linux Wireless, News 2008-07-14 (Linux 2.6.26)](https://wireless.docs.kernel.org/en/latest/news/2008-07-14.html)
- [open80211s, HOWTO](https://github.com/cozybit/open80211s/wiki/HOWTO)
- [IETF, RFC 2501: Mobile Ad hoc Networking (MANET)](https://www.rfc-editor.org/rfc/rfc2501)
- [IETF, RFC 3561: Ad hoc On-Demand Distance Vector (AODV) Routing](https://www.rfc-editor.org/info/rfc3561)
- [IETF, RFC 3626: Optimized Link State Routing Protocol (OLSR)](https://www.rfc-editor.org/info/rfc3626)
- [IETF, RFC 7181: The Optimized Link State Routing Protocol Version 2](https://www.rfc-editor.org/info/rfc7181)
- [Wireless mesh networks: a survey — Computer Networks 47(4), Akyildiz, Wang, Wang](https://ianakyildiz.com/bwn/surveys/mesh.pdf) — DOI 10.1016/j.comnet.2004.12.001
- [Wi-Fi CERTIFIED EasyMesh delivers intelligent Wi-Fi networks — Wi-Fi Alliance](https://www.wi-fi.org/news-events/newsroom/wi-fi-certified-easymesh-delivers-intelligent-wi-fi-networks)
- [Wi-Fi Alliance, Wi-Fi CERTIFIED EasyMesh Technology Overview (2024-01)](https://www.wi-fi.org/system/files/Wi-Fi_CERTIFIED_EasyMesh_Technology_Overview_202401.pdf)
- [Wi-Fi Alliance, Technical Note: Wi-Fi EasyMesh Deployment Guidelines v1.0 (2024-08)](https://www.wi-fi.org/system/files/Wi-Fi%20Alliance%20Technical%20Note%20Wi-Fi%20EasyMesh%20v1.0.pdf)
- [YouTube, 길리랩 - 실전 구현 랩, #NW 0057 - 무선 매쉬 네트워크 90초 완전 정리](https://www.youtube.com/watch?v=-N7v_PDuz1k) — 학습 계기. 사실은 위 출처로 대조했고 RFID, WiMAX 통합 활용과 보안 기능 같은 영상의 일반화는 확인하지 못해 쓰지 않음

## 관련 문서

- [[WiFi-Generations|Wi-Fi 세대와 연결 구간 진단]]
- [[WiFi-Direct|Wi-Fi Direct]]
- [[WPAN-and-6LoWPAN|WPAN과 6LoWPAN]]
- [[Switch-Hierarchy-and-Uplink|스위치 계층과 업링크]]
- [[Routing-Protocols|정적 라우팅과 RIP, OSPF, BGP]]
- [[Self-Organizing-Network|SON과 무선 자원 관리]]
- [[네트워크(Network)|네트워크 인덱스]]
