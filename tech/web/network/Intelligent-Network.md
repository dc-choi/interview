---
tags: [network, telecom, intelligent-network]
status: done
verified_at: 2026-11-08
category: "Web - 네트워크"
aliases: ["Intelligent Network", "지능망", "Service Switching Point", "Service Control Point"]
---

# 지능망(Intelligent Network)과 SSP, SCP

지능망(IN)은 통신 서비스를 만들고 제공하기 위한 아키텍처 개념으로, 호를 연결하는 교환 기능과 서비스를 결정하는 서비스 제어 기능을 기능 엔티티 단위로 나눈다. 서비스 로직은 SCP 같은 별도 노드에 둘 수 있지만 물리 배치는 유연해서 SSP와 같은 노드에 두거나 SSCP로 합칠 수도 있다. PSTN뿐 아니라 패킷 데이터망(PSPDN), 이동망, ISDN 같은 여러 망에 적용할 수 있고, CS-1은 PSTN, ISDN과 이동망(PLMN)을 고려한다. ITU-T Q.120x 계열 권고가 일반 구조를, Q.121x 계열이 첫 표준 단계인 CS-1(Capability Set 1)을 정의한다. 개념 모델의 목표는 서비스 구현, 망 구현과 벤더, 기술로부터의 독립이다.

## 기능 엔티티와 물리 엔티티

IN은 기능 엔티티(FE)와 이를 담는 물리 엔티티(PE)를 구분한다. 한 PE에 여러 FE를 둘 수 있지만 한 FE를 두 PE로 쪼개지 않는다. 같은 FE의 복제본은 서로 다른 PE에 둘 수 있다.

| 물리 엔티티 | 역할 | 필수 FE | 선택 FE |
|---|---|---|---|
| SSP (Service Switching Point) | 필요한 교환을 하고(가입자 교환기면 망 접속도 제공) IN 서비스 요청을 감지하며, SCF를 가진 노드와 통신해 그 지시에 따른다 | CCF, SSF (가입자 교환기면 CCAF도) | SCF, SRF, SDF |
| SCP (Service Control Point) | IN 서비스를 제공하는 서비스 로직 프로그램(SLP)을 담는다 | SCF | SDF |
| SDP (Service Data Point) | SLP가 개별화된 서비스에 쓰는 데이터를 담는다 | SDF | |
| IP (Intelligent Peripheral) | 음성 안내, DTMF 숫자 수집, 음성 인식, 회의 브리지 같은 특수 자원을 제공한다 | SRF | SSF/CCF |
| SN (Service Node) | SSP와 점대점으로 연결되어 IN 서비스를 제어하고 사용자와 상호작용한다 | SCF, SDF, SRF, SSF/CCF | |
| SSCP | SCP와 SSP를 한 노드에 합친다 | SCF, SDF, CCAF, CCF, SSF | SRF |
| SMP (Service Management Point) | 서비스 관리, 제공과 배포를 제어한다 | SMF | SMAF, SCEF |
| SCEP, SMAP | 서비스 생성 환경, 관리 접근 | SCEF, SMAF | |

약어는 CCF(Call Control Function), SSF(Service Switching Function), CCAF(Call Control Agent Function), SCF(Service Control Function), SDF(Service Data Function), SRF(Specialized Resource Function), SMF(Service Management Function), SMAF(Service Management Access Function), SCEF(Service Creation Environment Function)다. SSCP는 Service Switching and Control Point, SCEP는 Service Creation Environment Point, SMAP는 Service Management Access Point다. 이 밖에 SCP와 같은 FE를 담되 SSP에 고속 인터페이스로 직접 붙는 Adjunct(AD)가 있다.

## 호 처리 흐름

1. SSP가 들어온 호에서 IN 서비스 요청을 감지한다.
2. SSP는 SCF를 가진 노드에 지시를 요청한다. SCP와는 신호망으로, Adjunct와는 직접 연결한 고속 인터페이스로, SN과는 점대점 신호 및 전송 연결로 통신한다. SCP는 SDP의 데이터를 직접 또는 신호망을 통해 조회한다.
3. SLP가 서비스 로직을 실행하고 SSP에 지시를 돌려준다.
4. SSP는 지시에 따라 호를 연결한다. 안내 방송이나 숫자 수집이 필요하면 SCP가 SSP에 IP나 SN의 자원으로 사용자를 연결하라고 요청한다.

