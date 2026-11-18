---
tags: [ai, llm, training, alignment, rlhf, dpo]
status: done
verified_at: 2026-11-18
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Post-Training", "사후학습", "Supervised Fine-Tuning", "지도 미세조정", "Reward Model", "보상 모델", "Direct Preference Optimization", "Superficial Alignment Hypothesis", "Model Merging", "모델 병합"]
---

# LLM 사후학습: SFT, RLHF와 DPO

사전학습 모델은 학습 데이터의 문서를 이어 쓰도록 학습됐으므로 사용자의 지시를 따르는 것이 목표가 아니다. InstructGPT 논문도 모델을 키운다고 사용자의 의도를 더 잘 따르게 되지는 않으며, 큰 모델도 사실이 아니거나 유해하거나 도움이 되지 않는 출력을 낼 수 있다고 지적한다. 사후학습은 이 모델을 지시를 따르고 설계자가 정한 선을 지키는 어시스턴트로 바꾼다. 지도 미세조정(SFT)은 원하는 응답을 흉내 내게 하고, 선호 최적화(RLHF, DPO)는 두 응답 가운데 사람이 고른 쪽을 더 내게 한다. 상위: [[LLM-Generation-Mechanics|LLM 동작 원리]]. 단계 요약표는 [[LLM-Generation-Mechanics-Training#사전학습 이후의 조정|사전학습 이후의 조정]]에 있다.

원하는 데이터(사람이 쓴 질문과 모범 답)는 비싸고 적으며, 사전학습 데이터는 많지만 원하는 형태가 아니다. 그래서 사전학습을 마친 모델에서 출발해 적은 양의 선별된 데이터로 추가 학습한다. InstructGPT의 자체 프롬프트 분포에 대한 사람 평가에서 1.3B InstructGPT의 출력이 파라미터가 100배 많은 175B GPT-3의 출력보다 선호됐다.

## SFT: 같은 손실, 다른 데이터

SFT의 목적 함수는 사전학습과 같은 다음 토큰 교차 엔트로피다. 바뀌는 것은 데이터와 학습 설정이다.

- **응답 토큰만 센다**: Llama 2는 프롬프트와 답을 구분 토큰으로 이어 붙이고, 사용자 프롬프트 토큰의 손실을 0으로 둬 답 토큰에만 역전파했다. 코사인 학습률 일정(초기 2×10^-5)으로 2 epoch 학습했다.
- **학습률을 다시 연다**: 사전학습은 끝에서 학습률을 0 가까이 내리고(Llama 3는 마지막 40M 토큰에서 0까지 선형 감소), SFT는 별도의 학습률 일정으로 다시 시작한다(LIMA는 1×10^-5에서 1×10^-6으로 선형 감소). 최적화 관점에서 사전학습 가중치는 SFT의 초기값이다.
- **바꿀 파라미터를 고른다**: 모든 가중치를 갱신하는 전체 미세조정과, 저랭크 변화량만 학습하는 LoRA 같은 방식이 있다([[LLM-Generation-Mechanics-Training#LoRA와 QLoRA: 바꾸는 파라미터와 저장 정밀도|LoRA와 QLoRA]]).

### 데이터는 양보다 다양성과 품질

LIMA(2023)는 LLaMA 65B를 선별한 프롬프트와 응답 1,000개로만 미세조정하고 강화학습 없이 강한 결과를 보고했다(750개는 Stack Exchange, wikiHow 같은 커뮤니티 질문과 답에서 고르고 250개는 직접 썼다). 논문은 이를 근거로 표면 정렬 가설(Superficial Alignment Hypothesis)을 세웠다. 지식과 능력은 거의 모두 사전학습에서 배우고, 정렬은 사용자와 대화할 때 어떤 형식의 하위 분포를 쓸지를 가르친다는 가설이다.

- **양만 늘리면 정체된다**: 7B 모델의 절제 실험(ChatGPT가 1~6점으로 도움 정도를 채점)에서 같은 2,000개라도 프롬프트가 다양한 Stack Exchange가 균질한 wikiHow보다 나았고, 품질 필터를 거친 데이터가 거치지 않은 데이터보다 0.5점 높았다. Stack Exchange 데이터를 2K에서 32K까지 두 배씩 늘려도 응답 품질은 오르지 않았다.
- **수만 건이면 충분했던 사례**: Llama 2는 다양성과 품질이 부족한 수백만 건의 외부 SFT 데이터를 제쳐 두고 직접 모은 적지만 품질 높은 예시를 써서 결과가 크게 좋아졌고, 수만 건이면 충분하다고 판단해 27,540건에서 수집을 멈췄다.
- **해석의 경계**: LIMA의 절제 실험은 LLM 판정 점수이고 가설은 가설이다. SFT로 새 지식을 넣을 수 없다는 뜻도 아니다. 넣을 수는 있지만 부작용이 따른다는 결과가 아래에 있다.
- **작게 시작하고 절반으로 어림한다**: 2026-11-18 OpenAI 지도 미세조정 가이드는 잘 만든 시연 50개로 시작해 평가하고, 50개로 효과가 없으면 데이터를 늘리기 전에 과제나 프롬프트부터 다시 보라고 권한다(최소 10개, 개선은 50~100개에서 봤다고 적는다). 같은 회사의 모범 사례 문서는 데이터를 두 배로 늘릴 때마다 비슷한 폭의 개선을 기대하고, 현재 데이터 전체와 절반으로 각각 미세조정한 결과의 차이로 추가 데이터의 효과를 어림하라고 안내한다. 위 LIMA처럼 두 배씩 늘려도 정체하는 과제도 있으므로 어느 쪽인지는 이 절반 실험으로 자기 과제에서 확인한다. OpenAI의 미세조정 플랫폼은 신규 사용자를 받지 않고 축소 중이라([[LLM-Generation-Mechanics-Context-and-Agent#프롬프트, RAG와 파인튜닝은 바꿀 대상으로 고른다|파인튜닝 제공 범위]]) 수치는 그 서비스 모델에서 나온 경험칙으로 읽는다.
- **분포와 라벨 일관성이 상한을 정한다**: 같은 모범 사례 문서의 예로, 학습 데이터의 응답 60%가 거절인데 운영에서는 5%만 거절해야 하면 거절이 과해진다. 여러 사람이 만든 데이터에서 추출 결과가 70%만 일치했다면 모델도 그보다 낫기 어렵다. 라벨을 모으기 전에 좋은 답의 기준(맞지만 도움이 안 되는 답을 어떻게 볼지, 3점과 4점을 무엇으로 가를지)을 지침으로 쓰고 사람끼리의 일치도를 먼저 잰다(적용 제안, [[Eval-LLM-Judge#일치율과 놓친 실패를 함께 본다|일치도 측정]]).

### LLM이 만든 SFT 데이터

Alpaca(2023-03)는 사람이 쓴 지시와 출력 175쌍을 씨앗으로 text-davinci-003이 새 지시와 출력을 만들게 해(self-instruct) 52K개 시연을 얻고, LLaMA 7B를 미세조정했다. 당시 데이터 생성은 API로 500달러 미만, 미세조정은 80GB A100 8장으로 약 3시간에 100달러 미만이었다. 발표 글은 환각이 text-davinci-003보다 더 잦고 유해 출력과 고정관념도 있어 학술 연구용으로만 공개한다고 밝혔다. 강한 모델의 출력으로 작은 모델을 가르치는 구성은 [[Task-Specific-Small-Models|작은 특화 모델]]의 증류와 같은 계열이다.

## SFT만으로 부족한 이유

- **흉내의 상한**: SFT는 시연을 복제하므로 시연을 쓰는 사람의 능력과 비용에 묶인다. 직접 쓰기 어려운 수준의 답도 두 답 중 나은 쪽은 고를 수 있다는 점이 비교 데이터를 쓰는 설계 동기다. Llama 2는 수집하는 프롬프트의 다양성을 넓히려고 두 응답 중 하나를 고르는 이진 비교 방식을 택했다.
- **모르는 사실을 가르치면 환각이 는다**: Gekhman et al.(2024)은 닫힌 질의응답에서 미세조정 데이터 중 새 지식을 담은 예시의 비율을 바꿔 가며 실험했다. 새 지식 예시는 모델이 이미 아는 내용과 맞는 예시보다 훨씬 늦게 학습됐고, 학습될수록 환각 경향이 선형으로 커졌다. 저자들은 모델이 사실 지식을 주로 사전학습에서 얻고, 미세조정은 그 지식을 더 효율적으로 쓰게 한다고 해석한다. 기반 모델이 본 적 없는 참고문헌을 인용한 모범 답은 그럴듯한 인용을 지어내는 법을 가르칠 수 있다(적용 해석). 환각의 다른 원인은 [[LLM-Hallucination-Verification#왜 생기는가|환각이 생기는 이유]]에서 다룬다.

## RLHF: 보상 모델과 PPO

InstructGPT의 세 단계는 다음과 같다.

| 단계 | 데이터 | 학습 |
|---|---|---|
| 1. SFT | 라벨러가 쓴 시연(학습 프롬프트 약 13k) | 지도 학습 |
| 2. 보상 모델 | 한 프롬프트에 대한 출력 4~9개에 매긴 순위(33k 프롬프트) | 쌍 비교 손실 |
| 3. 강화학습 | 사람 라벨 없는 프롬프트(31k) | 보상 모델 점수를 PPO로 최대화하며 SFT 모델에서 멀어지는 것을 벌한다 |

보상 모델은 프롬프트와 응답 전체를 받아 점수 하나를 낸다. 보통 SFT 모델 위에 스칼라를 내는 선형 층을 얹어 초기화한다. 선호는 Bradley-Terry 모형으로, 두 응답의 점수 차가 한쪽이 선호될 로그 오즈가 되도록 맞춘다.

```text
P(y_w ≻ y_l | x) = σ( r(x, y_w) - r(x, y_l) )
loss(r) = -E[ log σ( r(x, y_w) - r(x, y_l) ) ]
```

이기고 지는 이진 신호만 쓰면 얼마나 나은지가 사라지지만, 보상 모델은 비교 라벨을 연속 점수로 바꿔 정책이 새로 만든 응답에도 점수를 매긴다. InstructGPT는 한 프롬프트에서 나온 비교들이 서로 강하게 상관돼 섞어 학습하면 과적합하므로, 한 프롬프트의 모든 쌍을 배치 원소 하나로 묶어 학습했다.

```text
objective(π) = E[ r(x, y) - β log( π(y|x) / π_SFT(y|x) ) ]   (+ γ × 사전학습 로그 가능도, PPO-ptx)
```

- **KL 벌점**: 토큰마다 SFT 모델에서 멀어지는 정도를 벌해 보상 모델의 과최적화를 줄인다. 보상 모델은 사람 선호의 대리 지표라서 끝까지 밀어붙이면 실제 품질이 떨어진다. Gao et al.(2022)은 고정된 기준 보상 모델을 사람 대신 두고 대리 보상 모델에 맞춰 최적화할수록 기준 점수가 나빠지는 현상을 측정했고, 관계의 형태는 강화학습과 best-of-n에서 달랐으며 계수는 보상 모델 크기에 따라 매끄럽게 변했다.
- **정렬 비용**: InstructGPT는 RLHF 뒤 공개 NLP 데이터셋의 성능이 떨어지는 것을 보고 사전학습 기울기를 섞는 PPO-ptx로 줄였다.
- **구현 부담**: PPO는 정책과 비슷한 크기의 가치 모델(critic), 롤아웃과 clipping이 필요하다. critic을 빼는 GRPO는 [[Reasoning-Model-Test-Time-Compute#재확인 습관을 강화학습으로 기르기: DeepSeek-R1-Zero와 GRPO|추론 모델의 강화학습]]에 있다.
- **확률이 확신도가 아니게 된다**: 강화학습 뒤의 모델은 텍스트 분포를 추정하는 모델이 아니라 보상을 높이는 정책이다. GPT-4 기술 보고서에서 사전학습 모델은 MMLU 선택지 확률이 실제 정답률과 잘 맞았지만 사후학습 뒤에는 보정이 크게 나빠졌다. 정렬한 모델의 로그 확률을 확신도로 쓰지 않는다([[LLM-Abstention|LLM Abstention]], [[LLM-Perplexity-and-Benchmarks#perplexity를 비교할 수 있는 조건|perplexity 비교 조건]]).

## DPO: 보상 모델 없이 선호를 최적화한다

KL 제약이 있는 보상 최대화의 최적 정책은 `π*(y|x) ∝ π_ref(y|x) exp(r(x,y)/β)`다. 이를 보상에 대해 풀면 `r(x,y) = β log(π*(y|x)/π_ref(y|x)) + β log Z(x)`이고, Bradley-Terry 모형은 두 응답의 보상 차만 쓰므로 계산하기 어려운 분배 함수 Z(x)가 사라진다. 그래서 선호 확률을 정책만으로 쓸 수 있고, 보상 모델 학습과 같은 형태의 최대 가능도 손실이 된다.

```text
L_DPO(π_θ) = -E[ log σ( β log( π_θ(y_w|x) / π_ref(y_w|x) ) - β log( π_θ(y_l|x) / π_ref(y_l|x) ) ) ]
```

- **하는 일**: 선호한 응답의 가능도를 올리고 선호하지 않은 응답의 가능도를 내린다. 기울기는 언어 모델이 암묵적으로 정의하는 보상이 두 응답의 순서를 틀리게 매길수록 커진다.
- **보고된 결과**: DPO 논문(6B 이하 모델)은 감정 제어에서 PPO 기반 RLHF를 앞서고, 요약과 단일 턴 대화에서 같거나 나은 품질을 훨씬 단순한 구현으로 냈다고 보고했다. AlpacaFarm의 모의 평가에서 Davinci003 대비 승률은 PPO 46.8±1.8%, DPO 46.8±1.7%, SFT(52k) 39.2±1.7%였고, 이 표에서 DPO는 사람 평가를 하지 않았다. Llama 3의 사후학습은 rejection sampling, SFT와 DPO로 구성됐다.
- **포기하는 것**: 기본 DPO는 이미 모은 비교 쌍에서만 학습한다. RLHF의 보상 모델은 정책이 학습 중에 새로 만든 응답에도 점수를 줄 수 있다. 이 차이가 성능 차이로 이어지는지는 과제마다 실험으로 확인한다.

## 선호 데이터의 함정

- **길이**: Singhal et al.(2023)은 RLHF가 출력을 길게 만드는 경우가 많고, 보상 상승이 주로 응답 길이 증가에서 나오며, 길이만 보상하는 보상 함수로도 SFT 대비 하류 개선의 대부분이 재현된다고 보고했다. 주된 원인은 선호 데이터의 길이 편향에 쉽게 흔들리는 보상 모델이었다. 평가에서도 길이를 통제한다([[Eval-LLM-Judge#알려진 편향과 완화|판정기의 장황함 편향]]).
- **사람끼리도 자주 엇갈린다**: AlpacaFarm에서 따로 둔 한 사람의 판정이 다른 사람 3명의 다수결과 일치한 비율은 66%였다. 여러 API LLM과 프롬프트로 만든 모의 판정기 13개를 묶은 평가용 판정기는 65%로 비슷했고, 1,000건당 비용은 300달러에서 12달러로 25배 쌌다. GPT-4 단일 프롬프트도 일치율은 65%였지만 사람 사이의 판정 변동을 재현하지 못해 보상 과최적화 같은 결과가 질적으로 달라질 수 있었다. 그래서 학습용 모의 라벨러는 판정기 13개에 25%의 라벨 뒤집기 잡음을 더했다(1,000건에 6달러로 크라우드워커보다 50배 저렴).
- **규모**: InstructGPT의 보상 모델 데이터는 33k 프롬프트(프롬프트마다 순위를 매긴 출력 4~9개)였고, Llama 2는 SFT 27,540건과 별도로 100만 건이 넘는 이진 비교를 모았다. 선호 데이터가 SFT 데이터보다 훨씬 많은 구성이다.
- **평가자 선발과 검수**: 자격 조건과 응답 품질 확인은 [[Crowdsourced-Human-Evaluation|크라우드소싱 사람 평가]]를 따른다.

## 따로 학습한 모델을 가중치로 합친다

같은 사전학습 가중치에서 출발해 따로 미세조정한 같은 구조의 모델은 출력이 아니라 가중치를 합칠 수 있다. 여러 모델을 함께 돌려 출력을 모으는 앙상블은 모델 수만큼 호출하지만, 가중치를 평균하거나 더해 만든 모델은 크기가 그대로라 추론 비용과 메모리가 늘지 않는다.

- **평균**: Model Soups(2022)는 하이퍼파라미터만 달리해 미세조정한 모델 가운데 검증 점수가 가장 좋은 하나만 남기는 관행 대신 가중치를 평균하면 정확도와 분포 변화에 대한 강건성이 자주 함께 좋아진다고 보고했다. Llama 3도 보상 모델, SFT, DPO 단계마다 데이터나 하이퍼파라미터를 달리한 실험의 모델을 평균했다.
- **과제 벡터**: Task Arithmetic(2023)은 미세조정한 가중치에서 사전학습 가중치를 뺀 값을 과제 벡터로 정의한다. 여러 과제 벡터를 더하면 여러 과제가 함께 좋아질 수 있고, 한 벡터를 빼면 그 과제의 성능은 떨어지되 대조 과제의 동작은 거의 그대로였다. 여러 과제를 한 모델에 담을 때 차례로 미세조정하면 [[Deep-Learning-Foundations-and-Practice#순차 학습과 파괴적 망각|파괴적 망각]]이, 모든 과제의 데이터를 섞어 한 번에 학습하면 데이터를 한곳에 모아야 하는 부담이 따르는데, 병합은 과제별로 따로 학습한 결과를 나중에 합친다.
- **간섭**: 합치는 모델이 늘수록 같은 파라미터를 서로 다른 방향으로 바꾼 값이 상쇄된다. TIES-Merging(2023)은 미세조정 중 조금만 바뀐 값을 되돌리고, 모델 사이에 부호가 엇갈리는 파라미터의 부호를 하나로 정한 뒤 그 부호와 같은 값만 평균한다.
- **층 쌓기**: 여러 모델의 층을 골라 이어 붙이는 방식(frankenmerging)은 파라미터 수가 늘 수 있어 메모리를 아끼는 수단이 아니다. 층을 늘려 모델을 키운 SOLAR 10.7B는 깊이 확장 뒤에 추가 사전학습을 거쳤다.
- **비용과 확인**: 병합은 경사 하강 없이 텐서를 계산하는 일이라 mergekit은 CPU만으로 돌리거나 VRAM 8GB로 가속할 수 있다고 안내한다. 병합한 모델은 과제마다의 점수와 유지할 범용 능력을 따로 잰다(적용 제안, [[Task-Specific-Small-Models#특화 성능과 유지할 범용 능력을 따로 평가한다|특화 성능과 범용 능력의 평가]]).

## 운영 체크포인트

- SFT만 한 모델과 선호 최적화를 더한 모델을 같은 프롬프트, 길이를 통제한 지표와 사람 표본으로 비교한다(적용 제안).
- SFT 데이터에 기반 모델이 모를 사실이나 출처가 들어갔는지 확인하고, 그런 답은 근거 검색과 함께 쓰거나 빼는 방안을 검토한다(적용 제안).
- 보상 점수만 오르고 사람 평가가 따라오지 않으면 보상 모델 과최적화와 길이 편향을 먼저 의심한다.
- 정렬한 모델의 토큰 확률은 확신도나 품질 점수로 해석하지 않는다.

## 이해 점검

1. SFT와 사전학습의 손실이 같은데도 결과 모델의 행동이 크게 달라지는 이유는 무엇인가?
2. 보상 모델 손실에서 두 응답 점수의 차이에 시그모이드를 씌우는 이유는 무엇인가?
3. PPO 목적식에 KL 항이 없으면 어떤 일이 생길 수 있는가?
4. DPO가 보상 모델 없이 같은 목적을 최적화할 수 있는 이유는 무엇이며, 그 대가로 무엇을 포기하는가?
5. RLHF 뒤 응답이 길어졌다면 무엇을 의심하고 어떻게 확인하는가?
6. 앙상블과 가중치 병합은 추론 비용이 어떻게 다르며, 과제 벡터를 더하는 병합은 어떤 전제에서 성립하는가?

## 출처

- [Training Language Models to Follow Instructions with Human Feedback — Ouyang et al.](https://arxiv.org/abs/2203.02155) — 2026-11-18 대조. 초록, 3.2절 데이터셋 규모, 3.5절의 순위 수집, 보상 모델 식 (1)과 PPO 목적식 (2)
- [Direct Preference Optimization: Your Language Model is Secretly a Reward Model — Rafailov et al.](https://arxiv.org/abs/2305.18290) — 2026-11-18 대조. 초록, 3절 Bradley-Terry와 보상 모델 손실, 4절 DPO 유도와 기울기
- [LIMA: Less Is More for Alignment — Zhou et al.](https://arxiv.org/abs/2305.11206) — 2026-11-18 대조. 2절 표면 정렬 가설, 3절 학습 설정, 5절 다양성, 품질과 양의 절제 실험
- [Llama 2: Open Foundation and Fine-Tuned Chat Models — Touvron et al.](https://arxiv.org/abs/2307.09288) — 2026-11-18 대조. 3.1절 SFT 데이터와 설정, 3.2.1절 이진 비교와 선호 데이터 규모
- [The Llama 3 Herd of Models — Llama Team, AI @ Meta](https://arxiv.org/abs/2407.21783) — 2026-11-18 3.4.3절 어닐링 학습률, 4절 사후학습 구성과 4.1.5절 모델 평균 대조
- [Alpaca: A Strong, Replicable Instruction-Following Model — Stanford CRFM](https://crfm.stanford.edu/2023/03/13/alpaca.html) — 2023-03-13 발표 글, 2026-11-18 데이터 생성과 비용, 한계 대조
- [AlpacaFarm: A Simulation Framework for Methods that Learn from Human Feedback — Dubois et al.](https://arxiv.org/abs/2305.14387) — 2026-11-18 대조. 3.2~3.3절 모의 판정기 설계와 비용, 4.3절 일치율, 표 2의 방법별 승률
- [Does Fine-Tuning LLMs on New Knowledge Encourage Hallucinations? — Gekhman et al.](https://arxiv.org/abs/2405.05904) — 2026-11-18 초록 대조
- [Scaling Laws for Reward Model Overoptimization — Gao et al.](https://arxiv.org/abs/2210.10760) — 2026-11-18 초록 대조
- [A Long Way to Go: Investigating Length Correlations in RLHF — Singhal et al.](https://arxiv.org/abs/2310.03716) — 2026-11-18 초록 대조
- [GPT-4 Technical Report — OpenAI](https://arxiv.org/abs/2303.08774) — 2026-11-18 그림 8의 사전학습 모델과 사후학습 모델 보정 대조
- [Model soups: averaging weights of multiple fine-tuned models improves accuracy without increasing inference time — Wortsman et al.](https://arxiv.org/abs/2203.05482) — 2026-11-18 초록 대조
- [Editing Models with Task Arithmetic — Ilharco et al.](https://arxiv.org/abs/2212.04089) — 2026-11-18 초록 대조
- [TIES-Merging: Resolving Interference When Merging Models — Yadav et al.](https://arxiv.org/abs/2306.01708) — 2026-11-18 초록 대조
- [SOLAR 10.7B: Scaling Large Language Models with Simple yet Effective Depth Up-Scaling — Kim et al.](https://arxiv.org/abs/2312.15166) — 2026-11-18 초록의 깊이 확장 구성 대조
- [mergekit — GitHub, arcee-ai](https://github.com/arcee-ai/mergekit) — 2026-11-18 README의 CPU 실행과 passthrough 방식(층 쌓기) 설명 대조
- [OpenAI API Docs, Supervised fine-tuning](https://developers.openai.com/api/docs/guides/supervised-fine-tuning) — 2026-11-18 예시 수 절과 플랫폼 축소 안내 대조
- [OpenAI API Docs, Fine-tuning best practices](https://developers.openai.com/api/docs/guides/fine-tuning-best-practices) — 2026-11-18 데이터 품질과 양을 반복하는 절 대조
- [YouTube, Stanford CS229, Building Large Language Models (LLMs)](https://www.youtube.com/watch?v=9vM4p9NN0Ts) — 2024-08-27 업로드. 정리의 계기이며 식과 수치는 위 원 논문으로 대조했다
- [YouTube, Marina Wyss, AI Engineering in 76 Minutes (Complete Course/Speedrun!)](https://www.youtube.com/watch?v=JV3pL1_mn2M) — 2025-04-01 업로드. Chip Huyen의 책 AI Engineering(O'Reilly Media, 2025)을 요약한 강의로 데이터 양 단락과 모델 병합 절의 계기다. 사실은 위 논문, 저장소와 공식 문서로 대조했다

## 관련 문서

- [[LLM-Generation-Mechanics|LLM 동작 원리 (묶음 인덱스)]]
- [[LLM-Generation-Mechanics-Training|학습과 사전학습 이후 조정]] — 단계 요약표, LoRA와 QLoRA
- [[LLM-Pretraining-Data-Pipeline|사전학습 데이터 파이프라인]] — 사전학습 필터와 사후학습 안전 조정의 분담
- [[LLM-Scaling-Laws|LLM 스케일링 법칙]]
- [[Reasoning-Model-Test-Time-Compute|추론 모델의 사고 길이]] — 규칙 보상과 GRPO
- [[LLM-Hallucination-Verification|LLM 환각 유형과 검증]]
- [[LLM-Abstention|LLM Abstention]] — 추측을 보상하는 채점과 보정
- [[LLM-Sycophancy-Evaluation|LLM 아첨 편향 평가]]
- [[AI-Generated-Text-Readability|AI 생성 글의 처리 난도]] — 검증 가능한 정답 보상과 출력 압축 가설
- [[Eval-LLM-Judge|LLM 판정기]] — 길이 편향과 보정
- [[Crowdsourced-Human-Evaluation|크라우드소싱 사람 평가]]
- [[Task-Specific-Small-Models|작은 특화 모델]] — 교사 모델 증류
- [[Deep-Learning-Foundations-and-Practice|딥러닝 기초와 실습]] — 순차 학습의 파괴적 망각과 대응
