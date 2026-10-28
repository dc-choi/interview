---
tags: [security, llm, prompt-injection, misinformation, provenance, ai-search]
status: done
category: "보안(Security)"
aliases: ["Web Content Manipulation for AI", "AI가 읽는 웹 콘텐츠의 조작", "숨은 AI 지시", "Hidden AI Instructions", "Citation Laundering", "인용 세탁"]
---

# AI가 읽는 웹 콘텐츠의 조작: 숨은 지시와 인용 세탁

AI 비서와 AI 검색은 웹 문서를 가져와 답의 근거로 쓴다. 사람이 화면에서 보는 내용과 기계가 받아 가는 내용이 다르거나, 근거처럼 보이는 숫자가 실제 조사 없이 만들어졌다면 답도 그 조작을 옮긴다. 이 문서는 두 경로를 다룬다. 하나는 사람에게 보이지 않게 넣은 AI용 지시이고, 다른 하나는 생성한 통계가 인용을 거치며 신뢰를 얻는 인용 세탁(citation laundering)이다.

## 사람에게 보이지 않는 AI 지시

사람이 화면으로 보는 내용과 수집기가 받아 가는 HTML은 같지 않을 수 있다. CSS로 화면 밖에 두거나 글자 크기나 투명도를 0으로 만든 텍스트, 화면에 그리지 않는 블록은 사람에게 보이지 않지만 HTML을 읽는 수집기에는 그대로 전달된다. 서버가 요청한 사용자 에이전트에 따라 다른 본문을 주면 특정 수집기만 다른 내용을 받는다. Google 스팸 정책은 순위 조작을 위해 사람이 보기 어렵게 넣은 텍스트(hidden text)와 사용자와 검색 엔진에 다른 내용을 보여 주는 행위(cloaking)를 금지하지만, 같은 구조는 운영 문구가 공개 본문에 섞이는 식으로 조작 의도 없이도 생긴다. OWASP LLM01은 사람이 볼 수 없는 입력도 모델이 읽기만 하면 모델 동작을 바꿀 수 있다고 본다.

