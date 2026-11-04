---
tags: [network, wireless, son, rrm, sdr, handover, 3gpp]
status: done
verified_at: 2026-11-04
category: "Web - 네트워크"
aliases: ["Self-Organizing Network", "SON", "자가 구성 네트워크", "무선 자원 관리", "Radio Resource Management", "Software Defined Radio"]
---

# SON과 무선 자원 관리

이동통신망이 이동과 혼잡 속에서 연결을 유지하는 과정에는 층위가 다른 세 개념이 함께 등장한다. RRM(Radio Resource Management)은 기지국이 무선 베어러를 수락하고 핸드오버를 결정하며 자원을 스케줄링하는 기능이다. SON(Self-Organizing Network)은 기지국 설정, RRM이 쓰는 파라미터 조정과 일부 장애 대응을 측정과 관리 데이터에 근거해 자동화하는 관리 개념이다. SDR(Software Defined Radio)은 RF 동작 파라미터를 소프트웨어로 설정하거나 바꿀 수 있는 기술을 쓰는 송수신기다. 어느 이름도 그 자체로 이동 중 무중단을 보장한다고 읽지 않는다.

## 세 개념의 위치

| 구분 | 정하는 것 | 동작 위치 | 기준 문서 |
|---|---|---|---|
| RRM | 무선 베어러 수락과 해제, 핸드오버 결정, 자원 스케줄링 | gNB, eNB | TS 38.300 4.2, TS 36.300 16 |
| SON | 새 기지국 설정, 이웃 셀 관계, 핸드오버와 부하, 커버리지 파라미터, 장애 대응 | 관리 시스템, 기지국 같은 네트워크 기능 또는 양쪽 | TS 32.500, TS 28.313, TS 38.300 15 |
| SDR | 주파수 범위, 변조 방식, 출력 같은 RF 파라미터를 소프트웨어로 설정하거나 바꿀 수 있는 송수신기 | 무선 장치 구현 | ITU-R SM.2152 |

## SON의 세 범주

SON은 Release 8에서 처음 3GPP 규격에 들어왔다(3GPP 소개 글은 2009년으로 적고, TS 32.500의 Rel-8 판은 2008-12에 승인됐다). TS 32.500은 여러 공급사의 많은 노드를 관리하는 운영 비용을 줄이려고 망 계획, 설정과 최적화 일부를 자동화해 수작업을 줄이는 개념으로 SON을 설명한다. SON 알고리즘 자체는 3GPP가 표준화하지 않는다. 규격은 측정, 노드 간 정보 교환, 관리 인터페이스와 요구사항을 정하고 판단 로직은 구현에 맡긴다.

| 범주 | 정의 | 예 |
|---|---|---|
| Self-configuration | 새로 배치한 노드가 자동 설치 절차로 운용에 필요한 기본 설정을 받는 과정이다. 전원과 백본 연결이 생긴 뒤 RF 송신기를 켜기 전의 pre-operational 상태에서 동작한다 | IP 주소 설정과 OAM 탐지, 기지국과 망의 인증, 소프트웨어와 운용 파라미터 내려받기, 초기 이웃 목록과 커버리지 설정 |
| Self-optimisation | 단말과 기지국 측정, 성능 측정으로 망을 자동 조정하는 과정이다. RF 인터페이스까지 켜진 operational 상태에서 동작한다 | 이웃 목록 최적화, 커버리지와 용량 제어, 핸드오버 파라미터 조정 |
| Self-healing | 자동으로 풀 수 있는 장애를 복구 동작으로 해결하거나 완화하는 SON 기능이다. 경보나 장애 탐지가 계기가 된다 | 셀 장애 탐지, 복구, 보상과 보상 해제, NE 소프트웨어 복구, 보드 장애 처리 |

앞의 두 정의는 LTE 규격 TS 36.300 22.1의 것이다. NR 규격 TS 38.300 15는 자가 설정과 자가 최적화를 기능별 절로 기술한다. 자가 치유의 개념과 요구사항은 GSM, UMTS, LTE 관리 규격인 TS 32.541이 다루며, 5GS SON 규격 TS 28.313 V19.2.0에는 자가 치유 사용 사례 절이 없다. TS 32.541은 셀 장애(cell outage)를 셀 커버리지 안의 무선 서비스가 전부 상실된 상태로 정의한다.

## 대표 기능

