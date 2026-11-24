---
tags: [learning, methods, cognitive-science, feedback, sleep]
status: done
category: "Growth - 학습"
aliases: ["Four Pillars of Learning", "학습의 네 기둥", "How We Learn", "독해 전략", "Generative Learning", "생성적 학습"]
---

# 학습의 네 기둥: 주의, 능동적 참여, 오류 피드백, 통합

인지신경과학자 스타니슬라스 드앤(Stanislas Dehaene)은 사람의 뇌가 배우는 방식을 주의(attention), 능동적 참여(active engagement), 오류 피드백(error feedback), 통합(consolidation)의 네 기둥으로 정리한다. 나이와 관계없이 이 네 요소가 학습 속도와 정착에 작용한다는 틀이다. 공부 계획을 세울 때 무엇을 얼마나 읽을지보다 이 네 조건을 갖췄는지를 먼저 점검하는 데 쓴다.

## 네 기둥의 역할

| 기둥 | 하는 일 | 빠지면 생기는 일(적용 해석) |
|---|---|---|
| 주의 | 들어온 정보 가운데 지금 처리할 것을 골라 증폭한다 | 같은 시간을 앉아 있어도 처리된 정보가 적다 |
| 능동적 참여 | 결과를 먼저 예측하고 가설을 세워 보게 한다 | 설명을 읽고 고개만 끄덕이며 예측이 시험되지 않는다 |
| 오류 피드백 | 예측과 실제의 차이를 신호로 돌려 예측을 고친다 | 틀린 예측을 고칠 신호가 없다 |
| 통합 | 반복과 수면을 거치며 배운 회로가 자동화된다 | 수면이 방해되면 통합이 막혀 다음 날 다시 떠올리기 어렵다 |

능동적 참여와 오류 피드백은 한 쌍이다. 학습자가 바깥 세계에 대한 예상을 먼저 만들고, 환경이나 교사가 돌려준 오류 신호가 그 예상을 고친다. 강의만 듣는 수업은 생각이 다른 데로 흐르기 쉬워 능동적인 수업 방식보다 덜 효과적이라고 설명된다. 이 문서에서는 능동을 몸을 움직이는 활동보다 예측을 내놓고 확인하는 머릿속 처리로 해석해 적용한다(해석, 책 본문 미대조).

통합에서 수면은 주요 요인으로 다뤄진다. 깊은 서파 수면이 사실 기억과 일반화를, 렘 수면이 지각과 운동 학습을 돕는다는 그림이 제시되지만, 2015년 강의 소개 기준으로 수면 단계별 역할은 확정된 결론이 아니었다. 학습 계획에서는 밤을 새워 몰아서 하는 방식보다 나눠서 반복하고 잠을 확보하는 쪽을 기본으로 둔다는 정도로 적용한다.

## 오류를 정보로 다룬다

오류는 정보를 주는 신호이며 처벌과 구분된다. 오류에는 빠른 피드백이 필요하고, 스스로 탐색하려는 시도를 매번 처벌하면 호기심이 꺾이며 반복된 처벌은 학습된 무력감으로 이어진다고 설명된다. 그래서 틀리는 일이 안전해야 하고, 학습자가 예측을 내놓지 않으면 고칠 신호도 생기지 않는다(해석). 이를 적용하면 피드백은 등수를 매기는 점수보다 무엇이 왜 틀렸는지 알려 주는 형태가 낫다(적용 해석).

혼자 공부할 때도 같은 구조를 만든다.

- 풀이를 보기 전에 답이나 다음 단계를 먼저 적는다. 맞힐 자신이 없어도 적는다.
- 정답과 비교해 틀린 지점을 한 줄로 남긴다. 틀린 횟수는 실력 평가가 아니라 다음에 볼 목록이다.
- AI나 해설은 정답을 받는 용도보다 내 예측이 어디서 어긋났는지 확인하는 용도로 쓴다.

## 공부 계획에 옮기기

1. 주의: 한 번에 다룰 개념을 하나로 줄이고 알림과 다른 탭을 닫는다. 깊은 집중이 필요한 내용은 집중 시간에, 복습은 자투리 시간에 둔다.
2. 능동적 참여: 예제 코드를 실행하기 전에 출력을 예측하고, 수식은 손으로 한 번 계산한다.
3. 오류 피드백: 실행 결과나 해설과 비교해 틀린 이유를 적고, 같은 유형을 다시 풀어 고친 이해를 확인한다.
4. 통합: 다음 날과 며칠 뒤에 짧게 다시 떠올려 보고, 막히는 부분만 다시 본다. 수면 시간을 공부 시간을 늘리는 데 쓰지 않는다.

