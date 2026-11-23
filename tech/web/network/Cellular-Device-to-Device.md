---
tags: [network, lte, nr, d2d, sidelink, prose, v2x]
status: done
verified_at: 2026-11-24
category: "Web - 네트워크"
aliases: ["셀룰러 단말 간 직접 통신", "Device-to-Device", "D2D", "ProSe", "사이드링크", "Sidelink", "LTE Direct"]
---

# 셀룰러 단말 간 직접 통신(D2D, ProSe와 사이드링크)

셀룰러의 Device-to-Device(D2D)는 가까운 단말끼리 기지국과 코어 노드를 거치지 않는 경로로 데이터를 주고받는 방식이다. 3GPP는 이를 Proximity Services(ProSe)로 표준화했고, 단말 사이의 인터페이스는 PC5, 그 물리 계층 이름은 사이드링크(sidelink)다. 위성과 단말이 직접 통신하는 위성 D2D는 약어만 같고 다른 개념이다([[Satellite-Direct-to-Device|위성 직접 연결]]).

## 데이터 경로와 제어를 나눠 본다

ProSe Direct Communication은 근처의 두 단말 이상이 네트워크 노드를 거치지 않는 경로로 통신하는 것이고, ProSe Direct Discovery는 단말이 주변의 다른 ProSe 단말을 찾는 절차다(TS 23.303 Rel-12). 데이터가 단말 사이로 직접 가도 네트워크가 손을 떼는 것은 아니다.

- **권한:** LTE(EPS) ProSe Rel-12에서 최종 사용 권한은 가입 사업자(Home PLMN)의 ProSe Function이 준다. 권한은 사업자망 단위이고 철회될 수 있다. 공공 안전 단말은 사업자가 UICC나 ME에 사전 설정한 파라미터로 동작할 수 있어 초기 설정을 위해 ProSe Function에 접속하지 않아도 된다. RRC_CONNECTED 단말이 전송 의사를 알리면 기지국(eNB)이 MME에서 받은 단말 정보로 권한을 확인한다. 5G ProSe(TS 23.304)의 기능 엔티티 목록에는 ProSe Function이 없어 권한과 프로비저닝 구조가 다르며, 이 문서에서는 그 절차를 대조하지 않았다.
- **자원 할당:** LTE Rel-12 사이드링크 통신에는 두 방식이 있다. 단말이 eNB에 전송 자원을 요청하고 eNB가 스케줄링하는 scheduled 방식과, 단말이 자원 풀에서 스스로 고르는 UE autonomous 방식이다. 커버리지 안의 단말은 eNB 설정이 지정한 방식을 쓰되, 규격이 정한 예외 상황에서는 scheduled로 설정된 단말도 일시적으로 autonomous 방식을 쓸 수 있다. 커버리지 밖에서는 autonomous 방식만 쓸 수 있다. NR 사이드링크(Rel-16)도 두 방식으로 나뉘며, TS 38.300 5.7.2절은 망이 자원을 할당하는 mode 1과 단말이 자원 풀에서 전송 자원을 정하는 mode 2를 정식 용어로 둔다.

따라서 제어 신호는 네트워크가 관리하고 데이터만 단말끼리 주고받는다는 설명은 커버리지 안의 scheduled 방식에 가깝다. 커버리지 밖이나 autonomous 방식에서는 단말이 자원 선택까지 맡는다.

## Rel-12의 범위: 통신은 공공 안전 전용, discovery는 커버리지 안

Rel-12 사이드링크 통신은 커버리지 안팎에서 모두 동작하지만, 그 규격(TS 36.300 Rel-12)은 공공 안전 용도로 인가된 단말만 사이드링크 통신을 할 수 있게 했고 미리 정한 공공 안전용 ProSe 반송파 하나를 쓰게 했다. 같은 릴리스의 discovery는 커버리지 안에서만 지원했고 공공 안전 단말로 한정하지 않았다. TS 23.303 Rel-12도 공공 안전이 아닌 ProSe 단말을 정의한다. 2015년 초 3GPP의 Rel-13 소개 글은 이 틀을 공공 안전과 소비자 용도에 맞게 확장하는 것을 목표로 적고, MCPTT(Mission Critical Push-To-Talk)에 필요한 요구사항 지원을 작업의 일부로 적었다.

LTE Direct는 Qualcomm이 쓰는 이름이다. 2015년 9월 Qualcomm 자료는 LTE Direct를 주로 Rel-12의 단말 간 근접 discovery 기술로 소개하지만, 같은 자료에서 공공 안전용 일대다 통신과 이후 릴리스의 확장(MCPTT, multi-hop, V2V)까지 LTE Direct 플랫폼으로 부른다. 자료는 ProSe라는 약어 대신 LTE Direct Proximity Services, LTE Proximity Services라는 표현과 3GPP Release 12 표준화 표기를 쓴다. 같은 자료는 사업자 시험과 시험용 SDK만 언급하고 상용 서비스는 언급하지 않는다. 그 뒤 소비자용 discovery가 널리 상용화됐는지는 이 문서에서 확인하지 못했다.