아래는 TS 38.300 V19.4.0의 NR 기준이다.

| 기능 | 하는 일 | 조정 범위와 주의 |
|---|---|---|
| ANR(Automatic Neighbour Relation) | 단말이 측정 보고한 이웃 셀 PCI로 전역 셀 ID를 읽게 해 이웃 셀 관계 표(NCRT)에 추가하고, 오래된 관계를 제거한다 | 탐지와 제거 로직은 구현마다 다르며 OAM도 관계를 추가, 삭제할 수 있다 |
| MRO(Mobility Robustness Optimisation) | 이동으로 인한 연결 실패, 불필요한 시스템 간 핸드오버, 시스템 간 핑퐁 등을 탐지하고 보정할 수단을 준다 | 단말의 RLF report 등으로 이동성 문제를 커버리지 문제와 구분한다 |
| MLB(Mobility Load Balancing) | 셀 간 부하 정보를 교환하고, 혼잡한 셀의 트래픽 일부를 옮기도록 핸드오버와 셀 재선택 파라미터를 조정하거나 부하 기반 핸드오버를 시작한다 | 대상 셀은 부하 분산 핸드오버에도 수락 제어를 수행한다 |
| RACH 최적화 | 단말의 랜덤 액세스 보고(시도별 경합 여부, SSB별 프리앰블 전송 수 등)와 기지국 간 PRACH 파라미터 교환으로 랜덤 액세스 설정을 맞춘다 | MRO의 실패 정의에서 성공한 핸드오버는 RA 절차 완료를 뜻한다(RACH-less LTM은 첫 상향 데이터 수신). 따라서 랜덤 액세스 설정이 이동성 판정과 이어진다(추론) |
| CCO(Coverage and Capacity Optimisation) | 커버리지 문제와 셀 가장자리 간섭 문제를 탐지해 해결하거나 완화한다 | gNB는 OAM이 준 대안 커버리지 설정 안에서 조정하고 전환하며, 바꾼 내용을 이웃 gNB에 알릴 수 있다 |
| Energy Saving | 예를 들어 기본 커버리지 셀과 구분되는 용량 증설 셀을 필요 없을 때 끄고 필요하면 다시 켠다. 시간, 주파수, 공간, 전력 영역의 적응 기법도 포함한다 | 끄기 전에 핸드오버로 단말을 옮길 수 있고, 이웃 gNB가 용량이 필요하면 재활성화를 요청할 수 있다 |
| PCI 최적화 | 셀의 물리 셀 ID(PCI)를 배정한다 | 중앙 방식은 OAM이 셀마다 하나를 정하고, 분산 방식은 OAM이 준 목록에서 gNB가 고른다 |

MRO가 구분하는 시스템 내부 이동의 연결 실패는 세 가지다.

- 너무 늦은 핸드오버: 단말이 한 셀에 오래 머문 뒤 무선 링크 실패(RLF)가 나고 다른 셀에서 연결 재수립을 시도한다.
- 너무 이른 핸드오버: 핸드오버 성공 직후 RLF가 나거나 핸드오버 도중 실패해 source 셀에서 재수립을 시도한다.
- 잘못된 셀로의 핸드오버: 같은 상황에서 source도 target도 아닌 셀에서 재수립을 시도한다.

TS 32.500의 범위에는 핸드오버 최적화, 커버리지와 용량 최적화와 함께 QoS 관련 무선 파라미터 최적화, 장애 대응을 위한 파라미터 최적화도 들어 있다. 셀 간 간섭 조정(ICIC)은 TS 36.300에서 RRM 기능으로 분류된다.

## 중앙형, 분산형, 하이브리드

SON 구조는 알고리즘이 실행되는 위치로 나눈다. 규격은 사용 사례의 필요에 따라 구조를 고른다고 설명한다.

| 구조 | 알고리즘 위치 | 규격의 세부 |
|---|---|---|
| 중앙형(C-SON) | 관리 시스템 | LTE 관리 규격 TS 32.500은 NM-Centralised와 EM-Centralised로, 5GS 관리 규격 TS 28.313은 Cross Domain-Centralized와 Domain-Centralized로 나눈다 |
| 분산형(D-SON) | 기지국 같은 네트워크 요소나 네트워크 기능 | 관리 시스템은 기능을 켜고 끄며 정책, 목표, 허용 범위를 주고 결과를 평가한다 |
| 하이브리드(H-SON) | 둘 이상의 계층 | 관리 시스템과 네트워크 기능이 함께 하나의 SON 알고리즘을 이루며, 판단 주체는 사례에 따라 관리 시스템, 네트워크 기능 또는 양쪽이다 |