예를 들어 추천시스템 기반 학습에서 행렬 곱이나 코사인 유사도를 배울 때, 작은 행렬의 결과를 먼저 손으로 예측하고 NumPy로 확인한 뒤 어긋난 지점을 적고, 다음 날 같은 계산을 보지 않고 다시 해 본다.

## 다 읽었다는 것과 이해했다는 것

설명형 책이나 강의를 끝까지 보고도 핵심을 거의 남기지 못하는 경우가 있다. Andy Matuschak의 에세이 Why books don't work(2019)는 원인을 매체가 깔고 있는 전달주의(transmissionism), 곧 지식이 가르치는 사람에게서 배우는 사람에게 바로 전해지고 문장을 읽으면 흡수된다는 암묵적 모델에서 찾는다.

- **피드백 고리는 독자의 몫이다:** 이해했는지, 다시 읽어야 하는지, 다른 자료를 봐야 하는지를 독자가 스스로 계속 묻는 메타인지 작업이 필요하고, 낯선 내용일수록 부담이 크다. 책은 정적이라 문장이 독자의 생각을 자극할 수는 있어도 그 생각에 반응하지는 못한다.
- **강좌는 그 부담을 나눠 맡는다:** 일정, 피드백, 질의 시간과 토론이 메타인지 부담의 상당 부분을 대신 지고, 사회적, 정서적 동기도 준다.
- **매체를 다시 설계한다:** 읽는 것이 곧 이해가 되는 매체를 묻고, 본문 사이에 질문을 넣어 점점 늘어나는 간격으로 다시 묻는 기억 매체 Quantum Country를 예로 든다.

이 문서의 네 기둥으로 보면 혼자 책을 읽는 일은 능동적 참여와 오류 피드백, 통합을 독자가 직접 설계해야 하는 일이다(해석). 장을 읽기 전에 답할 질문을 적고, 읽은 뒤 책을 덮고 설명하거나 예제를 풀어 본 다음 막힌 곳만 다시 읽고, 며칠 뒤 다시 떠올린다(적용 제안). 독자가 흡수하는 양이 적다는 판단은 저자가 공식 연구를 찾지 못해 직관에 기댄 것이고, 기억 매체가 다음 장의 작업 기억 부담을 줄일 것이라는 효과도 기대로 적혀 있다.

### 막힌 층을 나눠 읽고 다른 형태로 바꿔 본다

어려운 설명문이 읽히지 않으면 막힌 곳이 단어인지, 문장 구조인지, 개념 사이의 관계인지부터 나눈다. 아래 순서는 국어 비문학 독해 지도에서 쓰는 훈련을 일반화한 적용 제안이며, 단계마다 근거의 수준이 다르다.

