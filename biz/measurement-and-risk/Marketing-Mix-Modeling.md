---
tags: [business, marketing, measurement, mmm, analytics]
status: done
verified_at: 2026-11-09
category: "비즈니스&제품(Business&Product)"
aliases: ["Marketing Mix Modeling", "MMM", "마케팅 믹스 모델링", "Meridian"]
---

# 마케팅 믹스 모델링(MMM)

마케팅 믹스 모델링은 채널별 마케팅 활동이 매출, 가입 같은 KPI에 준 영향을 집계 데이터로 추정하고 예산 계획에 쓰는 통계 기법이다. 지역이나 국가 단위의 기간별 광고비, 노출과 KPI를 쓰며 쿠키나 사용자 단위 정보를 쓰지 않는다. 4P의 마케팅 믹스와 이름이 같지만 측정 모델을 가리킨다.

## 세 가지 측정 도구를 구분한다

| 도구 | 답하는 질문 | 쓰는 데이터 | 주의할 점 |
| --- | --- | --- | --- |
| 플랫폼 기여 전환 | 이 광고를 거친 전환이 몇 건인가 | 플랫폼이 추적한 노출, 클릭과 전환 | 적용 해석: 표준 기여 설정은 광고가 없어도 일어났을 전환을 빼지 않는다([[Meta-Paid-Ads\|Meta 기여 전환]]) |
| 리프트 실험 | 광고가 없을 때보다 얼마나 늘었나 | 노출 집단과 대조 집단, 또는 노출 지역과 비노출 지역 | 실험한 채널, 기간과 대상에만 직접 적용된다 |
| MMM | 채널 전체의 기여와 다음 예산 배분은 어떤가 | 기간별 집계 광고비와 KPI, 통제 변수 | 관찰 데이터라 모델 가정과 데이터 양에 결과가 좌우된다 |

