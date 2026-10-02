---
tags: [ai, expertise, learning, mentoring]
status: done
verified_at: 2026-10-02
category: "AI엔지니어링(AIEngineering)"
aliases: ["Expertise Formation AI", "AI 시대 전문성 형성"]
---

# AI 시대 전문성 형성 — 마찰, 판단 위임의 경계, 튜터형 활용

로그 없는 모호한 오류를 추적하고, 구현 방식에 따라 성능이 갈리는 걸 직접 확인하는 경험은 직관을 기를 기회다. 설명과 풀이 예제도 학습을 도울 수 있으므로, 마찰이 많을수록 더 잘 배우는 것으로 보지는 않는다. Lars Faye가 제기한 우려는 AI 코딩 도구가 문제 해결을 대신하면서 이런 학습 기회까지 줄일 수 있다는 것이다. 생산성 효과도 작업에 따라 갈린다(2025년 초 도구 기준 숙련 오픈소스 개발자 16명이 익숙한 저장소의 246개 작업을 수행한 METR RCT에서는 완료 시간이 19% 늘었다 — 조건과 후속 데이터는 [[AI-Leverage-Small-Teams|AI 시대 작은 팀의 구조적 레버리지]] 참조). 학습 관점의 위험은 마찰 제거 자체보다 사고와 검증의 연습을 생략해, 산출물은 나오지만 독립 수행 능력은 늘지 않는 상태다. 속도와 완성물만으로는 이 차이를 알기 어렵다.

> 부분 검증(2026-10-02): 수학 RCT의 설계와 효과 수치, METR의 2025년 결과, IES의 예제와 독립 문제풀이 병행 권고, Bainbridge 원문을 대조했다. 개발자의 장기 전문성 변화와 AI SRE의 MTTR 효과는 이 근거들로 검증되지 않았으며, 아래 도메인 확장은 위험 가설로 읽는다.

## 숙련자 역설과 역전된 학습 구조

- 기존 전문성은 산출물을 감사하는 데 도움이 된다. 다만 위임의 안전성이 전문성에 정비례하거나, 숙련자라면 안전하다는 보장은 없다. 도구의 오류 특성, 과제와 검증 경로도 중요하다. 보조 중 성과 이득과 감사 능력은 구분한다 — 아래 수학 RCT에서 연습 점수의 분산은 줄었지만, 그 효과가 AI 없는 시험까지 이어지지는 않았다.
- 역설의 반쪽은 침식 위험이다. 직접 수행하고 회상하며 검토하는 기회가 줄면, AI를 안내하고 감사하는 능력을 유지할 연습도 줄 수 있다. 숙련자에게도 가능한 위험이지만, 개발자에게서 침식의 크기나 속도, 오래 굳은 지식과 새 지식의 차이를 이 문서의 근거로 확정할 수는 없다.
- 초보자는 무엇을 모르는지 파악하거나 좋은 질문을 만드는 데 어려움을 겪을 수 있다. 학생이 먼저 튜터를 올바르게 안내해야 하는 역전 구조가 생길 위험이다. 모든 초보자가 질문을 못한다는 뜻은 아니며, 교사가 설계한 안내와 피드백으로 부담을 줄이는 접근이 가능하다.
- 생성된 코드를 감사하기 어렵다면 생성된 설명의 오류도 놓칠 수 있다. AI의 설명만으로 정확성을 판단하지 않고 공식 문서, 실행 결과와 사람의 검토를 함께 사용한다.

## 판단 위임과 기계 위임의 경계

판단을 통째로 넘기는 것과 기계적, 반복적인 작업을 위임하는 것은 다르다. 반복 작업의 위임은 부담을 줄일 수 있지만, 배우려는 판단까지 넘기면 연습 기회가 줄 수 있다. 무엇이 판단이고 무엇이 기계 작업인지 경계를 의식적으로 그어야 하며, 배우는 중인 영역일수록 판단 쪽 경계를 넓게 잡는다. 이 현상을 부르는 용어(인지 부채)의 은유 적합성 비판과 대체 명명(위축, 탈숙련)은 [[Technical-Debt|기술 부채]]가 다룬다.

## 근거 — 가드레일 설계에 따라 달라진 수학 학습 결과

2025년 PNAS에 게재된 Bastani 등의 RCT는 터키의 한 고등학교에서 2023년 가을에 진행됐다. 9~11학년 약 1,000명을 학급 단위로 세 집단에 배정했고, 우수반은 주분석에서 제외했다. 각 90분씩 네 차례 수업에서 공통 설명과 예제, 연습, 같은 회차의 AI 없는 시험을 진행해 보조 중 성과와 단기 독립 수행의 차이를 측정했다. 개발자의 장기 전문성이나 다른 교육 환경을 직접 측정한 연구는 아니다.

