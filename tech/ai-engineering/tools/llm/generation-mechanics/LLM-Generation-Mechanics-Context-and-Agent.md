---
tags: [ai, llm, inference, rag, agent]
status: done
verified_at: 2026-08-22
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Generation Mechanics Context and Agent", "LLM Context와 환각", "LLM 에이전트 전환 지점"]
---

# LLM 동작 원리: Context, 환각과 에이전트

모델 밖의 정보가 어떻게 응답에 들어오고 어디서 환각이 생기며 언제 모델이 에이전트가 되는지를 다룬다. Weight, Context, RAG, Memory의 구분과 자주 헷갈리는 점까지다. 상위: [[LLM-Generation-Mechanics|LLM 동작 원리]].

## Weight, Context, RAG와 Memory는 다르다

| 층 | 담는 것 | 언제 바뀌는가 |
|---|---|---|
| **Weight** | 학습된 통계적 패턴과 연관 | Training이나 별도 model update |
| **Context** | 이번 요청의 지침, 대화와 읽어 온 자료 | 추론 호출마다 조립 |
| **RAG와 Tool Result** | 외부 저장소와 시스템에서 가져온 현재 근거 | 조회 후 Context에 추가 |
| **Memory** | Host가 이후 호출에 다시 제공하도록 보존한 정보 | 제품과 설정의 저장, 선택 정책에 따라 다름 |

모델 내부의 Token Embedding은 Token ID를 Transformer 공간에 넣는 표현이다. 검색용 Embedding은 query와 문서 chunk를 유사도 공간에 놓고 외부 자료를 찾는 표현이다. 둘 다 벡터지만 학습 목적, pooling, 공간과 소비자 계약을 확인하지 않고 직접 대체할 수 없다.

## 왜 환각하는가

다음 Token loss는 학습 분포에 맞는 연속을 보상하지, 생성한 claim의 출처와 사실성을 직접 검증하지 않는다. 다음 조건이 함께 오류를 만든다.

- 학습 데이터가 부정확하거나 오래되고 서로 충돌한다.
- 질문이 애매하거나 Context에 필요한 근거가 없다.
- Weight가 패턴을 일반화하는 과정에서 존재하지 않는 세부를 그럴듯하게 조합한다.
- Retrieval, context packing, Tool Result와 인용 연결이 실패한다.
- Decoding이 낮은 확률 후보를 선택한다. 다만 Greedy도 사실 검증기는 아니다.

RAG, 구조화 Tool 조회, 출처 추적, 결정론적 validator, Eval과 Abstention은 위험을 줄이는 시스템 장치다. RAG도 검색 결과를 Context에 넣을 뿐 Weight를 바꾸지 않으며, 검색 점수가 근거의 진실성을 보장하지 않는다.

## 모델이 에이전트가 되는 지점

```text
Model
├─ Final Answer
└─ Tool Call → Runtime → Tool Result → Context → Model
```

Tool Call은 모델이 생성한 구조화 출력이다. Runtime이 권한을 확인하고 파일, 셸과 외부 API에서 실제 행동을 수행한다. 한 턴에는 도구 호출이 없거나 하나 또는 여러 개일 수 있다.

검증은 기본 LLM이 내장한 성공 보장이 아니다. 지침, 테스트, 출처 확인과 하네스가 별도 정책으로 요구해야 한다. 에이전트 루프는 정상 답변 외에도 오류, 승인 거절, 호출 한도, 예산 상한과 진전 없음으로 끝날 수 있다.

## 자주 헷갈리는 점

- 파일을 읽었다고 모델이 즉시 재학습한 것은 아니다. 고정 가중치 추론에서는 Context만 달라진다.
- Attention은 외부 검색이나 사실 조회가 아니라 현재 sequence 표현을 섞는 내부 계산이다.
- Context Window는 Weight나 장기 Memory와 같지 않다.
- 유창한 문장, 긴 reasoning과 높은 모델 점수는 검증된 사실의 증거가 아니다.
- RAG와 Tool Calling은 모델의 지식을 늘리는 학습이 아니라 외부 근거와 행동 수단을 연결한다.

## 이해 점검

1. 문서를 읽은 직후 달라지는 것은 Weight인가, Context인가?
2. Token Embedding과 검색용 Embedding은 각각 누가 무엇을 위해 사용하는가?

## 출처

- [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks — Lewis et al.](https://arxiv.org/abs/2005.11401)
- [Function Calling — OpenAI API](https://developers.openai.com/api/docs/guides/function-calling)

## 관련 문서

- [[LLM-Generation-Mechanics|LLM 동작 원리 (묶음 인덱스)]]
- [[LLM-Generation-Mechanics-Training|학습과 사전학습 이후 조정]]
- [[LLM-Generation-Mechanics-Decoding|추론과 디코딩]]
- [[Codex-Agent-Execution-Model|Codex 에이전트 실행 원리]]
- [[Context-Engineering|컨텍스트 엔지니어링]]
- [[Vector-Similarity-Search|벡터 유사도 검색]]
- [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링]]
- [[LLM-Workflow-Patterns|LLM 워크플로우 패턴]]
- [[LLM-Abstention|LLM 응답 보류와 캘리브레이션]]
- [[LLM-Eval-Strategy|LLM 평가 전략]]
