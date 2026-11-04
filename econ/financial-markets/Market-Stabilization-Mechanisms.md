---
tags: [econ, finance, trading-halt]
status: done
category: "Economics"
aliases: ["시장 안정화 장치", "Market Stabilization Mechanisms", "주식시장 사이드카", "프로그램매매호가 효력정지", "KRX Sidecar", "주식시장 서킷브레이커", "매매거래중단제도", "KRX Circuit Breakers", "증시 급락 대응", "MSCI 시장 재분류"]
verified_at: 2026-10-21
---

# 시장 안정화 장치: 사이드카와 서킷브레이커

> 한 줄 요약: 사이드카는 지수선물 가격이 급변할 때(코스닥은 지수도 함께) 급변 방향의 프로그램매매 호가(오를 때 매수, 내릴 때 매도)의 효력만 5분 멈추고, 서킷브레이커는 지수가 급락할 때 시장 전체의 매매를 멈춘다. 발동 소식을 읽을 때는 무엇을 기준으로 무엇을 멈췄는지부터 구분한다. 급락 뒤의 다른 대응은 수요 보강과 구조 개선으로 나눠 읽고, 지수 제공자는 구조 개선의 시행 증거를 본다(5절, 2026년 인도네시아 사례).

1~4절은 2026-10-21 한국거래소의 규정 안내와 공시를 대조한 한국 주식시장 기준이고, 5절은 2026-11-04 MSCI, FTSE Russell과 인도네시아 금융당국, 거래소 자료를 대조한 사례다. 기준과 수치는 규정 개정으로 바뀔 수 있으므로 적용 전 거래소 안내를 다시 확인한다.

## 1. 사이드카: 프로그램매매 호가만 멈춘다

유가증권시장의 프로그램매매호가 효력 일시정지(Sidecar) 기준이며, 코스닥시장은 마지막 항목에 따로 적는다.

- **발동 기준**: 파생상품시장 기준종목의 가격이 기준가 대비 5% 이상 오르거나 내린 상태가 1분간 지속될 때다. 대조한 두 공시는 발동 사유를 선물가격 상승(또는 하락) 5% 이상, 1분 이상으로 적고 KOSPI200 선물가격 변동내역을 함께 싣는다. 기준종목 가격이 기준가 대비 5% 이상 움직이면 효력 정지 가능성을 미리 예고할 수 있다.
- **정지 대상과 시간**: 오를 때는 프로그램 매수호가, 내릴 때는 프로그램 매도호가의 효력을 5분간 정지하고, 정지가 끝나면 접수 순서대로 체결한다. 프로그램매매가 아닌 호가와 시장 전체의 거래를 멈추는 장치가 아니다.
- **해제와 적용 범위**: 장 종료 40분 전 이후에는 발동을 해제하고, 효력 정지 중 서킷브레이커로 매매거래가 중단됐다가 재개되면 해제한다. 정규시장에만 발동하고 애프터마켓에서는 발동하지 않는다. 하루 발동 횟수의 제한은 이번에 대조한 규정 안내에서 확인하지 못했다.
- **공시 사례**: 2026-02-03 공시는 KOSPI200 선물 가격이 5% 이상 오른 상태로 1분 이상 이어져 09:26:22부터 5분간 프로그램 매수호가의 효력을 정지했다고 밝혔다. 2026-03-23 공시는 같은 선물 가격이 5% 이상 내린 상태로 1분 이상 이어져 09:18:23부터 5분간 프로그램 매도호가의 효력을 정지했다고 밝혔다.
- **코스닥시장**: 코스닥150선물 가격이 기준가격 대비 6% 이상, 코스닥150지수가 직전 매매거래일 최종수치 대비 3% 이상 같은 방향으로 움직인 상태가 동시에 1분간 지속될 때, 발동 시점부터 5분간 접수된 프로그램 매수호가(오를 때) 또는 매도호가(내릴 때)의 효력을 정지한다. 정지된 호가의 취소와 정정 호가도 같은 기간 효력이 정지되고, 정지 중 접수된 프로그램매매호가는 5분이 지난 뒤 접수 순서대로 가격 결정에 참여한다.

