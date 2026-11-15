---
tags: [semiconductor, packaging, substrate, supply-chain, infrastructure]
status: done
verified_at: 2026-11-15
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Package Substrate Supply", "패키지 기판 공급", "FC-BGA 기판"]
---

# 패키지 기판과 공급 병목

패키지 기판은 칩과 서버 보드 사이에 들어가 신호와 전원을 이어 주는 판이다. AI 가속기의 공급을 볼 때 웨이퍼 공정과 별도로 이 기판의 생산 능력도 병목이 될 수 있다. 칩이 커지고 연결이 늘수록 기판 한 장에 드는 면적과 공정이 늘어, 주문 개수가 같아도 기판 공장의 부담은 커진다.

die 사이를 잇는 EMIB, interposer 같은 구조는 [[Semiconductor-Advanced-Packaging|반도체 첨단 패키징]], 유리 코어와 TGV 공정의 기본 설명은 [[GPU-Server-Infrastructure|GPU 서버 인프라]]가 다룬다.

## 기판이 하는 일

- **간격 변환**: 칩 표면의 연결점은 좁은 간격으로 모여 있고 서버 보드는 더 넓은 간격으로 연결된다. 기판 안의 구리 배선이 칩에서 내려온 연결을 나눠 보내고 아래쪽에서 보드 간격으로 펼친다. FC-BGA(Flip Chip Ball Grid Array) 기판은 칩의 연결면을 아래로 향하게 붙이고, 기판 밑의 솔더 볼 배열로 보드와 잇는다.
- **전원 공급**: 같은 길이와 두께라면 배선 폭을 줄일수록 저항이 커져 열 손실과 전압 강하가 생긴다. 그래서 가는 신호선과 함께 전류를 나눠 보낼 넓은 구리 영역과, 순간 전류 요구에 대응할 커패시터 자리가 필요하다. 커패시터를 기판 안에 넣는 방식도 있다(예: MLCC와 실리콘 커패시터 같은 수동 소자 내장).
- **층을 쌓아 교차를 푼다**: 한 평면에서 신호와 전원 영역이 부딪히면 층을 나눈다. 층 사이에는 절연 재료를 넣고, 층을 옮겨야 하는 곳에만 구멍(via)을 내 구리로 잇는다.

## 커지고 두꺼워질수록 공장 부담이 커진다

- **빌드업**: 만든 배선 위에 얇은 절연 필름을 붙이고, 레이저로 via 구멍을 내고, 구리로 연결 통로와 다음 층 배선을 만드는 과정을 반복한다. ABF(Ajinomoto Build-up Film)는 Ajinomoto가 만든 이런 절연 필름의 제품명이며 기판 전체를 가리키는 말이 아니다. 층이 늘면 이 반복이 늘고 층간 위치 정렬과 구리 연결 불량의 기회도 는다.
- **패널 면적 효과**: 기판은 큰 작업판(패널)에 여러 개를 배치해 함께 가공한 뒤 자른다. 정사각형 기판의 가로와 세로가 각각 2배가 되면 면적은 4배라서, 같은 패널에서 나오는 개수는 자투리를 무시해도 4분의 1로 준다. 고객이 주문 개수를 유지해도 처리할 면적과 층별 공정이 함께 늘어난다. TOPPAN도 2024년 투자 발표에서 패키지 기판 대형화에 따른 제조 부하를 증설 이유로 들었다.
- **휨(warpage)**: 구리, 절연재와 실리콘 칩은 열을 받을 때 늘어나는 정도가 달라, 붙은 채로 가열되면 서로 당기며 판이 휜다. 판이 커지면 같은 휨도 양 끝의 높이 차이로 크게 드러나고, 촘촘한 연결점 일부가 들뜰 수 있다. 상온에서 평평한 것만으로는 부족하고 납땜 온도에서도 붙일 수 있어야 하므로, 재료와 층 배치 설계부터 공정 조건 조정까지 반복 작업이 따른다.
- **수율과 신뢰성**: 칩을 붙이기 전에 끊긴 연결과 잘못 이어진 배선을 걸러야 칩과 조립 비용을 잃지 않는다. 고객이 받는 양은 투입량에서 불량을 뺀 것이고, 초기 검사를 통과해도 칩을 붙인 뒤 반복 가열 조건에서 연결이 유지되는지 따로 검증해야 납품할 수 있다. 장비를 늘려도 수율이 안정되지 않으면 약속한 물량을 맞추기 어렵다.

## 유리라는 말이 가리키는 세 가지

