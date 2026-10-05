---
tags: [business, marketing, analytics, search]
status: done
verified_at: 2026-10-02
category: "비즈니스&제품(Business&Product)"
aliases: ["AI Search Visibility", "AI 검색 가시성", "GEO", "LLMO", "AIO"]
---

# AI 검색 가시성 측정 (AI Search Visibility)

생성 AI 답변 안에서 우리 사이트가 얼마나, 어떻게 드러나는지를 재는 일이다. 검색 결과 목록의 순위를 재던 기존 SEO와 달리 답변이라는 단일 출력 안에서 자리를 다투므로 무엇을 성과로 볼 것인지부터 다시 정의해야 한다. 부르는 이름은 갈리지만 대상은 같다. 영어권 자료는 GEO, 일본어권은 LLMO나 AIO를 쓴다.

## 가시성은 한 겹이 아니라 네 겹

가장 흔한 실수는 네 겹을 한 덩어리로 보고 아무 숫자나 성과로 부르는 것이다. 질문이 층마다 다르다.

| 층 | 묻는 것 | 어긋날 때 생기는 착각 |
|---|---|---|
| 1 표시됨 | 우리 링크가 AI 영역에 떴는가 | 노출이 늘면 성과가 좋아졌다고 읽는다 |
| 2 인용됨 | 답변 본문의 출처였는가, 하단 링크였는가 | 인용 횟수를 방문으로 환산한다 |
| 3 클릭됨 | 그 노출이 실제 방문으로 이어졌는가 | 유입 경로를 오가닉과 구분하지 못한다 |
| 4 답이었음 | 우리가 첫 선택이었는가, 경쟁사였는가, 답 자체가 없었는가 | 점유를 재지 못한 채 노출만 관리한다 |

1층은 표시 기회, 4층은 실제 점유다. 공식 도구도 표시와 인용의 일부를 제공하지만, 답변 안에서 어떤 역할을 맡았는지까지 보여주지는 않는다.

## 공식 데이터가 덮는 범위

Google Search Console의 생성 AI 성과 리포트는 AI Overviews와 AI Mode를 포함한 생성 AI 기능에서 사이트 링크가 사용자에게 몇 번 보였는지를 노출 수로 제공한다. 공식 문서 기준(2026-10-02 확인)으로 차원은 넷이다.

| 차원 | 기준 |
|---|---|
| 페이지 | 생성 AI 기능이 최종적으로 연결한 URL, 리다이렉트 이후 기준이며 대부분 Google이 선택한 canonical URL에 귀속 |
| 국가 | 검색이 시작된 국가 |
| 기기 | 데스크톱, 태블릿, 모바일 |
| 날짜 | 선택한 시간 단위에 따라 일, 주, 월. 태평양 시간(PT) 기준 |

쿼리는 차원으로 제공되지 않고, Search Labs 실험 데이터는 제외된다.

차트는 기본적으로 속성(property) 단위로 집계하므로 같은 사이트의 여러 링크가 한 AI 결과에 보여도 한 노출로 셀 수 있다. URL 필터를 적용하면 차트도 URL 단위로 집계된다. 페이지 표는 페이지 단위이므로 필터 상태와 집계 단위에 따라 표의 합계와 차트 총합이 다를 수 있다. GA4나 Bing과 일별 수치를 맞출 때는 집계 단위와 시간대도 맞춘다.

Google 공식 발표는 2026-06-03 일부 웹사이트에 공개하고 2026-08-31 전 세계로 확대했다고 설명한다. 규제 일정과 현재 기능은 구분한다. 영국 CMA의 2026-08-04 규제 요약은 노출, 클릭과 CTR, AI 검색 유입 식별 정보를 요구하며 기본 준수 기한을 2026-12-03으로 명시한다. 페이지 단위 제어에만 추가 3개월을 둔다. 이 영국 규제 요건이 전 세계 리포트의 클릭 기능 출시나 준수 완료를 뜻하지는 않으며, 공개 범위만으로 측정 필요와 무관하게 설계됐다고 단정하지 않는다.

클릭의 위치는 한 번 짚어야 한다. 공식 문서 기준으로 AI Overviews와 AI Mode 모두 표준 노출 규칙이 적용되고, 외부 페이지 링크를 누르면 클릭으로 집계된다. 다만 그 클릭은 전체 검색 성과 안에 들어가고 생성 AI 리포트에서 따로 떼어 볼 수 없다. AI Mode에서 후속 질문을 하면 새 쿼리로 계산된다. 정리하면 이 리포트가 답해 주는 것은 보였는가이고, 답이었는가는 여기서 나오지 않는다.

