---
tags: [network, telecom, ss7, signaling]
status: done
verified_at: 2026-11-09
category: "Web - 네트워크"
aliases: ["SS7", "Signalling System No. 7", "공통선 신호방식 7호", "No.7 신호방식", "Common Channel Signalling"]
---

# SS7(공통선 신호방식 7호)

SS7(Signalling System No. 7)은 디지털 통신망에 최적화된 국제 표준 범용 공통선 신호(CCS, Common Channel Signalling) 체계다. 공통선 신호에서는 하나의 신호 채널이 레이블을 붙인 메시지로 여러 회선의 신호 정보와 망 관리 정보를 함께 실어 나른다. ITU-T Q.7xx 계열 권고가 규격이며, 입문 권고인 Q.700(03/93)이 전체 구성 요소와 관계를 설명한다.

## 회선별 신호와 공통선 신호

전화망의 신호는 통화를 설정, 감시, 해제하기 위해 교환기 사이에서 주고받는 제어 정보다. 대비되는 두 방식은 다음과 같다.

| 구분 | 회선별 신호(채널 결합, CAS) | 공통선 신호(CCS) |
|---|---|---|
| 신호가 지나는 곳 | 각 통화 회선 또는 그 회선에 묶인 신호 비트 | 회선과 분리된 신호 링크 |
| 회선 식별 | 신호가 실린 회선 자체가 대상이다 | 메시지의 레이블로 대상 회선을 가리킨다 |
| 예 | Signalling System R2 | SS7 |

ITU-T Signalling System R2(Q.400~Q.490)는 회선 감시용 선로 신호(line signalling)와 호 설정 제어용 레지스터 간 신호(inter-register signalling)를 구분한다. 레지스터 간 신호는 압박식(compelled) 다주파 부호를 쓰고 종단 간 신호를 지원한다. 선로 신호는 4선 반송 회선이나 PCM 회선용 판이 따로 정의되어 있다. R2를 채널 결합 신호(CAS)의 예로 드는 것은 통상적인 분류이며, 이 문서가 대조한 ITU 요약에는 CAS라는 표현이 없다.

공통선 신호의 이점은 신호 정보가 메시지 단위로 독립된다는 데서 나온다. 통화 회선과 무관한 데이터베이스 조회, 망 관리 메시지도 같은 신호망으로 보낼 수 있다. 그래서 Q.700은 SS7의 적용 대상으로 PSTN, ISDN, 서비스 제어 지점(SCP)을 포함한 망 데이터베이스와의 상호작용, 이동망(PLMN), 망의 운영 관리를 함께 든다.

## 신호망의 구성 요소

- **신호점(SP, Signalling Point)**: SS7 기능을 구현해 신호망에 참여하는 지점이다. 한 물리 노드가 여러 신호점으로 정의될 수도 있다(예: 국제망과 국내망 경계의 교환기). Q.700(03/93)은 교환기, 서비스 제어 지점(SCP), 신호 중계점(STP), 운영 관리 센터를 신호점의 예로 든다.
- **신호 링크(signalling link)**: 두 신호점 사이에서 신호 메시지를 운반한다. 링크는 링크셋 단위로 묶여 신호점을 잇는다.
- **신호 중계점(STP, Signalling Transfer Point)**: 한 신호 링크로 받은 메시지를 레벨 3에서 다른 링크로 넘긴다. 메시지 중계만 하는 신호점이 STP 역할을 하며, 중계와 다른 기능을 한 노드에서 겸할 수도 있다.

신호점 사이의 메시지 전달 방식은 셋이다.

| 방식 | 경로 |
|---|---|
| 결합(associated) | 두 신호점을 직접 잇는 링크셋으로 보낸다 |
| 비결합(non-associated) | 둘 이상의 링크셋을 거쳐 보낸다 |
| 준결합(quasi-associated) | 비결합의 한정된 경우로, 경로가 미리 정해져 있고 특정 시점에는 고정된다 |

