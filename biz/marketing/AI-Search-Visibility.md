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

ChatGPT도 사업자용 집계 지표를 내기 시작했다. GeekNews 요약(2026-11-15) 기준 OpenAI는 비즈니스 허브를 베타로 열었다. 사업자는 ChatGPT에 표시되는 자사 소유권을 인증한 뒤 회사 정보와 가격, 판매 여부를 담은 제품 피드를 등록하고, ChatGPT에서의 언급 횟수, 웹사이트 클릭 수와 자사 사이트가 인용된 대화의 주요 주제를 본다. 개별 사용자 대화와 에이전트 채팅은 공유하지 않으며 일정 기준 이상 쌓여야 통계를 보여 준다. 미국의 일부 전자상거래와 온라인 서비스 기업은 답변에 나온 회사 프로필에서 대화가 시작되는 비즈니스 에이전트도 만들 수 있고, 이 대화와 유료 게재 항목은 일반 답변과 구분해 표시한다고 설명한다. OpenAI 원문과 도움말은 2026-11-16 HTTP 403으로 대조하지 못했다.

이 지표도 층을 나눠 읽는다. 언급 횟수는 링크 표시(1층)와도 답변 점유(4층)와도 다른 브랜드 등장 횟수이고, 인용된 대화의 주제는 2층, 웹사이트 클릭은 3층의 일부다. 비즈니스 에이전트와의 대화는 사업자가 운영하는 채널이므로 일반 답변에서의 점유와 섞지 않는다(이 문서의 제안).

노출 자격과 실제 노출도 구분한다. Google은 AI Overviews와 AI Mode의 지원 링크가 되려면 페이지가 색인되어 있고 검색에서 snippet 표시 자격을 갖춰야 한다고 설명한다. 별도 AI 파일이나 특수 schema.org 구조화 데이터는 필요하지 않으며, 구조화 데이터를 쓴다면 화면의 본문과 맞아야 한다. 요건 충족만으로 색인이나 노출이 보장되지는 않는다. Bing이 권하는 헤딩, 표와 FAQ 개선도 인용을 늘리기 위한 제안으로 보고 인용 보장이나 Google의 별도 필수 조건으로 옮기지 않는다.

## 노출이 오르는 것과 성과가 오르는 것은 다르다

AI 영역이 화면에서 넓어질수록 그 안에 링크가 표시될 기회는 늘어난다. 같은 이유로 기존 목록형 결과는 아래로 밀려 클릭 기회가 줄어든다. Google 생성 AI 리포트의 노출 수는 이런 화면 변화만으로도 올라갈 수 있다. 노출 그래프의 우상향과 성과 개선은 다른 사건이므로 같이 보지 않으면 잘못 읽는다.

신규 영역의 지표 증가가 전체 클릭 증가로 이어졌는지 확인하되, 전체 클릭이 같다는 이유만으로 단순 이동이나 가치 부재를 확정하지 않는다. 검색 수요, 화면 구성과 유입의 질이 함께 바뀔 수 있다. [[Metrics-Framework]]에 따라 같은 기간의 전체 유입, 문의와 구매 전환, 기여이익을 함께 보고 비교 설계 없이 인과 효과를 단정하지 않는다.

### AI 요약의 클릭 감소는 실험과 관측을 나눠 본다