| 쓰임 | 하는 일 | 상태 (2026-11 기준) |
|---|---|---|
| 유리섬유 직물 보강재 | 기존 유기 기판의 수지 안에 넣어 열팽창을 줄인다. Nittobo의 T-glass는 일반 E-glass보다 열팽창이 낮은 유리섬유다 | 기존 유기 기판의 재료 |
| 임시 유리 캐리어 | 제조 중 웨이퍼나 패널, 그 위에 만드는 배선층(유기 interposer 등)을 받치는 임시 판이다 | Lam Research는 이미 생산에 쓰인다고 설명 |
| 유리 코어, 유리 interposer | 완성품에 남아 칩을 지지하거나 연결한다 | Lam Research는 개발과 도입이 상대적으로 초기 단계라고 설명 |

유리 코어의 장점으로는 치수 안정성과 실리콘에 가깝게 조정할 수 있는 열팽창 계수가 꼽히며, 더 크고 촘촘한 패키지를 가능하게 할 수 있다. 과제는 깨지기 쉬운 재료의 취급과 절단, 구멍 주변의 깨짐과 균열, 유리 위 금속 접착, 양면이 열린 TGV를 채우는 전기 도금이다. 유리 코어를 써도 절연층과 배선층을 만드는 다른 공정이 사라지지 않는다.

캐리어의 양산 실적을 유리 코어의 양산 근거로 읽지 않는다. SKC도 2026-10-28 실적 발표에서 글라스기판 사업은 임베딩(Embedding) 제품의 신뢰성 평가와 수율 확보에 집중할 계획이라고 밝혔다. 유리 기판 소식은 어느 제품의 어느 공정까지 확인됐는지, 고객 제품에서 반복 생산과 신뢰성까지 확인됐는지를 나눠 본다. 유리가 다음 세대의 큰 패키지를 준비하는 동안에도 지금 출하할 칩에는 유기 기판이 필요하므로 유기 기판 증설은 별도로 계속된다.

## 고객이 기판 생산 능력을 미리 확보하는 방식

기판은 위에 붙일 칩의 연결점과 아래 배선에 맞춰 제품별로 설계되므로, 빈 공장이 있어도 주문을 그대로 옮기기 어렵다. 칩 일정과 기판 증설 일정을 몇 년 앞서 맞춰야 해서 칩 회사가 생산 준비의 부담을 함께 지는 계약이 나타난다.

| 방식 | 사례 (공식 발표 기준) |
|---|---|
| 합작 공장 | Broadcom과 TOPPAN의 합작사 AST가 싱가포르에 총 연면적 약 95,000m²(TOPPAN 발표상 1단계 가동 약 70,000m²)의 FC-BGA 기판 공장을 2024-03 착공해 2026-09-29 개소했다. 고부가 제품 생산 시작 목표는 2026년 말이다. Broadcom은 TOPPAN FC-BGA 기판의 최대 고객이다. 2024 착공 발표는 공장 자동화와 초기 핵심 인력의 일본 Niigata 공장 교육 계획을 밝혔다. TOPPAN은 FC-BGA 생산 능력을 2027 회계연도 말까지 2022 회계연도의 2.5배 이상으로 늘리는 목표를 두 발표에서 제시했다 |
| 생산 능력 예약금 | NVIDIA는 2026-10-21 Ibiden에 수십억 달러 규모의 capacity reservation advance(그해 앞서 Ibiden이 체결, 발표)를 제공해 Ono 공장 능력을 늘린다고 밝혔다 |
| 생산 능력 예약 계약 | 같은 발표에서 Unimicron의 대만 증설을 capacity reservation agreement로 뒷받침한다고 밝혔다. NVIDIA는 자사 제품용 기판 생산 능력을 3년간 2.5배로 늘릴 계획이며 이 계약들이 그 확대에 기여하고 추가 계약도 진행 중이라고 설명한다. 기준치는 밝히지 않았다 |
| 다년 공급 계약과 전용 라인 | 삼성전기는 같은 날 2026년부터의 다년 공급 계약과 세종, 부산 사업장의 전용 생산 라인 구축을 발표했다 |
| 공급 확보 자금 약정 | Intel은 2026 3분기 10-Q에서 분기 뒤 기판 공급 확보 계약 2건을 맺었고 총 소요 자금을 약 53억~61억 달러로 추정하며 일부 조건은 미확정이라고 공시했다(EDGAR 제출일 2026-10-30). 2026-10-29 실적 발표 원고에서 CEO는 EMIB 패키징용 첨단 유기 기판의 업계 전반 부족이 생산 확대를 제약한다고 말했다 |

계약 발표일을 체결일로 읽지 않는다(Ibiden 계약은 NVIDIA 발표보다 앞서 체결됐다). 개소, 장비 반입, 제품 검증과 고객 제품의 안정 공급은 서로 다른 단계다. 예약한 능력이 실제 물량이 되는 시점은 각 공장의 증설과 제품 검증 일정에 달려 있다.

## 판단 체크포인트

