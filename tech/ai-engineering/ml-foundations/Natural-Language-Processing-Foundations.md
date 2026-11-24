---
tags: [ai, nlp, natural-language-processing, n-gram, naive-bayes, word2vec, embedding, scikit-learn, learning]
status: done
verified_at: 2026-11-18
category: "AI엔지니어링(AIEngineering)"
aliases: ["자연어 처리 기초", "Natural Language Processing Foundations", "NLP 기초", "문맥 자유 문법", "Context-Free Grammar", "n-gram", "Bag-of-Words", "나이브 베이즈 텍스트 분류", "Laplace Smoothing", "word2vec", "단어 임베딩"]
---

# 자연어 처리 기초: 문법, n-gram과 단어 표현

자연어 처리(NLP)는 사람의 언어를 입력으로 받는 과업 전반이다. 긴 글의 요약, 정보 추출, 기계 번역, 질문 응답, 텍스트 분류(스팸 여부, 감성의 긍정과 부정)가 대표적이고 언어 식별, 개체명 인식, 음성 인식, 단어 뜻 구분도 포함한다. 이 문서는 규칙 기반 문법, 통계적 n-gram, 단어 단위 분류와 단어 벡터처럼 대규모 언어 모델 이전부터 쓰인 기초 도구를 다루고, 신경망 기반 시퀀스 모델은 흐름만 잇는다.

## 구문과 의미

- **구문(syntax):** 문장의 구조다. 같은 단어로도 순서가 어긋나면 문법적으로 성립하지 않는 문장이 된다.
- **구조의 중의성:** "I saw the man on the mountain with a telescope"는 망원경을 가진 사람이 나인지 산 위의 남자인지에 따라 두 구조로 읽히고, 구조가 다르면 뜻도 다르다.
- **의미(semantics):** 단어와 문장의 뜻이다. 단어가 달라도 뜻이 거의 같은 문장이 있고, 반대로 "Colorless green ideas sleep furiously"(Chomsky)처럼 구문은 맞지만 뜻이 없는 문장도 있다.

## 형식 문법과 문맥 자유 문법

형식 문법(formal grammar)은 한 언어의 문장을 생성하는 규칙 체계다. 문맥 자유 문법(context-free grammar, CFG)은 왼쪽의 기호 하나를 오른쪽의 기호열로 바꾸는 재작성 규칙의 모음이다.

- 단어처럼 더 바꿀 것이 없는 기호가 단말 기호(terminal symbol)다.
- N(명사), V(동사), D(한정사), NP(명사구), VP(동사구), S(문장)처럼 다른 기호로 바뀌는 기호가 비단말 기호(non-terminal symbol)다.

```text
S  -> NP VP
NP -> D N | N
VP -> V | V NP
D  -> "the" | "a"
N  -> "she" | "city" | "car"
V  -> "saw" | "walked"
```

이 문법으로 "she saw the city"를 분석하면 S가 NP(she)와 VP(saw the city)로, VP가 V(saw)와 NP(the city)로 나뉘는 구문 트리가 나온다. 전치사구(PP) 규칙을 더한 문법에서 "she saw the dog with the binoculars"를 분석하면 with the binoculars가 dog를 꾸미는 트리와 saw를 꾸미는 트리가 모두 나온다. NLTK 같은 파서는 가능한 트리를 모두 찾아 주지만, 어느 쪽이 의도인지는 문법만으로 정해지지 않는다.

규칙 기반 접근은 구조를 명시적으로 보여 주지만, 사람이 쓰고 말하는 모든 문장을 덮는 규칙을 손으로 쓰기는 어렵다. 그래서 대량의 텍스트에서 패턴을 배우는 통계적 접근을 함께 쓴다.

## n-gram, 토큰화와 Markov 생성

n-gram은 텍스트에서 연속한 n개 항목(문자나 단어)의 열이다. "how often have I said to you"의 단어 trigram(n = 3)은 how often have, often have I, have I said 등이다. 말뭉치에서 n-gram 빈도를 세면 어떤 단어열이 자주 이어지는지 알 수 있다.

n-gram을 세려면 먼저 문자열을 단위로 나눠야 한다. 토큰화(tokenization)는 문자열을 조각(token)으로 나누는 일이며, 여기서는 단어 단위로 나눈다. LLM이 쓰는 하위 단어 단위 토크나이저는 [[LLM-Generation-Mechanics-Decoding|추론과 디코딩]]의 BPE 설명에 있다.

