---
tags: [econ, applied, infrastructure, ai, power-grid, regulation]
status: done
verified_at: 2026-11-25
category: "Economics"
aliases: ["데이터센터 전력망 연결과 지역 수용성", "Data Center Grid Access Politics"]
---

# 데이터센터 전력망 연결과 지역 수용성

> 한 줄 요약: 이 문서는 AI 데이터센터의 공급 제약을 칩과 전력 설비 밖에서도 본다. 대형 부하의 전력망 연결 승인, 세제 혜택, 물 사용과 지역 부담을 둘러싼 정책 결정도 가동 시점과 비용에 영향을 줄 수 있다.

## 정의

이 문서의 전력망 연결(interconnection)은 데이터센터 같은 대형 부하가 전력망에 접속하는 절차를 가리킨다. 발전 설비의 계통 연결은 다루지 않는다. 접속 대기열에 올라온 요청은 실제 건설이나 가동이 아니라 연결 신청이므로, 대기열의 총량을 미래 전력 수요로 그대로 읽지 않는다(해석).

지역 수용성은 세제 감면에 따른 재정 부담, 전기요금 전가, 물과 소음 같은 외부 비용([[Market-Failure-Externalities|외부효과]])을 지역 사회와 주 정부가 받아들일 수 있는지의 문제다.

## 분석 틀

아래는 이 문서의 분석 제안이며, 일반 법칙으로 검증된 인과관계가 아니다.

1. **요청과 실제 수요의 괴리:** 접속 요청이 계통의 역대 최대 수요를 몇 배 넘으면 어떤 사업이 실제로 지어질지가 불확실하다. 대기열 수치는 수요 신호이지 확정 물량이 아니다.
2. **정보 수집과 승인 조건의 구분:** 정부가 소유 구조, 공공 지원, 전력과 물 사용 정보를 모으는 것과 그 항목을 승인 조건으로 정하는 것은 다른 단계다. 정보 수집 뒤의 입법과 규칙 제정이 실제 조건을 정한다.
3. **비용 배분 쟁점:** 송전망 증설, 세제 감면과 물 공급의 비용을 누가 부담하는지가 쟁점이 될 수 있다. 사업자 부담이 늘면 건설 원가와 기간에 반영될 수 있다.
4. **자금 구조별 차등 영향:** 지연과 추가 비용의 부담은 자체 현금으로 짓는 사업자와 차입으로 짓는 사업자 사이에 다를 수 있다. 건설 기간의 이자를 누가 부담하는지는 [[AI-Infrastructure-Capital-Cycle|AI 인프라 투자와 자본 순환]]의 위험 배분 질문으로 확인한다.

## 사례: 2026년 텍사스의 데이터센터 감사 지시

2026-08-03 텍사스 주지사 Greg Abbott은 텍사스 공공유틸리티위원회(PUCT)와 계통 운영자 ERCOT에 ERCOT 접속 절차를 진행 중인 데이터센터의 검증과 감사를 지시했다. 발표문은 감사를 마치기 전에는 어떤 데이터센터 사업도 진행할 수 없다고 적고, 같은 날 지시 서한은 추가 데이터센터가 승인되기 전에 감사해야 한다고 적는다. 두 문서 모두 종료 시점을 정하지 않았다. 발표와 서한에 따르면 텍사스 전력망에는 약 474GW(발표문은 approximately over로 표기)의 접속 요청이 있으며 이는 ERCOT 역대 최대 수요의 5배가 넘고, 새 요청의 약 90%가 데이터센터다.

발표가 밝힌 배경은 전력망의 신뢰성과 안정성 우려이며, 같은 해 6월 10일 지시의 후속 조치다. 서한은 일부 데이터센터가 주 예산법(General Appropriations Act)에 따른 PUCT의 물과 전력 사용량 조사를 준수하지 않은 점도 이유로 든다.

서한은 감사에 더해, 데이터센터 관련 우려를 입법으로 다루는 데 쓰도록 PUCT와 ERCOT가 사업마다 다음 정보를 받으라고 지시한다. 서한은 각 항목을 사업자가 스스로 비용을 대는지, 자체 전력과 물을 마련하는지 아니면 주의 지원과 ERCOT 전력망, 지역의 물에 기대는지를 묻는 형태로 제시한다.

- 받았거나 받을 예정인 주와 지방의 세제 혜택, 보조금, 감면과 기타 공공 재정 지원
- 연간과 최대 전력 소비 전망, 자체 발전 설비를 짓거나 사들이는 노력과 진척(발전 방식 포함)이나 ERCOT 전력망 수요를 줄이는 다른 조치
- 연간과 최대 물 사용 전망, 수원과 냉각 방식(공랭, 폐쇄형 순환 등)
- 소음, 조명, 이격 거리, 교통과 비상 대응 같은 지역 영향 대책
- 사업의 소유와 지배 지분