Bing도 공식 데이터를 제공한다. 2026-02-10 공개 프리뷰로 발표한 Bing Webmaster Tools의 AI Performance는 Microsoft Copilot, Bing AI 요약과 일부 파트너에서의 인용 수, 하루 평균 고유 인용 페이지 수, URL별 인용과 grounding query 표본을 보여준다. 다만 개별 답변에서의 인용 위치, 페이지의 역할이나 순위를 뜻하지 않는다 (2026-10-02 공식 발표 확인). 2026-06-16에는 grounding query의 의도(Intents)와 주제(Topics) 분류, 같은 grounding query에 표시된 전체 인용 중 우리 사이트의 비율인 Citation Share, 이전 기간 비교(Compare)의 프리뷰가 전 세계에 순차 제공되기 시작했다. Citation Share도 경쟁 도메인, 트래픽 점유나 순위를 보여주지 않는다 (2026-10-04 공식 발표 확인).

노출 자격과 실제 노출도 구분한다. Google은 AI Overviews와 AI Mode의 지원 링크가 되려면 페이지가 색인되어 있고 검색에서 snippet 표시 자격을 갖춰야 한다고 설명한다. 별도 AI 파일이나 특수 schema.org 구조화 데이터는 필요하지 않으며, 구조화 데이터를 쓴다면 화면의 본문과 맞아야 한다. 요건 충족만으로 색인이나 노출이 보장되지는 않는다. Bing이 권하는 헤딩, 표와 FAQ 개선도 인용을 늘리기 위한 제안으로 보고 인용 보장이나 Google의 별도 필수 조건으로 옮기지 않는다.

## 노출이 오르는 것과 성과가 오르는 것은 다르다

AI 영역이 화면에서 넓어질수록 그 안에 링크가 표시될 기회는 늘어난다. 같은 이유로 기존 목록형 결과는 아래로 밀려 클릭 기회가 줄어든다. Google 생성 AI 리포트의 노출 수는 이런 화면 변화만으로도 올라갈 수 있다. 노출 그래프의 우상향과 성과 개선은 다른 사건이므로 같이 보지 않으면 잘못 읽는다.

신규 영역의 지표 증가가 전체 클릭 증가로 이어졌는지 확인하되, 전체 클릭이 같다는 이유만으로 단순 이동이나 가치 부재를 확정하지 않는다. 검색 수요, 화면 구성과 유입의 질이 함께 바뀔 수 있다. [[Metrics-Framework]]에 따라 같은 기간의 전체 유입, 문의와 구매 전환, 기여이익을 함께 보고 비교 설계 없이 인과 효과를 단정하지 않는다.

## 인용 수도 성과가 아니다

2층과 3층 사이가 얼마나 벌어질 수 있는지를 보여주는 공개 사례가 있다. 한 영국 사이트 운영자가 공개한 데이터에서 Copilot 인용이 17,400회인데 같은 기간 Bing에서 들어온 클릭은 167회였다. 단일 사이트 사례이며 Copilot 인용과 Bing 클릭은 같은 노출 집단에 연결된 퍼널이라고 확인되지 않았다. 두 수치의 단순 비율을 CTR이나 인용에서 방문으로 전환되는 확률로 해석하지 않는다.

인용은 방문과 구분한 보조 지표로 보고할 수 있다. 다만 인용 횟수를 방문 수처럼 제시하거나 동일 사용자의 후속 행동으로 연결되지 않은 수치로 전환율을 계산하지 않는다.

같은 맥락에서 브랜드 멘션 위주의 접근이 과거 SEO 인용 플레이의 재포장에 가깝다는 회의론도 있다. 반대편에는 웹상의 기업 정보가 서로 어긋날수록 AI가 인용하기 어려워진다는 엔티티 일관성 논점이 있다. 둘 다 아직 공개 검증치가 얇으므로 가설로 둔다.

## 엔진마다 다른 출처를 본다

같은 1층이라도 엔진을 바꾸면 보이는 그림이 달라진다. 아래는 인용 자료의 스냅샷 수치이고 절대값보다 구조를 본다.

| 관측 | 내용 |
|---|---|
| AI Overviews 상위 인용 도메인(미국 쿼리, 9월 스냅샷) | YouTube 22.9%, Reddit 18.5%, Facebook 10.1% |
| 직전 6월 스냅샷 대비 | YouTube 20.9에서 22.9로 상승, Reddit 19.6에서 18.5로 하락, Facebook 11.6에서 10.1로 하락 |
| 엔진별 Wikipedia 비중(2025년 6월 데이터) | ChatGPT 16.3%, Perplexity 12.5%, AI Overviews 8.4% |
| 브랜드 약 7만 5천 개 벤치마크 | AI 가시성과 가장 강하게 상관한 것은 YouTube 언급, 링크 수와 페이지 수는 약했다 |

읽을 점이 셋이다. 첫째, 출처 슬롯을 브랜드 공식 사이트가 아니라 영상, 커뮤니티, 소셜이 차지하는 구조다. 둘째, 같은 도메인의 비중이 엔진에 따라 두 배까지 차이 나므로 한 엔진의 도메인 순위로 다른 엔진을 추론할 수 없다. 셋째, 기존 랭킹 대시보드가 잡는 신호와 AI가 보는 신호가 다르다. 2025년 6월 수치는 오래됐으므로 절대값은 다시 재야 하고, 엔진별로 신뢰 출처가 다르다는 구조만 가져간다.