n-gram 통계로 Markov chain을 만들면 앞의 n−1개 단어로 다음 단어의 분포를 정하고 한 단어씩 뽑아 문장을 생성할 수 있다([[Markov-Chain-and-Stationary-Distribution|마르코프 체인과 정상 분포]]). 결과는 원문에 없던 문장이면서 국소적으로는 그럴듯하지만, 통계적 패턴을 따를 뿐 문장 전체의 의미나 목적을 보장하지 않는다. n을 키우면 참고하는 문맥이 길어지는 대신 가능한 단어열의 조합이 기하급수적으로 늘어 말뭉치에 한 번도 나오지 않는 n-gram이 많아진다.

## bag-of-words와 Naive Bayes 텍스트 분류

bag-of-words는 텍스트를 순서 없는 단어 모음으로 표현한다. loved, fun, best는 긍정 리뷰에, broke, cheap, flimsy는 부정 리뷰에 자주 나온다는 식의 단어 단서만 쓰고 어순은 버린다. 같은 표현을 검색의 희소 벡터로 쓰는 방식은 [[Vector-Space-Model-and-Cosine-Similarity|벡터 공간 모델과 코사인 유사도]]에 있다.

Naive Bayes 분류기는 베이즈 규칙으로 클래스별 사후 확률을 비교한다. 리뷰가 "my grandson loved it"이면 긍정일 확률은 다음에 비례한다.

`P(긍정 | 단어들) ∝ P(긍정) × P(my | 긍정) × P(grandson | 긍정) × P(loved | 긍정) × P(it | 긍정)`

- 분모 `P(단어들)`은 클래스와 무관하므로 계산하지 않고, 클래스별 값을 구한 뒤 합이 1이 되도록 정규화한다. 긍정의 곱이 0.006, 부정의 곱이 0.003이면 긍정 확률은 0.006 / 0.009, 약 0.67이다.
- 클래스가 정해지면 각 단어가 서로 독립이라고 가정하는 것이 naive라는 이름의 이유다. 실제 단어는 서로 의존하지만 계산이 단순해지고 분류에는 쓸 만하게 동작한다. 조건부 독립과 곱셈 규칙은 [[Conditional-Probability-and-Bayes|조건부 확률과 베이즈 정리]]에 있다.
- 확률은 학습 데이터를 세어 추정한다. `P(긍정)`은 긍정 표본 수를 전체 표본 수로, `P(loved | 긍정)`은 loved가 들어 있는 긍정 표본 수를 긍정 표본 수로 나눈 값이다.

학습 데이터의 긍정 리뷰에 grandson이 한 번도 없었다면 `P(grandson | 긍정) = 0`이 되어, 다른 단어가 아무리 긍정적이어도 곱 전체가 0이 된다. 덧셈 평활(additive smoothing)은 각 빈도에 α를 더해 이 0을 막고, α = 1이면 Laplace smoothing이다. 모든 값을 실제보다 한 번 더 관측했다고 치는 셈이다.

scikit-learn 1.9.1 기준 구현의 선택지는 다음과 같다.