TS 28.313은 중앙형 처리를 모니터링, 분석, 결정, 실행, 평가 단계로 설명한다. TS 32.541은 NE에 있으면서 더 빠른 대응이 필요한 일부 자가 치유 기능은 장애 탐지 자체를 계기로 삼을 수 있다고 설명한다.

자동화의 경계도 규격에 있다.

- Open loop는 SON이 제안한 변경을 운영자 응답 뒤에 적용하고, closed loop는 운영자 응답 없이 적용한다. 운영자가 SON의 신뢰성을 확인하면서 open loop에서 closed loop로 쉽게 넘어갈 수 있어야 한다(TS 32.500 REQ-SON-CON-01, 05, 06).
- 핸드오버와 재선택 파라미터의 자동 변경은 OAM이 허용한 범위 안에서만 한다. OAM은 MRO에 핸드오버 트리거의 최대 편차를 주고, 변경 사이 최소 시간으로 알고리즘의 안정성과 수렴을 제어한다(TS 38.300 15.5.1.4, 15.5.2.5).
- MLB와 MRO는 모두 핸드오버와 재선택 파라미터를 바꾼다. TS 32.500은 SON 기능 사이의 부정적 영향을 막거나 줄일 것을 요구하고, 공급사마다 다른 최적화 알고리즘이 ping-pong과 진동 현상을 만들 수 있다고 설명한다.

## RRM: 수락 제어와 이동성 제어

TS 36.300은 RRM의 목적을 가용 무선 자원의 효율적 사용과 자원 관련 요구 충족으로 두고, 단일 셀과 여러 셀 측면을 함께 고려해 자원을 할당, 재할당, 해제한다고 설명한다. 아래 정의는 LTE 규격의 것이며, NR에서도 gNB가 Radio Bearer Control, Radio Admission Control, Connection Mobility Control과 상향, 하향, sidelink의 동적 자원 할당(scheduling)을 맡는다(TS 38.300 4.2).

- Radio Admission Control(RAC): 새 무선 베어러 수립 요청을 수락하거나 거절한다. 전체 자원 상황, QoS 요구, 우선순위와 진행 중 세션이 받는 QoS를 고려해, 자원이 있으면 받아 이용률을 높이고 수용할 수 없으면 거절해 진행 중 세션의 QoS를 지킨다.
- Connection Mobility Control(CMC): idle 모드에서는 임계값과 히스테리시스 같은 파라미터로 셀 재선택을 제어한다. connected 모드에서는 단말과 기지국 측정에 이웃 셀 부하, 트래픽 분포, 전송과 하드웨어 자원, 운영자 정책을 더해 핸드오버를 결정할 수 있다.
- Radio Bearer Control(RBC): 무선 베어러를 설정할 때 전체 자원 상황과 진행 중 세션, 새 서비스의 QoS 요구를 고려하고, 이동 등으로 자원 상황이 바뀌면 진행 중 세션의 무선 베어러를 유지하며, 세션 종료나 핸드오버 때 관련 자원을 해제한다.
- Load Balancing과 ICIC: 여러 셀의 부하 불균형과 셀 간 간섭을 다룬다. LB는 핸드오버나 셀 재선택으로 부하가 높은 셀의 트래픽을 여유 있는 셀로 옮길 수 있고, ICIC는 여러 셀이 주파수 영역과 시간 영역의 자원 사용을 조율하게 한다.

이 기능들은 gNB 간 핸드오버에서 만난다(TS 38.300 9.2.3). 기본 시나리오에서는 AMF와 UPF가 바뀌지 않고 준비와 실행 단계를 5GC 개입 없이 gNB끼리 진행하며, 완료 단계의 경로 전환에 5GC가 관여한다.

1. source gNB가 측정 보고와 RRM 정보로 핸드오버를 결정하고 Xn으로 HANDOVER REQUEST를 보낸다.
2. target gNB가 수락 제어를 하고 새 RRC 설정을 담은 HANDOVER REQUEST ACKNOWLEDGE를 돌려준다.
3. 단말이 이전 셀에서 분리돼 새 셀에 동기화하는 동안 source gNB는 버퍼에 있던 데이터와 새로 온 하향 데이터를 target gNB로 넘기고, target gNB가 이를 버퍼링한다.
4. 완료 단계에서 target gNB의 경로 전환 요청으로 UPF의 경로가 target으로 바뀌고 source의 자원이 해제된다.