적용 해석: 세 도구는 서로를 대신하지 않는다. 플랫폼 기여는 운영 진단에, 리프트 실험은 특정 채널의 증분 확인에, MMM은 채널 사이의 예산 비교에 쓰고, 실험 결과로 MMM을 보정한다. 대조 집단의 원리는 [[Metrics-Framework#광고 노출, 브랜드 리프트와 전환을 구분한다|지표 설계의 리프트 실험]]을 따른다.

### 검색 광고에서 관찰 추정과 실험이 갈리는 이유

검색 광고는 이미 살 생각이 있는 사람이 검색하고 클릭하므로 클릭과 구매가 함께 움직인다. 이 상관을 효과로 읽으면 수익률이 부풀려진다. eBay에서 한 대규모 필드 실험은 유료 검색의 실험 기반 수익률이 관례적인 비실험 추정치의 일부에 그친다고 보고했다(2014년 NBER 워킹페이퍼로 공개, 2015년 Econometrica 게재).

- 극단적인 경우로 브랜드 키워드 광고는 측정 가능한 단기 효과가 없었다. 자기 상호를 검색한 사람은 광고가 없어도 찾아오기 쉽기 때문이다(해석).
- 일반 키워드에서는 신규 이용자와 드물게 이용하는 사람이 광고에 반응했다. 그러나 광고와 관계없이 구매하는 잦은 이용자가 광고비의 대부분을 차지해 평균 수익률은 음수였다.

적용 해석: 이 결과는 한 대형 마켓플레이스의 실험이라 모든 사업에 그대로 옮기지 않는다. 경쟁사가 자기 상호에 입찰하는지, 고객 중 신규 비중이 얼마인지에 따라 결과가 달라질 수 있다. 브랜드 검색 광고와 일반 검색 광고는 나눠 보고, 플랫폼 보고 ROAS 대신 광고를 끈 집단이나 기간과 비교해 증분을 확인한다.

## 모델이 표현하는 광고의 성질

Google의 오픈소스 MMM인 Meridian(Apache-2.0)을 기준으로 보면 다음 요소를 모델에 넣는다.

- **이월 효과(adstock):** 광고 효과는 집행 뒤 서서히 줄어든다. 현재 시점과 최대 지연 기간(`max_lag`)까지의 과거 집행을 가중 평균하며, 가중치 함수는 geometric과 binomial 중에서 고르고 감쇠율은 0과 1 사이다.
- **포화(saturation):** 같은 채널에 돈을 더 쓸수록 추가 효과는 줄어든다. 두 모수의 Hill 함수로 표현하며 `ec`는 효과가 절반에 이르는 지점, `slope`는 모양을 정한다. `slope`가 1 이하면 오목한 곡선, 1보다 크면 S자 곡선이고 기본 사전분포는 오목한 모양을 가정한다. 기본값에서는 adstock 다음에 Hill 변환을 적용한다.
- **통제 변수:** 광고와 KPI에 함께 영향을 주는 요인을 넣어 광고 효과로 잘못 잡히지 않게 한다. Google 검색량(GQV)은 자연 검색 수요(브랜드와 일반 검색량)를 반영하는 통제 변수로 쓸 수 있고, Google 검색 광고의 교란 요인이다. 브랜드 검색과 일반 검색 광고는 별도 채널로 두고 각각 맞는 검색량을 통제한다. 다만 검색을 일으키는 다른 매체 채널에게 검색량은 매개변수(mediator)일 수 있고, 매개변수를 통제 변수로 넣으면 그 채널의 효과 추정이 편향된다. 넣을지는 편향 없이 추정해야 할 채널, 매체와 검색량과 KPI 사이 관계의 세기, 검색량이 교란 요인인 채널 수를 함께 보고 정하며, 문서는 대부분의 경우 교란 요인으로 보고 넣는 쪽을 권한다.
- **추세와 계절성:** 시간 효과는 knot로 모델링한다.

채널 단위 모델을 기본으로 한다. 시작과 종료가 뚜렷한 캠페인 단위로 쪼개면 이월 효과의 기억이 끊길 수 있어 캠페인 단위 실행은 일반적으로 권하지 않는다.

## 실험 결과로 사전분포를 보정한다

Meridian은 베이지안 모델이며 MCMC(NUTS)로 사후분포를 구한다. 보정(calibration)은 실험 결과와 도메인 지식으로 채널별 처치 사전분포(주로 ROI)를 정하는 과정이다. 기본 사전분포는 중간 정도의 정보를 담고 있으며, 보정한 사전분포는 결과가 비현실적으로 벗어나지 않게 하는 안전장치 역할을 한다. 데이터가 사전분포와 강하게 어긋나면 모델은 데이터 쪽으로 조정된다.

실험 결과를 사전분포로 바꾸는 단일 공식은 없다. 반영 전에 다음 차이를 확인한다.

- 실험 시점이 모델 기간과 얼마나 떨어졌는가
- 실험 기간이 이월 효과를 다 담을 만큼 길었는가
- 실험한 매체 단위와 대상 인구가 모델 채널과 같은가
- 측정한 값이 같은가: MMM의 반사실은 광고비 0이지만, 일부 실험은 추가 집행의 한계 효과를 재거나 0이 아닌 기준선을 쓴다

`CalibrationBuilder`는 증분 실험 결과를 시점, 기간, 매체 단위와 광고비 차이를 반영한 ROI 사전분포로 바꾸는 도구다. 보정 뒤에는 사전분포와 사후분포가 얼마나 움직였는지 그려서 확인한다.

## 데이터 양을 먼저 확인한다

데이터 크기는 지역 수와 시점 수의 곱이다. 다만 지역과 시점의 각 칸은 서로 독립된 관측치가 아니다. Meridian 문서는 2년치 주간 국가 단위 데이터(104개 시점)로 26개 모수(Adstock과 Hill 모수를 뺀 단순화 기준)를 추정하는 예를 신뢰하기에 너무 적다고 본다. 지역 모델의 모수당 데이터 비율은 지역 간 공유를 전혀 하지 않는 관점의 하한과 완전히 공유하는 관점의 값 사이에 놓이며, 실제 공유 정도는 계층 분산 모수가 정한다. 그래서 문서는 단일 최소 비율을 정하지 않는다. 이 지침은 방향을 알려 줄 뿐이며, 실제로 모델을 돌려 신용구간의 폭을 보는 것이 가장 정확한 확인이다.

## 예산 최적화 결과를 읽는 법

고정 예산 시나리오의 최적화는 정한 예산과 채널별 제약 안에서 추천 배분, 예상 ROI와 증분 KPI, 채널별 반응 곡선을 낸다. 포화 모델링 문서는 관찰 범위 밖으로 연장한 결과는 주의해 해석하고, S자 곡선은 볼록성 때문에 최적화의 수렴 문제를 일으킬 수 있다고 설명한다. 적용 해석: 다음 경우는 추천 배분을 집행안으로 옮기기 전에 다시 검토한다.

- 관찰한 적 없는 광고비 수준까지 반응 곡선을 연장한 추천이다
- S자 반응 곡선 때문에 최적화가 수렴하지 않거나 불안정하다
- 사후분포의 신용구간이 넓어 채널 간 차이를 구분하기 어렵다

## 작은 사업의 적용 점검

다음은 위 데이터 양 기준을 소규모 사업에 적용한 제안이다. 채널이 적고 집행 기간이 짧은 1인 사업이나 홈페이지 외주의 광고에서는 국가 단위 주간 데이터만으로 MMM을 신뢰할 만큼 추정하기 어렵다. 먼저 KPI와 채널별 광고비를 같은 주기로 끊김 없이 기록하고, 주요 채널은 대조 집단이나 비노출 지역을 둔 리프트 실험으로 증분을 확인한다. 기록이 쌓이고 채널이 늘어 배분 결정이 커질 때 MMM을 검토한다.

## 체크포인트

- 플랫폼 기여 전환, 리프트 실험과 MMM이 각각 무엇을 반사실로 삼는지 설명할 수 있는가
- 이월 효과와 포화를 넣지 않으면 광고 효과가 어떻게 왜곡되는가
- 실험 결과를 MMM 사전분포로 옮기기 전 확인할 차이는 무엇인가
- 추천 배분이 관찰 범위 밖으로 연장된 결과인지 확인했는가

## 출처

- [Google for Developers, Meridian](https://developers.google.com/meridian)
- [Google for Developers, About Meridian](https://developers.google.com/meridian/docs/basics/about-the-project)
- [Google for Developers, Amount of data needed](https://developers.google.com/meridian/docs/pre-modeling/amount-data-needed)
- [Google for Developers, Media saturation and lagging](https://developers.google.com/meridian/docs/advanced-modeling/media-saturation-lagging)
- [Google for Developers, Calibrate treatment priors](https://developers.google.com/meridian/docs/advanced-modeling/roi-priors-and-calibration)
- [Google for Developers, Control variables](https://developers.google.com/meridian/docs/advanced-modeling/control-variables)
- [Google for Developers, Paid search modeling](https://developers.google.com/meridian/docs/advanced-modeling/paid-search-modeling)
- [Google for Developers, Generate optimization results output](https://developers.google.com/meridian/docs/user-guide/generate-optimization-results-output)
- [Google for Developers, Introduction to Applied Modeling](https://developers.google.com/meridian/docs/advanced-modeling/intro)
- [google/meridian — GitHub](https://github.com/google/meridian)
- [Consumer Heterogeneity and Paid Search Effectiveness: A Large Scale Field Experiment — NBER Working Paper 20171, Tom Blake, Chris Nosko, Steven Tadelis](https://www.nber.org/papers/w20171)
- [Consumer Heterogeneity and Paid Search Effectiveness: A Large-Scale Field Experiment — Econometrica, Thomas Blake, Chris Nosko, Steven Tadelis](https://doi.org/10.3982/ECTA12423)

## 관련 문서

- [[Metrics-Framework|지표 설계 (증분, 리프트 실험과 비교 집단)]]
- [[Marketing-Fundamentals|마케팅 기본 (4P 마케팅 믹스, ROAS)]]
- [[Meta-Paid-Ads|Meta 유료 광고 (플랫폼 기여 전환)]]
- [[AI-Marketing-Analysis|AI 마케팅 분석 (증분 효과)]]
- [[CTV-Performance-Advertising|CTV 퍼포먼스 광고 (클릭 기여와 증분 실험의 차이)]]
- [[Performance-Ad-Budget-and-Bidding|퍼포먼스 광고의 예산과 입찰 (한계 ROAS 곡선)]]