## 2. 서킷브레이커: 시장 전체 매매를 멈춘다

유가증권시장의 주식시장 매매거래중단제도(Circuit Breakers) 기준이다. 아래 요건이 1분간 지속될 때 발동한다.

| 단계 | 발동 요건 | 결과 |
|---|---|---|
| 1단계 | 코스피가 직전 매매거래일 종가 대비 8% 이상 하락 | 20분간 시장의 호가접수와 매매거래 중단 |
| 2단계 | 1단계 발동 뒤 코스피가 직전 매매거래일 종가 대비 15% 이상 하락하고 1단계 발동 지수보다 1% 이상 추가 하락 | 20분간 중단 |
| 3단계 | 2단계 발동 뒤 코스피가 직전 매매거래일 종가 대비 20% 이상 하락하고 2단계 발동 지수보다 1% 이상 추가 하락 | 발동 시점에 그날 유가증권시장의 모든 매매거래 종료 |

- 1, 2단계에서는 채권시장을 제외한 현물시장과 연계된 선물, 옵션 시장도 호가접수와 매매거래를 멈춘다. 중단 중에는 새 호가를 낼 수 없지만 중단 전에 접수한 호가는 취소할 수 있다. 3단계에서는 취소호가를 포함한 모든 호가접수가 불가능하다.
- 각 단계는 하루 한 번만 발동한다. 1, 2단계는 종가 결정 시간을 확보하려고 장 종료 40분 전 이후에는 발동하지 않지만 3단계는 그 뒤에도 발동할 수 있다. 정규시장에서만 발동하고 애프터마켓에서는 발동하지 않는다.
- 발동 요건은 하락만 정한다. 오를 때도 걸리는 사이드카와 다르다.

## 3. 종목별 장치와 구분한다

개별 종목의 일시적 급변에는 종목별 변동성완화장치(VI)가 2분의 단일가매매라는 냉각기간을 둔다. 거래소는 이를 개별종목에 대한 가격안정화 장치로 설명한다. 시장 지수나 지수선물을 기준으로 발동하는 사이드카, 서킷브레이커와는 기준과 대상이 다르다. 종목별 발동 기준은 종목 구분과 매매 시간대에 따라 달라 거래소 안내의 표로 확인한다.

## 4. 발동 소식을 읽는 법

다음은 위 규정에서 도출한 해석 기준이다.