연결 거부는 PUCT와 ERCOT의 요건, 주법이나 검증과 감사 절차를 지키지 못한 사업에 적용된다고 적었다. 위 정보 항목에서 사업자가 비용을 얼마나 부담해야 승인되는지는 서한이 정하지 않으며, 정보를 내지 않은 것이 연결 거부 사유인지도 두 문서 모두 밝히지 않는다. 이 절은 2026-08-03 발표문과 서한을 2026-11-16 대조한 내용이며, 그 뒤 PUCT와 ERCOT의 이행 상황은 확인하지 않았다.

해석: 정보 항목은 주 정부가 입법 판단을 위해 모으는 비용 배분 쟁점의 목록으로 읽을 수 있다. 이것이 실제 승인 조건이 될지는 이후 입법과 규칙 제정에 달려 있다.

## 용량 시장을 통한 비용 전가: PJM 사례

미국 동부의 계통 운영자 PJM은 인도연도에 필요한 발전 용량을 경매(Base Residual Auction)로 미리 산다. 원칙은 3년 앞이지만 아래 표의 최근 경매는 일정을 압축해 인도연도 시작 약 10~23개월 전에 열렸다. 부하서비스사업자(LSE, 전력회사 등)는 존별로는 예측 최대 부하 비중, 존 안에서는 배전사업자(EDC)가 정한 기준으로 나눈 자기 몫의 용량 의무에 최종 존별 용량 가격(여러 경매 결과를 가중 평균하고 조정한 값)을 곱한 비용을 인도연도 동안 부담하고, 이 비용이 주별 요금 제도를 거쳐 소매 요금에 반영된다. 즉 비용은 경매 시점이 아니라 6월 1일에 시작하는 인도연도에 발생한다. 경매 가격은 도매가격이며, 자체 공급이나 쌍무계약으로 헤지한 부하는 경매 가격에 그대로 노출되지 않는다.

부하 예측에 아직 짓지 않은 데이터센터가 들어가면, 그 부하가 실제로 전기를 쓰기 전에 용량 가격이 오르고 기존 소비자도 그 비용을 나눠 낸다. 2026-01 기준 PJM은 전용 부하 접속 대기열을 두지 않고 EDC나 LSE가 내는 대형 부하 조정을 예측에 반영한다. 같은 달 PJM 이사회는 2026년 예측에 아직 반영하지 못한 개선을 2027년 부하 예측까지 적용하라고 지시했다. 내용은 주 위원회의 비공식 검토와 의견 제출, 중복 요청 제거, 재정 약정 기준이다.

| 인도연도 | RTO 청산 가격($/MW-day) | 비고 |
| --- | --- | --- |
| 2024/2025 | 28.92 | |
| 2025/2026 | 269.92 | |
| 2026/2027 | 329.17 | 상한에서 청산 |
| 2027/2028 | 333.44 | 상한에서 청산, 신뢰도 요건보다 약 6,517MW 부족 |
| 2028/2029 | 325.00 | 상한에서 청산, 약 6,831MW 부족 |

2026/2027과 2027/2028의 상한과 하한은 펜실베이니아 주지사와 PJM의 합의를 PJM이 FERC에 제출해 승인받은 한시 장치이고, 2028/2029와 2029/2030에는 PJM의 별도 제출과 FERC 승인으로 연장됐다. PJM 보고서는 신뢰도 요건을 올린 예측 부하 증가분(2027/2028 약 5,250MW, 2028/2029 약 1,375MW)이 대체로 대형 부하 추가 때문이라고 적는다. 같은 보고서는 경매 결과에 영향을 준 계획 변수와 규칙 변화도 함께 적는다. 2027/2028에는 예비율(IRM)이 19.1%에서 20.0%로 오르고 상한을 넘는 입찰 약 810MW가 청산되지 못했으며, 2028/2029에는 IRM이 20.0%로 유지되고 예측 풀 요건(FPR)이 올랐다. 제출된 입찰을 그대로 두고 상한과 하한을 뺀 PJM 시뮬레이션에서 RTO 가격은 약 530달러(2027/2028)와 555달러(2028/2029)였으며, PJM은 상한이 없었다면 입찰이 어떻게 달라졌을지는 알 수 없다고 단서를 단다. 원인 해석은 기관마다 다르다. PJM은 2025-03 증언에서 2025/2026 급등의 원인으로 대규모 발전기 퇴역에 따른 공급 감소, 수요 증가와 FERC가 승인한 시장 규칙 개편을 함께 들었고, 아래 IMM은 최근 용량 시장 상황의 주된 원인을 데이터센터 부하 증가로 본다.

