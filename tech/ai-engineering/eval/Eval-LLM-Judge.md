---
tags: [ai, evaluation, quality, llm-judge]
status: done
verified_at: 2026-10-06
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM-as-a-Judge", "LLM-as-Judge", "LLM Judge", "LLM 판정기"]
---

# LLM 판정기 (LLM-as-a-Judge)

별도 모델이 루브릭에 따라 다른 모델의 출력을 판정하는 채점기다. 채점기 세 종류 사이의 자리와 게이트 배치는 [[Eval-Rubric-and-Score-Gate]], 판정에 쓸 문항은 [[Eval-Golden-Set-and-Deploy-Gates]]가 맡는다. 이 문서는 판정기를 설계하는 법과 그 판정을 믿어도 되는지 확인하는 법을 다룬다.

## 참조 기반 지표가 재지 못하는 것

참조 답과 기계적으로 비교하는 지표는 참조에 얼마나 가까운지를 잴 뿐, 정답 표현이 여럿인 열린 답에서는 답이 맞는지를 재지 못한다.

| 지표 | 재는 것 | 맞는 자리 | 놓치는 것 |
|---|---|---|---|
| 정확 일치 | 문자열이 같은가 | 라벨, 코드, ID처럼 닫힌 출력 | 표현만 다른 정답 |
| BLEU | 후보의 n-gram 중 참조 번역에도 나오는 비율 (precision 기반) | 기계 번역 | 어휘와 어순이 다른 정답, 사실 여부 |
| ROUGE | 참조 요약과 겹치는 n-gram, 단어 순서열, 단어 쌍 (recall 중심) | 요약 | 같은 내용의 다른 표현, 사실 여부 |
| 임베딩 코사인 | 두 텍스트 임베딩의 방향 유사도 | 바꿔 말한 질문에 같은 취지로 답하는지 보는 일관성 | 사실 여부 |

- BLEU와 ROUGE는 참조와 겹치는 단어를 세므로 표현이 다른 정답은 낮게, 단어 몇 개가 틀려 사실이 뒤집힌 답은 높게 나올 수 있다. 참조 답이 필요해 정답이 하나로 정해지지 않는 열린 질문에는 맞지 않는다. 창의성과 다양성이 필요한 생성 과제에서는 사람 판정과의 상관이 비교적 낮다고 보고되며(G-Eval), BLEU 원 논문은 기계 번역에서 사람 평가와 높은 상관을 보고했다.
- 임베딩 유사도는 표현 차이를 흡수하지만 가까움이 맞음은 아니다. Anthropic의 평가 예시는 코사인 유사도를 FAQ 봇의 일관성 측정에 쓰고, RAGAS의 answer relevance는 답에서 거꾸로 만든 질문과 원래 질문의 임베딩 유사도로 계산하며 사실성은 고려하지 않는다고 명시한다.
- OpenAI Evals의 `text_similarity` grader도 `bleu`, `rouge_l`, `cosine` 같은 지표로 출력이 참조에 얼마나 가까운지를 재고 `pass_threshold`로 합격을 가른다(2026-10-06 확인). 사실과 지시 이행은 근거 대조나 판정기로 넘긴다.

## 판정기에 넣을 것과 받을 것

판정할 답과 함께 다음을 넣는다.

| 입력 | 빠지면 생기는 일 |
|---|---|
| 질문과 앞선 대화 | 다중 턴에서 판정기가 이전 답을 잘못 짚는다 |
| 그때 모델에 준 컨텍스트 (검색 문서, 정책 버전, 계정 상태) | 판정 모델이 자기 지식으로 채점해 조건에 따라 정답이 바뀌는 질문을 오판한다 |
| 루브릭과 점수별 정의 | 같은 점수의 뜻이 실행마다 달라진다 |
| 참조 답 (선택) | 계산과 추론 문항에서 판정기가 제시된 답의 실수를 따라간다 |

- 다중 턴은 턴을 나눠 넣기보다 대화 전체를 한 프롬프트에 보여 주고 판정할 턴을 지정하는 편이 이전 답을 잘못 짚는 문제를 줄인다.
- 근거 대비 판정(faithfulness)은 답의 주장이 그때 준 컨텍스트로 지지되는지를 보는 것이라 컨텍스트 없이는 성립하지 않는다.
- 판정 모델이 혼자서는 풀 수 있는 계산 문제도 제시된 답을 보면 같은 실수를 할 수 있다. 수학 10문항을 답 순서를 바꿔 20회 판정한 2023년 실험에서, 같은 프롬프트 안에서 먼저 풀고 채점하게 하는 사고 과정(CoT) 판정으로는 오판이 70%에서 30%로만 줄었고, 판정기가 별도 호출로 먼저 푼 답을 참조로 넣자 15%로 줄었다.

