---
tags: [ai, productivity, employment, product-engineering, evaluation]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["AI Work Output and Employment", "AI 코드 생산과 제품 성과 및 고용"]
---

# AI 코드 생산과 제품 성과 및 고용

코드 작성, 검토, 배포와 사용자의 문제 해결은 연결된 단계지만 같은 산출이 아니다. 코드량 증가를 제품 성과나 인력 대체의 증거로 쓰기 전에 각 단계의 처리량, 대기와 실패를 나눠 확인한다.

## 생산성은 전체 흐름에서 잰다

| 층위 | 확인할 결과 |
|---|---|
| 작성 | 코드, 커밋과 PR이 얼마나 생성됐는가 |
| 검토 | 검토 시간, 수정 요청과 재작업이 어떻게 바뀌었는가 |
| 전달 | 요구사항이 배포되고 실제로 동작하는가 |
| 고객 성과 | 업무 시간, 오류와 반복 사용이 개선됐는가 |
| 조직 | 인건비, 운영비와 고용이 어떻게 바뀌었는가 |

작성 용량만 늘면 검토 대기열이 길어질 수 있다. 검토 생략으로 병목을 없애기보다 변경 크기, 완료 조건과 실행 가능한 검증을 조정한다. 코드 줄 수는 유지할 부담이기도 하므로 기능과 결함 해결의 크기를 함께 본다.