PJM의 독립 시장감시인(IMM, Monitoring Analytics)은 데이터센터 부하가 없다고 가정한 시나리오와 비교해 경매 수입 증가분을 추정했다. 2027/2028 경매의 수입 약 164억 달러 가운데 기존과 예측 데이터센터 부하 전체가 늘린 금액은 약 65억 달러, 예측분(신규와 기존 증가분 13,018MW)만으로 늘린 금액은 약 62억 달러다. 2025/2026부터 2028/2029까지 네 경매에서 기존과 예측 데이터센터 부하 전체가 늘린 금액의 합계는 약 294억 달러이며, IMM은 예측 데이터센터 부하가 없었다면 부족분도 없었다고 적는다. 이 금액은 IMM의 시나리오 추정으로 낸 경매 수입 기준이며 가구별 소매 요금 증가액이 아니다. PJM은 2025-07-22 2026/2027 결과 발표에서 LSE와 주의 전가 방식에 따라 일부 고객의 청구액이 전년 대비 1.5~5% 오를 수 있고 가격이 내린 존에서는 내릴 수 있다고 예상했다. 실제 소매 요금 변화는 확인하지 않았다.

대형 부하에 비용을 직접 묶는 요금제도 등장했다. 오하이오 공공유틸리티위원회(PUCO)는 2025-07-09 AEP Ohio 사건의 합의안을 채택해 데이터센터 전용 요금제를 만들게 했다. AEP Ohio 발표에 따르면 대형 신규 데이터센터 고객은 4년의 증량기간을 포함한 12년 동안 가입한 에너지의 최소 85%에 대한 요금을 내고(중소형에는 단계적 기준), 사업을 취소하거나 의무를 이행하지 못하면 exit fee를 내며 재무 능력을 증빙해야 한다. 적용 대상 규모는 1차 출처로 확인하지 못했다.

해석: 같은 데이터센터 수요라도 비용이 용량 시장을 거쳐 전체 소비자에게 퍼지면 지역 반대의 근거가 되고, 대형 부하 요금제로 사업자에게 묶이면 사업자 원가가 된다. 비용 배분 방식에 따라 정치적 저항과 사업자 원가 사이의 무게가 달라진다.

지역 투표에서도 저항이 드러났다. 집계 기관 Ballotpedia는 2026-11-03 선거와 함께 치러진 데이터센터 관련 지역 주민투표 41건 가운데 40건에서 개발을 제한하는 쪽이 이겼다고 집계했다(제한안 27건 가결, 우호적 안 13건 부결). 41건은 Ballotpedia가 수록한 건수이며 전수 집계인지는 기사에 없다. 선거 3일 뒤 발행분이라 인증 전 결과일 수 있고, 각 지역 선관위 결과로는 확인하지 않았다. 지역 단위 투표이므로 주 전체나 전국의 여론으로 확대하지 않는다.

이 절은 2026-11-25 대조한 내용이며 2026-12로 잡힌 2029/2030 경매 결과는 반영하지 않았다.

## 투자 판단에 적용하는 질문

- 공개된 AI 인프라 용량 전망이 이미 승인된 물량인지, 접속 대기열의 요청까지 포함한 것인지 구분한다.
- 규제 변화가 금지인지, 정보 수집인지, 비용 부담을 조건으로 붙이는 것인지 나눈다. 조건 부과라면 수요 소멸이 아니라 원가 상승과 일정 지연으로 반영할 수 있다.
- 지연 비용을 누가 버티는지 본다. 자체 현금으로 짓는 사업자, 차입으로 짓는 사업자와 장비 공급사의 영향을 나눈다.
- 용량 시장이 있는 지역이면 예측 부하에 들어간 미건설 데이터센터가 경매 가격과 소비자 비용을 얼마나 움직였는지, 대형 부하 요금제로 사업자에게 되돌리는 장치가 있는지 본다.
- 한 지역의 규제를 전체 시장의 수요 감소로 확대하지 않는다. 물량이 다른 지역으로 옮겨 가는지, 같은 쟁점이 여러 지역으로 번지는지를 따로 확인한다.
- 지시나 공약 단계의 내용을 확정된 규칙으로 읽지 않는다. 규제기관의 후속 결정과 입법 일정을 함께 확인한다.

## 출처