SS7은 이 가운데 결합 방식과 준결합 방식에 쓰도록 규정되어 있다. MTP에는 동적으로 경로를 바꾸는 완전한 비결합 방식에서 메시지 순서가 뒤바뀌는 것을 막는 기능이 없기 때문이다.

신호망은 국제와 국내의 두 수준으로 기능이 분리되어 각 망의 신호점 번호 체계를 독립적으로 운영할 수 있다. 두 망에 모두 속한 신호점(STP 포함)은 양쪽의 신호점 코드를 가진다. Q.705는 국제 신호망에서 출발 신호점과 도착 신호점 사이의 STP 수를 정상 상태에서 두 개 이하로 두고, 장애 시 짧은 기간 세 개나 네 개가 될 수 있다고 정한다.

## 기능 블록

| 블록 | 역할 |
|---|---|
| MTP(Message Transfer Part) | 레벨 1~3. 신호 메시지를 신호점 사이에 신뢰성 있게 운반하고 신호망을 관리한다 |
| 사용자부(User Part) | 레벨 4. MTP를 이용하는 기능이다. 전화용 TUP(Telephone User Part)와 ISDN용 ISDN-UP(흔히 ISUP)가 호 제어 메시지를 정의한다 |
| SCCP(Signalling Connection Control Part) | 레벨 4 사용자부로서 MTP 위에 비연결형과 연결형 망 서비스를 더한다 |
| TC(Transaction Capabilities) | 7계층에 위치해 같은 계층의 TC 사용자(응용)에게 회선과 무관한 트랜잭션형 통신을 제공한다. 응용 계층 프로토콜은 TCAP다 |
| TC 사용자 응용 | TC 위에서 동작한다. 이동망의 MAP(Mobile Application Part)이 한 예다(TS 29.002의 TC 매핑) |
| OMAP(Operations Maintenance and Administration Part) | 신호망의 운영 관리를 맡는다. 03/93판 Q.700은 OMAP을 TC와 나란히 SCCP 사용자로 들고, OMAP이 TCAP를 쓴다는 설명은 1988판에 있다 |

초기 SS7 규격은 회선 관련 전화 제어 요구를 바탕으로 만들어졌고, 이후 회선과 무관한 요구까지 다루도록 발전했다. SCCP와 TC가 그 확장을 맡은 블록이라고 보는 것은 블록의 역할에서 나온 이 문서의 해석이며, 도입 시점은 대조하지 않았다.

## 신호망을 쓰는 서비스

- **호 설정**: 사용자부(TUP, ISUP)의 메시지로 교환기 사이에서 회선을 잡고 해제한다. 호 설정 신호가 통화 회선과 분리된 링크로 오가는 것이 공통선 신호의 출발점이다.
- **지능망 서비스**: 080 수신자 부담 전화 같은 서비스는 교환 노드(SSP)가 서비스 제어 노드(SCP)에 지시를 묻는 지능망 구조로 설명된다. SSP는 지능망(IN, Q.1205)에서 호 제어 기능(CCF)과 서비스 교환 기능(SSF)을 갖춰 IN 서비스 요청을 감지하는 교환기이고, SCP는 Q.700도 신호점의 예로 드는 노드다. SSP와 SCP는 신호망으로 통신한다. 구조는 [[Intelligent-Network|지능망과 SSP, SCP]]에서 다룬다.
- **이동망 로밍과 문자 메시지**: 3GPP TS 29.002(Rel-19, v19.1.0 기준) MAP은 로밍하는 이동 단말을 처리하기 위해 이동망 개체 사이에 필요한 정보를 SS7으로 전달하는 프로토콜이다. 이동성 서비스(8절)와 단문 메시지 서비스 관리 서비스(12절)를 정의하고, SCCP와 TC 사용 요건(6절)과 TC 서비스로의 매핑(16절)을 둔다.