출력은 JSON 같은 정해진 형식으로 받고, 이유를 먼저 쓴 뒤 점수나 라벨을 쓰게 한다. OpenAI 평가 가이드는 점수 전에 추론하게 하면 판정 성능이 오른다고 권고한다. G-Eval은 다른 방식으로, 평가 기준에서 평가 단계를 먼저 한 번 생성한 뒤(CoT) 그 단계를 넣은 양식 채우기 프롬프트로 답마다 점수만 받고 점수 토큰 확률로 가중 평균한다. 지지되지 않는 주장, 빠진 요구, 어긴 지시를 목록으로 함께 받으면 낮은 점수의 원인을 바로 추적할 수 있다. 결과는 판정기 버전과 함께 회차마다 저장해 비교한다.

## 판정 방식 넷

| 방식 | 판정기가 하는 일 | 강점 | 약점 |
|---|---|---|---|
| 단일 점수 (pointwise) | 답 하나에 척도 점수를 매긴다 | 답 수에 비례해 확장되고 추이를 숫자로 남긴다 | 미세한 차이를 가르기 어렵고, 판정 모델이 바뀌면 절대 점수가 쌍대 비교보다 더 흔들리기 쉽다 |
| 통과와 실패 | 기준 충족 여부만 답한다 | 판정이 비교적 안정적이고 게이트에 바로 쓴다 | 합격선 안쪽에서 서서히 나빠지는 변화가 안 보인다 |
| 쌍대 비교 (pairwise) | 두 답 중 나은 쪽이나 무승부를 고른다 | 신구 버전 비교에 맞는다 | 비교할 쌍이 후보 수의 제곱으로 늘고 위치 편향을 탄다 |
| 오류 식별 | 지지되지 않는 주장, 빠진 요구, 어긴 지시를 나열한다 | 고칠 곳이 바로 나온다 | 주장 분해와 지지 판정이 모두 모델에 의존한다 |

- 단일 점수는 점수마다 무엇을 뜻하는지 루브릭에 적어 둔다.
- OpenAI 평가 가이드는 쌍대 비교나 통과와 실패를 더 안정적인 방식으로 권한다. 통과와 실패만 남기면 정도를 모르는 구멍([[Evaluation-Driven-Development]])이 생기므로, 게이트는 통과와 실패로 막고 추이와 원인은 점수와 오류 목록으로 함께 남긴다.
- 오류 식별을 점수로 바꾸려면 집계 규칙이 필요하다. RAGAS의 faithfulness는 답을 짧은 주장들로 쪼개 각 주장이 컨텍스트에서 추론되는지 판정한 뒤, 지지된 주장 수를 전체 주장 수로 나눈다.

## 알려진 편향과 완화

| 편향 | 증상 | 완화 |
|---|---|---|
| 위치 편향 | 두 답의 순서만 바꿔도 판정이 뒤집힌다 | 순서를 바꿔 두 번 판정해 양쪽에서 모두 이긴 답만 승리로 세고, 엇갈리면 무승부로 둔다 |
| 장황함 편향 | 더 명확하거나 정확하지 않아도 긴 답을 선호한다 | 비교하는 답의 길이 차이를 통제하고, 새 정보 없이 길이만 늘린 답으로 판정기를 시험한다 |
| 자기 선호 | 판정 모델이 자기가 생성한 답에 점수를 더 준다 | 생성 모델과 다른 판정 모델을 쓴다 |
| 추론 판정 한계 | 스스로 풀 수 있는 문제도 제시된 답을 따라 오판한다 | 제시된 답을 보지 않는 별도 호출로 판정기가 먼저 푼 답이나 사람이 만든 참조 답을 넣는다 |

