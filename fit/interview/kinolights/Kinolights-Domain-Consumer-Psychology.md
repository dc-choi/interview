---
tags: [fit, interview, kinolights, ott, domain]
status: done
category: "Interview - Fit"
aliases: ["Kinolights OTT Consumer Psychology", "OTT 소비자 심리"]
---

# OTT 소비자 심리 (구독 피로, 탐색 비용, 결정 회피)

키노라이츠 도메인 이해 시리즈의 세 번째 문서. 앞의 [[Kinolights-Domain-OTT-Business-Models|OTT 수익 모델]]이 같은 시장을 공급자의 수익 구조 축에서 봤다면, 이 문서는 수요자의 행동 축에서 본다. 공개된 제품 표면을 기준으로 보면 통합 검색과 통합 랭킹은 구독 피로, 탐색 비용, 결정 회피라는 세 가지 마찰에 대응한다고 해석할 수 있다. 이 문서는 그 개인 가설의 근거를 정리한다.

## 세 가지 마찰

### 구독 피로 (Subscription Fatigue)

- **정의**: 구독 서비스 수와 월 지출이 누적되면서, 개별 서비스의 효용보다 관리 부담과 총액 인식이 앞서는 상태.
- 미국 기준 조사 수치 (Deloitte Digital Media Trends 2026, 2025년 10~11월 미국 14세 이상 3,575명): 유료 SVOD를 쓰는 가구가 90%이고 평균 4개를 구독하며 월 지출은 평균 69달러. 최근 6개월 안에 SVOD를 해지한 응답이 41%, 해지했다가 같은 서비스로 되돌아온 응답이 22%다.
- **서핑 행태**: 보려는 시리즈가 공개될 때 가입하고 다 보면 해지하는 churn and return이 예외가 아니라 하나의 이용 패턴으로 굳었다. 구독을 상시 계약이 아니라 단기 이용권처럼 쓰는 방식이다.
- **가격 민감도**: 같은 조사에서 즐겨 쓰는 서비스가 월 5달러 오르면 해지하겠다는 응답이 61%, 가격 인상에 불만을 표한 응답이 73%다.
- **공급자 대응**: 광고 요금제가 이 피로에 대응하는 가격 축 수단이다. 같은 조사 기준 SVOD 구독자의 68%가 광고 포함 요금제를 하나 이상 쓰고 있고 2024년 조사의 46%에서 올랐다. 요금제와 수익 모델 정의는 [[Kinolights-Domain-OTT-Business-Models|OTT 수익 모델]], 구독 티어와 가격 심리 일반론은 [[Pricing-Strategy|가격 전략]]이 정본이다.
- **한국 맥락**: 방송미디어통신위원회 2025 방송매체 이용행태조사(2025-12-30 발표, 13세 이상 8,320명 대면조사) 기준 OTT 이용률 81.8%, 유료 OTT 이용률 65.5%로 전년보다 늘었다. 위 미국 수치를 국내에 그대로 대입할 수는 없고, 국내는 유료 전환이 아직 진행 중인 단계로 읽는 편이 안전하다.
- 제품 관점: 구독 피로는 이탈 위험이면서 동시에 어느 서비스를 남길지 판단할 근거를 찾는 수요이기도 하다.

### 콘텐츠 탐색 비용 (Discovery Cost)

- **정의**: 볼 작품을 정하기까지 드는 시간, 인지 부하, 앱 전환의 총합.
- **질문이 둘로 갈라지는 구조**: 카탈로그가 서비스별로 파편화되면 무엇을 볼까(취향 문제)와 어디서 볼 수 있나(가용성 문제)가 분리된 두 개의 질문이 된다. 단일 카탈로그 시절에는 하나였던 질문이다.
- 조사 수치 (Nielsen Gracenote State of Play, 2025-11-05 공개, 브라질, 프랑스, 독일, 멕시코, 영국, 미국 6개국 3,000명): 볼 것을 찾는 데 쓰는 시간이 전 세계 평균 14분, 미국 12분으로 2023년 중반의 10.5분에서 늘었다. 검색이 잘 안 되면 시청 자체를 포기한다는 응답이 19%(18~24세는 29%), 탐색이 어려워 서비스를 해지할 수 있다는 응답이 49%다. 서비스 전반의 파편화가 경험을 해친다는 응답이 33%, 서비스를 가로지르는 통합 가이드를 원한다는 응답이 66%다.
- **앱 전환 비용**: 같은 제목을 서비스마다 다시 검색해야 하고, 실패해도 그 서비스에 없다는 사실만 남는다. 실패한 탐색은 다음 탐색을 줄여주지 않는다.
- **정보 노후화**: 홀드백과 창구 이동으로 가용성이 계속 바뀌므로 한 번 알아낸 정보의 유효기간이 짧다. 탐색 비용이 일회성 지출이 아니라 반복 지출이 되는 이유다. 창구 구조는 [[Kinolights-Domain-OTT-Business-Models|OTT 수익 모델]]과 [[Kinolights-Domain-Film-Industry|영화 산업 구조]]가 다룬다.
- 검색 의도 분류, facet, 자동완성, zero-result 복구 같은 UI 층 해법은 [[Search-UX|검색 UX]]가 정본이므로 여기서 다시 풀지 않는다.
- 제품 관점: 탐색 비용은 통합 서비스의 존재 이유 그 자체다. 가용성 데이터의 정확도가 실제로 절감되는 비용의 크기를 결정한다.