1. **단어:** 뜻을 물으면 바로 말할 수 없는 단어는 느낌으로 짐작되더라도 모르는 단어로 표시하고, 사전 정의 안의 모르는 단어까지 거슬러 찾는다. 글이 직접 정의해 주는 전문 용어는 글의 정의를 따른다. 선행 개념으로 거슬러 가는 방식은 [[CS-Learning-Method|CS 지식 학습법]]의 순환 탐색과 같다.
2. **문장:** 긴 문장은 주어와 서술어의 뼈대를 먼저 찾고 수식어와 예시는 거기에 덧붙은 말로 다시 읽는다. 과학기술의 장점과 첨단 기술의 부작용을 한 문장에 늘어놓은 글이라면 과학기술은 좋은 측면이 있다, 첨단 기술은 사회 문제와 새 불평등을 낳는다는 두 뼈대로 줄인 뒤 나머지를 붙인다. 표시는 수단이다. 밑줄 긋기 자체는 학습 기법 검토에서 유용성이 낮게 평가됐으므로([[Structure-First-Memorization#근거가 있는 부분과 경험칙인 부분|근거가 있는 부분과 경험칙인 부분]]), 어디가 뼈대이고 어디가 덧붙은 말인지 판단하는 데 쓴다. 이 문장 쪼개기의 효과를 검증한 연구는 대조하지 못했다.
3. **설명:** 읽은 문장을 처음 듣는 사람에게 소리 내어 설명한다. 설명이 막히는 곳이 이해가 빈 곳이다. 자기 설명은 2번에 링크한 검토에서 중간 유용성으로 평가됐고, 안다는 느낌과 설명 능력이 어긋난 실험은 [[Fluency-Illusion-and-Effortful-Learning|쉽게 느껴지는 공부와 오래 남는 공부]]에 있다.
4. **그림과 도식:** 과정이나 공간의 변화를 다루는 글(빙하가 녹아 해수면이 오르는 과정, 이미지에 노이즈를 더했다가 걷어 내는 과정)은 그림으로, 개념 사이의 관계를 다루는 글(정립, 반정립, 종합을 나란한 세 범주가 아니라 대립하는 두 범주가 종합으로 모이는 구조로 설명하는 [[Dialectics|변증법]])은 도식으로 옮긴다.

그림과 도식의 근거는 조건부다.

- **생성적 학습 전략:** Fiorella와 Mayer는 새 내용을 다시 조직해 기존 지식과 잇게 하는 전략으로 요약, 매핑, 그리기, 상상하기, 자기 시험, 자기 설명, 가르치기, 실연하기의 여덟 가지를 정리했다(책 목차 기준, 전략별 효과 크기와 경계 조건은 본문을 열람하지 못함).
- **직접 그리기:** 대학생 63명이 과학 글을 읽은 실험에서 그리기는 반복 읽기보다 이해를 높였는데, 사전 지식이 비교적 낮은 학습자에서 그랬다(Lin 외 2017). 초등 4학년과 6학년 실험에서는 도움을 받으며 그린 두 조건이 그리지 않은 조건보다 문제 해결 사후 검사 점수가 높았고, 6학년만 따로 보면 가장 많이 도움받은 조건이 도움 없이 그린 조건보다도 높았다. 4학년만 보면 조건 차이가 유의하지 않았고 객관식 재인 검사에서도 유의한 차이가 없었다(Van Meter 외 2006). 문헌 검토는 그리기를 권하는 처방과 연구로 확인된 내용 사이에 간극이 있다고 지적했다(Van Meter와 Garner 2005).
- **머릿속으로 그려 보기:** 글을 읽으며 심상을 만드는 기법은 Dunlosky 외(2013)의 검토에서 유용성이 낮다는 평가를 받았다. 위 Lin 외 실험의 상상하기 조건은 글을 더 오래 읽게 했다.
- **개념 지도:** 4학년부터 대학생까지 55개 연구, 5,818명을 묶은 메타분석에서 개념 지도 사용은 지식 유지 향상과 연관됐다. 효과 크기는 지도를 쓰는 방식에 따라 작은 것부터 큰 것까지 달랐고 대부분의 하위 집단에서 이질성이 컸다(Nesbit과 Adesope 2006).

적용 제안: 머릿속으로 그려 보고 이해했다고 판단하지 않고 손으로 그린 다음, 원문과 대조해 틀린 연결을 고친다(이 문서의 오류 피드백). 도식은 글을 덮고 다시 그려 본다. 날마다 짧게 반복하는 편이 하루에 몰아서 많이 분석하는 것보다 낫다는 조언은 분산 연습의 근거와 같은 방향이며([[CS-Learning-Method-Retrieval-Practice|CS 학습의 읽기, 회상과 적용]]), 30분 같은 시간 기준은 경험칙이다.

## 한계

네 기둥은 학습에 필요한 조건의 틀이지 특정 공부법의 효과 크기를 정한 처방이 아니다. 같은 틀 안에서도 필요한 지원은 사람마다 다를 수 있다. 수면 단계별 기능처럼 2015년 강의 소개에서 확정되지 않았던 부분은 현재 연구 상태를 확인하기 전까지 확정된 사실로 옮기지 않는다.

## 확인할 질문

1. 예제를 읽기만 한 공부와 결과를 먼저 예측한 공부는 네 기둥 가운데 무엇이 다른가?
2. 시도할 때마다 처벌받으면 학습자에게 어떤 일이 생기고, 오류 피드백은 왜 약해지는가?
3. 오늘 이해한 개념을 다음 주에도 쓸 수 있게 하려면 계획에 무엇을 넣어야 하는가?
4. 지금 막힌 글은 단어, 문장 구조, 개념 사이의 관계 가운데 어디서 막혔고, 그림이나 도식으로 옮기면 어느 연결이 비는가?

## 출처

- [How We Learn — Penguin, Stanislas Dehaene](https://www.penguin.co.uk/books/310169/how-we-learn-by-dehaene-stanislas/9780141989303) — 2026-11-16 출판사 소개 글의 네 기둥 구성만 확인, 책 본문 미대조
- [Collège de France, Stanislas Dehaene, Attention and executive control](https://www.college-de-france.fr/en/agenda/lecture/cognitive-foundations-of-school-learning/attention-and-executive-control) — 2015 강의, 2026-11-16 강의 소개 대조
- [Collège de France, Stanislas Dehaene, Active engagement, curiosity and error correction](https://www.college-de-france.fr/en/agenda/lecture/cognitive-foundations-of-school-learning/active-engagement-curiosity-and-error-correction) — 2015 강의, 2026-11-16 강의 소개 대조
- [Collège de France, Stanislas Dehaene, Learning consolidation and the importance of sleep](https://www.college-de-france.fr/en/agenda/lecture/cognitive-foundations-of-school-learning/learning-consolidation-and-the-importance-of-sleep) — 2015 강의, 2026-11-16 강의 소개 대조
- [Why books don't work — Andy Matuschak](https://andymatuschak.org/books/) — 2019-05 에세이, 2026-11-16 전달주의, 독자의 피드백 고리, 강좌와의 비교, 기억 매체의 기대 효과와 연구 부재 단서 대조
- [책이 제 역할을 하지 못하는 이유 (2019) — GeekNews](https://news.hada.io/topic?id=36969) — 2026-11-16 접속 시 브라우저 확인 페이지로 요약 미열람, 위 원문으로 대조
- [Learning as a Generative Activity: Eight Learning Strategies that Promote Understanding — Cambridge University Press, Logan Fiorella, Richard E. Mayer](https://doi.org/10.1017/CBO9781107707085) — 2015. 2026-11-24 출판사 페이지의 목차로 여덟 전략의 이름만 확인, 본문 미열람
- [The Effect of Learner-Generated Drawing and Imagination in Comprehending a Science Text — Journal of Experimental Education, Lijia Lin 외](https://eric.ed.gov/?id=EJ1118626) — 85권 1호 142~154쪽(2017). 2026-11-24 ERIC의 초록으로 참가자, 조건과 사전 지식에 따른 결과 확인
- [Learner-Generated Drawing as a Strategy for Learning from Content Area Text — Contemporary Educational Psychology, Peggy Van Meter 외](https://eric.ed.gov/?id=EJ737565) — 31권 2호 142~166쪽(2006). 2026-11-24 ERIC의 초록으로 조건과 학년별 결과 확인
- [The Promise and Practice of Learner-Generated Drawing: Literature Review and Synthesis — Educational Psychology Review, Peggy Van Meter, Joanna Garner](https://eric.ed.gov/?id=EJ732434) — 17권 4호 285~325쪽(2005). 2026-11-24 ERIC의 초록만 확인
- [Learning with Concept and Knowledge Maps: A Meta-Analysis — Review of Educational Research, John C. Nesbit, Olusola O. Adesope](https://eric.ed.gov/?id=EJ751159) — 2006. 2026-11-24 ERIC의 초록으로 연구 수, 참가자 수, 유지 효과와 이질성 확인
- [Improving Students' Learning With Effective Learning Techniques — Psychological Science in the Public Interest, Dunlosky 외](https://doi.org/10.1177/1529100612453266) — 14권 1호 4~58쪽(2013). 2026-11-24 Europe PMC의 초록으로 글 학습의 심상 사용이 낮은 유용성으로 평가된 점 확인
- [책 100권 읽을 바엔 차라리... 이 영상 1개 보세요 \[문해력편\] — YouTube, 샤학관](https://www.youtube.com/watch?v=KmEj5FwdNh8) — 2025-05-09 업로드 공개, 2026-11-24 음성 인식 전사 전체 확인. 단어, 문장, 설명, 그림과 도식의 단계와 예문의 계기. 국어 4~5등급 학생이 1등급이 됐다는 사례와 열 명 중 셋도 안 한다는 관찰은 확인할 수 없어 옮기지 않음

## 관련 문서

- [[AI-Tutoring-and-Mastery-Learning|AI 튜터링과 완전학습]]
- [[Flow-Theory-and-Learning|몰입 이론과 학습]]
- [[CS-Learning-Method|CS 지식 학습법]]
- [[Structure-First-Memorization|구조를 먼저 외우고 가린 채 떠올리기]] — 밑줄 긋기와 자기 설명의 근거 수준
- [[Recommender-System-Foundations-Roadmap|추천시스템 구현 기반 로드맵]]
