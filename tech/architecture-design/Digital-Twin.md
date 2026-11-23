---
tags: [architecture, digital-twin, simulation, virtual-commissioning, real-time-3d, manufacturing, logistics]
status: done
verified_at: 2026-11-23
category: "아키텍처&설계(Architecture&Design)"
aliases: ["Digital Twin", "디지털 트윈", "디지털 트윈 성숙도", "Virtual Commissioning", "가상 시운전", "CAD to Real-Time 3D", "CAD 실시간 3D 변환"]
---

# 디지털 트윈: 성숙도 단계, 가상 시운전과 3D 모델 준비

디지털 트윈은 물리 자산, 시설이나 공정을 가상 공간에 재현하고 실제 데이터와 연결해, 변경을 현장에 적용하기 전에 관찰하고 예측하고 시험하는 체계다. 3D 모델만 있는 상태부터 스스로 판단해 실행하는 상태까지 범위가 넓으므로, 디지털 트윈이라는 말을 들으면 어느 단계를 가리키는지부터 확인한다. 물류센터 운영에 적용한 결정과 시작 조건은 [[Warehouse-Operations-Simulation|물류센터 운영 시뮬레이션]]에 있다.

## 성숙도 단계

Unity Learn의 디지털 트윈 입문 튜토리얼은 다섯 단계를 둔다(2026-11-23 확인). 튜토리얼은 이를 Level 1~5의 유형으로 부르고, 성숙도 모델(Digital Twin Maturity Model)이라는 이름은 Unity가 삼성SDS REAL Summit 2026에서 발표한 자료의 표현이다.

| 단계 | 하는 일 | 튜토리얼의 설명과 예 |
|---|---|---|
| 1. 가상 트윈(virtual twin) | 실제 대상을 정확히 재현한 상호작용 가능한 3D 모델. 이후 단계의 기준이 된다 | 건물의 3D CAD/BIM 모델 |
| 2. 연결 트윈(connected twin) | 실시간 데이터와 IoT를 붙여 현재 상태를 모니터링하고 보고한다 | 집의 열 분포와 전력 사용량을 실시간으로 보여 주는 모델 |
| 3. 예측 트윈(predictive twin) | 2단계 데이터를 분석해 결과와 문제를 예측한다. 의사결정 보조 도구다 | 건물의 월별 가스 사용량 예측 |
| 4. 처방 트윈(prescriptive twin) | 모델링, 실시간 시뮬레이션과 머신러닝으로 시나리오를 돌려 대안과 권고를 낸다 | 더 비용 효율적인 대안 모델 제안 |
| 5. 자율 트윈(autonomous twin) | 여러 실시간 데이터에서 배워 사람의 개입 없이 문제를 바로잡는다 | 다른 차량과 보행자의 행동을 시각과 센서 데이터로 예측하는 자율주행차 |

