---
tags: [ai, agent, llm, architecture, history, cognitive-architecture]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["AI Agent Anatomy and Lineage", "AI 에이전트의 정의와 계보", "AI 에이전트란", "LLM 에이전트의 구성 요소", "What Is an AI Agent"]
---

# AI 에이전트의 정의, 계보와 구성 요소

에이전트는 스스로 판단해 환경에 행동하고, 그 결과를 다시 받아 다음 판단에 쓰는 시스템이다. 이 생각은 1970년대 분산 AI에서 시작해 강화학습을 거쳐 LLM 에이전트로 이어졌다. LLM 에이전트에서 달라진 점은 판단을 사전학습된 언어 모델이 맡아, 과제마다 따로 학습하지 않고 지시와 예시만으로 여러 과제에 투입된다는 것이다. 이 문서는 정의, 계보, 구성 요소와 구성 요소별 실패 지점을 다룬다. 구현 계층(모델, 오케스트레이션, 도구)은 [[Agent-From-Scratch|에이전트 직접 만들기]]에서, 워크플로우와 에이전트의 선택은 [[LLM-Workflow-Patterns-Chain-vs-Agent|체인과 에이전트]]에서 다룬다.

## 정의는 하나로 합의되지 않았다

1995년의 에이전트 서베이도 에이전트가 무엇인지에 대해 보편적으로 받아들여진 정의가 없다고 적었다. 자주 쓰는 정의는 강조점이 다르다.

| 정의 | 핵심 | 출처 |
|---|---|---|
| 약한 에이전트 개념 | 자율성(사람의 직접 개입 없이 자기 행동과 내부 상태를 통제), 사회성(다른 에이전트나 사람과 소통), 반응성(환경을 지각하고 변화에 제때 대응), 능동성(반응에 그치지 않고 목표를 향해 먼저 움직임) | Wooldridge와 Jennings(1995) |
| 지각과 행동 | 센서로 환경을 지각하고 액추에이터로 환경에 작용하는 모든 것 | Russell과 Norvig 교재 2장 |
| LLM 기반 에이전트 | LLM이 두뇌 역할을 하고 계획, 기억과 도구 사용이 이를 보완하는 시스템 | Weng(2023) |