SS7의 노드를 SSP, STP, SCP 셋으로 묶어 설명할 때 SSP는 흔히 신호점인 교환기를 가리키지만, Q.1205의 SSP는 SSF를 갖춰 IN 서비스 요청을 감지하는 교환기로 범위가 더 좁다. STP는 신호점의 중계 역할, SCP는 서비스 로직을 담은 신호점이다. 규격의 기본 단위는 신호점과 신호 링크다.

## 체크포인트

- 신호가 회선마다 묶여 있는지(CAS), 공용 신호 채널에서 레이블 붙은 메시지로 분리되는지(CCS)가 SS7을 이해하는 출발점이다.
- STP는 레벨 3 중계 역할이고, SSP는 SS7 권고 Q.700이 아니라 지능망 권고 Q.1205에서 정의되는 이름이다. 노드 이름과 기능(교환, 중계, 서비스 제어)을 구분해서 본다.
- SS7은 결합 방식과 준결합 방식용이다. 경로를 동적으로 바꾸는 비결합 방식에서는 메시지 순서를 MTP가 보장하지 않는다.
- MAP과 TCAP처럼 회선과 무관한 질의가 같은 신호망 위에서 돌기 때문에 로밍과 문자 메시지가 SS7과 연결된다. 현재 사업자 망이 SIGTRAN이나 Diameter, IMS로 어디까지 옮겨 갔는지는 이 출처들로 확인하지 않았다.
- 이 문서의 구조 설명은 Q.700과 Q.705의 03/93판, TS 29.002 Rel-19의 목차를 기준으로 한다.

## 출처

- [ITU-T, Q.700 Introduction to CCITT Signalling System No. 7 (03/93)](https://www.itu.int/rec/T-REC-Q.700-199303-I/en)
- [ITU-T, Q.705 Signalling network structure (03/93)](https://www.itu.int/rec/T-REC-Q.705-199303-I/en)
- [ITU-T, Q.700 Introduction to CCITT Signalling System No. 7 (11/88)](https://www.itu.int/rec/T-REC-Q.700-198811-S/en)
- [ITU-T, Q.1205 Intelligent network physical plane architecture (03/93)](https://www.itu.int/rec/T-REC-Q.1205-199303-I/en)
- [ITU-T, Q.400-Q.490 Specifications of Signalling System R2 (11/88) 요약](https://itu.int/dms_pubrec/itu-t/rec/q/T-REC-Q.400-Q.490-198811-I!!SUM-HTM-E.htm)
- [3GPP, TS 29.002 Mobile Application Part (MAP) specification](https://portal.3gpp.org/desktopmodules/Specifications/SpecificationDetails.aspx?specificationId=1585)
- [ETSI, TS 129 002 V19.1.0](https://www.etsi.org/deliver/etsi_ts/129000_129099/129002/19.01.00_60/ts_129002v190100p.pdf)
- [#NW 0009 - SS7이란? — 길리랩](https://www.youtube.com/watch?v=qwk1neCyI7w): 2026-10-28 쇼츠. 이 문서의 계기이며, 사실은 ITU와 3GPP 문서로 대조했다. 1980년대부터 쓰였다는 연대는 배포 시점을 대조하지 않아 쓰지 않았고, 신호망이 먼저 최적 경로를 찾는다는 설명은 Q.700의 미리 정해진 신호 경로와 맞지 않아 쓰지 않았다. 통신 비용 절감 주장은 대조하지 않았고, SSP, STP, SCP를 핵심 노드로 나란히 둔 설명은 범위를 나눠 적었다.

## 관련 문서

- [[Intelligent-Network|지능망과 SSP, SCP]]
- [[Mobile-Network-Continuity|이동 환경의 통신 연속성]]
- [[OSI-7-Layer|OSI 7계층]]
- [[네트워크(Network)|네트워크 인덱스]]