발행자 쪽에서 보면 자사 챗봇의 운영 지시를 공개 문서에 섞은 구성이 노출 원인이 된다. 그 문서를 읽는 다른 AI 쪽에서 보면 문서 안의 지시는 [[LLM-Application-Security#LLM01 프롬프트 인젝션|간접 프롬프트 인젝션]]과 같은 경로로 들어온다. 지시가 있다는 사실과 지시가 실제 답변을 바꿨다는 사실은 따로 확인한다(이 문서의 해석).

### 사례: WhatsApp 도움말의 숨은 지시 (2026-10)

개인정보 보호 기업 Redact가 2026-10-08 발견해 10-19 공개한 조사를 2026-10-27 대조했다.

- 도움말 센터가 링크한 545개 문서 중 80개에서 화면에 표시되지 않는 AI용 지시 블록 102개를 찾았고, 대부분은 일상적인 상담 안내였다.
- 문제가 된 지시는 휴대전화나 번호를 잃어 계정을 지울 수 없는 사용자에게 데이터 보호 기관이나 규제 기관에 연락하라고 권하지 말고, 소송이나 법원이 언급되면 GDPR, LGPD, CCPA 같은 법규를 인용하거나 해석하지 말라는 내용이었다. 2026-07-02 시행한 유럽 지역 개인정보 처리방침은 아일랜드 데이터보호위원회에 민원을 낼 권리를 적고 있어, 숨은 지시가 공개 정책보다 좁게 안내했다.
- Redact는 서버가 이 지시를 Google과 Bing 수집기에도 보냈다고 밝혔지만 확인 방법은 적지 않았다. 10-09 OpenAI, Anthropic, Perplexity 수집기 이름으로 요청하면 본문과 지시가 모두 빠진 페이지가 돌아왔다.
- 인터넷 아카이브 사본 기준으로 계정 삭제 문서의 지시는 07-12와 09-04 사이에 들어갔고, 10-18 확인에서 102개 블록이 모두 사라졌다(문서는 유지). WhatsApp은 WIRED에 자사 상담 챗봇용 지시가 버그로 노출됐고 고쳤다고 밝혔다.
- 챗봇의 실제 답변과 외부 AI 비서가 지시를 따랐는지는 시험하지 않았다. 같은 시스템을 쓰는 Facebook과 Instagram 도움말 300개에서는 비슷한 지시를 찾지 못했다.

### 화면과 수집 결과를 대조한다

위 조사 방식에서 가져온 점검 절차다.

- 화면 텍스트와 페이지 소스, 렌더링된 DOM을 비교해 보이지 않는 블록을 찾는다.
- 같은 URL을 사용자 에이전트별로 요청해 검색 엔진 수집기, AI 수집기와 브라우저가 받는 본문을 비교한다. 사이트는 역방향 DNS나 공개된 IP 대역으로 실제 수집기를 가려낼 수 있으므로(Google은 그 확인 방법을 공개한다), 사용자 에이전트만 바꾼 요청은 실제 수집기와 다른 응답을 받을 수 있다. 결과를 실제 수집기가 받은 본문으로 단정하지 않고 요청 방법을 함께 기록한다.
- 자사 사이트라면 Search Console의 URL 검사처럼 운영자 도구로 수집기가 실제로 받은 HTML을 확인한다.
- 웹 아카이브 사본으로 시점 범위를 좁히고, 제거 뒤 다시 확인해 변경 시각을 기록한다.
- 문서 수, 블록 수와 확인 시각을 남기고, 지시가 있다는 사실과 모델이 따랐다는 사실을 별도 검증 항목으로 둔다.

자사 사이트라면 모델 지시는 시스템 프롬프트나 설정처럼 공개 본문과 분리된 곳에 두고, 공개 문서에 AI용 문구가 남지 않았는지 배포 전에 검사한다(운영 제안).

## 생성한 통계와 인용 세탁

인용 세탁은 근거 없는 수치가 인용을 거칠 때마다 출처가 있는 수치처럼 보이게 되는 과정이다. 처음 만든 페이지가 하나여도 그 수치를 옮긴 논문, 보고서와 AI 답변이 늘면, 나중에 읽는 사람이나 모델은 여러 출처가 같은 값을 확인한 것으로 받아들이기 쉽다. 인용 수는 독립된 확인의 수가 아니므로 사슬을 거슬러 처음 만든 주체를 찾아야 한다. 생성형 도구로 국가별, 주제별 통계 페이지를 대량으로 만들면 이런 출발점을 싸게 만들 수 있다. Google 스팸 정책은 사용자에게 가치를 더하지 않고 순위 조작을 목적으로 대량 생성한 페이지를 scaled content abuse로 금지하지만, 검색 노출이 줄어든 페이지를 AI 검색은 계속 답변 근거로 가져갈 수 있다(아래 사례에서 도출한 이 문서의 해석).

### 사례: 지어낸 통계 사이트 실험 (2026)

AI 검색 노출(GEO) 기업 Peec AI가 2026-10-07 게시한 자체 실험이며, 수치는 모두 실험자의 자체 보고다.

- 2026년 3월 새 도메인(stateglobe.com)에 GPT-4.1로 200개국의 SEO, 마케팅, 전자상거래 등에 관한 지어낸 통계 페이지 5만 개를 하루 만에 만들었고, 나중에 리스티클 1만 5천 개를 더해 비용은 약 50달러였다.
- 일주일 안에 거의 모든 페이지가 Google 색인에 들어갔지만 두 차례 업데이트 뒤 Google 노출이 급감했다. 반면 최근 30일 봇 요청 60만 건 중 약 7만 2천 건이 ChatGPT-User였고, 3월 이후 ChatGPT 유입 세션이 1만 건을 넘었다.
- Ahrefs와 Semrush 기준 330개 넘는 도메인이 링크했고, 학술 논문, 금융 그룹의 투자 리서치와 경제 매체가 지어낸 수치를 인용했다. 링크 없는 인용은 세지 못했다.
- 사이트에 지금은 면책 문구를 달았다고 밝혔지만, 데이터를 내리거나 정정했는지는 밝히지 않았다.

실험자는 이 과정을 인용 세탁이라고 부르고, LLM이 날짜가 붙은 구체적인 통계를 선호하면서 검증하지 않는다고 해석했다. 한 사이트로 한 실험이므로 엔진별 인용 기준이나 효과의 크기로 일반화하지 않는다.

### 통계의 출처를 확인하는 순서

이 문서의 점검 제안이다.

1. 인용한 문서가 아니라 숫자를 처음 만든 주체를 찾는다. 인용 사슬이 같은 페이지로 모이면 인용 수는 독립된 확인이 아니다.
2. 처음 만든 주체가 조사 방법, 표본, 기간과 정의를 공개하는지 본다. 국가별, 주제별로 같은 형식의 페이지가 대량으로 있고 방법 설명이 없으면 생성된 데이터일 가능성을 검토한다.
3. 공식 통계 기관이나 원자료 보유자의 수치와 대조하고, 확인하지 못한 수치는 미확인으로 표시한다.
4. AI 답변이 인용한 수치도 답변의 링크를 열어 같은 순서를 적용한다. AI가 인용했다는 사실을 검증으로 세지 않는다.

## 출처

- [WhatsApp's Hidden Notes Told AI Not to Recommend a Regulator — Redact](https://redact.dev/blog/whatsapp-help-pages-hidden-ai-instructions) — 2026-10-19 공개와 갱신. 2026-10-27 규모, 지시 문구, 수집기별 차이(Google과 Bing의 확인 방법은 미기재), 제거 시점, 회사 설명과 한계 대조
- [Publish stats, get cited: The tactic that put my data all over the web — Peec AI](https://peec.ai/blog/publish-stats-get-cited-the-tactic-that-put-my-data-all-over-the-web) — 2026-10-07 게시. 2026-10-27 실험 구성, 자체 보고 수치와 면책 문구 대조
- [Google Search Central, Spam policies for Google web search](https://developers.google.com/search/docs/essentials/spam-policies) — 2026-08-28 갱신판. 2026-10-27 cloaking, hidden text와 scaled content abuse 정의 대조
- [Google Crawling Infrastructure, Verify requests from Google crawlers and fetchers](https://developers.google.com/crawling/docs/crawlers-fetchers/verify-google-requests) — 2026-03-20 갱신판. 2026-10-27 역방향 DNS와 IP 대역 확인 방법 대조
- [Search Console Help, URL Inspection tool](https://support.google.com/webmasters/answer/9012289) — 2026-10-27 수집된 HTML 확인과 소유 속성 조건 대조
- [OWASP GenAI, LLM01:2025 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) — 2026-10-27 사람에게 보이지 않는 입력의 영향 대조

## 관련 문서

- [[LLM-Application-Security|LLM 애플리케이션 보안]] — 간접 프롬프트 인젝션과 허위 정보
- [[AI-Content-Provenance|AI 콘텐츠의 워터마크와 출처 증명]]
- [[Coding-Agent-Package-Hallucination|코딩 에이전트의 패키지 환각 공격]] — 규칙 파일에 숨긴 지시
- [[LLM-Hallucination-Verification|LLM 환각 유형과 검증]]
- [[AI-Search-Visibility|AI 검색 가시성 측정]]