노출과 클릭이 따로 움직이는지는 무작위 실험이 가장 직접 보여 준다. Agarwal과 Sen의 현장 실험(Indian School of Business 데이터과학연구소 소개, SSRN 작업 논문)은 Google을 주 검색 엔진으로, Chrome만 브라우저로 쓰는 미국 데스크톱 사용자 1,065명을 2026년 1~2월에 모집해, 자체 Chrome 데스크톱 확장 프로그램으로 실제 검색을 2주 동안 관찰하면서 같은 결과를 AI 요약과 함께 보는 집단과 빼고 보는 집단으로 무작위로 나눴다. AI Overviews가 나온 검색에서 외부 사이트로 가는 자연 검색 클릭은 39.8% 줄었고, Google 밖으로 나가지 않는 무클릭 검색은 34.5% 늘었다. 검색 횟수와 유료 광고 클릭은 바뀌지 않았고, 클릭해 들어간 사이트에서의 이용도 집단 사이에 차이가 없었으며, 만족도, 정보 품질과 답 찾기의 쉬움 평가도 나아지지 않았다. 39.8%는 요약이 나온 검색만의 감소율이다. 요약은 표본 검색의 약 41%에 나왔으므로, 저자들은 요약이 없는 검색까지 합친 전체 검색 기준으로 외부 자연 검색 클릭이 약 18.5% 줄고 무클릭 검색이 약 20.4% 는다고 환산했다. 같은 논문은 Gemini 대화형 화면으로 보낸 AI Mode 조건에서 외부 유입 감소가 더 컸다고 적지만, 이 조건은 이탈이 많아 인과 추정이 아닌 기술 통계로만 제시한다. 동료 심사를 거쳤다는 표시가 없는 작업 논문(2026-07-08 개정판)이고 모바일과 다른 브라우저는 다루지 않았다.

관측 자료는 방향이 같아도 원인을 말하지 못한다. Pew가 미국 성인 900명의 2025년 3월 브라우징 기록을 본 결과, AI 요약이 나온 검색 페이지 방문의 8%, 나오지 않은 방문의 15%에서 일반 결과를 눌렀고 요약 안의 링크를 누른 경우는 1%였다. 요약이 붙는 검색은 질문형이거나 긴 경향이 있어 통제된 비교가 아니다. 클릭 점유를 모델로 추정하면 값이 크게 달라질 수 있다. DataForSEO 보고서 요약은 AI Overviews가 나올 때 측정된 클릭의 42~45%를 가져간다고 적는데, 관측에서 요약 안 링크 클릭이 1%인 것과는 정의와 측정 방식이 다르다. 한 숫자를 다른 조사의 숫자와 비교하기 전에 무엇을 클릭으로 셌는지부터 맞춘다.