target이 source와 같은 DRB 설정을 쓰면 핸드오버 중 데이터 전달, 순서 보장과 중복 방지를 보장할 수 있다. DAPS(Dual Active Protocol Stack) 핸드오버에서는 단말이 source 셀을 해제할 때까지 source gNB에서 하향 데이터를 계속 받고, target으로 랜덤 액세스를 마칠 때까지 상향 데이터를 source로 보낸다. DAPS는 source gNB가 요청하고 target gNB가 수락해야 적용된다.

## SDR은 재구성 가능한 송수신기다

ITU-R Report SM.2152(2009)는 SDR을 주파수 범위, 변조 방식, 출력 등을 포함한 RF 동작 파라미터를 소프트웨어로 설정하거나 바꿀 수 있는 기술을 쓰는 송신기나 수신기로 정의한다. 시스템 규격이나 표준에 따라 미리 설치되고 정해진 정상 동작 중의 파라미터 변경은 정의에서 뺀다. 이 제외 조항에 따르면 표준이 정한 링크 적응으로 MCS를 바꾸는 것([[Wireless-Multiple-Access|무선 다중접속과 공간 다중화]])만으로는 SDR이라 부를 근거가 되지 않는다(해석). 소프트웨어로 바꿀 수 있는 범위는 정의가 정하지 않으므로 장치 사양으로 확인한다.

같은 보고서는 운용 환경과 지리적 환경, 정해진 정책과 내부 상태를 파악해 정해진 목표를 이루도록 동작 파라미터와 프로토콜을 동적이고 자율적으로 조정하고, 결과에서 학습하는 시스템을 CRS(Cognitive Radio System)로 따로 정의한다. SDR은 소프트웨어로 바꿀 수 있는 송수신기이고, 바꿀 내용을 스스로 판단하는 쪽은 CRS의 정의에 가깝다. SDR은 관리 시스템과 기지국이 망의 운용 파라미터를 조정하는 SON과도 대상이 다르다.

## 웹 애플리케이션에서 읽는 법