- 세 집단: 교재와 노트를 쓰는 통제군, GPT-4 기반 ChatGPT형 인터페이스(GPT Base), 답 대신 교사 설계 힌트를 주도록 가드레일을 건 GPT Tutor.
- 배정된 집단 기준 분석(ITT)에서 연습 점수는 통제군 대비 GPT Base +48%, GPT Tutor +127%였다. 이는 통제군 평균에 대한 상대 변화율이며 퍼센트포인트가 아니다. 연습 점수의 분산도 줄었지만, 그 차이가 AI 없는 시험까지 유지되지는 않았다.
- AI 없이 치른 시험에서 GPT Base 점수는 통제군 평균 대비 17% 낮았고 통계적으로 유의했다. GPT Tutor는 통제군과 통계적으로 구별되지 않았다. 유의한 향상이나 하락이 확인되지 않았다는 뜻이며, 효과가 정확히 0이라는 증거는 아니다. [원문 Table 1과 결과](https://www.pnas.org/doi/10.1073/pnas.2422633122) 참조.

이 연구에서 보조 중 높은 점수는 독립 수행의 향상을 보장하지 않았다. GPT Tutor의 결과는 가드레일 설계가 중요함을 시사하지만, 단순히 힌트를 요청하면 같은 효과가 난다는 뜻은 아니다. 정답을 시스템 프롬프트에 넣어 오답 생성을 줄이고, 흔한 오개념에 대한 교사 설계 힌트를 주되 전체 풀이는 내주지 않는 조합이었다. 장기 학습은 측정하지 않았다([저자 제공 원문 PDF, 본문 각주 3](https://hamsabastani.github.io/education_llm.pdf)).

## 도메인 확장 — 운영 자동화와 시스템 직관

운영에서도 비슷한 위험을 검토할 수 있다. Sylvain Kalache는 2026-09-04 글에서 AI가 일상 장애를 처리하면 평균 복구 시간(MTTR)은 줄고, 대응자의 연습 부족으로 복잡한 장애의 해결 시간은 늘 수 있다고 예측했다. 이는 비교 측정한 효과가 아니라 저자의 전망이다. AI SRE가 경보 분석부터 조치까지 맡고 사람이 낯설고 심각한 장애에만 개입하는 운영이라면, 독립 진단 연습이 충분한지 확인할 필요가 있다. 온콜과 사고 대응의 기본 구조는 [[SRE|SRE]]가 다룬다.

이 위험의 선행 논의는 Lisanne Bainbridge의 자동화의 역설(Ironies of Automation, 1983)이다. 산업 공정과 항공 자동화를 다룬 원문은 일상 수행과 연습이 줄어든 운영자에게 비정상 상황의 개입을 요구하는 문제를 지적하고, 직접 제어와 시뮬레이터 훈련 등을 제안한다. 이를 AI SRE에 적용하는 것은 유추이며 현대 SRE의 성과를 입증한 결과는 아니다. 시스템 실제와 운영자 이해 사이의 간극을 이해 부채(comprehension debt)로 보는 은유도 위험을 설명하는 관점이다. 일상 대응의 검토와 직접 진단, 모의 장애 훈련으로 반복 기회를 보존하는 방안을 검토한다.

## 전문성 공급망 문제

개인의 습관을 넘어 세대 차원의 위험으로 볼 수도 있다 — [[Developer-Role-AI-Era|AI 시대 개발자 역할]]의 견습 사다리 붕괴 우려와 같은 축이고, 그 순환 구조(검토가 주니어의 일이 되는데 검토 능력을 기를 직접 경험은 줄어드는 위험)는 그 문서가 다룬다. 이는 이미 공급망이 무너졌다는 실증 결론이 아니다. AI 사용에서 산출과 함께 학습 기회를 설계하느냐가 향후 경로를 바꿀 조건 중 하나다.

## 실천

- 학습 국면과 산출 국면을 구분한다. 배우는 중인 영역에서는 힌트와 질문을 받는 튜터 모드를 활용하고, 기초가 부족하면 설명과 검증된 풀이 예제를 독립 문제풀이와 교대한다. [IES 교육 지침](https://ies.ed.gov/ncee/wwc/practiceguide/1)도 예제와 문제풀이 병행을 권고한다. 이를 코딩에 적용하는 것은 학습 설계 제안이다. 초안 먼저 쓰기, 힌트 요청, AI 있는 작업과 없는 작업의 교대 같은 구체 수칙은 [[AI-Handicap-Learning|AI 핸디캡 학습법]]이 다룬다. 불필요한 막힘보다 스스로 판단하고 확인하는 구간을 남기는 데 초점을 둔다.
- 위임 범위의 기준은 감사 가능성이다. 산출물을 스스로 감사할 수 있거나, 감사할 수 있는 사람이 리뷰 경로에 있는 영역까지만 판단을 위임한다.
- 팀 차원의 육성 구조(검토와 직접 구현의 배합)는 [[Developer-Role-AI-Era|AI 시대 개발자 역할]]의 견습 사다리 재설계가 다룬다.
- 반대 방향의 주장도 있다. AI를 튜터이자 스파링 상대로 쓰면 도제식으로 오래 쌓던 도메인 암묵지를 짧은 기간에 압축해 익힐 수 있고, 선배의 역할은 정답을 주는 사람에서 의도(해결할 비즈니스 문제)와 인지적 스캐폴딩(판단 기준, 검토 질문, 스스로 구조를 그리고 말로 설명하게 하는 과제)을 설계하는 사람으로 바뀐다는 것이다. 압축 학습의 속도는 근거가 제시되지 않은 주장이다. 위 수학 RCT는 가드레일 없는 보조가 단기 독립 수행을 낮출 수 있음을 보여 주지만, 개발자의 압축 학습 속도를 입증하지는 않는다. 역할 재정의는 활용할 관점으로 두고, 설명과 예제, 힌트를 받은 뒤의 학습 여부는 AI 없이 설명하고 재현하는 결과로 확인한다.

## 면접 체크포인트

- 보조 중 성과와 학습의 괴리를 RCT 결과로 설명할 수 있는가 (연습 +127%가 시험 성적 향상이 아니었던 이유).
- 숙련자 역설 — 기존 전문성이 감사에 어떻게 도움이 되며, 위임이 독립 연습을 줄일 위험과 아직 측정되지 않은 부분은 무엇인가.
- 주니어 육성을 어떻게 설계할 것인가 — 튜터 모드, 마찰 보존 구간, 검토와 직접 구현의 배합.

## 출처

- [AI Coding will Prevent Expertise — Lars Faye](https://larsfaye.com/articles/ai-coding-will-prevent-expertise)
- [AI 의존이 코딩 전문성의 성장 경로를 무너뜨릴 수 있음 — GeekNews](https://news.hada.io/topic?id=32854)
- [Generative AI without guardrails can harm learning: Evidence from high school mathematics — PNAS, Bastani et al.](https://www.pnas.org/doi/10.1073/pnas.2422633122)
- [Generative AI Without Guardrails Can Harm Learning — Bastani et al., 저자 제공 원문 PDF](https://hamsabastani.github.io/education_llm.pdf)
- [Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity — METR](https://arxiv.org/abs/2507.09089)
- [Organizing Instruction and Study to Improve Student Learning — IES, What Works Clearinghouse](https://ies.ed.gov/ncee/wwc/practiceguide/1)
- [Ironies of Automation — Automatica, Lisanne Bainbridge](https://tc.ifac-control.org/4/1/newsletter/ironies-of-automation/@@download/file/Bainbridge1983_Automatica_Ironies%20of%20automation.pdf)
- [AI Handles Incidents, Engineers Lose Touch With Their Systems — Sylvain Kalache](https://www.sylvainkalache.com/blog/ai-handles-incidents-engineers-lose-touch-with-their-systems)
- [AI 시대 주니어 육성과 선배의 역할 — Threads, simula](https://www.threads.com/@simula/post/DdV6f9aGGjo)

## 관련 문서

- [[Developer-Role-AI-Era|AI 시대 개발자 역할]] — 견습 사다리 붕괴, 위임의 4분면
- [[Technical-Debt|기술 부채]] — 인지 부채 명명 비판, 위축과 탈숙련
- [[AI-Handicap-Learning|AI 핸디캡 학습법]] — 튜터 모드의 구체 수칙 (초안 먼저, 힌트 요청, 교대 훈련)
- [[Tech-Trend-Learning-Strategy|기술 변화와 학습 전략]] — 깊이 있는 학습과 이전 가능한 작동 모델
- [[SRE|SRE]] — 온콜과 사고 대응 구조, 자동화가 걷어가는 일상 반복과 이해 부채
- [[AI-Capability-Transfer|AI 역량 이전]] — 내부 코치 양성과 자립 역량 기준