- `MultinomialNB`는 단어 출현 횟수(또는 tf-idf) 벡터를 쓰고, 클래스 y에서 단어 i의 확률을 `(N_yi + α) / (N_y + α × n)`으로 추정한다. `N_yi`는 클래스 y의 학습 표본에서 단어 i가 나온 횟수, `N_y`는 그 클래스의 전체 단어 수, `n`은 특징(어휘) 수다. α = 1이 Laplace, α < 1이 Lidstone 평활이다.
- `BernoulliNB`는 단어가 있는지 없는지의 이진 특징을 쓰며, 클래스를 가리키는 단어가 나오지 않은 것도 명시적으로 벌한다. 문서가 짧은 데이터에서 나을 수 있어 두 모델을 함께 평가하라고 권한다. 위 예처럼 단어가 들어 있는 표본 수로 세는 방식은 이진 특징에 가깝지만, 나오지 않은 단어를 곱에 넣지 않았다는 점이 `BernoulliNB`와 다르다.
- Naive Bayes는 분류기로는 괜찮지만 확률 추정기로는 나쁘다고 알려져 있어 `predict_proba` 값을 그대로 믿지 않는다. 확률로 쓰려면 보정을 확인한다([[Supervised-Learning-Validation-and-Metrics#임계값, ROC와 유병률|임계값과 보정]]).

감성 분류 결과를 응대 결정과 분리하는 설계는 [[Aspect-Based-Sentiment-Analysis|속성 기반 감성 분석]]에 있다.

## 단어를 벡터로 표현하기

신경망에 단어를 넣으려면 단어를 숫자 벡터로 바꿔야 한다.

| 표현 | 방식 | 한계 또는 성질 |
|---|---|---|
| one-hot | 어휘 크기 길이의 벡터에서 그 단어 자리만 1, 나머지는 0 | 어휘가 5만 개면 길이 5만인 벡터가 5만 개 필요하다. 서로 다른 단어 벡터는 모두 직교해 wrote와 authored, book과 novel의 유사성을 담지 못한다 |
| 분산 표현(distributed representation) | 뜻을 여러 차원의 실수 값에 나눠 담는다 | 비슷한 뜻의 단어가 가까운 벡터가 되도록 학습한다 |

분산 표현을 학습하는 근거는 "You shall know a word by the company it keeps"(J. R. Firth)로 요약되는 생각이다. "for ___ he ate"의 빈칸에 breakfast, lunch, dinner가 모두 들어가듯, 비슷한 문맥에 나오는 단어는 뜻이 비슷하다고 본다.

word2vec(Mikolov 외, 2013)은 대규모 말뭉치에서 이런 벡터를 적은 계산으로 학습하는 두 구조를 제안했다.

- **CBOW:** 앞뒤 단어로 가운데 단어를 예측한다. 주변 단어 벡터를 평균하므로 문맥 안의 어순은 반영되지 않는다.
- **Skip-gram:** 가운데 단어로 앞뒤 일정 범위의 단어를 예측한다.

학습된 벡터에서는 뜻이 비슷한 단어(book과 novel, breakfast와 lunch)가 가깝게 놓이고, 벡터의 차이가 단어 사이의 관계를 담기도 한다. `vector("King") − vector("Man") + vector("Woman")`에 가장 가까운 벡터가 Queen이라는 결과가 대표적이다. 원 논문은 이런 유추 질문을 코사인 거리로 가장 가까운 단어를 찾아 풀고, 질문에 쓴 단어는 후보에서 뺀다. 어떤 단어와 가장 가까운 단어 목록을 뽑을 때도 그 단어 자신이 맨 위에 오므로 걸러야 한다.

word2vec은 어휘의 단어마다 벡터 하나를 학습하므로 철자가 같고 뜻이 다른 단어를 문맥에 따라 구분하지 않는다. 문맥에 따라 다른 표현을 내는 BERT 같은 모델은 [[Deep-Learning-Foundations-and-Practice#번역 구조에서 범용 설계도까지|Transformer 계보]]에 있다. 벡터 사이의 가까운 이웃을 대규모로 찾는 방법은 [[Vector-Similarity-Search|벡터 유사도 검색]]에 있다.

## 순서를 다루는 신경망

번역과 질문 응답은 길이가 다른 단어열을 다른 단어열로 바꾼다. 여기서는 흐름만 정리하고 세부 구조는 기존 문서로 잇는다.

1. **RNN 인코더-디코더:** 인코더 RNN이 입력 단어를 하나씩 읽으며 은닉 상태를 갱신한다. 입력 끝을 알리는 종료 토큰 뒤에 디코더 RNN이 직전 출력 단어와 상태를 받아 다음 단어를 내고, 종료 토큰을 내면 멈춘다([[Neural-Network-Fundamentals#순차 데이터와 순환 신경망|순환 신경망]]).
2. **attention:** 마지막 은닉 상태 하나에 긴 입력 전체를 담기는 어렵다. attention은 출력 단어를 만들 때마다 입력 위치별 은닉 상태에 관련도 점수를 매기고, 점수로 가중 평균한 문맥 벡터를 디코더에 넣는다. 점수 계산은 내적처럼 단순한 방식부터 별도 신경망까지 있으며, 어디에 주목할지는 학습으로 정해진다. 번역에서 점수를 시각화하면 서로 대응하는 단어 쌍이 높게 나온다.
3. **Transformer:** RNN은 앞 단계가 끝나야 다음 단계를 계산하므로 병렬화가 어렵다. Transformer는 순환과 합성곱 없이 attention만으로 위치 사이 정보를 결합해 위치들을 병렬로 처리한다. 순서 정보는 입력 임베딩에 위치 인코딩을 더해 넣는다. 인코더의 self-attention에서는 각 단어가 같은 입력의 다른 단어를 참고하고, 여러 head가 서로 다른 표현 공간의 관계를 함께 본다. 디코더는 이전 출력에 대한 self-attention에 더해 인코더 출력에 대한 attention을 쓴다. 인코더만 쓰거나 디코더만 쓰는 변형도 있다. 직관적으로는, 가을과 단풍이 함께 나오는 문장에서 은행이 은행나무 열매인지 금융기관인지를 주변 단어와의 관계로 정하는 계산이 층마다 반복되며 뜻이 좁혀지는 과정이다(대중 해설의 예).

계보와 학습 비용은 [[Deep-Learning-Foundations-and-Practice#번역 구조에서 범용 설계도까지|Transformer 계보]], Q, K, V 계산과 디코딩은 [[LLM-Generation-Mechanics-Decoding|추론과 디코딩]]에 있다. 이 절은 2023년 공개 강의 범위의 구조 개요이며 현재 LLM의 구성이나 성능을 설명하지 않는다.

## 이해 확인

1. "she saw the dog with the binoculars"의 두 구문 트리를 그리고 각각의 뜻을 설명한다.
2. 말뭉치 "the cat sat on the mat the cat ran"에서 bigram 빈도를 세고 the 다음 단어의 분포를 구한다.
3. 긍정 표본 10개 중 grandson이 든 표본이 0개일 때 평활 전과 Laplace 평활 후의 `P(grandson | 긍정)`을 비교한다(이진 특징이라 분모에 2를 더하는 경우).
4. one-hot 벡터 사이의 코사인 유사도가 서로 다른 모든 단어 쌍에서 0인 이유와, 분산 표현이 이를 어떻게 바꾸는지 설명한다.
5. RNN 인코더-디코더에서 attention이 해결한 병목과 Transformer가 해결한 병목을 각각 설명한다.

## 출처

- [YouTube, Harvard CS50's Artificial Intelligence with Python, Language](https://www.youtube.com/watch?v=5NgNicANyqM&t=38760s) — freeCodeCamp.org 채널, 2023-08-10 공개. 2026-11-18 10:46:00부터의 Language 구간 전체를 사람이 단 영어 자막으로 대조했다. 화면에만 있던 Naive Bayes 예시 확률표 일부와 word2vec 데모의 거리 값은 옮기지 않았다.
- [Harvard, CS50's Introduction to Artificial Intelligence with Python, Lecture 6 Language Notes](https://cs50.harvard.edu/ai/2020/notes/6/) — 이전 판으로 표시된 공식 노트. 2026-11-18 NLP 과업, 구문과 의미의 예문, CFG 규칙, n-gram과 토큰화 정의, Markov 텍스트 생성, bag-of-words, Naive Bayes 추정과 평활, one-hot과 분산 표현, word2vec을 대조했다. 이 판에는 attention과 Transformer가 없어 그 부분은 자막과 아래 논문으로 대조했다.
- [scikit-learn, Naive Bayes](https://scikit-learn.org/stable/modules/naive_bayes.html) — 1.9.1 문서. MultinomialNB의 평활 추정과 Laplace, Lidstone 구분, BernoulliNB의 이진 특징과 짧은 문서, 확률 추정기로서의 한계.
- [Efficient Estimation of Word Representations in Vector Space — Mikolov 외](https://arxiv.org/abs/1301.3781) — 2013. 2026-11-18 v3 PDF의 1.1절 King과 Queen 예시, 3.1절과 3.2절, 그림 1의 CBOW와 Skip-gram, 4절의 코사인 거리 유추 검색과 질문 단어 제외를 대조했다.
- [현재의 AI 대혁명은 바로 이 논문에서 시작됐다 | 필요한 건 오직 어텐션뿐 | 다큐프라임 — YouTube, EBS](https://www.youtube.com/watch?v=YXLWe_pqmjU) — 2026-11-24 공개, 2026-11-24 음성 인식 전사 확인. 동음이의어 직관 예만 썼다. 인터뷰 구간은 음성 인식 반복 오류가 커서 쓰지 않았다
- [Attention Is All You Need — Vaswani 외](https://arxiv.org/abs/1706.03762) — 2026-11-18 초록의 순환과 합성곱 없는 구조와 병렬화, v7 HTML의 3.2.2절 multi-head, 3.2.3절 attention의 세 쓰임, 3.5절 위치 인코딩을 대조했다.

## 관련 문서

- [[ml-foundations|머신러닝 기초]]
- [[Neural-Network-Fundamentals|신경망 기초]]
- [[Deep-Learning-Foundations-and-Practice|딥러닝 기초와 실습]]
- [[LLM-Generation-Mechanics-Decoding|추론과 디코딩]]
- [[Conditional-Probability-and-Bayes|조건부 확률과 베이즈 정리]]
- [[Markov-Chain-and-Stationary-Distribution|마르코프 체인과 정상 분포]]
- [[Vector-Space-Model-and-Cosine-Similarity|벡터 공간 모델과 코사인 유사도]]
- [[Aspect-Based-Sentiment-Analysis|속성 기반 감성 분석]]