2023년 MT-bench 실험(GPT-4, GPT-3.5, Claude-v1)에서 같은 모델로 두 번 생성한 비슷한 두 답의 순서를 바꿨을 때 판정이 일관된 비율은 GPT-4 65.0%, GPT-3.5 46.2%, Claude-v1 23.8%였다. 목록을 새 정보 없이 바꿔 써서 앞에 덧붙인 답을 원래 답보다 낫다고 판정한 비율은 GPT-3.5와 Claude-v1이 91.3%, GPT-4가 8.7%였다. 판정 모델에 따라 편향 크기가 크게 다르고, OpenAI 평가 가이드도 가능하면 가장 강한 모델로 판정하라고 권한다. 자기 선호는 이 실험에서는 데이터가 적어 결론을 내지 못했다. 2024년 연구(뉴스 요약 과제, GPT-4, GPT-3.5, Llama 2)는 판정 모델이 다른 모델이나 사람이 쓴 요약보다 자기 요약을 더 높게 평가하는 경향을 보고했고, 미세조정으로 자기 출력을 알아보는 능력을 바꾸자 자기 선호의 강도가 그 능력과 선형 상관했다. 이 연구는 사람 평가로 생성 품질을 통제하지 않았다는 한계를 스스로 밝힌다. Anthropic의 평가 예시 코드도 생성 모델과 다른 모델로 판정하는 것을 일반적인 모범 사례로 적는다.

수치는 당시 모델의 값이므로 현재 판정기에 옮기지 않고, 같은 점검을 자기 판정기에 다시 돌려 본다. few-shot 예시는 GPT-4의 순서 교체 일관성을 65.0%에서 77.5%로 올렸지만, 일관성이 정확성을 뜻하지는 않고 예시가 새 편향을 들일 수 있으며 프롬프트가 길어져 호출 비용이 4배가 됐다.

## 사람 라벨로 판정기를 교정한다

판정기를 넓게 쓰기 전에 대표 표본(예: 답변 100건)을 사람이 통과와 실패로 라벨링하고, 같은 표본을 판정기에 돌려 일치도를 잰다. 사람과 꾸준히 일치하는 항목부터 판정기에 맡기고, 판정 프롬프트는 이 라벨 묶음을 판정기 전용 평가 세트로 삼아 고친다. 판정기도 평가 대상이다.

단순 일치율에는 우연한 일치가 섞인다. Cohen's kappa는 관측 일치율 `p_o`에서 두 평가자의 라벨 분포로 기대되는 우연 일치 `p_e`를 빼고, 우연을 넘어 가능한 최대 일치로 나눈 값이다.

`kappa = (p_o - p_e) / (1 - p_e)`

사람 라벨의 90%가 통과인 표본에서 모든 답을 통과로 판정하는 판정기는 일치율이 90%지만 `p_e`도 0.9라 kappa는 0이다. 실패가 드문 운영 데이터일수록 일치율이 판정기를 과대평가한다. scikit-learn 문서는 0.8을 넘으면 대체로 좋은 일치로, 0 이하는 사실상 무작위 라벨로 본다.

- kappa는 두 평가자를 대등하게 비교하는 지표다. scikit-learn 문서도 kappa가 서로 다른 사람 평가자의 라벨을 비교하려는 지표이지 분류기와 정답을 비교하는 지표가 아니라고 밝힌다. 사람 라벨을 정답으로 놓고 판정기가 놓친 실패를 세려면 실패 판정의 재현율을 따로 본다. 평가자가 셋 이상이면 Cohen's kappa를 그대로 쓰지 않고, 1에서 5 같은 순서 척도라면 `weights`에 linear나 quadratic을 주는 가중 kappa를 검토한다.
- 사람끼리의 일치도도 잰다. 두 사람이 자주 엇갈리면 판정기보다 루브릭이 모호하거나 과제가 본래 주관적이라는 신호다. 2023년 MT-bench 실험에서 무승부를 뺀 일치율은 사람끼리 81%, GPT-4와 사람 사이 85%였다.
- 같은 실험에서 GPT-4와 사람의 일치율은 비교한 두 모델의 실력 차가 클수록 70%에서 100% 가까이로 올랐다. 차이가 근소한 회귀일수록 판정기만으로 결론 내리지 않고 표본을 늘리거나 사람이 확인한다.

## 판정기도 바뀌고 닳는다

판정 모델, 판정 프롬프트, 루브릭과 척도를 묶어 판정기 버전으로 기록하고 점수와 함께 남긴다. 이 중 하나만 바뀌어도 같은 답의 점수가 달라질 수 있고, 판정 모델을 바꾸면 절대 점수가 쌍대 비교 결과보다 더 흔들리기 쉽다. 판정기를 바꾸면 사람 라벨 교정 세트로 일치도를 다시 재고, 기준 버전의 출력을 새 판정기로 다시 채점해 베이스라인을 새로 잡는다. 판정기 버전이 다른 회차의 점수는 직접 비교하지 않는다.