### 결정 회피와 선택 과부하 (Choice Overload)

- **정의**: 선택지가 늘어날수록 결정을 미루거나 포기하고 선택 후 만족도도 떨어진다는 가설. 대중적으로는 Iyengar와 Lepper의 2000년 잼 실험(6종 진열과 24종 진열 비교)이 가장 널리 인용된다.
- **재현 논쟁**: 이 가설을 법칙처럼 인용하지 않는 편이 안전하다. Scheibehenne, Greifeneder, Todd의 2010년 Journal of Consumer Research 메타분석은 50개 실험 63개 조건(N=5,036)을 모아 평균 효과 크기가 사실상 0이고 연구 간 분산이 크며 충분조건을 특정하지 못했다고 보고했다. 이후 Dean, Ravindran, Stoye는 기존 검정의 통계적 검정력이 부족했다고 주장하며 개선한 설계에서 과부하 증거를 찾았다고 보고했다(arXiv 2022년 최초 공개, 이후 개정). 현재 문헌 상태에 맞게 쓰려면 조건부 현상으로 다루는 편이 맞다.
- **OTT 맥락의 조사 응답**: 심리학 실험의 일반 명제와 별개로, 위 Nielsen 조사에서 응답자의 19%는 검색이 잘 안 되면 시청을 포기한다고 답했고 45%는 전체 경험이 부담스럽다고 답했다. 자기보고 응답이므로 실제 행동 로그로 단정할 수는 없지만 이 시장의 마찰을 보여 주는 별도 신호다.
- **전형적 행태**: 카탈로그를 한참 스크롤하다 아무것도 보지 않고 종료하기, 이미 본 작품을 다시 트는 재시청으로 회귀하기, 랭킹이나 지인 추천처럼 남이 좁혀준 후보로 도피하기.
- 제품 관점: 후보를 늘려주는 것보다 좁혀주는 것이 가치가 크다. 개인화 운영의 함정은 [[Personalization-Recommendation|개인화와 추천]], 검색과 무질의 추천과 browse의 의도 분리는 [[Recommendation-System-OTT-Discovery-Architecture|OTT 디스커버리 아키텍처]]가 정본이다.

### 한눈 비교

| 마찰 | 사용자가 겪는 형태 | 관측 가능한 행동 신호 | 제품이 대응하는 방향 |
|---|---|---|---|
| 구독 피로 | 서비스 수와 월 총액 부담, 결제 관리 피로 | 해지와 재가입 반복, 광고 요금제 전환, 가격 인상 직후 이탈 | 이미 낸 구독으로 볼 수 있는 범위를 드러내기, 서비스별 가치 비교 |
| 탐색 비용 | 볼 것을 정하기까지의 시간과 앱 전환 | 세션당 탐색 시간 증가, 검색 실패 후 이탈, 앱 간 재검색 | 서비스를 가로지르는 통합 검색과 정확한 가용성 표기 |
| 결정 회피 | 후보가 너무 많아 결정을 미룸 | 스크롤 후 무시청 종료, 재시청 비중 상승, 랭킹 진입 비중 상승 | 랭킹, 컬렉션, 개인화로 후보 집합 좁히기 |

## 세 마찰의 상호작용

- **순환 구조**: 카탈로그 파편화가 탐색 비용을 올리고, 높아진 탐색 비용이 무시청 종료 같은 결정 회피를 키우고, 결정 회피가 구독료 대비 실제 시청이 적다는 인식을 만들어 구독 피로를 강화한다. 해지 뒤 다른 서비스에 가입하면 파편화 경험이 다시 시작된다.
- **개입 지점**: 통합 서비스는 이 순환의 두 번째와 세 번째 고리에 직접 개입한다. 구독 자체를 대체하는 것이 아니라, 이미 지불한 구독으로 볼 수 있는 것을 드러내 체감 가치를 올리는 방향이다.
- **지표 함의**: 그래서 통합 검색의 성공 지표는 검색 결과 개수가 아니라 결정까지 걸린 시간과 무시청 종료 비율에 가깝다. surface별 지표와 실험 설계는 [[Recommendation-System-OTT-Aggregator-Design-Proposal|OTT 통합 서비스 초기 설계안]]이 다룬다.
- 단, 이 순환은 인과 사슬 가설이다. 위에 인용한 조사들은 각 고리를 따로 관측했을 뿐 순환 전체를 검증한 것이 아니다.