- 단계의 이름과 수는 프레임워크마다 다르다. 인용할 때는 어느 프레임워크의 몇 단계인지 함께 적는다(운영 제안).
- 4단계까지는 결과를 사람이 보고 물리 시스템에 반영한다. 5단계는 실행 권한까지 넘기는 단계라 예측 정확도보다 실행 범위, 승인과 되돌리기 조건을 먼저 정해야 한다(해석). 실행을 단계적으로 넘기는 기준은 [[Agent-Ready-Data#단계적 자율성 — 신입에게 첫날 법인카드를 주지 않는다|에이전트의 단계적 자율성]]과 같다.

## 어느 계층에 연결하는가

물류와 제조 현장의 정보와 제어는 여러 계층으로 나뉜다. 트윈이 어느 계층의 데이터와 연결되는지가 무엇을 재현할 수 있는지를 정한다(해석).

| 계층 | 다루는 것 | 트윈이 얻는 것 |
|---|---|---|
| ERP | 주문, 구매, 재무 | 수요와 주문 시나리오 |
| WMS | 재고, 로케이션, 작업 지시 | 재고 배치, 작업량과 작업자 동선 |
| WCS | 컨베이어, 분류기, 자동 창고 같은 설비의 작업 실행 | 설비 처리량과 대기열 |
| SCADA, PLC | 설비 감시와 입출력 제어 | 제어 로직과 타이밍 |
| 센서(RFID, LiDAR, 영상) | 지게차, 팔레트와 작업자의 위치 | 실제 동선과 작업 시간의 측정값 |

WMS 수준까지만 연결한 트윈으로는 작업 배분과 동선을 검증할 수 있지만 설비 제어 로직은 검증할 수 없다. 반대로 PLC를 붙인 트윈은 제어 로직을 시험할 수 있어도 주문 변동을 재현하려면 WMS와 ERP 데이터가 필요하다(해석). 창고 작업 흐름의 도메인 모델은 [[WMS-Outbound-Context-Modeling|WMS 출고 컨텍스트]]에 있다.

## 모델 신뢰도는 실제 운영 지표와 비교해 정한다

시뮬레이션이 빠르고 시나리오를 많이 돌린다는 사실은 결과를 믿을 근거가 아니다. 다음은 신뢰도를 정하는 절차다(운영 제안).

1. 현재 운영 조건을 넣어 돌린 결과를 실제 처리량, 리드타임과 작업 시간과 비교한다. 차이가 허용 범위에 들어온 뒤에 대안 시나리오를 비교한다.
2. 데이터가 없는 구간은 합리적인 가정으로 시작하고 가정을 기록한다. 검증하면서 실제 값으로 바꾼다.
3. 결과마다 모델 버전, 입력 기간과 가정을 함께 남긴다. 모델이 재현하지 않는 조건(설비 고장, 작업자 숙련 차이)은 해석에서 지우지 않고 한계로 적는다.

가상 하드웨어에서 통과한 범위와 실제 장비에서 확인할 범위를 나누는 기준은 [[Test-Pyramid-Blind-Spots#가상 하드웨어에서 통과한 범위를 구분한다|테스트의 사각지대]]와 같다.

## 가상 시운전

시운전(commissioning)은 새 설비를 실제 생산이 가능한 상태로 만드는 과정이다. 과거에는 PLC 프로그래밍과 시스템 시험 대부분에 실제 하드웨어가 있어야 해 일정 지연과 막판 문제 해결이 잦았다. 가상 시운전은 PLC가 실제 장치, 센서와 구동기 대신 그 동작을 모사한 디지털 트윈과 통신하게 해 이 과정을 가상 환경에서 먼저 한다. 가상 단계와 실제 단계에 같은 PLC 프로그램을 쓰므로 하드웨어가 도착한 뒤 코드를 고치지 않고 넘길 수 있다는 것이 Unity 블로그 기고의 설명이다.

- **검증할 수 있는 것:** 제어 로직과 동작 순서, 설비 사이의 신호 교환, 상위 시스템(WMS)과의 전문(telegram) 통신.
- **현장에 남는 것:** 기계와 전기 결합, 센서 설치 오차, 실제 부하에서의 타이밍. 현장 시험은 기계, 로봇 팔과 컨베이어를 실제로 움직이므로 오작동이 작업자를 다치게 할 수 있다는 점도 로직을 가상에서 먼저 시험하는 이유로 든다.
- **모델 범위가 검증 범위다:** 필드버스, 구동기, 안전 모듈, RFID 리더 같은 부품을 어디까지 모사했는지 기록하고, 모사하지 않은 부품에 걸린 로직은 통과로 세지 않는다(운영 제안).

PLC 코드를 생성형 AI로 만들 때도 에뮬레이터와 설비 시뮬레이션을 시험 환경으로 쓴다. 그 시뮬레이션이 실제 설비를 얼마나 대표하는지 판단하는 일은 사람에게 남는다([[PLC-Engineering-AI#사람에게 남는 책임|AI 코드 생성과 PLC 엔지니어링]]).

### 사례 (Unity 게시 고객 사례)

- **SEW-EURODRIVE와 realvirtual.io (2025-03-19 게시):** 구동 장치 회사의 MOVI-C 컨트롤러를 시뮬레이션 인터페이스로 Unity 트윈에 연결해 PLC 자동화 로직을 배치 전에 시험했다. 결과로 시운전 시간 70% 감소(같은 글 본문은 최대 70%로 표기)와 PLC 로직의 100% 사전 시험을 들고, 현장에서는 기계와 전기 문제만 다루면 된다고 적는다.
- **SpiraTec (Unity 블로그 기고):** 한 물류 회사의 창고 시뮬레이션에 가상 PLC 12개를 넣고 필드버스 에뮬레이션과 구동기, 안전 모듈, RFID 리더를 모사했으며, WMS와 전문 통신으로 연결해 실제 기계가 생기기 전에 소프트웨어를 검증했다. 시운전 시간을 30% 줄였다고 적는다.

두 수치 모두 Unity가 게시한 고객 사례이며 비교 기준(기존 시운전 기간, 설비 규모)을 밝히지 않았다. 다른 프로젝트의 단축 목표로 옮기지 않는다.

## 3D 모델 준비: CAD를 실시간 3D로 바꾼다

설계용 CAD, BIM과 점군 데이터는 공학적 정밀도를 위해 만들어져 그대로는 실시간 렌더링에 무겁다. 1단계 가상 트윈을 만들 때 3D 데이터 변환이 병목이 되는 이유다. Unity Asset Transformer SDK 2026.1 문서의 데이터 준비 흐름은 다음 순서다(2026-11-23 확인). 1단계 세부와 아래 테셀레이션 허용치는 SDK 2026.4 가져오기 지침 기준이고, 최신 2026.6 문서와는 대조하지 않았다.

1. **가져오기(Import):** 필요한 정보만 읽도록 설정하고 곡면을 폴리곤으로 바꾼다(테셀레이션). 렌더링에 필요 없는 작도용 점과 선은 일찍 지운다.
2. **고치기(Fix, 선택):** 기하 결함을 고쳐 형상이 올바른 모델을 만든다.
3. **다듬기(Stage, 선택):** UV, 재질과 앰비언트 오클루전을 더해 마스터 모델(LOD0)을 만든다.
4. **최적화(Optimize, 선택):** LOD0의 품질과 파일 크기를 줄인다.
5. **LOD 생성(선택):** decimation 강도를 달리해 LOD0부터 LOD3 이상까지 사슬을 만든다.
6. **내보내기(Export).**

테셀레이션 품질은 CAD 곡면과 메시 사이의 최대 거리(maximum sag), 모델 크기에 대한 그 거리의 비율(sag ratio), 인접 폴리곤 법선 사이의 최대 각도와 선택적인 최대 변 길이로 정한다. 네 값 모두 시각 충실도와 폴리곤 수를 맞바꾸는 허용치다.

다음은 변환을 설계할 때의 판단 기준이다(설계 판단).

- **계층과 메타데이터를 보존한다.** 부품 이름과 속성이 남아 있어야 3D 객체를 WMS 로케이션이나 설비 ID에 연결하고, 이름 규칙으로 재질을 바꾸는 규칙 기반 처리를 할 수 있다.
- **반복 여부로 도구를 고른다.** Unity는 개별 복잡 자산은 데스크톱 앱(Studio)에서 손으로, 비슷한 자산의 반복 가져오기는 에디터 안의 규칙 기반 도구(Toolkit)로, 대량 처리는 자체 인프라의 headless 배치(SDK)나 클라우드 자동화로 나눈다. 같은 변환을 여러 번 한다면 손 작업 결과보다 변환 규칙과 스크립트를 버전 관리할 자산으로 남긴다.
- **대상 기기의 성능 예산을 먼저 정한다.** 웹, 태블릿과 XR 중 어디서 돌릴지 정한 뒤 decimation과 LOD 강도를 맞춘다.

Unity 제품 페이지는 70개가 넘는 CAD, BIM, 메시와 점군 형식을 읽는다고 적는다. 지원 형식 목록은 버전마다 바뀌므로 도입 전에 실제 원본 형식을 해당 버전 문서에서 확인한다.

## 코딩 에이전트가 3D 편집기를 조작하는 경로

트윈 장면의 설비 배치와 데이터 연결을 편집기 명령으로 자동화할 수 있다. Unity는 2026-07-15 CLI 베타를 냈고, 2026-11-17 Unity CLI와 Pipeline 패키지(`com.unity.pipeline`)를 1.0으로 공개했다. Pipeline 패키지는 CLI가 실행 중인 에디터를 조작하게 해, 스크립트나 에이전트가 프로젝트를 열고 명령을 실행한 뒤 결과를 확인할 수 있게 한다. Claude Code, Codex, Grok Build와 Google Antigravity용 공식 플러그인이 있다. MCP 경로(AI Assistant 2.0.0-pre.1 문서의 Unity MCP)는 외부 MCP 클라이언트가 직접 연결할 때 Project Settings의 대화상자에서 사용자가 승인해야 허용한다.

에이전트가 편집기를 조작하는 권한과 트윈이 현장 설비에 작업을 지시하는 권한은 다른 것이다. 앞의 것은 개발 도구 권한으로, 뒤의 것은 5단계의 실행 권한으로 따로 관리한다(설계 판단).

## 도입 점검 질문

- 지금 필요한 것은 몇 단계 트윈인가. 모니터링(2단계)이 목적인데 자율 실행(5단계)을 전제로 범위를 잡지 않았는가.
- 트윈이 어느 계층(ERP, WMS, WCS, PLC, 센서)과 연결되며, 그 연결로 검증할 수 없는 조건은 무엇인가.
- 현재 운영을 재현한 결과를 실제 지표와 비교했는가. 비교 전에 나온 시나리오 순위를 결정에 쓰지 않았는가.
- 가상 시운전에서 통과한 범위와 현장에서 다시 확인할 범위를 나눴는가.
- 3D 변환을 반복한다면 변환 규칙과 스크립트를 버전 관리하는가.

## 출처

- [Unity Learn, Introduction to Digital Twins with Unity](https://learn.unity.com/tutorial/introduction-to-digital-twins-with-unity) — 2026-11-23 다섯 단계의 이름, 정의와 예시 대조. 튜토리얼 표기 버전은 Unity 2022.3.
- [How SpiraTec is Redefining Manufacturing — Unity Blog](https://unity.com/blog/spiratec-virtual-commissioning) — 2026-11-23 가상 시운전의 정의, 같은 PLC 코드 사용, 가상 PLC 12개와 WMS 전문 통신, 30% 단축 주장 대조.
- [SEW-EURODRIVE and realvirtual.io: Accelerating virtual commissioning with Unity — Unity](https://unity.com/resources/sew-eurodrive) — 2025-03-19 게시. 2026-11-23 70% 단축(본문의 최대 70%), 사전 시험, 현장에 남는 기계와 전기 문제, 현장 시험의 부상 위험 대조.
- [Unity, Asset Transformer SDK 2026.1, Data preparation workflow](https://docs.unity.com/en-us/asset-transformer-sdk/2026.1/manual/sdktips/global-guidelines) — 2026-11-23 여섯 단계와 단계별 결과물 대조.
- [Unity, Asset Transformer SDK 2026.4, Import guidelines](https://docs.unity.com/en-us/asset-transformer-sdk/2026.4/manual/sdktips/import-guidelines) — 2026-11-23 테셀레이션 허용치 네 가지와 작도용 점, 선 삭제 대조.
- [Studio, Toolkit, SDK, or Pipeline Automation: choose your Asset Transformer tool — Unity](https://unity.com/resources/choose-asset-transformer-tool) — 2026-09-11 게시. 2026-11-23 도구별 용도 대조.
- [Unity Asset Transformer — Unity](https://unity.com/products/unity-asset-transformer) — 2026-11-23 70개 이상 형식, LOD와 decimation 기능 표기 대조.
- [The Unity CLI 1.0 is here! — Unity Blog](https://unity.com/the-unity-cli-1.0-is-here) — 2026-11-17 게시. 2026-11-23 베타 시작일, 1.0 공개, Pipeline 패키지와 공식 플러그인 대조.
- [Unity, AI Assistant 2.0.0-pre.1, Unity MCP](https://docs.unity3d.com/Packages/com.unity.ai.assistant%402.0/manual/unity-mcp-overview.html) — 2026-11-23 MCP 연결 대상과 직접 연결 승인 방식 대조.
- [Unity Industry and AI를 활용한 물류 혁신 — 삼성SDS REAL Summit 2026 발표 자료, 유니티](https://image.samsungsds.com/kr/real/2026/assets/uploads/sessionPDF/Track%205-6%20%EC%9C%A0%EB%8B%88%ED%8B%B0_%EC%9E%A5%EA%B1%B4%EC%9A%B0%20%EB%A6%AC%EB%8D%94_Unity%20Industry%20and%20AI%EB%A5%BC%20%ED%99%9C%EC%9A%A9%ED%95%9C%20%EB%AC%BC%EB%A5%98%20%ED%98%81%EC%8B%A0_%EB%B0%B0%ED%8F%AC%EB%B3%B8.pdf) — 2026년 9월 발표. 성숙도 다섯 단계, 물류 시스템 계층(WMS, WCS, SCADA, ERP, PLC), 3D 변환 병목, 가상 시운전 사례와 AI 편집 흐름의 계기. 제품 기능 목록과 교육, 항만, 공항 사례는 옮기지 않았다.
- [디지털 트윈 기반 물류센터 혁신 사례 — 삼성SDS REAL Summit 2026 발표 자료, 삼성SDS](https://image.samsungsds.com/kr/real/2026/assets/uploads/sessionPDF/Track%205-4%20%EC%82%BC%EC%84%B1SDS%20%EB%AC%B8%EB%B3%B4%EC%98%81%20%EA%B7%B8%EB%A3%B9%EC%9E%A5_%EB%94%94%EC%A7%80%ED%84%B8%20%ED%8A%B8%EC%9C%88%20%EA%B8%B0%EB%B0%98%20%EB%AC%BC%EB%A5%98%EC%84%BC%ED%84%B0%20%ED%98%81%EC%8B%A0%20%EC%82%AC%EB%A1%80_%EB%B0%B0%ED%8F%AC%EB%B3%B8.pdf) — 2026년 9월 발표. 실제 운영 지표와의 비교, 가정으로 시작해 검증하며 정교화하는 절차.

## 관련 문서

- [[Warehouse-Operations-Simulation|물류센터 운영 시뮬레이션]] — 적치, 피킹, 인력 배치와 시작 조건
- [[PLC-Engineering-AI|AI 코드 생성과 PLC 엔지니어링]] — 에뮬레이터와 설비 시뮬레이션의 대표성 판단
- [[Test-Pyramid-Blind-Spots|테스트의 사각지대]] — 가상 하드웨어에서 통과한 범위
- [[Robot-Policy-Training-Pipeline|로봇 정책 학습과 평가 파이프라인]] — 로봇 시뮬레이션과 sim-to-real 차이
- [[Agent-Ready-Data|에이전트용 데이터 준비]] — 실행 권한의 단계적 이양
- [[WMS-Outbound-Context-Modeling|WMS 출고 컨텍스트 모델링]]
- [[Generative-3D-Asset-Workflow|생성형 3D 자산 제작]]
- [[Ontology-Knowledge-Graph|온톨로지와 지식 그래프]] — 조직의 운영 계층을 트윈으로 보는 관점
