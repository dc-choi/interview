---
tags: [ai, llm, evaluation, benchmark, perplexity]
status: done
verified_at: 2026-11-18
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Perplexity and Benchmarks", "Perplexity", "퍼플렉서티", "Multiple-Choice Benchmark Scoring", "객관식 벤치마크 채점", "Test Set Contamination", "벤치마크 오염"]
---

# 언어 모델의 perplexity와 객관식 벤치마크 채점

사전학습 단계의 언어 모델은 주로 두 가지로 잰다. 학습에 쓰지 않은 텍스트를 얼마나 잘 예측하는지(perplexity)와, 정답이 정해진 문항을 얼마나 맞히는지(객관식 벤치마크)다. 두 숫자 모두 계산 방식이 결과에 들어 있으므로 숫자만 떼어 비교하면 틀린 결론이 나온다. 열린 답을 내는 대화형 모델의 평가는 [[LLM-Eval-Strategy|LLM 평가 전략]], [[Eval-LLM-Judge|LLM 판정기]]와 [[Crowdsourced-Human-Evaluation|크라우드소싱 사람 평가]]에서 다룬다. 상위: [[eval|AI 모델 평가, 신뢰성, 캘리브레이션]].

## 문장 확률은 토큰 확률의 곱이다

언어 모델은 토큰 시퀀스에 확률을 주는 모델이다. 문법이 틀린 문장이나 뜻이 어색한 문장에는 더 낮은 확률을 주기를 기대한다. 자기회귀 모델은 확률의 연쇄 법칙으로 이를 분해한다.

```text
p(x_1, ..., x_L) = p(x_1) × p(x_2 | x_1) × ... × p(x_L | x_1, ..., x_(L-1))
```