## 키노라이츠 도메인 연결

아래 매핑은 공개된 제품 표면과 공개 보도만 보고 세운 개인 가설이며, 회사의 내부 지표나 전략이 아니다.

- **통합 검색**: 어디서 볼 수 있나라는 질문을 한 번에 끝내는 표면. 탐색 비용에 직접 대응한다.
- **OTT 통합 랭킹**: 후보를 사회적 신호로 좁혀주는 표면. 결정 회피에 대응하며, 무질의 상태의 진입점 역할도 한다.
- **컬렉션과 큐레이션**: 취향 축으로 후보를 좁힌다. 탐색 비용과 결정 회피에 걸쳐 있다.
- **작품별 시청 방법 표기(정액제, 무료, 대여, 구매)**: 지금 내가 낸 구독으로 볼 수 있는지 즉답한다. 구독 피로에 대응하는 표면이다.
- **가용성 정확도**: 탐색 비용에 직결된다. 표기가 틀리면 비용이 줄기는커녕 늘어난다. 앱을 열었는데 작품이 없는 경험은 실패한 탐색보다 비싸다. offer와 AccessType 같은 데이터 표현은 [[Content-Availability-Data-Contract|콘텐츠 가용성 데이터 계약]], 창구 이동과 산업 배경은 [[Kinolights-Domain-OTT-Business-Models|OTT 수익 모델]]이 담당한다.

## 출처

- [2026 Digital Media Trends — Deloitte Insights](https://www.deloitte.com/us/en/insights/industry/technology/digital-media-trends-consumption-habits-survey.html) (2025년 10~11월 미국 14세 이상 3,575명 조사)
- [From Subscribers to Superfans 보도자료 — Deloitte US](https://www.deloitte.com/us/en/about/press-room/deloitte-survey-digital-media-trends-consumption-habits.html) (2026-03-25 공개, 같은 조사의 가격 민감도와 광고 요금제 수치)
- [New Gracenote Report Highlights Impact of Ineffective Content Discovery on Consumer Happiness with Streaming — Nielsen](https://www.nielsen.com/news-center/2025/new-gracenote-report-highlights-impact-of-ineffective-content-discovery-on-consumer-happiness-with-streaming/) (2025-11-05 공개, 6개국 3,000명 조사)
- [Can There Ever Be Too Many Options? A Meta-Analytic Review of Choice Overload — Journal of Consumer Research](https://academic.oup.com/jcr/article-abstract/37/3/409/1827647) (Scheibehenne, Greifeneder, Todd, 2010)
- [A Better Test of Choice Overload — arXiv](https://arxiv.org/abs/2212.03931) (Dean, Ravindran, Stoye, 2022 최초 공개)
- [방미통위, 2025 방송매체 이용행태조사 결과 발표 — 방송미디어통신위원회](https://www.kmcc.go.kr/user.do?boardId=1113&page=A05030000&dc=K00000200&boardSeq=67869&mode=view) (2025-12-30 발표)
- [2025 방송매체 이용행태조사 결과 발표 — KDI 경제정보센터](https://eiec.kdi.re.kr/policy/materialView.do?num=275509) (OTT 이용률 81.8%, 유료 이용률 65.5%)
- [키노라이츠 공개 서비스 화면 — 키노라이츠](https://m.kinolights.com/)

## 관련 문서

- [[Kinolights-Domain-OTT-Business-Models|OTT 수익 모델 (시리즈 첫 문서)]]
- [[Kinolights-Domain-Film-Industry|영화 산업 구조와 유통 창구]]
- [[Business-Model|비즈니스 모델 (일반 수익 모델 정본)]]
- [[Pricing-Strategy|가격 전략 (구독 티어와 가격 심리 정본)]]
- [[Search-UX|검색 UX (탐색 UI 메커니즘 정본)]]
- [[Recommendation-System-OTT-Discovery-Architecture|OTT 디스커버리 아키텍처]]
- [[Recommendation-System-OTT-Aggregator-Design-Proposal|OTT 통합 서비스 초기 설계안]]
- [[Personalization-Recommendation|개인화와 추천]]
- [[Content-Availability-Data-Contract|콘텐츠 가용성 데이터 계약]]
- [[Interview-Prep-Kinolights-2nd-Domain-Pitch|키노라이츠 2차 도메인 오너십 피치]]