- GPU나 가속기 공급 전망을 볼 때 웨이퍼, HBM, 패키징(interposer와 조립), 기판을 따로 확인했는가.
- 기판 부족을 개수 부족으로만 보지 않고 면적, 층 수, 수율과 신뢰성 검증 기간으로 나눠 보았는가.
- 유리 기판 뉴스가 캐리어, 코어, 보강재 중 무엇을 말하는지, 시험 성공과 고객 제품 반복 생산을 구분했는가.
- 공급 계약의 발표일, 체결일, 공장 개소일과 실제 공급 시작일을 구분했는가.

공급 사례와 유리 기판 상태는 공개 발표와 공시, 장비사의 기술 설명을 대조한 것이다. 기판의 역할, 빌드업, 휨과 수율의 개념 설명은 정리 계기인 영상과 일반적인 패키징 지식을 따랐고 ABF와 기판 대형화 부하만 1차 출처로 대조했다. 특정 기판 업체의 수율, 계약 단가와 실제 공급 물량은 확인하지 않았다.

## 출처

- [AST Completes Singapore's First High-End FC-BGA Substrate Facility to Meet Growing AI Chip Demand — Singapore EDB](https://www.edb.gov.sg/en/news-and-insights/ast-completes-singapore-first-high-end-fc-bga-substrate-facility-to-meet-growing-ai-chip-demand) — 2026-09-29 개소 발표
- [AST Breaks Ground on Singapore Facility to Produce High-End Substrates — Singapore EDB](https://www.edb.gov.sg/en/news-and-insights/ast-breaks-ground-on-singapore-facility-to-produce-high-end-substrates) — 2024-03-14 착공 발표, 자동화와 Niigata 교육 계획
- [TOPPAN Establishes FC-BGA Substrate Production Site in Singapore — TOPPAN Holdings](https://www.holdings.toppan.com/en/news/2026/09/newsrelease260930_1.html) — 2026-09-30, 개소식, 면적과 가동 시점, 2.5배 목표
- [TOPPAN、シンガポールにFC-BGA基板の生産拠点を新設 — TOPPAN Holdings](https://www.holdings.toppan.com/ja/news/2024/03/newsrelease240314_1.html) — 2024-03-14, 기판 대형화에 따른 제조 부하
- [NVIDIA and Supply Chain Partners Expand Capacity to Accelerate AI Infrastructure Buildout — NVIDIA](https://nvidianews.nvidia.com/news/nvidia-and-supply-chain-partners-expand-capacity-to-accelerate-ai-infrastructure-buildout) — 2026-10-21
- [Samsung Electro-Mechanics and NVIDIA Announce Strategic Partnership to Supply ABF Substrates — Samsung Electro-Mechanics](https://m.samsungsem.com/global/newsroom/news/view.do?id=10614) — 2026-10-21
- [Intel Form 10-Q for the quarter ended September 26, 2026 — SEC](https://www.sec.gov/Archives/edgar/data/50863/000005086326000191/intc-20260926.htm) — EDGAR 제출일 2026-10-30, Note 14 기판 공급 계약
- [Intel Q3 2026 Earnings Prepared Remarks — Intel](https://d1io3yog0oux5.cloudfront.net/_5bcd8acc7e1b5c73a62283d752dd0b96/intel/db/887/9273/prepared_remarks/Q3%2726_Prepared_Remarks.pdf) — 2026-10-29 EMIB 기판 부족 언급
- [Glass Substrates Open the Window to Advancing AI Chip Packaging — Lam Research](https://newsroom.lamresearch.com/glass-substrates-advanced-packaging?blog=true) — 2026-10-29
- [SKC, 3분기 실적 발표 — SKC 뉴스룸](https://skc.co.kr/kor/Conmmunication/newsroom/more.do) — 2026-10-28, 기사별 주소가 없어 목록 페이지에서 확인
- [Ajinomoto Fine-Techno, Insulating Film ABF](https://www.aft-website.com/en/products/insulating_film-abf/)
- [Nittobo, T-glass](https://www.nittobo.co.jp/eng/business/electronicmaterials/t-glass.htm)
- [AI 칩은 만들어도 기판이 없다? 반도체 공급을 막는 새로운 병목 — YouTube, 안될공학](https://www.youtube.com/watch?v=gbUdfXFkNZc) — 2026-11-04 업로드, 정리 계기. 음성 전사 기준이며 사실은 위 1차 출처로 대조

## 관련 문서

- [[Semiconductor-Advanced-Packaging|반도체 첨단 패키징]]
- [[GPU-Server-Infrastructure|GPU 서버 인프라 (유리 코어 기판과 TGV)]]
- [[GPU-Inference-Hardware|추론용 GPU 선택]]
- [[Memory-Semiconductor-Cycle|메모리 반도체 사이클]]
- [[AI-Infrastructure-Capital-Cycle|AI 인프라 자본 사이클 (공급 계약의 자금 부담)]]
