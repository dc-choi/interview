---
tags: [cs, semiconductor, semiconductor-foundry, yield, pdk, eda, computer-architecture]
status: done
verified_at: 2026-11-23
category: "CS - 기초"
aliases: ["Semiconductor Foundry Selection", "파운드리 선택과 전환 비용", "팹리스와 파운드리"]
---

# 파운드리 선택: 수율, 설계 생태계와 전환 비용

칩을 설계하는 일과 그 설계를 웨이퍼 위에서 안정적으로 대량생산하는 일은 다른 역량이다. 파운드리를 고르거나 바꾸는 판단은 웨이퍼 단가보다 수율, 설계 도구와 IP의 검증 범위, 패키징과 생산 일정을 함께 본다.

## 팹리스, 파운드리, IDM

| 형태 | 하는 일 | 예 |
| --- | --- | --- |
| 팹리스 | 칩의 구조(연산기, 캐시, 메모리 연결, 전력 목표)를 설계하고 제조는 맡긴다 | NVIDIA, AMD, Qualcomm |
| 파운드리 | 고객이 설계한 칩을 자기 공정으로 제조한다 | TSMC |
| IDM(종합반도체) | 설계와 제조를 모두 한다 | Samsung Electronics, Intel |

TSMC는 고객 제품의 제조에만 집중하는 순수 파운드리 모델을 택했고, 공식 경영 철학에서 창립 이래 고객을 파트너로 대하며 고객과 경쟁하지 않았다고 밝힌다(2026-11-23 확인). 이 원칙이 고객에게 중요한 이유는 차세대 칩의 공정 선택, 다이 크기, 성능과 전력 목표, 출시와 생산 물량을 설계 초기부터 제조사와 함께 검토해야 하기 때문이다. 제조사가 같은 시장의 칩도 팔면 고객은 미공개 제품 정보를 넘기는 데 부담을 느낄 수 있다. 다만 IDM의 파운드리 사업이 실제로 고객 정보를 어떻게 분리하는지는 이 문서에서 검증하지 않았다.

## 장비를 사는 것과 양산하는 것은 다르다

아래 문단은 출처의 강의 설명이며 1차 자료로 대조하지 않았다. 같은 노광 장비를 사도 결과가 다를 수 있다. 칩은 재료 증착, 노광, 식각을 반복해 트랜지스터와 배선을 쌓는데, 앞 단계의 두께나 패턴 위치가 조금 어긋나면 다음 단계 조건과 배선 연결에 영향을 준다. 같은 종류의 장비도 개체마다 상태 편차가 있으므로 제조사는 단계별 조건을 맞추고 결과를 측정해 계속 보정하며, 불량이 나오면 시작된 단계를 찾아 고친다. 시제품 몇 개가 동작하는 것과 생산량을 늘려도 같은 품질을 유지하는 것은 다른 문제다.

새 공정 발표를 읽을 때도 미세 구조를 만드는 기술의 확보와 고객의 복잡한 칩을 계획한 물량만큼 안정적으로 생산하는 단계를 나눈다(읽는 기준).

## 수율이 원가와 물량을 바꾼다

수율(yield)은 웨이퍼에서 만든 칩 가운데 검사를 통과해 쓸 수 있는 칩의 비율이다. 결함이나 공정 편차로 목표 속도나 전력을 맞추지 못한 칩은 빠진다.

단순 계산 예시: 웨이퍼 한 장 제조비가 900만 원이고 칩 100개가 들어간다고 하자.

| 정상 칩 | 수율 | 정상 칩 하나당 웨이퍼 제조비 |
| --- | --- | --- |
| 90개 | 90% | 10만 원 |
| 60개 | 60% | 15만 원 |

같은 비용으로 같은 수의 칩을 만들어도 수율 차이만으로 정상 칩 하나당 제조비가 50% 높아진다. 같은 물량을 납품하려면 웨이퍼도 더 많이 생산해야 한다. 실제 칩 원가에는 패키징, 테스트와 설계비가 더해지므로 이 계산은 수율의 방향을 보여주는 예시일 뿐 원가 모델이 아니다.

### 수율 숫자는 칩 크기와 함께 읽는다

다이가 클수록 웨이퍼에 들어가는 칩 수가 줄고, 같은 결함 하나가 작은 칩이면 한 개만 버리지만 큰 칩이면 전체를 버리게 될 수 있다. 그래서 같은 공정에서도 큰 칩은 수율을 높이기 어렵다. 강의는 일부 회로의 결함을 비활성화해 낮은 등급 제품으로 파는 경우도 있어 실제 관계는 이보다 복잡하다고 덧붙인다.