- 기지국 변경과 IP 주소 변경을 구분한다. 5GS에서 단말 IP 주소는 SMF가 할당하고 관리하며, UPF는 RAT 내부와 RAT 간 이동성의 앵커가 될 수 있다(TS 38.300 4.2). IP 유형의 SSC mode 1 PDU 세션은 단말이 셀이나 접속 유형을 바꿔도 처음의 앵커 UPF를 유지해 IP 연속성을 지원한다. SSC mode 2에서는 망이 세션을 해제하고 새 세션을 맺게 할 수 있으며, 세션 해제는 할당된 IP의 해제로 이어진다. SSC mode 3은 새 앵커로 먼저 연결한 뒤 이전 연결을 끊고, 앵커가 바뀌면 IP가 유지되지 않으며 이전 주소는 일정 시간 뒤 해제된다(TS 23.501 5.6.9).
- 세션 모드는 앱 코드가 정하지 않는다. SMF가 가입 정보의 허용 모드, PDU 세션 유형과 단말 요청으로 고르며, 단말은 운영자가 URSP로 준 정책에 따라 앱이나 앱 그룹별 모드를 요청할 수 있다. 정해진 모드는 PDU 세션 수명 동안 바뀌지 않는다. PDU 연결을 지원하는 단말은 mode 1을 지원해야 하고 mode 2와 3은 선택 사항이다.
- 망에 NAT가 있으면 서버가 보는 주소는 단말의 PDU 세션 주소와 다를 수 있다(TS 23.501 5.6.10.1). 서버 로그의 IP 변화와 단말 IP 변화를 같은 것으로 보지 않는다.
- 주소가 바뀌면 상위 계층이 따로 대응한다. 일반 TCP 연결은 주소와 포트 조합에 묶여 있어 새로 맺어야 하고, QUIC은 Connection ID로 연결 이전을 시도할 수 있다([[HTTP-3#연결 이전 (Connection Migration)|QUIC 연결 이전]]). 로그인 상태는 쿠키나 토큰 같은 애플리케이션 세션으로 이어진다([[Session-Presentation-Application-Layer|세션, 프레젠테이션, 애플리케이션 계층]]).
- 핸드오버는 손실보다 지연으로 드러날 수 있다(추론). 기본 핸드오버에서는 source가 넘긴 데이터를 target이 버퍼링했다가 전달하기 때문이다. 이동 구간에서는 오류율과 함께 RTT 분포, 재연결 횟수와 재시도 결과를 나눠 기록한다(측정 제안).
- 망의 SON과 RRM은 앱 코드가 직접 바꾸지 않는다. 3GPP의 2024년 소개 글은 SON이 개념 수준으로만 규정되고 보편적으로 채택되지는 않았다고 설명하므로, 특정 사업자 망의 적용 여부는 사업자 자료나 실측으로 확인한다. 앱에서 할 수 있는 일은 재연결과 멱등한 재시도([[tech/web/http/Idempotency|Idempotent / Safe Method]])처럼 연결 변화를 견디는 설계다(제안).

## 확인 범위

2026-11-04에 3GPP Release 19 문서(TS 32.500 V19.0.0, TS 32.541 V19.0.0, TS 28.313 V19.2.0, TS 36.300 V19.2.0, TS 38.300 V19.4.0, TS 23.501 V19.9.0)와 ITU-R SM.2152(2009)의 해당 절을 대조했다. 기능의 정의와 규격상 절차만 확인했으며, 특정 사업자 망의 SON 적용 여부, 장비 구현과 실제 핸드오버 시간은 확인하지 않았다.

## 출처

- [3GPP, TS 32.500 V19.0.0 Self-Organizing Networks (SON); Concepts and requirements](https://www.etsi.org/deliver/etsi_ts/132500_132599/132500/19.00.00_60/ts_132500v190000p.pdf) — SON 범위, 구조 정의, open loop와 closed loop 요구사항
- [3GPP, TS 28.313 V19.2.0 Self-Organizing Networks (SON) for 5G networks](https://www.etsi.org/deliver/etsi_ts/128300_128399/128313/19.02.00_60/ts_128313v190200p.pdf) — 5GS의 C-SON, D-SON, H-SON과 중앙형 처리 단계
- [3GPP, TS 32.541 V19.0.0 SON; Self-healing concepts and requirements](https://www.etsi.org/deliver/etsi_ts/132500_132599/132541/19.00.00_60/ts_132541v190000p.pdf) — 자가 치유의 목적, 셀 장애 정의와 사용 사례
- [3GPP, TS 36.300 V19.2.0 E-UTRA and E-UTRAN; Overall description; Stage 2](https://www.etsi.org/deliver/etsi_ts/136300_136399/136300/19.02.00_60/ts_136300v190200p.pdf) — 16 RRM 기능, 22.1 자가 설정과 자가 최적화 정의
- [3GPP, TS 38.300 V19.4.0 NR and NG-RAN Overall description; Stage-2](https://www.etsi.org/deliver/etsi_ts/138300_138399/138300/19.04.00_60/ts_138300v190400p.pdf) — 4.2 기능 분담, 9.2.3 핸드오버와 DAPS, 15 SON 기능
- [3GPP, TS 23.501 V19.9.0 System architecture for the 5G System (5GS)](https://www.etsi.org/deliver/etsi_ts/123500_123599/123501/19.09.00_60/ts_123501v190900p.pdf) — 5.6.9 SSC mode와 IP 주소 유지
- [ITU-R, Report SM.2152 (09/2009) Definitions of Software Defined Radio (SDR) and Cognitive Radio System (CRS)](https://www.itu.int/dms_pub/itu-r/opb/rep/R-REP-SM.2152-2009-PDF-E.pdf) — SDR과 CRS 정의
- [Self-Organising Networks (SON) — 3GPP](https://www.3gpp.org/technologies/son) — Release 8 도입, 개념 수준 규정과 채택 현황. 2024-06-17 작성, 2025-04-03 갱신된 소개 글

## 관련 문서

- [[Mobile-Network-Continuity|이동 환경의 통신 연속성]]
- [[Wireless-Multiple-Access|무선 다중접속과 공간 다중화]]
- [[Satellite-Direct-to-Device|위성 직접 연결]]
- [[Session-Presentation-Application-Layer|세션, 프레젠테이션, 애플리케이션 계층]]
- [[HTTP-3|HTTP/3와 QUIC]]