- 판정 모델 교체는 예정된 일이다. Anthropic 문서 기준(2026-10-06 확인)으로 Claude 모델 ID는 고정 스냅샷이지만 모델마다 은퇴 일정(Anthropic이 운영하는 플랫폼에서 이 날짜 이전에는 은퇴하지 않는다는 약속이며, Amazon Bedrock과 Google Cloud는 자체 일정을 둔다)이 공시된다. 스냅샷 고정은 교체 시점을 고르게 해 줄 뿐 교체를 없애지 않는다.
- 운영 중에도 판정 결과 일부를 주기적으로 사람이 다시 라벨링해 일치도가 유지되는지 감사한다. 새 요청 유형이 늘거나 루브릭이 바뀌면 교정 세트도 갱신한다.
- 판정 점수를 학습 보상으로 쓰면 학습 중인 모델이 판정기의 약점을 파고드는 grader hacking이 생길 수 있고, 이때는 판정기 점수가 높은데 전문가 평가는 낮게 나온다. 판정기 점수만 오르고 사람 평가가 따라오지 않으면 판정기부터 의심한다. 채점기를 속이는 동기와 채점 무결성은 [[Agent-Swarm-Containment]]을 본다.

## 면접 체크포인트

- BLEU, ROUGE, 임베딩 유사도가 정답 여부를 대신하지 못하는 이유
- 판정기에 그때의 컨텍스트와 참조 답을 넣는 이유, 이유를 점수보다 먼저 쓰게 하는 이유
- 단일 점수, 통과와 실패, 쌍대 비교, 오류 식별을 각각 어디에 쓰는가
- 위치, 장황함, 자기 선호 편향의 증상과 완화
- 일치율 대신 kappa를 보는 이유와 판정기를 바꿀 때 다시 교정하는 이유

## 출처

- [Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena — arXiv, Lianmin Zheng 외](https://arxiv.org/abs/2306.05685)
- [G-Eval: NLG Evaluation using GPT-4 with Better Human Alignment — arXiv, Yang Liu 외](https://arxiv.org/abs/2303.16634)
- [LLM Evaluators Recognize and Favor Their Own Generations — arXiv, Arjun Panickssery 외](https://arxiv.org/abs/2404.13076)
- [Ragas: Automated Evaluation of Retrieval Augmented Generation — arXiv, Shahul Es 외](https://arxiv.org/abs/2309.15217)
- [Bleu: a Method for Automatic Evaluation of Machine Translation — ACL Anthology, Kishore Papineni 외](https://aclanthology.org/P02-1040/)
- [ROUGE: A Package for Automatic Evaluation of Summaries — ACL Anthology, Chin-Yew Lin](https://aclanthology.org/W04-1013/)
- [OpenAI, Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
- [OpenAI, Graders](https://developers.openai.com/api/docs/guides/graders)
- [Anthropic, Define success criteria and build evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)
- [Anthropic, Models overview](https://platform.claude.com/docs/en/about-claude/models/overview)
- [scikit-learn, cohen_kappa_score](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.cohen_kappa_score.html)
- [scikit-learn, User Guide: Cohen's kappa](https://scikit-learn.org/stable/modules/model_evaluation.html#cohen-s-kappa)

## 관련 문서

- [[Eval-Rubric-and-Score-Gate|루브릭과 점수 게이트 (채점기 3종, 3층 게이트, 점수 의심 순서)]]
- [[Eval-Golden-Set-and-Deploy-Gates|골든셋과 배포 관문 (판정에 쓸 문항, 베이스라인과 표류)]]
- [[Evaluation-Driven-Development|평가 주도 개발 (검증 서브에이전트에서 LLM-as-Judge로의 승격)]]
- [[LLM-Eval-Strategy|LLM 평가 전략 (좋은 답변의 정의, 평가 프레임워크에 대한 입장)]]
- [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링 (faithfulness와 층별 평가)]]
- [[LLM-Abstention|LLM Abstention (근거 충분성 이중 검증)]]
- [[AI-Slop-Quality-Gate|AI 슬롭 품질 게이트 (코드 판정에서 절대 점수와 쌍대 비교의 불안정)]]
- [[Agent-Swarm-Containment|에이전트 군집 격리 (채점 무결성과 채점기를 속이는 동기)]]
- [[LLM-Decision-Models|결정 모델 (선택지별 확률로 분류와 판정을 받는 모델)]]