- 유가증권시장에서 사이드카의 기준은 KOSPI200 선물 가격이고 서킷브레이커의 기준은 코스피 지수다. 코스닥시장 사이드카는 코스닥150선물과 코스닥150지수를 함께 보고, 코스닥시장 서킷브레이커는 코스닥지수를 기준으로 한다. 같은 날 지수 하락률과 선물 하락률은 다를 수 있으므로 기사 수치가 어느 시장, 어느 기준인지 확인한다.
- 사이드카 발동은 프로그램매매 호가의 일시 정지이지 시장 휴장이 아니다. 일반 주문까지 막혔다는 뜻으로 읽지 않는다.
- 사이드카는 한 방향의 프로그램매매 호가를, 1, 2단계 서킷브레이커는 시장 전체의 매매를 일시적으로 멈추고 3단계는 그날 매매를 끝낸다. 어느 장치도 가격 방향이나 손실 규모를 정하지 않으며, 발동 뒤에도 하락이나 상승이 이어질 수 있다.
- 실적 발표 직후의 급락처럼 좋은 실적과 주가가 엇갈리는 날의 해석은 [[Stocks#좋은 실적과 기대를 넘는 실적은 다르다|기대와 실적의 차이]]를 함께 본다.

## 5. 거래 장치 밖의 대응: 2026년 인도네시아 사례

급락 뒤의 정책 대응은 세 갈래로 나눠 읽는다(이 문서의 분류). 매매를 잠시 멈추는 거래 장치는 속도를 늦출 뿐 방향을 정하지 않는다(4절). 자사주 매입 요건 완화나 국내 투자자와 공적 자금의 매수는 수요를 보강한다. 그러나 외국인 매도를 다른 주체가 받는 것일 뿐 매도의 원인을 고치지는 않는다([[Investor-Flows-and-Market-Funds#1. 순매수의 합은 0이다|순매수의 합]]). 지분 공시, 유통주식, 감시와 제재 같은 구조 개선은 시간이 걸리지만, 지수 제공자가 투자 가능성을 판단할 때 확인하는 대상이다. 아래는 MSCI와 FTSE Russell 발표, 인도네시아 금융감독청(OJK)과 거래소(BEI) 자료를 2026-11-04에 대조한 사례다.

- **지수 제공자의 판단:** MSCI는 2026-10-15 MSCI Indonesia 지수를 신흥시장(EM)에서 Standalone 시장으로 재분류하는 안의 협의를 시작했다. 6월 시장분류 검토 때 지분 구조의 불투명성과 조율된 매매 의심이 제기됐다. 인도네시아는 1% 초과 주주 공시, 투자자 분류 세분화, 고집중 보유(HSC) 보고와 최소 유통주식 비율 15% 로드맵을 발표했다. 그러나 기관투자자들은 일관된 시행과 지속적이고 실질적인 효과의 증거를 요구했다. 시장 참가자들은 인도네시아 주식시장 전반에서 충분한 진전이 일관되게 관찰되지 않았다고 MSCI에 전했다. MSCI는 발표된 개혁에도 조율된 매매 의심이 이어지고 실효성 있는 집행의 증거가 없는 등 시장 기능 장애에 대한 큰 우려가 남아 있다고 적었다. 프런티어 시장 강등으로는 문제의 깊이를 반영하지 못한다는 의견도 나왔다. 의견은 2027-04-30까지 받고 결정은 2027-06-30까지 내며, 시장 지배구조와 기능이 실질적으로 나아졌다는 명확한 증거가 없으면 재분류를 진행할 예정이다.
- **분류와 동결의 의미:** Standalone 지수는 MSCI EM 지수와 프런티어 지수에 들어가지 않는다. 추가 공지가 있을 때까지 동결이 이어진다. 외국인 투자자에게 적용하는 유동주식 조정 계수(FIF)와 주식 수의 증가, MSCI Indonesia IMI 신규 편입과 규모 구간 상향 이동은 반영되지 않는다. 인도네시아 당국이 HSC로 지정한 종목은 계속 지수에서 빼고, 1% 주주 공시로 유동주식 추정치를 고친다. 지수 비중은 유동주식 조정 시가총액으로 정해지므로([[Stocks#지수의 가중 방식과 상승 종목 수를 구분한다|지수의 가중 방식]]) 동결은 FIF와 주식 수 증가, 신규 편입과 상향 이동처럼 지수 유지 작업으로 비중이 커지는 경로를 막지만, 주가 변동에 따른 비중 변화는 막지 않는다(지수 산식에서 도출한 해석).
- **발표와 시행의 간극:** 2026-01-30 BEI 사장이 사임하자 OJK는 이를 자본시장 상황에 대한 도의적 책임으로 평가했다. 동시에 5% 미만 주주의 투명성 규정, 유통주식 15% 상향, 거래소 비상호화(demutualization, 회원 소유 조직을 주주 소유 회사로 바꾸는 것)와 법 집행, 지배구조 강화를 개혁 방향으로 들고, MSCI가 제기한 우려의 후속 조치를 챙겨 2026년 5월 전 마무리를 기대한다고 밝혔다. 2026-02-09 OJK, BEI와 예탁기관(KSEI)은 MSCI에 낸 세 제안을 공개했다. 기존 9개 투자자 범주를 보완해 법인과 기타 범주 아래 하위 분류 28개를 두고, 상장사마다 1% 초과 주주를 공시하며, 상장 유지 최소 유통주식 비율을 7.5%에서 15%로 단계적으로 올리는 내용이다. OJK 집계로 2022년부터 2026년 1월까지 3,418개 당사자(pihak)에 과징금 5,424억 9천만 루피아가 부과됐고, 여기에는 시세조종 관련 151개 당사자에 부과한 2,406억 5천만 루피아가 들어 있다. 조사 중인 형사 사건 42건 중 32건은 pump and dump, 가장매매, 사전 합의 매매 같은 시세조종 혐의다.
- **MSCI 발표 뒤의 조치(2026-10-26):** OJK는 주주총회 승인 없는 자사주 매입 허용 기간을 2027년 6월까지 늘렸다. 조건은 최소 유통주식 요건 충족과 매입 주식의 재유통(re-float)이다. BEI에는 두 가지를 촉구했다. 자율규제기관 밖의 독립 인사가 참여하는 위원회로 HSC 방법론을 다듬고, 이상 거래와 조율된 매매를 찾는 감시 방법론을 강화하라는 것이다. 자사주 매입은 유통주식을 줄이므로 매수 지원과 유통주식 상향이 부딪칠 수 있고, 붙인 조건은 이 충돌을 줄이는 장치로 읽힌다(이 문서의 해석). OJK는 개혁이 지수 분류 결정과 무관하게 계속되며, 지수 상승폭보다 회복의 질이 중요하다고 밝혔다.
- **거래 장치:** BEI는 2025-04-08 발표로 종합지수(IHSG)가 하루 8%를 넘게 내리면 30분, 15%를 넘으면 다시 30분 매매를 멈출 수 있게 했다. 20%를 넘으면 그 세션 끝까지, 또는 OJK 승인이나 지시로 더 길게 매매를 정지할 수 있다(2025-04 발표 기준, 2026년 10월 적용 여부는 확인하지 못함). 단계 기준은 2절의 코스피 서킷브레이커와 같은 8%, 15%, 20%지만 중단 시간과 마지막 단계의 처리가 다르다. 코스피 쪽에는 1분 지속과 직전 단계 대비 1% 추가 하락 요건도 붙는다(2절).
- **시장 지표(OJK 집계):** IHSG는 2025-12-30 8,646.94에서 2026-09-30 6,071.14(연초 대비 -29.79%)로 내렸다. 10-19~23 거래에서는 4.9% 올라 10-23 5,439.2로 마감했고, 그 사이 10-19에는 4,907.37까지 내려갔다. 10-23 종가는 2025년 말 대비 약 -37%다(이 문서의 계산). 2026년 연초부터 9월 말까지 외국인의 주식 순매도는 81.04조 루피아였고, 자본시장 투자자 수는 연초보다 57.96% 늘어난 3,217만 명이었다. 국내 투자자가 매도 물량을 받아도 지수 제공자가 보는 투자 가능성과 집행 증거는 별개다(첫 문단의 분류 적용).
- **지수 제공자별 차이:** 같은 시기 BEI 사장은 FTSE Russell이 2026-10-06 발표에서 인도네시아를 Secondary Emerging으로 유지하고 강등 관찰 목록에 넣지 않았다고 밝혔다(OJK 보도자료 인용). LSEG의 같은 발표에서 관찰 목록에 새로 오른 시장은 승격 후보인 오만뿐이었고, 이집트는 강등 관찰 목록에서 빠졌다. 다만 FTSE Russell도 2026년 9월 리뷰에서 인도네시아 종목의 신규 편입(IPO 포함), 유동주식 비율 증가와 마이크로캡 강등을 뺀 규모 구간 변경의 반영을 계속 보류한다고 밝혔다. 두 지수 제공자 모두 신규 편입과 유동주식 비율 증가를 보류해 종목 처리의 방향은 비슷하고(주식 수 증가는 MSCI만 동결한다), 큰 차이는 국가 분류 지위에 있다(이 문서의 해석). 분류와 일정은 지수 제공자마다 따로 확인한다.

점검 질문: 급락 대응 발표를 보면 세 갈래로 나눈다. 거래 속도를 늦추는 장치인지, 수요를 보강하는 조치인지, 지분 공시, 유통주식, 감시와 제재처럼 투자 가능성 판단의 근거를 바꾸는 조치인지다. 마지막 갈래는 발표가 아니라 시행 일정과 집행 실적으로 확인한다. 위 사례에서 도출한 기준이며 지수 결정이나 주가 방향의 예측이 아니다.

## 출처

- [한국거래소, 유가증권시장 프로그램매매](https://regulation.krx.co.kr/contents/RGL/03/03010404/RGL03010404.jsp) — 사이드카 발동 기준, 예고, 해제와 정규시장 한정
- [한국거래소, 주식시장의 매매거래중단제도(Circuit Breakers)](https://regulation.krx.co.kr/contents/RGL/03/03010402/RGL03010402.jsp) — 단계별 요건, 중단 범위, 1일 1회와 장 종료 40분 전 제한
- [한국거래소, 코스닥시장 프로그램매매호가 일시 효력정지제도(Sidecar)](https://regulation.krx.co.kr/contents/RGL/03/03020403/RGL03020403.jsp) — 코스닥150선물과 지수의 동시 요건, 정지 중 호가 처리
- [한국거래소, 코스닥시장 시장 일시중단제도(Circuit Breakers)](https://regulation.krx.co.kr/contents/RGL/03/03020402/RGL03020402.jsp) — 코스닥지수 기준의 발동 요건
- [한국거래소, 유가증권시장 종목별 변동성완화장치](https://regulation.krx.co.kr/contents/RGL/03/03010409/RGL03010409.jsp) — 개별종목 대상과 2분 단일가매매
- [유가증권시장 매수 사이드카(Side car) 발동 — 한국거래소 KIND](https://kind.krx.co.kr/external/2026/02/03/000241/20260203000369/99404.htm) — 2026-02-03 공시, 발동일시, 발동 사유와 KOSPI200 선물가격 변동내역
- [유가증권시장 매도 사이드카(Side car) 발동 — 한국거래소 KIND](https://kind.krx.co.kr/external/2026/03/23/000098/20260323000344/99405.htm) — 2026-03-23 공시, 발동일시, 발동 사유와 KOSPI200 선물가격 변동내역
- [MSCI Launches a Consultation on a Proposal to Reclassify Indonesia from Emerging Market to Standalone Market Status — MSCI](https://www.msci.com/downloads/documents/press-releases/media-room/Indonesia_PR_Oct_26.pdf) — 2026-10-15 보도자료. 2026-11-04 재분류 제안의 이유, 발표된 개혁과 요구된 증거, 의견 수렴과 결정 일정, 동결 항목과 HSC 종목 제외 대조
- [MSCI, Market Classification](https://www.msci.com/indexes/index-resources/market-classification) — 2026-11-04 분류의 세 기준과 Standalone 지수의 EM, 프런티어 지수 제외 대조
- [MSCI, MSCI Index Glossary (June 2014)](https://www.msci.com/documents/10199/1283513/MSCI_Index_Glossary_-_June_2014.pdf/a4712bc8-4c79-4c56-9bcf-6ceab332809e) — 2026-11-04 FIF와 유동주식 조정 시가총액의 정의 대조
- [OJK Pastikan Kesinambungan Operasional Bursa Efek Indonesia — OJK](https://www.ojk.go.id/id/berita-dan-kegiatan/siaran-pers/Documents/Pages/OJK-Pastikan-Kesinambungan-Operasional-Bursa-Efek-Indonesia/SP%2020%20OJK%20Pastikan%20Kesinambungan%20Operasional%20Bursa%20Efek%20Indonesia.pdf) — SP 20/GKPB/OJK/I/2026, 2026-01-30. BEI 사장 사임, 세 가지 개혁 방향과 5월 전 목표 대조
- [OJK, BEI, dan KSEI Percepat Reformasi Integritas Pasar Modal dan Tindak Lanjut Masukan MSCI — OJK](https://www.ojk.go.id/id/berita-dan-kegiatan/siaran-pers/Documents/Pages/OJK-BEI-dan-KSEI-Percepat-Reformasi-Integritas-Pasar-Modal-dan-Tindak-Lanjut-Masukan-MSCI/SP%2034%20OJK%2c%20BEI%2c%20dan%20KSEI%20Percepat%20Reformasi%20Integritas%20Pasar%20Modal%20dan%20Tindak%20Lanjut%20Masukan%20MSCI.pdf) — SP 34/GKPB/OJK/II/2026 공동 보도자료, 2026-02-09. MSCI에 낸 세 제안, 과징금과 형사 사건 집계 대조
- [SP 185 RDK September 2026: Stabilitas Sektor Jasa Keuangan Terjaga di Tengah Meningkatnya Tekanan Perekonomian Global — OJK](https://www.ojk.go.id/id/berita-dan-kegiatan/siaran-pers/Documents/Pages/RDKB-September-2026/SP%20185%20RDKB%20Sep%202026%20-%20Stabilitas%20Sektor%20Jasa%20Keuangan%20Terjaga%20di%20Tengah%20Meningkatnya%20Tekanan%20Perekonomian%20Global.pdf) — 2026-10-05. IHSG의 2025년 말과 2026년 9월 말 수준, 외국인 주식 순매도 누적, 투자자 수 대조
- [OJK Perkuat Stabilitas dan Integritas Pasar Modal Melalui Tiga Langkah Kebijakan Strategis — OJK](https://ojk.go.id/id/berita-dan-kegiatan/siaran-pers/Documents/Pages/OJK-Perkuat-Stabilitas-dan-Integritas-Pasar-Modal-Melalui-Tiga-Langkah-Kebijakan-Strategis/SP%20201%20-%20OJK%20Perkuat%20Stabilitas%20Dan%20Integritas%20Pasar%20Modal%20Melalui%20Tiga%20Langkah%20Kebijakan%20Strategis.pdf) — SP 201/OJK/DPKU/X/2026, 2026-10-26. 세 조치와 자사주 매입 조건, 10-19 저점과 10-23 종가, FTSE Russell 관련 BEI 발언 대조
- [IDX Adjusted Rules on Lower Limit of Auto Rejection and Rules on Temporary Halt on Securities Trading — ASEAN Exchanges](https://www.aseanexchanges.org/content/idx-adjusted-rules-on-lower-limit-of-auto-rejection-and-rules-on-temporary-halt-on-securities-trading/) — 2025-04-08 게시된 BEI 보도자료. 지수 하락 단계별 매매 정지 기준 대조. 2026년 10월 적용 여부는 별도 공식 자료로 확인하지 않음
- [FTSE Country Classification Review September 2026 — LSEG](https://www.lseg.com/en/media-centre/press-releases/ftse-russell/2026/ftse-country-classification-review-september-2026) — 2026-10-06 발표. 2026-11-04 관찰 목록 대조
- [Treatment of Indonesian Securities in FTSE Russell Equity Indices FAQ (v1.4) — FTSE Russell](https://www.lseg.com/content/dam/ftse-russell/en_us/documents/policy-documents/ftse-faq-document-treatment-of-indonesian-securities-in-ftse-russell-equity-indices.pdf) — 2026년 9월 판. 2026-11-04 9월 리뷰에서 보류한 신규 편입, 유동주식 비율 증가와 규모 구간 변경(마이크로캡 강등 제외), 시행하는 주식 수 갱신 대조
- [세계 주식시장 하락율 1위 국가의 대책 / 불타는 프랑스, 그 원인은? / 김정은은 사망했는가 / 미국 중간선거, 선 넘는 네거티브 광고 / 미국 부유세 논란 — YouTube, 슈카월드](https://www.youtube.com/watch?v=djny0bkGyqk) — 2026-10-25 공개 영상, 5절의 계기 자료. 수치와 사실은 이 목록의 1차 출처로 대조

## 관련 문서

- [[Stocks|주식]]
- [[Derivatives|파생상품]]
- [[Risk-and-Return|위험과 수익]]
- [[Investor-Flows-and-Market-Funds|투자자별 매매동향과 증시 자금]]
- [[금융시장(Financial Markets)|금융시장 지도]]