노출 범위도 넓어졌다. DataForSEO는 분석한 Google 검색 결과의 61.43%에 AI Overviews가 나와 2년 전 5.93%에서 늘었다고 밝힌다. RevScope가 같은 보고서로 정리한 검색 의도별 노출률은 2025년 4분기에서 2026년 3분기 사이 정보 탐색 48.42%에서 70.44%, 상품 비교 26.30%에서 51.35%, 특정 사이트 탐색 17.04%에서 34.03%, 구매 목적 10.82%에서 28.64%로 올랐다(2026-11-21 공개 소개 페이지에는 이 수치가 없고, 전체 보고서는 이메일과 이름을 요구하는 신청 양식 뒤에 있어 내려받지 않았으므로 직접 대조하지 못함). 클릭 감소가 정보성 글에만 해당한다고 가정하지 않는다. 검색 유입에 기대던 사이트의 사례는 [[Website-Traffic-and-Ad-Revenue#검색 화면이 바뀌면 사람의 방문이 줄어든다|검색 화면 변화와 사이트 수입]]에 있다.

### 인용을 늘린다는 방법은 근거의 종류를 나눠 본다

Google의 공식 기준은 앞 절에 적은 대로다. AI Overviews와 AI Mode의 지원 링크가 되려면 색인과 snippet 표시 자격이 필요하고, 별도 AI 파일이나 특수 구조화 데이터는 요구하지 않는다. 그 밖의 인용 최적화 주장은 근거의 종류가 다르다.

- **관측 상관:** 참조 도메인 수와 AI 인용 수의 Spearman 상관이 AI Overviews 0.406, ChatGPT 0.377이라는 DataForSEO 분석은 RevScope 정리로만 확인했다. 상관이므로 링크가 인용을 늘린다는 인과를 보여 주지 않는다.
- **효과를 찾지 못한 조사:** SE Ranking은 약 30만 도메인에서 llms.txt와 AI 인용 사이의 상관을 찾지 못했고, 예측 모델에서 이 변수를 빼자 정확도가 오히려 올랐다고 적는다(2026-10-15). 해당 모델과 데이터 범위의 결과다.
- **모의 엔진의 통제 실험:** RevScope가 인용한 GEO 논문(Aggarwal 외, KDD 2024)은 gpt-3.5-turbo가 Google 상위 5개 결과를 읽어 답하는 모의 생성 엔진에서 본문에 인용문, 통계, 출처 인용을 더하면 위치를 가중한 단어 수 지표가 기준선(19.3)보다 각각 약 41%, 31%, 27% 높아진다고 보고한다(표의 값으로 계산한 상대 증가, 초록은 최대 40%). 실제 엔진인 Perplexity.ai의 200개 표본에서는 인용문 추가의 개선이 22%였고, 기존 SEO의 키워드 채우기는 기준선보다 10% 나빴다. 2023년의 모델과 엔진에서 잰 값이므로 현재 Google이나 ChatGPT의 인용 증가율로 옮기지 않는다.
- **벤치마크 재검증:** C-SEO Bench(Puerto 외, NeurIPS 2025 Datasets & Benchmarks)는 질의응답과 상품 추천 두 과제, 과제마다 세 도메인에서 페이지 수정 기법을 다시 쟀다. 대부분의 기법은 효과가 거의 없었고 문서 순위를 자주 떨어뜨렸으며, LLM 문맥 안에서 출처의 순위를 올리는 전통적 SEO가 훨씬 효과적이었다. 같은 기법을 쓰는 경쟁자가 늘수록 전체 이득은 줄어 혼잡하고 제로섬에 가까운 문제로 묘사한다. 이 벤치마크도 실제 서비스 엔진이 아닌 실험 환경의 결과이며, 모의 엔진 실험의 개선율을 실제 경쟁 환경의 기대 효과로 옮기지 않을 근거로 읽는다(이 문서의 해석).
- **단일 사이트 자연 실험:** Glasp는 2026년 1월부터 YouTube 영상 질문에 답하는 자사 페이지에 중복 URL 통합, AI 봇이 요청한 페이지 생성, 질문형 제목, 짧은 독립 요약과 구글 유입이 이미 의미 있던 페이지는 다시 쓰지 않는 보호 규칙을 묶어 적용하고, 같은 사이트의 나머지 경로를 대조군으로 비교했다. 1월에서 5월(5월은 일부)까지 ChatGPT 유입 방문은 바꾼 페이지가 6.1배, 손대지 않은 페이지가 3.5배, 사이트 전체가 5.7배 늘었다. 주별 처리군/대조군 비율의 단절 시계열 모형은 적용 시점에 1.82배(95% 신뢰구간 1.31~2.54)의 수준 상승을 추정하지만, 가짜 시점으로 바꾼 위약 검정의 p가 0.16이라 저자들은 시사적일 뿐 결론적이지 않다고 본다. 저자들은 성장의 상당 부분이 변경 없이 생겼다고 보고, ChatGPT 이용 자체의 증가를 가능한 원인으로 든다. 무작위 배정이 아닌 묶음 변경, 처리군과 대조군의 콘텐츠 종류 차이, 한 사이트, ChatGPT 링크 방문(답변 속 언급이 아님) 기준이라는 한계가 있다. 최적화 전후의 배수만 보고하는 사례는 같은 기간 손대지 않은 페이지의 증가와 함께 읽는다(운영 제안).

RevScope는 이런 근거를 묶어 기본 SEO 요건 유지, 다른 사이트의 링크, 플랫폼별 인용 출처 확인과 그 커뮤니티 참여, 질문에 바로 답하고 독자적인 데이터를 담은 페이지, 지름길 회피, 채널별 매출 평가를 권한다. 분석 제품을 판다고 스스로 밝히고 채널별 매출 평가는 그 제품의 기능과 겹치므로, 이 등급 구분과 권고는 이해관계가 있는 출처의 의견으로 읽는다.

이 문서의 운영 제안은 Google 문서의 기본 요건을 지키되, 인용을 늘린다는 변경의 효과는 인용 수나 노출 수가 아니라 [[Metrics-Framework]]에 따라 같은 기간의 유입, 전환과 기여이익으로 판단하는 것이다. 변경 전에 질문 집합, 엔진과 비교 기간을 정해 두고([[#질문과 인용 페이지를 함께 남긴다|질문과 인용 페이지 기록]]), 전후 차이만으로 인과를 단정하지 않는다(운영 제안).

2026-11-21 ISB의 연구 소개, SSRN 원문(초록과 PDF), Pew, DataForSEO 공개 소개 페이지, SE Ranking 원문과 GEO 논문을 대조해 이 두 절을 보탰다. 의도별 노출률과 상관계수는 RevScope 정리로만 확인했고, 기존 Google과 Bing 리포트 범위는 다시 검증하지 않아 문서의 검증일을 유지한다. 2026-11-23 C-SEO Bench 초록, Glasp 연구 소개와 그 논문 초록을 대조해 벤치마크와 자연 실험 항목을 더했다.

## 인용 수도 성과가 아니다

2층과 3층 사이가 얼마나 벌어질 수 있는지를 보여주는 공개 사례가 있다. 한 영국 사이트 운영자가 공개한 데이터에서 Copilot 인용이 17,400회인데 같은 기간 Bing에서 들어온 클릭은 167회였다. 단일 사이트 사례이며 Copilot 인용과 Bing 클릭은 같은 노출 집단에 연결된 퍼널이라고 확인되지 않았다. 두 수치의 단순 비율을 CTR이나 인용에서 방문으로 전환되는 확률로 해석하지 않는다.

인용은 방문과 구분한 보조 지표로 보고할 수 있다. 다만 인용 횟수를 방문 수처럼 제시하거나 동일 사용자의 후속 행동으로 연결되지 않은 수치로 전환율을 계산하지 않는다.

같은 맥락에서 브랜드 멘션 위주의 접근이 과거 SEO 인용 플레이의 재포장에 가깝다는 회의론도 있다. 반대편에는 웹상의 기업 정보가 서로 어긋날수록 AI가 인용하기 어려워진다는 엔티티 일관성 논점이 있다. 둘 다 아직 공개 검증치가 얇으므로 가설로 둔다.

## 엔진마다 다른 출처를 본다

같은 1층이라도 엔진을 바꾸면 보이는 그림이 달라진다. 아래는 인용 자료의 스냅샷 수치이고 절대값보다 구조를 본다.

| 관측 | 내용 |
|---|---|
| AI Overviews 상위 인용 도메인(미국 쿼리, 9월 스냅샷) | YouTube 22.9%, Reddit 18.5%, Facebook 10.1% |
| 6월 스냅샷 대비 | YouTube 20.9에서 22.9로 상승, Reddit 19.6에서 18.5로 하락, Facebook 11.6에서 10.1로 하락 |
| 엔진별 Wikipedia 비중(2025년 6월 데이터) | ChatGPT 16.3%, Perplexity 12.5%, AI Overviews 8.4% |
| 브랜드 약 7만 5천 개 벤치마크 | AI 가시성과 가장 강하게 상관한 것은 YouTube 언급, 링크 수와 페이지 수는 약했다 |

읽을 점이 셋이다. 첫째, 출처 슬롯을 브랜드 공식 사이트가 아니라 영상, 커뮤니티, 소셜이 차지하는 구조다. 둘째, 같은 도메인의 비중이 엔진에 따라 두 배까지 차이 나므로 한 엔진의 도메인 순위로 다른 엔진을 추론할 수 없다. 셋째, 기존 랭킹 대시보드가 잡는 신호와 AI가 보는 신호가 다르다. 2025년 6월 수치는 오래됐으므로 절대값은 다시 재야 하고, 엔진별로 신뢰 출처가 다르다는 구조만 가져간다.

## 실무에서 쓰는 조합과 남는 공백

공식 데이터 하나로는 부족하므로 엔진별 공식 지표와 유입, 전환 데이터를 함께 본다.

| 조각 | 무엇을 채우나 | 한계 |
|---|---|---|
| Search Console 생성 AI 노출 | 1층, 구글 엔진 한정 | 쿼리와 인용 방식 구분 없음 |
| Bing Webmaster AI Performance | 2층 일부, 지원되는 Microsoft AI 경험과 파트너의 인용 | grounding query는 표본이며 답변 내 위치, 역할과 순위는 제공하지 않음 |
| ChatGPT 비즈니스 허브 인사이트(베타) | 언급 횟수, 인용된 대화의 주제와 사이트 클릭, ChatGPT 한정 | 기준 미만이면 통계가 없고 개별 대화는 제공하지 않음. 원문 미대조 |
| GA4의 AI 레퍼러 | 3층 일부 | AI 서비스의 레퍼러나 캠페인 식별 정보가 전달된 유입만 분리 가능. 정보가 없으면 direct 등으로 섞일 수 있고, 구글 AI 경로는 이 표만으로 분리할 수 없음 |
| 문의 폼 자기신고 | 3층 일부, 전환 근처 | 표본이 작고 응답 편향이 있다 |

이들을 합쳐도 엔진과 층별 범위가 다르다. Bing은 인용 횟수를 제공하지만 2층의 세부 인용 방식까지 분리하지 않으며, 위 도구만으로 4층의 답변 점유나 엔진 전체의 비교 가능한 CTR을 구할 수는 없다.

## 무엇을 성과로 정의할 것인가

### 질문과 인용 페이지를 함께 남긴다

답변을 직접 조사할 때는 질문, 엔진, 관찰 시점, 국가와 언어, 답변 원문, 브랜드 언급과 인용 URL을 한 묶음으로 남긴다. 인용된 사이트가 같아도 페이지마다 다루는 제품과 선정 기준은 다를 수 있다. 경쟁 제품이 있는 페이지에서 우리 제품이 빠졌다는 사실과, 그 페이지의 비교 대상에 우리 제품이 맞는지는 별도로 확인한다.

공개 AEO 워크플로 사례인 treg는 구매 질문 선정, 엔진별 답변과 인용 수집, 인용 페이지 조사, 작성자와 접촉 경로 확인 및 제안 초안 작성을 연결한다. 2026-11-04 공개 안내와 프롬프트를 대조한 범위이며, 도구를 실행하거나 인용 증가 효과를 측정한 것은 아니다. 화면의 예시 데이터도 실제 성과로 취급하지 않는다.

이를 측정에 적용할 때는 다음 경계를 둔다.

- **수집 실패와 미언급을 분리한다.** 답변을 받지 못한 호출은 브랜드가 없었던 답변이 아니다. 성공한 관측 수와 실패 수를 함께 남긴다.
- **도구 점수와 엔진의 판단을 구분한다.** 언급 순서, 페이지 지표와 가중치를 합친 점수는 조사 우선순위일 뿐, 엔진 내부의 신뢰 점수나 전체 시장 점유율이 아니다.
- **전후 비교의 조건을 맞춘다.** 같은 질문 집합과 엔진, 언어를 유지하고 바뀐 조건을 적는다. 전후 차이만으로 콘텐츠 수정의 인과 효과를 확정하지 않는다.
- **조사와 발송을 분리한다.** 공개 작성자와 접촉 경로를 찾았다는 사실은 연락이나 게시를 실행했다는 뜻이 아니다. 초안 검토와 실제 발송은 별도 단계다.

기존 Google과 Bing 리포트의 기능 전체를 이번에 재검증한 것은 아니므로 문서의 기존 검증일은 유지한다.

### 성과 해석 기준

- 노출은 가시성 목표의 지표로 사용할 수 있지만 매출과 같은 최종 사업 결과를 대신하지 않는다. 전체 유입과 후속 전환도 함께 본다.
- 인용 수는 출처와 측정 범위를 명시하고 같은 기간의 유입과 함께 보고한다. 범위가 다르면 단순히 나누어 전환율을 만들지 않는다.
- 층을 섞어 보고하지 않는다. 표시, 인용, 클릭, 점유는 각각 다른 데이터이고 한 숫자로 합치면 해석이 무너진다.
- 엔진별로 따로 잰다. 한 엔진의 결과를 전체로 일반화하지 않는다.
- 4층을 재려면 답변 화면 자체를 관측해야 한다. 노출 수나 도메인 멘션 수와는 다른 종류의 데이터다.
- 측정 계약을 먼저 정한다. 관찰 기간, 비교 기준, 다음 결정을 정하지 않은 숫자는 허수지표가 된다.

## 출처

- [How to Get AI to Recommend Your Product — treg](https://treg.to/aeo) — 2026-11-04 공개 워크플로와 프롬프트의 질문 선정, 인용 페이지 조사, 실패 호출 제외, 초안과 발송 분리를 확인. 도구 실행, 요금 검증과 성과 검증은 하지 않음.

2026-10-02 Google과 Bing의 위 리포트 범위, Google의 AI 노출 자격, GA4 유입 식별 한계와 CMA 규제 요약의 시행 기한을 공식 자료로 대조하고, 지표 간 범위 차이와 증분 해석을 보완했다. 기존 사례와 엔진별 스냅샷 수치, Google의 규제 준수 구현 전체를 이번에 다시 검증한 것은 아니다. 2026-10-05에는 사례, 9월 스냅샷, 엔진별 Wikipedia 비중과 브랜드 벤치마크를 whito와 Ahrefs 원 자료와 대조했다. 6월 수치는 Ahrefs 데이터를 인용한 2차 기사로만 확인했다. Ahrefs AI Overviews 집계는 월별 스냅샷이고 7월 스냅샷이 따로 있어 6월이 9월의 직전 스냅샷은 아니다.

- [구글이 모든 사이트에 공식 AI 가시성 리포트를 열었다. 담긴 숫자는 노출 수 하나뿐이다 — 뷰저블 (2026-09-16)](https://www.beusable.net/blog/?p=8637)
- [Google, Generative AI performance report (Search)](https://support.google.com/webmasters/answer/16984139)
- [Google, What are impressions, position, and clicks?](https://support.google.com/webmasters/answer/7042828)
- [Google Search Central, AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- [Google Analytics Help, Understand (direct) / (none) traffic](https://support.google.com/analytics/answer/15258820)
- [CMA, Publisher conduct requirement summary (2026-08-04)](https://assets.publishing.service.gov.uk/media/6a7195d7aec8358a34958bfa/Publisher_conduct_requirement_-_3_Aug_2026.pdf)
- [Introducing AI Performance in Bing Webmaster Tools Public Preview — Bing Webmaster Blog](https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview)
- [New AI Visibility Insights in Bing Webmaster Tools: Intents, Topics, Citation Share, Compare — Bing Search Blog](https://blogs.bing.com/search/2026/6/New-AI-Visibility-Insights-in-Bing-Webmaster-Tools-Intents-Topics-Citation-Share-Compare/)
- [Introducing Search Generative AI performance reports in Search Console — Google Search Central Blog](https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports)
- [Do AI Citations Drive Traffic? 17,400 Citations, 167 Clicks — whito](https://whito.co.uk/research/do-ai-citations-drive-traffic/)
- [The 50 Most-Cited Websites in Google AI Overviews (September 2026) — Ahrefs](https://ahrefs.com/blog/most-cited-domains-ai-overviews/)
- [The 10 Most Mentioned Domains for ChatGPT, Perplexity, and AI Overviews Across 78.6M Searches — Ahrefs](https://ahrefs.com/blog/top-10-most-cited-domains-ai-assistants/)
- [Top Brand Visibility Factors in ChatGPT, AI Mode, and AI Overviews (75k Brands Studied) — Ahrefs](https://ahrefs.com/blog/ai-brand-visibility-correlations/)
- [ChatGPT 내 비즈니스 기능 소개 — OpenAI](https://openai.com/ko-KR/index/introducing-businesses-chatgpt/) — 2026-11-16 HTTP 403으로 원문 미대조
- [ChatGPT 내 비즈니스 기능 소개 — GeekNews](https://news.hada.io/topic?id=37183) — 2026-11-15 요약. 소유권 인증, 제품 피드, 집계 인사이트와 공개 조건, 비즈니스 에이전트의 제공 범위와 표시 구분의 출처
- [AI Summaries in Search and Their Impact on Publisher Traffic — Indian School of Business, Agarwal, Sen](https://www.isb.edu/faculty-and-research/isb-institute-of-data-science/research/ai-summaries-in-search-and-their-impact-on-publisher-traffic) — 2026-11-21 실험 설계, 클릭 감소율, 무클릭 검색 증가와 만족도 대조
- [The Impact of Google AI Overviews on Publisher Traffic and User Experience: Evidence from a Field Experiment — SSRN, Saharsh Agarwal, Ananya Sen](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6513059) — 2026-07-08 개정 작업 논문. 2026-11-21 브라우저로 초록과 PDF를 열어 모집 조건(Google, Chrome 전용, 데스크톱), 참가자 1,065명, 39.8%와 34.5%, 전체 검색 기준 18.5%와 20.4% 환산(각주 4), AI Mode 조건의 한계 대조
- [GEO: Generative Engine Optimization — arXiv, Pranjal Aggarwal 외](https://arxiv.org/abs/2311.09735) — KDD 2024, v3(2024-06-28). 2026-11-21 모의 엔진 구성, 표 1의 기준선과 방법별 값, Perplexity.ai 200개 표본 결과 대조
- [Google users are less likely to click on links when an AI summary appears in the results — Pew Research Center](https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/) — 2025-07-22, 2026-11-21 표본, 클릭 비율과 관측 연구의 한계 대조
- [Search Insider 2026 — DataForSEO](https://dataforseo.com/whitepapers/search-insider-2026) — 2026-11-21 공개 소개 페이지의 노출 비중과 클릭 점유 수치를 브라우저로 다시 대조. 의도별 노출률과 상관계수는 이 페이지에 없고, 전체 보고서는 이메일과 이름을 요구하는 신청 양식 뒤에 있어 제출하지 않았으므로 읽지 않음
- [Does LLMs.txt impact your AI visibility and citations? No, according to research — SE Ranking](https://seranking.com/blog/llms-txt/) — 2026-10-15, 2026-11-21 표본 규모, 도입률과 상관 없음 결론 대조
- [C-SEO Bench: Does Conversational SEO Work? — arXiv, Haritz Puerto 외](https://arxiv.org/abs/2506.11097) — NeurIPS 2025 Datasets & Benchmarks 채택, v3(2025-10-20). 2026-11-23 초록의 과제 구성, 기법 효과, 전통적 SEO 비교와 다수 채택 시 이득 감소 대조
- [ChatGPT traffic grew even on pages we did not optimize — Glasp, Keisuke Watanabe, Kazuki Nakayashiki](https://glasp.co/research/measuring-answer-engine-optimization) — 2026-11-07 공개 연구 소개. 2026-11-23 변경 내용, 6.1배와 3.5배, 데이터 한계 대조. 자사 사이트를 다룬 회사 연구다
- [Disentangling Answer Engine Optimization from Platform Growth: A Log-Based Natural Experiment on ChatGPT Referral Traffic — arXiv, Keisuke Watanabe, Kazuki Nakayashiki](https://arxiv.org/abs/2606.04362) — 2026-06-03 v1. 2026-11-23 초록의 단절 시계열 추정 1.82배, 신뢰구간과 위약 검정 p=0.16 대조
- [Google's AI Overviews cut clicks to websites by 40% — RevScope](https://revscope.co/blog/search-seo-geo-2026/) — 2026-11-09 공개 정리, 2026-11-21 대조. 의도별 노출률, 상관계수와 권고 목록의 출처이며(18.5% 추정, 실험 한계와 GEO 논문 수치는 원문으로 대조) 분석 제품을 파는 회사의 글이라고 스스로 밝힌다
- [Google의 AI 답변, 검색 유입을 40% 줄임 — GeekNews](https://news.hada.io/topic?id=37392) — 학습 계기

## 관련 문서

- [[Metrics-Framework|지표 설계 (허수지표, 재배분 대 증분, Leading과 Lagging)]]
- [[Content-Marketing|콘텐츠 마케팅 (SEO와 Topic Cluster, 콘텐츠 ROI 측정)]]
- [[Marketing-Fundamentals|마케팅 기초 (Customer Journey, 채널 층위)]]
- [[Competitive-Analysis|경쟁 분석 (점유를 어떻게 정의할 것인가)]]
- [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링 (엔진이 무엇을 근거로 인용하는가)]]
- [[Website-Traffic-and-Ad-Revenue|웹사이트 트래픽과 광고 수익 (검색 화면 변화와 사이트 수입)]]