- [Governor Abbott Directs Comprehensive Data Center Audit — Office of the Texas Governor](https://gov.texas.gov/news/post/governor-abbott-directs-comprehensive-data-center-audit) — 2026-08-03 발표의 수신 기관, 배경, 474GW와 데이터센터 비중 약 90%를 2026-11-16 대조
- [Data Centers Directive Letter to PUCT and ERCOT — Office of the Texas Governor](https://gov.texas.gov/uploads/files/press/Thomas_Gleeson_Pablo_Vegas_Data_Centers_Directive_Letter_to_PUCT_ERCOT_August_2026_.pdf) — 2026-08-03 서한의 감사 시점, 정보 요구 항목과 연결 거부 요건을 2026-11-16 대조
- [2026/2027 RPM Base Residual Auction Report — PJM](https://www.pjm.com/-/media/DotCom/markets-ops/rpm/rpm-auction-info/2026-2027/2026-2027-bra-report.pdf) — 2024/2025부터 2026/2027의 RTO 가격, 상한과 하한, 합의 적용 경매를 2026-11-25 대조
- [2027/2028 RPM Base Residual Auction Report — PJM](https://www.pjm.com/-/media/DotCom/markets-ops/rpm/rpm-auction-info/2027-2028/2027-2028-bra-report.pdf) — 상한 청산, 부족분과 상한 없을 때의 추정 가격을 2026-11-25 대조
- [2028/2029 Base Residual Auction Report — PJM](https://www.pjm.com/-/media/DotCom/markets-ops/rpm/rpm-auction-info/2028-2029/2028-2029-bra-results-report.pdf) — 상한 청산, 부족분, 시뮬레이션 가격과 경매 일정을 2026-11-25 대조
- [PJM Auction Procures 134,311 MW of Generation Resources — PJM Inside Lines](https://insidelines.pjm.com/pjm-auction-procures-134311-mw-of-generation-resources-supply-responds-to-price-signal/) — 2025-07-22 소매 청구액 예상 범위를 2026-11-25 대조
- [Board Decisional Letter on Critical Issue Fast Path - Large Load Additions — PJM](https://www.pjm.com/-/media/DotCom/about-pjm/who-we-are/public-disclosures/2026/20260116-pjm-board-letter-re-results-of-the-cifp-process-large-load-additions.pdf) — 2026-01-16 부하 접속 대기열 미설치와 예측 개선 지시를 2026-11-25 대조
- [Overview of RPM Cost Allocation — PJM](https://www.pjm.com/-/media/DotCom/committees-groups/workshops/rbpw/2026/20260225/20260225-item-04---overview-of-rpm-cost-allocation---pjm-presentation.pdf) — LSE의 용량 의무와 부과 방식을 2026-11-25 대조
- [Testimony to the New Jersey Senate Legislative Oversight Committee — PJM](https://www.pjm.com/-/media/DotCom/library/reports-notices/testimony/2025/20250303-testimony-stanek-nj-senate-legislative-oversight-committee.pdf) — 경매 가격이 도매가격이라는 설명과 2025/2026 가격 상승 요인을 2026-11-25 대조
- [Analysis of the 2027/2028 RPM Base Residual Auction, Part A — Monitoring Analytics](https://www.monitoringanalytics.com/reports/Reports/2026/IMM_Analysis_of_the_20272028_RPM_Base_Residual_Auction_Part_A_20260105.pdf) — 데이터센터 부하 시나리오별 수입 증가분을 2026-11-25 대조
- [Analysis of the 2028/2029 RPM Base Residual Auction, Part A — Monitoring Analytics](https://www.monitoringanalytics.com/reports/Reports/2026/IMM_Analysis_of_the_20282029_RPM_Base_Residual_Auction_Part_A_20261030.pdf) — 네 경매의 데이터센터 기여 금액, 주지사 합의와 2028/2029, 2029/2030 상한 연장(PJM 제출과 FERC 승인), 2029/2030 경매 일정을 2026-11-25 대조
- [PUCO orders AEP Ohio to create data center specific tariff — Public Utilities Commission of Ohio](https://content.govdelivery.com/accounts/OHPUC/bulletins/3e8bb79) — 2025-07-09 합의안 채택을 2026-11-25 대조
- [AEP Ohio proposal on data centers to protect Ohio consumers adopted by PUCO — AEP Ohio](https://www.prnewswire.com/news-releases/aep-ohio-proposal-on-data-centers-to-protect-ohio-consumers-adopted-by-puco-302501668.html) — 85%, 12년, exit fee 조건을 2026-11-25 대조
- [Voters favored limiting data center development in 40 of 41 local ballot measures on Nov. 3 — Ballotpedia News](https://news.ballotpedia.org/2026/11/06/voters-favored-limiting-data-center-development-in-40-of-41-local-ballot-measures-on-nov-3/) — 집계 기관 자료, 2026-11-25 확인

## 관련 문서

- [[AI-Infrastructure-Capital-Cycle|AI 인프라 투자와 자본 순환]]
- [[Hidden-Infrastructure-Markets|보이지 않는 B2B 인프라 시장]]
- [[Data-Center-Power-Distribution|데이터센터 전력 분배]]