## 실무에서 쓰는 조합과 남는 공백

공식 데이터 하나로는 부족하므로 엔진별 공식 지표와 유입, 전환 데이터를 함께 본다.

| 조각 | 무엇을 채우나 | 한계 |
|---|---|---|
| Search Console 생성 AI 노출 | 1층, 구글 엔진 한정 | 쿼리와 인용 방식 구분 없음 |
| Bing Webmaster AI Performance | 2층 일부, 지원되는 Microsoft AI 경험과 파트너의 인용 | grounding query는 표본이며 답변 내 위치, 역할과 순위는 제공하지 않음 |
| GA4의 AI 레퍼러 | 3층 일부 | AI 서비스의 레퍼러나 캠페인 식별 정보가 전달된 유입만 분리 가능. 정보가 없으면 direct 등으로 섞일 수 있고, 구글 AI 경로는 이 표만으로 분리할 수 없음 |
| 문의 폼 자기신고 | 3층 일부, 전환 근처 | 표본이 작고 응답 편향이 있다 |

이들을 합쳐도 엔진과 층별 범위가 다르다. Bing은 인용 횟수를 제공하지만 2층의 세부 인용 방식까지 분리하지 않으며, 위 도구만으로 4층의 답변 점유나 엔진 전체의 비교 가능한 CTR을 구할 수는 없다.

## 무엇을 성과로 정의할 것인가

- 노출은 가시성 목표의 지표로 사용할 수 있지만 매출과 같은 최종 사업 결과를 대신하지 않는다. 전체 유입과 후속 전환도 함께 본다.
- 인용 수는 출처와 측정 범위를 명시하고 같은 기간의 유입과 함께 보고한다. 범위가 다르면 단순히 나누어 전환율을 만들지 않는다.
- 층을 섞어 보고하지 않는다. 표시, 인용, 클릭, 점유는 각각 다른 데이터이고 한 숫자로 합치면 해석이 무너진다.
- 엔진별로 따로 잰다. 한 엔진의 결과를 전체로 일반화하지 않는다.
- 4층을 재려면 답변 화면 자체를 관측해야 한다. 노출 수나 도메인 멘션 수와는 다른 종류의 데이터다.
- 측정 계약을 먼저 정한다. 관찰 기간, 비교 기준, 다음 결정을 정하지 않은 숫자는 허수지표가 된다.

## 출처

2026-10-02 Google과 Bing의 위 리포트 범위, Google의 AI 노출 자격, GA4 유입 식별 한계와 CMA 규제 요약의 시행 기한을 공식 자료로 대조하고, 지표 간 범위 차이와 증분 해석을 보완했다. 기존 사례와 엔진별 스냅샷 수치, Google의 규제 준수 구현 전체를 이번에 다시 검증한 것은 아니다.

- [구글이 모든 사이트에 공식 AI 가시성 리포트를 열었다. 담긴 숫자는 노출 수 하나뿐이다 — 뷰저블 (2026-09-16)](https://www.beusable.net/blog/?p=8637)
- [Google, Generative AI performance report (Search)](https://support.google.com/webmasters/answer/16984139)
- [Google, What are impressions, position, and clicks?](https://support.google.com/webmasters/answer/7042828)
- [Google Search Central, AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- [Google Analytics Help, Understand (direct) / (none) traffic](https://support.google.com/analytics/answer/15258820)
- [CMA, Publisher conduct requirement summary (2026-08-04)](https://assets.publishing.service.gov.uk/media/6a7195d7aec8358a34958bfa/Publisher_conduct_requirement_-_3_Aug_2026.pdf)
- [Introducing AI Performance in Bing Webmaster Tools Public Preview — Bing Webmaster Blog](https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview)
- [New AI Visibility Insights in Bing Webmaster Tools: Intents, Topics, Citation Share, Compare — Bing Search Blog](https://blogs.bing.com/search/2026/6/New-AI-Visibility-Insights-in-Bing-Webmaster-Tools-Intents-Topics-Citation-Share-Compare/)
- [Introducing Search Generative AI performance reports in Search Console — Google Search Central Blog](https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports)

## 관련 문서

- [[Metrics-Framework|지표 설계 (허수지표, 재배분 대 증분, Leading과 Lagging)]]
- [[Content-Marketing|콘텐츠 마케팅 (SEO와 Topic Cluster, 콘텐츠 ROI 측정)]]
- [[Marketing-Fundamentals|마케팅 기초 (Customer Journey, 채널 층위)]]
- [[Competitive-Analysis|경쟁 분석 (점유를 어떻게 정의할 것인가)]]
- [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링 (엔진이 무엇을 근거로 인용하는가)]]