AI 사용률은 위 표의 어느 층위의 결과도 아니다([[AX-Transformation#문화와 시스템이 AI 효과를 좌우하는 조건|채택 신호와 KPI의 구분]]). McKinsey의 2025년 글로벌 설문(2025-06-25~07-29, 105개국 1,993명, 응답자 국가의 세계 GDP 비중으로 가중)에서 소속 조직이 최소 한 업무 기능에서 AI를 정기적으로 쓴다는 응답은 88%였다. 반면 전사 확산을 시작했다는 응답은 약 3분의 1, 전사 EBIT에 영향이 있다는 응답은 39%였다. 기업 수가 아니라 응답자 비율이며, 2025년에 사용의 정의를 도입에서 정기 사용으로 바꿨으므로 전년 수치(78%)와의 비교에는 정의 차이가 섞인다(2026-10-26 보고서 본문, Exhibit 1 각주와 조사 개요 대조).

## 연구 사례: 작성량과 제품 산출의 차이

Chen과 Stratton의 2026-08-04 작업 논문은 Jellyfish의 718개 기업, 약 3억 건 업무 이벤트를 사용한다. 자료 기간은 2021년 1월부터 2026년 3월까지다. 도입 시점 차이를 활용한 차분의 차분 분석이며 무작위 실험은 아니다(2026-10-16 초록, 서론과 검토 시간 측정 정의 확인).

에이전트 도입 후 코드 줄 수는 30% 늘었지만 Jira 이슈와 epic 해결량 증가는 통계적으로 유의하지 않았다. PR 제출에서 병합까지는 49%, 리뷰를 하는 직원 비중은 14% 증가했다. 후자는 14퍼센트포인트가 아니다. 저자들은 유의한 고용 변화를 AI 도입에 귀속하지 못했다.

이는 효과가 정확히 0이라거나 모든 팀에서 AI가 쓸모없다는 결과가 아니다. 표본, 채택 시점에 관한 식별 가정과 지표의 한계가 있다. 이후 모델과 도구 개선은 이 관찰 기간의 결과로 검증되지 않는다. 개별 해고 일화가 있다는 사실과 표본 평균에서 고용 효과를 확인하지 못한 결과도 양립할 수 있다.

## 연구 사례: 숙련도와 과업에 따라 갈리는 효과

Brynjolfsson, Li, Raymond의 학술지 게재판(QJE 2025, 140권 2호)은 미국 중소기업용 업무 소프트웨어를 파는 Fortune 500 기업의 자료를 분석했다. 이 회사의 고객 지원 상담원 5,172명의 자료로 GPT-3 기반 대화 보조 도구의 단계적 도입을 분석했다. 시간당 해결 건수는 평균 15% 늘었다. 경험이 적고 숙련도가 낮은 상담원은 시간당 해결 건수가 30% 늘었고 속도와 품질이 함께 좋아졌다. 가장 숙련된 상담원은 속도가 조금 오르고 품질이 조금 떨어졌다. 도구를 쓴 근속 2개월 상담원은 도구를 쓰지 않은 근속 6개월 초과 상담원만큼 성과를 냈다. 상담원 5,179명, 평균 14%, 신입과 저숙련 34%는 2023년 NBER 작업 논문판의 수치다(2026-10-26 학술지 초록과 서론, NBER 초록 대조).

Dell'Acqua 등의 사전 등록 실험(Organization Science 2026, 37권 2호)은 Boston Consulting Group의 지식 노동자 758명을 AI 없음, GPT-4, GPT-4와 프롬프트 작성 안내의 세 조건에 무작위로 배정했다. AI 능력 안쪽의 현실적 과업 18개에서 AI 사용자는 과업을 12.2% 더 많이 끝냈고 25.1% 빨랐으며 품질도 유의하게 높았다. 능력 밖으로 고른 복잡한 경영 과업에서는 AI 사용자가 정답을 낼 가능성이 더 낮았다. 게재판 초록은 그 차이를 19%로 적지만, 이전 작업 논문을 인용한 2차 자료는 19퍼센트포인트로 적어 단위는 본문으로 확인해야 한다. 같은 업무 흐름 안에서도 AI가 돕는 과업과 해치는 과업의 경계가 고르지 않다는 뜻에서 이를 jagged technological frontier라 부른다(2026-10-26 Crossref 등록 초록 대조).

두 연구는 각각 한 회사의 특정 직무에서 GPT-3와 GPT-4 시기 도구로 얻은 결과다. 고객 지원 연구의 상담원은 80%가 필리핀에서 일했다. 하위 숙련자의 큰 개선은 주로 도구를 쓰는 동안의 성과다. 저자들은 도구가 상담원의 학습을 돕고 영어 유창성을 높인다는 근거도 함께 제시했지만, 도구 없이 독립적으로 수행하는 능력의 변화는 이 성과 수치만으로 판단하지 않는다. 그 구분은 [[Expertise-Formation-AI|AI 시대 전문성 형성]]이 다룬다. 능력 밖 과업에서 정답률이 떨어진 결과는 작성 속도와 별개로 결과를 검증할 단계가 필요하다는 근거로 읽는다(추론).

## 직무 폐지와 기술적 대체를 구분한다

기업이 더 싼 수단으로 버틸 수 있다고 믿어 인력을 줄이는 결정과, 그 수단이 모든 업무를 같은 품질로 수행하는 것은 다르다. 해고의 원인을 분석할 때 예산, 사업 전망, 위험 감수와 실제 업무 성능을 각각 확인한다.

2026-10-11 Fable took my jorb 에세이는 마지막 엔지니어의 해고 경험을 전하며, AI가 직무 폐지에 기여한 것과 엔지니어를 완전히 대체한 것을 구분한다. 경영진이 인수합병까지 버틸 수 있다고 판단했다는 해석, 제품 안목과 장기 운영 비용의 한계, 감독 아래 이식 작업의 성과가 함께 나온다. 당사자의 경험과 해석이며 회사 결정의 독립 기록이나 일반 고용률을 입증하지 않는다. 사용자의 경력 사실로 옮기지 않는다.

## 제품 엔지니어링의 조건

문제 정의, 좋은 결과의 기준, 구현과 사용자 피드백을 함께 다루는 역할은 구현만 담당하는 역할과 책임 범위가 다르다. 고객의 실제 업무를 관찰하고 요구를 검수 가능한 조건으로 바꾸며, 기능 추가의 운영 부담을 판단한다.

We are all Product Engineers now 에세이의 장기 전망에는 개발 생명주기 전체의 자동화와 사실상 상한 없는 소프트웨어 수요라는 두 가정이 있다. 운영과 확장 자동화에는 근거가 얇다고 본문도 인정한다. 따라서 제품 감각을 기를 이유로 활용할 수 있지만 모든 개발자가 같은 직무가 된다거나 인력 수요가 반드시 증가한다는 예측으로 확정하지 않는다.

## 좋은 소프트웨어가 보이는 방식

AI의 효과가 있다면 기존 제품 개선, 비공개 내부 도구, 개인의 일회성 작업에도 나타날 수 있다. 공개 신규 제품 수만 세면 이런 성과를 놓칠 수 있다. 반대로 보이지 않는 성과가 있을 것이라는 추측도 전체 생산성 향상의 증거가 아니다.

Where is all the new, good software? 에세이는 공개 제품의 부족에 대해 기존 제품 개선, 비공개 도구, 조직의 병목 등 아홉 가지 가설을 제시한다. 각각 가능한 설명이며 검증된 원인 목록이 아니다. 확인하려면 신규 제품 수와 별도로 배포 주기, 사용 완료율과 내부 도구의 실제 사용을 측정한다.

## 체감 역량의 차이를 다루는 법

같은 모델이라도 채팅만 하는 환경과 코드, 실행 도구 및 검증 경로가 있는 환경은 경험이 다르다. 비교할 때 모델 이름 외에 접근 등급, 과제 규모, 기간, 도구와 검증 가능성을 기록한다. 한 분야의 성과를 다른 분야에 자동으로 확대하지 않는다.

개인 추산으로 나눈 AI 사용자의 층을 보급률 통계로 취급하지 않는다. 사용 여부, 유료 접근, 에이전트 활용과 업무 성과는 다른 변수다. 인구 추산의 반올림 수치를 합쳐 남은 비율을 별도 집단으로 해석하거나, 개발자 수에 설문 비율을 곱해 전문 사용자의 규모를 계산하려면 먼저 모집단과 정의가 일치해야 한다.

### 이용 규모를 비교할 때의 분모

아래는 2026-10-26 확인한 공개 자료다. 서로 다른 지표이므로 하나의 사용자 계층표로 합산하지 않는다.

| 지표 | 공개된 수치와 기준 | 비교의 경계 |
| --- | --- | --- |
| 특정 서비스의 주간 이용자 | OpenAI의 2026-10-07 발표: ChatGPT 주간 이용자 12억 명 이상 | 회사 발표 수치이며 무료 이용자만의 수나 전체 생성형 AI 이용자 수가 아님 |
| 세계 생산가능인구의 이용 비율 | Microsoft Global AI Diffusion Q2 2026: 2026년 6월 15~64세의 18.8% | 익명 집계 원격 측정을 운영체제와 기기 점유율, 인터넷 보급률과 인구로 보정한 추정치. 포함하지 못한 도구가 있어 다음 측정에서는 특히 중국 등의 수치가 높아질 수 있다고 설명 |
| 개발자의 에이전트 사용 응답 | Stack Overflow 2025 설문: 에이전트 문항 응답자 31,877명 | 2025-05-29~06-23에 주로 자사 채널에서 모집한 설문. 전체 개발자의 무작위 표본이나 인구 추계가 아님 |
| 한 플랫폼에서 나타난 사용 분야 | Anthropic 2026-03 보고서: 2026-02-05~02-12 표본에서 Claude.ai 대화의 35%가 컴퓨터와 수학 직군 관련 과업 | 사람 수가 아닌 대화 비율이며, 한 회사 플랫폼의 사용 분포 |

서비스 이용자 수가 커도 그 사람들이 같은 모델, 도구와 과업을 경험했다고 볼 수 없다. 반대로 특정 플랫폼에서 코딩 비중이 높아도 모든 직무의 능력이나 생산성 효과가 그 비율로 설명되지는 않는다. 업무 적용에서는 접근 등급과 함께 실제 과업, 검토 비용과 완료 품질을 기록한다(측정 제안).

보급률은 모집단 조사로 따로 확인한다. 과학기술정보통신부와 한국지능정보사회진흥원의 2025 인터넷이용실태조사(2025-10-17~12-12, 전국 22,500가구 방문 면접, 국가승인통계)에서 생성형 AI 서비스 경험률은 44.5%로 전년보다 11.2%p 높았다(2026-03-31 발표, 경험률 분모의 연령 범위는 확인하지 못했다). 경험 여부를 묻는 지표이므로 사용 빈도, 숙련도와 업무 성과는 따로 확인한다.

## 출처

- [Artificial Intelligence in the Firm: Bottlenecks in Software Production — Fiona Chen and James Stratton](https://fion.ac/jellyfish.pdf) — 2026-08-04 작업 논문, 2026-10-16 부분 대조
- [Fable took my jorb — Cendyne](https://cendyne.dev/posts/2026-10-11-fable-took-my-jorb.html)
- [We are all Product Engineers now — Laurie Voss](https://seldo.com/posts/we-are-all-product-engineers-now/)
- [Where is all the new, good software? — Nate Meyvis](https://www.natemeyvis.com/where-is-all-the-new-good-software/)
- [LLM의 능력에 대한 인식 격차가 커지고 있다 — GeekNews](https://news.hada.io/topic?id=35202) — 소셜 게시물 기반 추산, 원 인구 자료 미확인
- [The state of AI in 2025: Agents, innovation, and transformation — McKinsey & Company](https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai) — 2025-11 보고서, 2026-10-26 본문 3쪽, Exhibit 1 각주와 About the research 대조
- [Generative AI at Work — The Quarterly Journal of Economics, Erik Brynjolfsson 외](https://academic.oup.com/qje/article/140/2/889/7990658) — 2025-02-04 온라인 게재, 140권 2호 889~942쪽. 2026-10-26 초록과 서론 대조
- [Generative AI at Work — NBER, Erik Brynjolfsson 외](https://www.nber.org/papers/w31161) — 작업 논문 w31161(2023-04 발행, 2023-11 개정), 이전 판본의 초록 수치만 대조
- [Navigating the Jagged Technological Frontier: Field Experimental Evidence of the Effects of Artificial Intelligence on Knowledge Worker Productivity and Quality — Organization Science, Fabrizio Dell'Acqua 외](https://doi.org/10.1287/orsc.2025.21838) — 2026-03, 37권 2호 403~423쪽. 2026-10-26 Crossref 등록 초록만 대조, 본문과 성과 수준별 수치는 미대조
- [2025년 인터넷이용실태조사 최종보고서 — 한국지능정보사회진흥원](https://nia.or.kr/site/nia_kor/ex/bbs/View.do?bcIdx=29198&cbIdx=99870) — 2026-03-31 게시, 조사 개요와 생성형 AI 서비스 경험률 대조
- [국민 44.5% 생성형 AI 경험, 전년 대비 11.2%p 증가 — KDI 경제정보센터, 과학기술정보통신부](https://eiec.kdi.re.kr/policy/materialView.do?num=278744) — 과학기술정보통신부 2026-03-31 보도자료, 2026-10-26 생성형 AI 경험률 대조
- [YouTube, 조코딩 JoCoding, AI 리터러시 특강 4강: AI 시대, 우리는 무엇을 준비해야 할까?](https://www.youtube.com/watch?v=R1klN8XsPG4) — 2026-10-19, 도입률과 하위 숙련자의 생산성 효과를 다룬 계기. 수치는 위 1차 출처로 대조
- [GPT-6 and Intelligent UI for everyone — OpenAI](https://openai.com/index/gpt-6-for-everyone/) — 2026-10-07, 주간 사용자 12억 명 이상 표현 대조
- [Global AI Diffusion: Q2 2026 Trends and Insights — Microsoft AI Economy Institute](https://www.microsoft.com/en-us/research/wp-content/uploads/2026/09/Microsoft-AI-Diffusion-Report-2026-Q2.pdf) — 2026-09, 측정 정의, 18.8%와 측정에 넣지 못한 도구의 한계 대조
- [2025 Developer Survey: AI — Stack Overflow](https://survey.stackoverflow.co/2025/ai) — AI 에이전트 사용 빈도 문항과 응답자 수 대조
- [2025 Developer Survey: Methodology — Stack Overflow](https://survey.stackoverflow.co/2025/methodology) — 조사 기간 대조
- [Anthropic Economic Index report: Learning curves — Anthropic](https://www.anthropic.com/research/economic-index-march-2026-report) — 2026-03-24, 표본 기간과 Claude.ai 대화 35% 대조
- [99.8%는 아직 진짜 AI를 써보지 못했습니다 — YouTube, 커리어해커 알렉스](https://www.youtube.com/watch?v=5AqT9njBbI0) — 2026-10-20, AI 이용 규모를 비교한 계기. 반영한 지표는 위 1차 출처로 대조

## 관련 문서

- [[Developer-Role-AI-Era|AI 시대 개발자 역할]]
- [[Software-Productivity-Measurement|소프트웨어 생산성 측정]]
- [[AI-Code-Delegation-Review|AI 구현 위임과 코드 리뷰]]
- [[AI-Slop-Quality-Gate|AI 산출물의 품질 경계]]
- [[Citizen-Development-AI|AI 시민 개발]]