이 분해는 근사가 아닌 항등식이고, 자기회귀 모델의 선택은 각 조건부 확률을 하나의 신경망으로 계산한다는 데 있다. 로그를 취하면 문장의 로그 가능도는 토큰별 로그 확률의 합이 되므로, 토큰별 교차 엔트로피 손실을 줄이는 것은 학습 텍스트의 로그 가능도를 키우는 것과 같다([[LLM-Generation-Mechanics-Training#LLM은 어떻게 학습하는가|학습 손실]]). 생성할 때는 한 토큰씩 순서대로 뽑아야 하므로 출력이 길수록 오래 걸린다([[LLM-Generation-Mechanics-Decoding|추론과 디코딩]]).

## perplexity는 토큰당 평균 손실의 지수다

```text
PPL(X) = exp( -(1/t) × Σ_i log p(x_i | x_<i) )
```

- **평균을 내는 이유**: 토큰당 평균이라 텍스트 길이와 무관하게 비교할 수 있다.
- **지수를 취하는 이유**: 로그 단위의 손실을 확률의 역수 척도로 되돌려 읽기 쉽게 한다. 로그와 지수의 밑은 같아야 한다(자연로그면 e, 밑 2면 2).
- **범위와 직관**: 모든 토큰을 확률 1로 맞히면 1이다. 어휘 V 전체에 확률을 균등하게 나누는 모델은 정확히 |V|이고, 정답 토큰에 균등 분포보다 낮은 확률을 주면 |V|보다 커질 수도 있다. 매 위치에서 정답 확률이 0.25였다면 perplexity는 4로, 다음 토큰을 고를 때 평균 4개 후보 사이에서 헤매는 것과 같다고 읽는다.
- **교차 엔트로피와의 관계**: perplexity는 데이터와 모델 예측 사이 교차 엔트로피의 지수다. 그래서 스케일링 법칙의 검증 손실과 같은 정보를 다른 척도로 보여 준다([[LLM-Scaling-Laws|LLM 스케일링 법칙]]).
- **교차 엔트로피의 하한**: 교차 엔트로피는 데이터 분포 자체의 엔트로피와 모델 분포가 데이터 분포에서 벗어난 정도(KL divergence)의 합이다(`H(P, Q) = H(P) + D_KL(P ‖ Q)`). KL divergence는 0 이상이므로 기댓값으로 본 손실은 데이터의 엔트로피 아래로 내려가지 않고, 모델이 데이터 분포를 완벽히 배워도 0이 되는 것은 KL 항뿐이다. 그래서 perplexity의 하한은 데이터 엔트로피의 지수이고, 구조가 정해져 다음 토큰을 예측하기 쉬운 텍스트일수록 perplexity가 낮게 나오기 쉽다. 스케일링 법칙의 손실이 0이 아닌 값에서 평평해져야 하는 이유도 같다([[LLM-Scaling-Laws#손실은 규모의 거듭제곱으로 줄어든다|손실의 거듭제곱 법칙]]).

## perplexity를 비교할 수 있는 조건

| 조건 | 맞지 않으면 생기는 일 |
|---|---|
| 같은 토크나이저 | 같은 텍스트도 토큰 수와 토큰 단위 확률이 달라진다. Hugging Face 문서도 토큰화 절차가 perplexity에 직접 영향을 주므로 모델을 비교할 때 늘 고려하라고 적는다. 토크나이저가 다르면 문자 단위로 정규화한 지표(bits per character 등)를 검토한다 |
| 같은 평가 데이터와 전처리 | 쉬운 텍스트와 어려운 텍스트의 값은 비교 대상이 아니다 |
| 같은 문맥 처리 방식 | 고정 길이 모델은 긴 텍스트를 잘라 평가한다. GPT-2 large의 WikiText-2 perplexity는 1,024토큰씩 겹치지 않게 자르면 19.44, 512토큰씩 밀며 앞 문맥을 더 주면 16.44였다 |
| 다음 토큰 예측 모델 | BERT 같은 마스크 언어 모델에서는 같은 방식으로 정의되지 않는다 |
| 사후학습 전 모델 | 사후학습한 모델은 텍스트 분포를 추정하도록 최적화되지 않아 값이 품질을 대표하지 못한다 |

마지막 행의 근거로, GPT-4 기술 보고서에서 사전학습 모델은 MMLU 선택지 확률이 실제 정답률과 잘 맞았지만 사후학습 뒤에는 보정이 크게 나빠졌다. LIMA 논문도 perplexity가 생성 품질과 상관하지 않아 SFT 체크포인트를 개발 세트로 직접 골랐다([[LLM-Post-Training|사후학습]]). perplexity는 같은 토크나이저와 데이터로 사전학습의 진행을 보는 개발 지표로 쓰고, 서로 다른 회사 모델의 순위표로 쓰지 않는다.

## 객관식 벤치마크는 채점 방식까지가 벤치마크다

MMLU는 초등 수학, 미국사, 컴퓨터과학, 법학 등 57개 과목의 객관식 문항(선택지 A~D)으로 넓은 지식과 문제 해결 능력을 잰다. 정답이 정해져 있어 자동 채점이 쉽기 때문에 HELM이나 Hugging Face Open LLM Leaderboard처럼 자동 채점 과제를 여럿 모아 순위를 내는 평가에 들어갔다. 하지만 같은 문항도 채점하는 방법이 여럿이다(2023-06-23 Hugging Face 분석 기준).

| 구현 | 채점 방법 | LLaMA 65B 점수 |
|---|---|---|
| 원 구현 | 프롬프트 다음 토큰으로 A, B, C, D 글자의 확률만 비교한다 | 63.6 |
| HELM | 모델이 생성한 답을 기대한 글자와 비교한다. 네 글자 밖의 토큰은 오답이다 | 63.7 |
| EleutherAI Harness(2023-01 판) | 글자와 답 텍스트를 이은 선택지 전체의 로그 확률 합을 비교한다(토큰 수 정규화는 선택) | 48.8 |

세 구현 모두 5-shot이지만 프롬프트 형식도 조금씩 다르다. 분석 글은 구현이 다른 점수는 전혀 비교할 수 없다고 결론냈고, 이후 Harness는 원 구현에 맞게 고쳐졌다. 같은 모델의 점수가 15점 가까이 달라졌으므로 점수에는 프롬프트, few-shot 수, 채점 방식과 정규화를 붙여 기록하고, 같은 평가 코드로 잰 값끼리만 비교한다([[AI-Capability-and-Cost-Trends#1. 벤치마크 점수에 붙여 읽을 조건|벤치마크 점수에 붙여 읽을 조건]]).

## 학습 데이터 오염을 검사한다

벤치마크 문항이 사전학습 데이터에 들어가면 점수가 능력보다 기억을 잰다. 모델 개발자는 학습 데이터를 직접 검색할 수 있지만 외부 평가자는 데이터를 볼 수 없다.

- **n-gram 겹침과 깨끗한 부분집합**: 학습 데이터를 가진 쪽은 평가 문항과 학습 문서의 긴 n-gram 겹침으로 오염 후보를 찾는다. GPT-3(2020)는 사전학습 데이터와 대략 13-gram이 겹치는 문항(문항이 그보다 짧으면 문항 전체가 겹치는 경우)을 보수적으로 오염 후보로 잡아 뺀 깨끗한 부분집합을 벤치마크마다 만들고 원래 점수와 비교했다. 두 점수가 비슷하면 오염이 있어도 보고 결과에 큰 영향이 없고, 깨끗한 쪽이 낮으면 오염이 점수를 부풀렸을 수 있다고 읽는다. 학습 전에 겹침을 지우려던 처리는 버그로 일부만 적용됐고 재학습 비용 때문에 이 사후 비교로 대신했다. 벤치마크 4분의 1에서 오염 후보가 50%를 넘었지만 대부분 점수 변화는 미미했고, 논문은 보수적 기준이 오염을 과대 추정했거나 오염의 영향이 작다고 해석했다.
- **순서 교환 검사**: Oren et al.(2023)은 벤치마크 문항의 순서를 바꿔도 데이터셋의 의미는 같다는 교환 가능성을 이용한다. 오염되지 않은 모델에게는 공개된 원래 순서와 섞은 순서가 비슷하게 그럴듯해야 하지만, 원래 순서 그대로 학습한 모델은 그 순서에 훨씬 높은 가능도를 준다. 섞은 순서들보다 원래 순서의 가능도가 유의하게 높으면 오염을 의심하며, 사전학습 데이터나 가중치 없이 로그 확률만 있으면 된다. 1.4B 파라미터 모델, 1,000문항 테스트 세트, 사전학습 말뭉치에 몇 번만 들어간 데이터셋에서도 검출할 만큼 민감했고, 공개 모델 다섯 개를 감사한 결과 광범위한 오염의 증거는 적었다.
- **검사의 범위**: 이 검사는 문항이 원래 순서대로 학습된 경우를 잡는 방법이므로, 문항이 흩어져 들어간 오염까지 배제하지는 못한다(해석).
- **개발 쪽 예방**: Llama 3는 흔히 쓰는 벤치마크의 학습 세트를 어닐링 데이터에 넣지 않았다고 밝힌다([[LLM-Pretraining-Data-Pipeline#학습 마지막의 어닐링|어닐링]]).
- **평가 쪽 대응**: 비공개 문항이나 익숙한 과제를 바꾼 변형 과제로 다시 잰다([[Eval-Model-Drift-Monitoring|서빙 모델 드리프트 감시]], [[Benchmark-Coverage-and-Workplace-Performance#익숙한 과제를 바꿔 점수의 일반화를 확인한다|변형 과제]]).

## 열린 답은 선호로 잰다

대화형 모델의 답은 정답이 하나가 아니고 표현이 달라도 같은 답일 수 있어, 선택지 확률이나 참조 문자열로 채점하기 어렵다. 실제 사용자 질문에 두 모델의 답을 나란히 보여 주고 나은 쪽을 고르게 하는 쌍 비교가 대표적이다. 사람 투표를 모으는 방식은 [[Crowdsourced-Human-Evaluation#블라인드 쌍 비교의 결론 범위를 정한다|블라인드 쌍 비교]], LLM이 판정해 기준 모델 대비 승률을 내는 방식과 길이 보정은 [[Eval-LLM-Judge#알려진 편향과 완화|LLM 판정기의 편향과 완화]]에서 다룬다.

## 이해 점검

1. 매 위치에서 정답 토큰 확률이 0.5인 모델의 perplexity는 얼마인가?
2. 어휘가 10만 개인 모델과 1만 개인 모델의 perplexity를 바로 비교할 수 없는 이유는 무엇인가?
3. 같은 MMLU에서 LLaMA 65B가 63.6과 48.8을 받은 이유는 무엇인가?
4. 사후학습한 모델의 perplexity가 낮다고 더 좋은 대화 모델이라고 할 수 없는 이유는 무엇인가?
5. 순서 교환 검사가 학습 데이터 없이 오염을 의심할 수 있는 원리는 무엇인가?
6. 교차 엔트로피를 엔트로피와 KL divergence로 나누면 학습으로 줄일 수 있는 손실과 줄일 수 없는 손실은 각각 무엇인가?

## 출처

- [Hugging Face Transformers, Perplexity of fixed-length models](https://huggingface.co/docs/transformers/perplexity) — 2026-11-18 정의, 토큰화 영향, 마스크 언어 모델 제외와 sliding window 예 확인
- [What's going on with the Open LLM Leaderboard? — Hugging Face](https://huggingface.co/blog/open-llm-leaderboard-mmlu) — 2023-06-23 게시, 2026-11-18 세 구현의 채점 방식과 LLaMA 65B 점수 대조
- [Measuring Massive Multitask Language Understanding — Hendrycks et al.](https://arxiv.org/abs/2009.03300) — 2026-11-18 초록 대조
- [Proving Test Set Contamination in Black Box Language Models — Oren et al.](https://arxiv.org/abs/2310.17623) — 2026-11-18 초록 대조
- [Language Models are Few-Shot Learners — Brown et al.](https://arxiv.org/abs/2005.14165) — 2026-11-18 4절의 13-gram 겹침 기준, 깨끗한 부분집합 비교와 겹침 제거 버그 대조
- [GPT-4 Technical Report — OpenAI](https://arxiv.org/abs/2303.08774) — 2026-11-18 그림 8의 보정 비교 대조
- [LIMA: Less Is More for Alignment — Zhou et al.](https://arxiv.org/abs/2305.11206) — 2026-11-18 3절의 체크포인트 선택 대조
- [The Llama 3 Herd of Models — Llama Team, AI @ Meta](https://arxiv.org/abs/2407.21783) — 2026-11-18 3.1.3절 어닐링 데이터의 벤치마크 제외 대조
- [YouTube, Stanford CS229, Building Large Language Models (LLMs)](https://www.youtube.com/watch?v=9vM4p9NN0Ts) — 2024-08-27 업로드. 정리의 계기이며 정의와 수치는 위 문서와 논문으로 대조했다
- [YouTube, Marina Wyss, AI Engineering in 76 Minutes (Complete Course/Speedrun!)](https://www.youtube.com/watch?v=JV3pL1_mn2M) — 2025-04-01 업로드. Chip Huyen의 책 AI Engineering(O'Reilly Media, 2025)을 요약한 강의로 교차 엔트로피 분해와 n-gram 오염 검사 항목의 계기다. 분해식은 정의에서 바로 나오는 항등식이고 오염 검사는 GPT-3 논문으로 대조했다

## 관련 문서

- [[eval|AI 모델 평가, 신뢰성, 캘리브레이션]]
- [[LLM-Eval-Strategy|LLM 평가 전략]]
- [[Eval-LLM-Judge|LLM 판정기]] — 길이 보정 승률
- [[Crowdsourced-Human-Evaluation|크라우드소싱 사람 평가]] — 블라인드 쌍 비교
- [[AI-Capability-and-Cost-Trends|AI 능력과 비용 추세 읽기]] — 벤치마크 점수에 붙일 조건
- [[Benchmark-Coverage-and-Workplace-Performance|벤치마크 평가 범위와 업무 성과]] — 변형 과제
- [[LLM-Scaling-Laws|LLM 스케일링 법칙]] — 검증 손실의 예측
- [[LLM-Post-Training|사후학습]] — 정렬 뒤 확률 보정의 변화
- [[LLM-Generation-Mechanics-Decoding|추론과 디코딩]] — 토크나이저 차이
- [[Natural-Language-Processing-Foundations|자연어 처리 기초]] — n-gram과 단어 단위 토큰화
- [[LLM-Abstention|LLM Abstention]] — 이진 채점과 확신 표현