여러 SCP가 같은 SLP와 데이터를 가져 신뢰성을 높이고 부하를 나눌 수 있다. 새 서비스는 SCEP에서 정의, 개발, 시험한 뒤 SMP로 배포한다. Q.1211은 IN 구현이 새 서비스의 빠른 도입을 돕는다고 설명한다. 다만 CS-1은 Type A 서비스만 대상으로 한다. Type A는 호의 한 당사자에게만 적용되고(single-ended) 한 시점에 하나의 SCF만 호를 제어하는(single point of control) 서비스로, SSF가 SCF에 정보를 묻되 연결 제어는 교환기가 계속 갖는다. 교환기가 Type A 서비스 범주를 수용하게 하는 소프트웨어 수정은 범위가 비교적 작고 잘 알려져 있다. 여러 가입자가 한 호에 묶이고 연결 제어를 외부 서비스 로직과 나눌 수 있는 Type B는 교환기 소프트웨어 재설계에 매우 큰 투자가 필요할 수 있다. 서비스 로직을 분리해도 교환기에 IN 지원을 넣는 수정 자체는 필요하다.

권고는 응용 계층 프로토콜에 초점을 두고, 하위 프로토콜 플랫폼은 capability set별 권고(Q.12x5)에서 정한다. 일반 구조만으로 특정 신호 프로토콜이나 신호망 토폴로지를 단정하지 않는다.

## 예: Freephone

CS-1의 대상 서비스 중 Freephone(FPH)은 가입자가 자기 비용으로 호를 받아 통화 요금 전체를 부담하는 역과금 서비스다. 가입자는 하나 이상의 설치 장소를 하나의 freephone 번호로 전국, 일부 지역 또는 국제적으로 받을 수 있다. 국내 사례로 LG U+의 080서비스는 기업이 고객의 통화료를 부담하고 고객은 무료로 거는 수신자 부담 대표번호다. 이 사업자의 현재 080 구현이 IN의 SSP와 SCP 조회 구조로 동작하는지는 이 출처들로 확인하지 않았다.

같은 CS-1 목록에는 착신 분배(Call distribution), 시간대, 발신 지역, 발신 번호, 우선순위, 요금, 비율 배분 같은 조건에 따른 라우팅(Destination call routing), 신용카드 과금(Credit card calling) 등이 있다. 이들은 번호와 조건을 해석해 연결 대상이나 과금 대상을 정하는 서비스로 묶어 이해할 수 있다(이 문서의 해석).

## 체크포인트

- 교환(SSF/CCF)과 서비스 제어(SCF)는 기능 엔티티이고 SSP와 SCP는 물리 노드다. 둘을 같은 개념으로 섞지 않는다.
- 서비스 제어(SCF)가 반드시 별도 장비(SCP)에 있다는 뜻은 아니다. SSP가 SCF를 선택적으로 가질 수 있고, SSCP는 SCP와 SSP를 한 노드에 합친다.
- 1993년 권고 기준의 구조다. 현재 사업자 망의 구현 방식이나 IMS 같은 후속 구조로의 대응은 별도 출처로 확인한다.

## 출처

- [ITU-T, Q.1205 Intelligent network physical plane architecture (03/93)](https://www.itu.int/rec/T-REC-Q.1205-199303-I/en)
- [ITU-T, Q.1211 Introduction to intelligent network capability set 1 (03/93)](https://www.itu.int/rec/T-REC-Q.1211-199303-I/en)
- [LG U+, 080서비스](https://www.lguplus.com/biz/all/telecom/lines/toll-free/B000000029)

## 관련 문서

- [[Mobile-Network-Continuity|이동 환경의 통신 연속성]]
- [[Routing-Protocols|정적 라우팅과 RIP, OSPF, BGP]]
- [[네트워크(Network)|네트워크 인덱스]]