대형 AI GPU는 한 번에 노광할 수 있는 영역에 가깝다. 26mm x 33mm(858mm²)는 ASML의 DUV 액침 스캐너(NXT:2000i)와 0.33 NA EUV 스캐너(NXE:3600D)가 공통으로 밝히는 최대 노광 영역이다. NVIDIA가 밝힌 다이 면적은 2020년 발표한 GA100(A100, TSMC N7) 826mm², 2022년 발표한 GH100(H100, TSMC 4N) 814mm²다. 칩 사이 절단 공간 등이 필요해 노광 영역 전체를 칩으로 쓰지는 못한다.

수율 비교 기사에서 확인할 것(읽는 기준):

- 어떤 칩(모바일용 소형 칩인지 대형 GPU인지)에서 나온 수치인가.
- 어떤 공정과 시점의 수치인가. 공정 초기와 성숙기의 수율은 다르다.
- 회사가 공식 발표한 수치인가, 추정 보도인가.

회사 전체를 대표하는 수율 하나로 두 파운드리의 제조 실력을 단정하지 않는다.

## 생산 경험과 설계 생태계가 누적된다

TSMC는 2025년에 534개 고객의 제품 12,682종을 305가지 공정 기술로 생산했다고 밝힌다(공식 회사 소개, 2026-11-23 확인). 다양한 칩을 많이 만들수록 개발 단계에서 보이지 않던 장비별 불량이나 공정 조건별 편차가 드러나고, 생산 데이터를 비교해 원인을 찾을 기회가 늘어난다는 것이 출처 강의의 설명이다. 이 고객 수와 제품 수는 경험의 폭을 보여줄 뿐 특정 공정의 수율이나 품질 우위를 직접 증명하지 않는다.

파운드리마다 트랜지스터 특성과 배선 폭, 간격 규칙이 다르므로 설계는 쓸 공정을 정한 뒤에 구체화된다.

| 요소 | 역할 |
| --- | --- |
| PDK(Process Design Kit) | 파운드리가 제공하는 공정 정보와 설계 규칙. 이 공정으로 만들려면 지켜야 할 조건 |
| EDA | PDK를 반영해 회로와 배선을 배치하고 규칙 위반과 목표 성능을 검사하는 설계 소프트웨어. 해당 공정을 지원해야 하며, 파운드리는 공정별 도구 인증 프로그램을 운영한다 |
| IP | 메모리, 고속 인터페이스처럼 여러 칩에 공통으로 쓰는 재사용 설계 블록. 선택한 공정에서 실제 실리콘으로 검증됐는지가 중요하다 |

TSMC는 OIP(Open Innovation Platform)를 IP, EDA, Design Center, Cloud, Value Chain, 3DFabric의 여섯 alliance로 운영하며, 목적을 설계 장벽을 낮추고 설계 기간, 양산 도달 시간과 출시 시간을 줄이는 것으로 설명한다. IP는 silicon-verified, production-proven 자산을 내세운다. Samsung은 SAFE(Samsung Advanced Foundry Ecosystem)를 IP, EDA, Cloud, Design Solution, MDI(Multi-Die Integration), OSAT의 여섯 alliance로 운영하며, 2026-07-03 공식 자료 기준 IP 협력사 50곳 이상과 약 5,300개 IP 자산을 밝혔다. 두 생태계 모두 존재하므로 비교할 것은 생태계의 유무가 아니라 필요한 IP와 도구가 내 대상 공정에서 양산 검증까지 됐는지다.

고객이 모인 공정에 EDA와 IP 업체의 투자가 따라오고, 그만큼 다음 고객의 설계가 쉬워지는 순환이 생길 수 있다. 강의는 경쟁사가 공정 기술을 따라잡아도 고객이 그 공정을 택해 제품을 출시하기까지 필요한 도구, IP와 지원 경험을 갖추는 데는 별도의 시간이 든다고 설명한다.

## 듀얼 파운드리는 설계와 검증을 두 벌로 진다

이 절의 재설계와 재검증 설명은 출처 강의에 근거하며 개별 칩의 전환 사례로 확인하지 않았다. 공급처를 둘로 나누면 한쪽 문제에 대비할 수 있지만, 반도체에서는 주문만 나누는 일이 아니다. 한 파운드리의 PDK에 맞춘 설계를 다른 파운드리에서 그대로 만들기 어렵다. 트랜지스터 특성이 달라 회로와 배선 배치를 다시 조정해야 할 수 있고, 쓰던 IP도 새 공정에서 다시 검증해야 한다. HBM과의 고속 인터페이스와 첨단 패키징까지 얽힌 대형 AI 칩이면 이전 자체가 새 개발 프로젝트가 될 수 있다.

파운드리 전환이나 이원화를 검토할 때 볼 것(검토 기준):

- 새 공정에서 목표 PPA(성능, 전력, 면적)가 나오는가. 공정 이름의 숫자가 같다고 같은 결과로 보지 않는다. 회사마다 트랜지스터 구조와 구현 방식이 다르다.
- 대상 칩 크기에서 수율이 안정적인가.
- 필요한 IP와 EDA 흐름이 그 공정에서 검증됐는가.
- 필요한 패키징을 같은 공급망에서 할 수 있는가.
- 원하는 시점에 필요한 물량을 받을 수 있는가. 출시가 몇 달 밀리는 비용도 계산에 넣는다.