## 차량과 NR로 이어진 진화

| 릴리스 | 변화 |
| --- | --- |
| Rel-12, Rel-13 | LTE ProSe(D2D) 도입과 확장, PC5 인터페이스 |
| Rel-14 | LTE V2X. Rel-12, Rel-13의 D2D를 바탕으로 하고, eNB가 Uu로 제어하는 방식(Mode 3)과 단말이 감지 기반으로 고르는 방식(Mode 4), 5.9GHz ITS 대역을 다룬다 |
| Rel-16 | NR 사이드링크. 주로 차량 간, 차량과의 통신을 겨냥 |
| Rel-17 | 사이드링크 절전과 단말 간 자원 할당 조정. 5G 시스템의 ProSe(TS 23.304)는 Direct Discovery, Direct Communication, UE-to-Network Relay를 제공한다 |
| Rel-18 | 비면허 대역 사이드링크, ITS 대역 반송파 집성, 사이드링크 측위. 사이드링크 relay 개선은 2021-12, 2022-04 기준 Rel-18 우선순위 포스터에만 있어 완료 여부를 이 문서에서 대조하지 않았다 |

비면허 대역과 ITS 대역이 들어오면서 사이드링크가 늘 사업자 면허 대역만 쓴다고 단정할 수 없다. 대역과 권한 조건은 릴리스와 용도별로 확인한다.

## 비슷한 단말 간 기술과 구분한다

Wi-Fi Direct와 Bluetooth도 AP나 기지국 없이 기기끼리 연결하지만, 사업자 망의 권한 부여를 받고 커버리지 안에서 기지국의 자원 설정을 따르는 3GPP 사이드링크와는 구조가 다르다. 콘서트장의 사진 전송이나 오프라인 근거리 게임 같은 소비자 사례가 어느 기술로 구현됐는지는 이 문서에서 확인하지 못했으므로, D2D라는 말이 나오면 어느 기술인지부터 확인한다([[WiFi-Direct|Wi-Fi Direct]]).

## 점검 질문

- 셀룰러 사이드링크인가, Wi-Fi Direct나 Bluetooth인가, 위성 직접 연결인가?
- 어느 릴리스와 용도(공공 안전, V2X, 소비자)인가? 단말과 망이 그 릴리스를 지원하는가?
- 커버리지 안에서 기지국이 자원을 스케줄링하는가, 단말이 자원 풀에서 고르는가?
- 어느 대역(사업자 반송파, ITS 대역, 비면허 대역)과 어떤 권한 부여 절차를 쓰는가?
- 망 부하 감소 효과를 말한다면 어떤 트래픽이 실제로 사이드링크로 옮겨 가는지 측정했는가?

## 출처

- [Initial Cellular V2X standard completed — 3GPP](https://www.3gpp.org/news-events/3gpp-news/v2x-r14) — 2016-09-26
- [Evolution of LTE in Release 13 — 3GPP](https://www.3gpp.org/news-events/3gpp-news/rel13) — 2015-02-17, 승인된 작업 항목의 목표
- [RAN1, 5G-Advanced and Rel-18 Completion — 3GPP](https://www.3gpp.org/technologies/ran1-rel18)
- [Release 18, TSG SA, RAN, CT priorities — 3GPP](https://www.3gpp.org/images/PDF/Release_18_features_tsg95_v03.pdf) — 2021-12, 2022-04 기준 우선순위 포스터
- [ETSI, TS 123 303 V12.8.0 (3GPP TS 23.303, ProSe Stage 2)](https://www.etsi.org/deliver/etsi_ts/123300_123399/123303/12.08.00_60/ts_123303v120800p.pdf)
- [ETSI, TS 136 300 V12.10.0 (3GPP TS 36.300, E-UTRA 전체 설명, 23.10과 23.11절)](https://www.etsi.org/deliver/etsi_ts/136300_136399/136300/12.10.00_60/ts_136300v121000p.pdf)
- [ETSI, TS 138 300 V16.8.0 (3GPP TS 38.300, NR 전체 설명, 5.7.2절과 16.9절)](https://www.etsi.org/deliver/etsi_ts/138300_138399/138300/16.08.00_60/ts_138300v160800p.pdf)
- [ETSI, TS 123 304 V17.3.0 (3GPP TS 23.304, 5G ProSe, 4.1절과 4.3절)](https://www.etsi.org/deliver/etsi_ts/123300_123399/123304/17.03.00_60/ts_123304v170300p.pdf)
- [Creating a Digital 6th Sense with LTE Direct — Qualcomm](https://www.qualcomm.com/media/documents/files/lte-direct-overview-presentation.pdf) — 2015-09 발표 자료

## 관련 문서

- [[Satellite-Direct-to-Device|위성 직접 연결]]
- [[WiFi-Direct|Wi-Fi Direct]]
- [[Self-Organizing-Network|SON과 무선 자원 관리]]
- [[네트워크(Network)|네트워크 인덱스]]