정의를 고르기보다 시스템이 어디까지 스스로 정하는지를 보는 편이 실무에 쓸모 있다. 다음 단계를 코드가 정하면 워크플로우, 모델이 실행 중에 고르면 에이전트로 나누며, 둘 다 모델과 검색기, 도구를 묶은 compound AI system이다([[LLM-Workflow-Patterns-Chain-vs-Agent#워크플로우도 compound AI system이다|워크플로우도 compound AI system이다]]).

## 계보

| 시기 | 개념 | 더해진 것 |
|---|---|---|
| 1973 | 액터 모델(Hewitt 외) | 액터를 신호에 따라 대본대로 역할을 수행하는 능동적 에이전트로 보고, 모든 행동을 액터에게 메시지를 보내는 한 가지 행동으로 정의했다([[Concurrency-vs-Parallelism\|동시성 모델의 액터]]) |
| 1980 | Contract Net Protocol(Smith) | 관리자가 작업을 공고하고 수행자가 입찰하면 관리자가 입찰을 평가해 계약을 맡기는 협상으로 작업을 나눈다. 관리자와 수행자 역할은 미리 정하지 않는다 |
| 1986 | 마음의 사회(Minsky) | 혼자서는 단순한 일만 하는 많은 에이전트의 조합으로 마음을 설명했다. 2023년의 멀티 에이전트 토론 연구는 자기 방식을 society of minds 접근이라 불렀다 |
| 1990년대 | 약한 에이전트 개념, 지각과 행동 정의 | 위 표의 네 속성과 환경 루프 |
| 2015 전후 | 심층 강화학습 | 행동, 관측과 보상의 루프에서 행동 방식을 학습한다([[Reinforcement-Learning-from-Experience\|경험 기반 강화학습]]). DQN(2015)은 화면 픽셀과 점수만 받고 같은 알고리즘, 신경망 구조와 하이퍼파라미터로 49개 Atari 게임에서 전문 게임 테스터에 견줄 성능을 냈다 |
| 2020~2022 | 문맥 내 학습, 단계별 추론, 도구 사용 | GPT-3 논문은 가중치를 갱신하지 않고 지시와 예시만 바꿔 과제를 푸는 zero-shot과 few-shot 설정을 규모별로 비교했다([[OpenAI-GPT-Generations#흔한 오독\|GPT 세대의 흔한 오독]]). CoT는 중간 추론을, WebGPT(2021)는 웹 검색과 근거 수집을, MRKL(2022)은 계산기나 외부 API 같은 전문 모듈로의 위임을 더했다 |
| 2022 | ReAct | 추론과 행동을 한 루프에 번갈아 두고, 행동의 관찰로 다음 추론을 고친다 |
| 2023 | AutoGPT, BabyAGI | GPT-4 기술 보고서(2023-03-15) 직후 공개됐다. AutoGPT는 GPT-4가 인터넷 검색, 장단기 기억과 파일 저장을 쓰며 사람의 다음 지시 없이 진행하는 실험이었고, BabyAGI는 목표와 이전 작업 결과로 새 작업을 만들고 우선순위를 다시 정해 실행하는 작업 관리 루프였다. AutoGPT의 초기 README는 완성된 제품이 아닌 실험이며 복잡한 실제 업무에서는 잘 동작하지 않을 수 있고 실행 비용이 크다고 밝혔다 |

## 구성 요소

| 구성 요소 | 하는 일 | 자세히 |
|---|---|---|
| LLM 코어 | 관찰과 기억을 입력으로 받아 다음 행동을 판단한다. 같은 루프라도 기반 모델의 능력에 따라 결과가 크게 달라진다 | [[OpenAI-GPT-Generations\|GPT 세대별 변화]] |
| 계획과 추론 | 큰 과제를 하위 목표로 나누고, 관찰을 해석하고, 지난 시도를 돌아본다 | [[Agent-Loop-Engineering#ReAct는 사실 환각을 줄이고 반복 루프를 남긴다\|ReAct의 오류 양상]], [[Agent-Loop-Engineering#실패를 글로 남겨 다음 시도에 쓰는 Reflexion\|Reflexion]], [[Self-Consistency-Voting#서로의 답을 읽고 고치는 멀티 에이전트 토론\|멀티 에이전트 토론]] |
| 기억 | 단계와 작업 사이에 상태를 잇는다 | [[Agent-Memory-Retain-Recall-Reflect\|에이전트 기억의 저장, 검색과 추론]] |
| 도구와 행동 | 검색, 계산, 코드 실행과 외부 API로 모델이 혼자 못 하는 일을 한다 | [[LLM-Workflow-Patterns-Function-Calling\|Function Calling]], [[MCP\|MCP]] |
| 환경과 관찰 | 행동의 결과가 관찰로 돌아와 다음 판단의 입력이 된다 | [[Agent-From-Scratch#1. 도구 호출 루프\|도구 호출 루프]] |

어휘는 연구마다 다르지만 같은 구조를 가리킨다. Weng(2023)은 계획(하위 목표 분해와 자기 성찰), 기억(단기와 장기), 도구 사용으로 나눴다. CoALA는 기억 모듈, 행동 공간과 의사결정 절차로 나누고, 행동 공간을 바깥 환경에 작용하는 외부 행동(grounding)과 기억에 접근하는 내부 행동으로 가른다. 내부 행동은 장기 기억을 읽는 검색(retrieval), LLM으로 작업 기억을 갱신하는 추론(reasoning), 장기 기억에 쓰는 학습(learning) 셋이다. 결정 주기마다 검색과 추론으로 계획을 세운 뒤 외부 행동이나 학습 중 하나를 실행한다. 기억 모듈의 구분은 [[Agent-Memory-Retain-Recall-Reflect#기억의 역할과 연산은 다른 분류다|기억의 역할과 연산]]에 있다.

이 분류에서 추론은 바깥 세계가 아니라 에이전트 자신의 상태를 바꾸는 내부 행동이다. 관찰에서 행동으로 바로 넘어가는 에이전트는 왜 그 행동을 골랐는지 읽기 어렵다. 추론 흔적을 남기면 행동 계획을 세우고 고치며 예외를 처리하는 과정을 사람이 따라갈 수 있고, ReAct 논문은 추론이 없는 방식보다 해석 가능성과 신뢰성이 나아졌다고 보고했다. 다만 그 흔적이 모델 내부 계산을 그대로 보여 준다고 보지는 않는다([[LLM-Hallucination-Verification#설명은 증거가 아니다|설명은 증거가 아니다]]).

## 문제를 찾을 때는 층을 나눈다

에이전트가 기대대로 동작하지 않으면 원인이 어느 층에 있는지부터 가른다.

- **시스템:** 구성 요소와 그 연결. 모델, 계획 방식, 기억 설계, 도구와 환경 중 무엇이 빠지거나 어긋났는가
- **데이터:** 학습 예시, 시연과 실행 때 넣은 맥락. 에이전트가 배우거나 참고한 자료가 과제에 맞는가
- **평가:** 과제와 지표. 지표를 잘못 고르면 약한 에이전트도 좋아 보이므로 평가 자체도 점검 대상이다

## 구성 요소별 실패 지점

| 구성 요소 | 대표 실패 | 근거와 대응 |
|---|---|---|
| LLM 코어 | 정확도가 올라도 실행마다 결과가 흔들린다 | [[LLM-Eval-Strategy#pass^k: k번 모두 성공할 가능성\|pass^k와 신뢰성의 네 차원]] |
| 계획과 추론 | 추론만 하면 사실을 지어내고, 행동을 섞으면 같은 행동을 되풀이하거나 쓸모없는 검색 결과에 끌려간다 | [[Agent-Loop-Engineering#ReAct는 사실 환각을 줄이고 반복 루프를 남긴다\|ReAct의 오류 양상]] |
| 기억 | 압축 요약이 행동 제약을 잃고, 반복 정리가 쓸모 있던 기억을 망가뜨린다 | [[LLM-Generation-Mechanics-Context-and-Agent#압축이 행동 제약을 지운 사례\|압축과 제약 손실]], [[Agent-Memory-Write-and-Consolidation-Failures\|기억의 쓰기와 정리 실패]] |
| 도구와 행동 | 없는 API를 지어내 부르거나 되돌릴 수 없는 행동을 실행한다 | [[LLM-Workflow-Patterns-Function-Calling#도구 사용을 학습시킨 방식의 계보\|도구 호출의 환각과 오류]], [[LLM-Workflow-Patterns-Chain-vs-Agent#되돌릴 수 없는 행동 직전 승인: 또 하나의 절충\|되돌릴 수 없는 행동 직전 승인]] |
| 환경과 관찰 | 화면의 팝업이나 페이지에 숨긴 지시를 따른다 | [[Agent-Browser-Task-Boundaries#화면의 팝업이 작업을 가로챈다\|팝업 공격]], [[Web-Content-Manipulation-for-AI\|숨은 AI 지시]] |
| 사용자와의 상호작용 | 모호한 요청을 묻지 않고 가정으로 진행하고, 맥락에 맞지 않는 개인정보를 드러내고, 듣기 좋은 평가를 한다 | [[Agent-Coding-Guardrails#1. Think Before Coding — 가정을 표면화\|가정의 표면화]], 아래 개인정보 항목, [[LLM-Sycophancy-Evaluation\|아첨 평가]] |
| 목표와 보상 | 검사 대상을 고쳐 통과하거나 샌드박스 밖으로 나간다 | [[Eval-Rubric-and-Score-Gate\|루브릭과 점수 게이트]], [[Agent-Swarm-Containment\|에이전트 군집 격리]] |
| 여러 에이전트 | 조정 비용이 늘고 오류가 증폭된다 | [[Multi-Agent-Coordination-Cost\|멀티 에이전트의 조정 비용]] |

**행동 단계의 개인정보:** 개인정보 규범을 묻는 문항에 맞게 답하는 능력과 실제 작업 중의 행동은 다르다. PrivacyLens(NeurIPS 2024 Datasets and Benchmarks)는 이메일이나 게시물을 쓰는 에이전트 궤적에서, 개인정보 보호를 강조하는 지시를 받은 GPT-4와 Llama-3-70B가 각각 25.68%와 38.69%의 사례에서 민감한 정보를 유출했다고 보고했다. 규범 문항의 정답률로 행동 단계의 유출을 추정하지 않고 실제 작업 궤적에서 따로 잰다(적용 제안). 출력 전 검사의 일반 원칙은 [[LLM-Application-Security#LLM02 민감 정보 유출|민감 정보 유출]]에 있다.

## 체크포인트

- 약한 에이전트 개념의 네 속성이 LLM 에이전트에서 각각 무엇으로 구현되는가
- 환경의 보상으로 행동 방식을 학습한 강화학습 에이전트와 지시와 예시로 과제를 바꾸는 LLM 에이전트의 차이
- CoALA에서 추론이 내부 행동으로 분류되는 이유와 외부 행동(grounding)과의 구분
- 실패 원인을 시스템, 데이터, 평가 층으로 나눠 찾는 순서
- 구성 요소별 대표 실패와 대응 문서

## 출처

- [A Universal Modular ACTOR Formalism for Artificial Intelligence — IJCAI 1973, Carl Hewitt, Peter Bishop, Richard Steiger](https://www.ijcai.org/Proceedings/73/Papers/027B.pdf) — 2026-11-18 액터의 정의와 메시지 전송으로 정의한 행동 대조
- [The Contract Net Protocol: High-Level Communication and Control in a Distributed Problem Solver — IEEE Transactions on Computers, Reid G. Smith](https://www.reidgsmith.com/The_Contract_Net_Protocol_Dec-1980.pdf) — 1980-12. 2026-11-18 공고, 입찰과 계약의 협상, 미리 정하지 않는 역할 대조
- [The Society of Mind — Simon & Schuster, Marvin Minsky](https://en.wikipedia.org/wiki/Society_of_Mind) — 1986. 책 소개와 서문 발췌로 단순한 에이전트의 조합이라는 핵심 개념만 확인
- [Intelligent Agents: Theory and Practice — Knowledge Engineering Review, Michael Wooldridge, Nick Jennings](https://www.cs.ox.ac.uk/people/michael.wooldridge/pubs/ker95/ker95-html.html) — 1995. 2026-11-18 약한 에이전트 개념의 네 속성과 정의 합의의 부재 대조
- [Artificial Intelligence: A Modern Approach — Pearson, Stuart Russell, Peter Norvig](https://aima.cs.berkeley.edu/) — 2장의 에이전트 정의. 교재 원문이 아니라 강의 자료의 재수록본으로 문구를 확인했다
- [Human-level control through deep reinforcement learning — Nature, Volodymyr Mnih 외](https://www.nature.com/articles/nature14236) — 2015. 초록의 입력, 49개 게임과 같은 알고리즘, 구조, 하이퍼파라미터 대조
- [WebGPT: Browser-assisted question-answering with human feedback — arXiv, Reiichiro Nakano 외](https://arxiv.org/abs/2112.09332) — 초록의 웹 탐색 환경과 근거 수집 대조
- [MRKL Systems: A modular, neuro-symbolic architecture that combines large language models, external knowledge sources and discrete reasoning — arXiv, Ehud Karpas 외](https://arxiv.org/abs/2205.00445) — 라우터와 전문 모듈 구성 대조
- [ReAct: Synergizing Reasoning and Acting in Language Models — ICLR 2023, Shunyu Yao 외](https://arxiv.org/abs/2210.03629) — 초록의 해석 가능성과 신뢰성 보고 대조
- [LLM Powered Autonomous Agents — Lil'Log, Lilian Weng](https://lilianweng.github.io/posts/2023-06-23-agent/) — 2023-06-23. 두뇌로서의 LLM과 계획, 기억, 도구 사용의 구성 대조
- [Cognitive Architectures for Language Agents — TMLR, Theodore R. Sumers 외](https://arxiv.org/abs/2309.02427) — v3. 4절 행동 공간의 내부와 외부 구분, 결정 주기 대조
- [GPT-4 Technical Report — arXiv, OpenAI](https://arxiv.org/abs/2303.08774) — v1 2023-03-15 제출일 확인
- [AutoGPT — GitHub, Significant-Gravitas](https://github.com/Significant-Gravitas/AutoGPT) — 저장소 생성 2023-03-16(GitHub API). 2023-04-02 커밋의 README에서 기능과 한계 확인
- [babyagi_archive — GitHub, yoheinakajima](https://github.com/yoheinakajima/babyagi_archive) — 원래 BabyAGI의 README. 작업 생성, 우선순위 재조정, 실행 루프와 연속 실행 비용 경고 확인
- [PrivacyLens: Evaluating Privacy Norm Awareness of Language Models in Action — NeurIPS 2024 Datasets and Benchmarks, Yijia Shao 외](https://arxiv.org/abs/2409.00138) — 초록의 유출 비율과 규범 문항 대비 행동의 차이 대조
- [YouTube, Stanford CS329Z Engineering AI Agents, Lecture 1 What Are AI Agents? Agentic Systems Explained](https://www.youtube.com/watch?v=DGI4vucR71w) — 2026-09-23 녹화, 2026-11-09 공개. 계보, 구성 요소, 문제를 층으로 나누는 방법과 핵심 과제의 정리 계기. 인용된 연구는 위 1차 출처로 대조했다

## 관련 문서

- [[Agent-From-Scratch|에이전트 직접 만들기]] — 구현 계층과 도구 호출 루프
- [[LLM-Workflow-Patterns-Chain-vs-Agent|체인과 에이전트, 그리고 절충]]
- [[Agent-Loop-Engineering|루프 엔지니어링]] — ReAct와 Reflexion, 정지 조건
- [[Self-Consistency-Voting|자기 일관성과 샘플 투표]] — 멀티 에이전트 토론
- [[Agent-Memory-Retain-Recall-Reflect|에이전트 기억의 저장, 검색과 추론]]
- [[LLM-Workflow-Patterns-Function-Calling|Function Calling과 스킬 시스템]] — 도구 사용을 학습시킨 방식의 계보
- [[Harness-Anatomy|하네스 구성도]]
- [[Software-3-0|Software 3.0]]
- [[Reinforcement-Learning-from-Experience|경험 기반 강화학습]]
- [[Multi-Agent-Coordination-Cost|멀티 에이전트의 조정 비용과 증설 판단]]