작은 폭의 웨이퍼 단가 할인만으로는 이 비용을 상쇄하기 어려울 수 있다. 반대로 고객이 기존 파운드리를 떠날 수 없다는 뜻도 아니며, 조건 차이가 전환 비용보다 크면 옮길 수 있다.

## 경쟁 범위가 패키징으로 넓어진다

AI GPU는 연산 성능뿐 아니라 옆에 둔 여러 HBM과 얼마나 빠르게 데이터를 주고받는지가 중요해, 여러 다이를 한 패키지로 묶는 첨단 패키징이 파운드리 선택에 함께 들어간다. TSMC는 OIP 안에 3DFabric Alliance를 두고, Samsung의 MDI Alliance는 interposer 위에 칩을 나란히 두는 2.5D와 수직 적층하는 3D 패키징을 EDA, IP, 설계 지원과 OSAT 협력사와 함께 최적화한다고 설명한다. 연결 구조의 차이는 [[Semiconductor-Advanced-Packaging|반도체 첨단 패키징]]에서 다룬다.

설계 시장에서 경쟁하는 회사(GPU 회사와 자체 AI 칩을 만드는 클라우드 회사)가 제조에서는 같은 파운드리의 고객일 수 있다. 설계 기업이 늘어나는 것과 제조 공급자가 늘어나는 것은 다른 일이다.

## 출처

- [TSMC, Company Profile](https://www.tsmc.com/english/aboutTSMC/company_profile) — 2026-11-23 2025년 고객 수, 제품 수와 공정 기술 수, 순수 파운드리 모델 확인
- [TSMC, Values and Business Philosophy](https://www.tsmc.com/english/aboutTSMC/values) — 2026-11-23 고객을 파트너로 대하며 경쟁하지 않았다는 경영 철학 확인
- [TSMC, Open Innovation Platform](https://www.tsmc.com/english/dedicatedFoundry/oip) — 2026-11-23 여섯 alliance와 목적 확인
- [Teamwork Behind Cutting-Edge Chip Manufacturing: How Samsung Foundry's SAFE Ecosystem Powers Next-Generation Semiconductor Innovation — Samsung Semiconductor Newsroom](https://news.samsungsemiconductor.com/global/infographic-teamwork-behind-cutting-edge-chip-manufacturing-how-samsung-foundrys-safe-ecosystem-powers-next-generation-semiconductor-innovation/) — 2026-07-03 게시, 2026-11-23 여섯 alliance, MDI Alliance 범위와 IP 규모 확인
- [TSMC, EDA Alliance](https://www.tsmc.com/english/dedicatedFoundry/oip/eda_alliance) — 2026-11-23 EDA 도구 인증 프로그램 운영 확인
- [ASML, TWINSCAN NXE:3600D](https://www.asml.com/products/euv-lithography-systems/twinscan-nxe-3600d) — 2026-11-23 최대 노광 영역 26mm x 33mm 확인
- [ASML, TWINSCAN NXT:2000i](https://www.asml.com/en/products/duv-lithography-systems/twinscan-nxt2000i) — 2026-11-23 DUV 액침 장비의 26 x 33mm 필드 확인
- [NVIDIA Hopper Architecture In-Depth — NVIDIA Technical Blog](https://developer.nvidia.com/blog/nvidia-hopper-architecture-in-depth/) — 2022-03-22 게시, 2026-11-23 GH100의 TSMC 4N 공정과 814mm² 다이 확인
- [NVIDIA Ampere Architecture In-Depth — NVIDIA Technical Blog](https://developer.nvidia.com/blog/nvidia-ampere-architecture-in-depth/) — 2020-05-14 게시, 2026-11-23 GA100의 TSMC N7 공정과 826mm² 다이 확인
- [TSMC가 비싸면 삼성에 맡기면 되잖아? 설계부터 검증까지, 파운드리를 바꾸는 데 돈과 시간이 드는 이유 [패치의 칩문학 5강] — 안될공학](https://www.youtube.com/watch?v=I7aC7RHs4kA) — 2026-11-07 강의 영상, 음성 전사 기준. 수율 계산 예시, 공정 편차와 보정, 등급 판매, 듀얼 파운드리의 재설계와 재검증 설명은 강의의 설명이며 1차 출처로 대조하지 않음

## 관련 문서

- [[Semiconductor-Advanced-Packaging|반도체 첨단 패키징]]
- [[HBM-Stack-and-Base-Die|HBM 적층과 베이스 다이]]
- [[DRAM-Cell-and-3D-DRAM|DRAM 셀과 3D DRAM]]
- [[CS-Computer-Architecture|컴퓨터 구조]]
