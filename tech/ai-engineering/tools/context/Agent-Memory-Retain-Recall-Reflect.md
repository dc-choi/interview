---
tags: [ai, agent-memory, retrieval, hindsight, provenance]
status: done
verified_at: 2026-10-06
category: "AI엔지니어링(AIEngineering)"
aliases: ["Agent Memory Retain Recall Reflect", "에이전트 기억의 저장 검색 추론"]
---

# 에이전트 기억의 저장, 검색과 추론

## 세 연산의 책임

장기 기억은 대화 이력을 저장하는 것 외에도 필요한 근거를 찾고, 근거에서 만든 해석을 구분하는 책임이 있다. Hindsight의 공개 설계는 이를 `retain`, `recall`, `reflect`로 나눈다. 아래 API 의미는 2026-10-06 확인한 공개 자료 기준이며 모든 메모리 제품의 공통 규격은 아니다.

| 연산 | 역할 | 반환 또는 보존 대상 |
|---|---|---|
| `retain` | 정보를 기억 계층에 수집한다 | 이후 조회할 기억 |
| `recall` | 질문과 관련된 기억을 검색한다 | 순위가 매겨진 사실 목록 |
| `reflect` | 검색한 기억을 바탕으로 추론한다 | 종합 답변과 선택적인 근거 참조 |

단순 사실 조회에 `reflect`를 쓰면 불필요한 생성 비용이 든다. 반대로 여러 사건을 종합해야 하는 질문에 `recall`만 쓰면 근거를 모은 뒤 해석하는 단계가 따로 필요하다. `reflect`는 `recall`을 대체하지 않고 내부 근거 조회에 활용한다.

## 사실과 믿음의 분리

Hindsight의 ACL 2026 공개 논문은 world, experience, observation, opinion이라는 네 논리적 기억망을 구분한다. 사실과 주관적 믿음을 같은 수준의 근거로 취급하지 않도록 나눈 설계다. 벡터 검색, 키워드 검색, 그래프 탐색과 시간 필터를 함께 사용하므로 기억 검색을 벡터 유사도 하나로 축소하지 않는다.

예를 들어 과거 회의의 결정과 그 결정을 바탕으로 생성한 추천은 서로 다른 자료다. 추천을 다시 저장하더라도 원래 결정의 직접 증거로 바꾸지 않는 것이 검토 기준이다. 최신성, 충돌과 원문 위치의 계약은 [[Agentic-Context-Platform|컨텍스트 플랫폼]]과 연결한다.

## 비용과 품질을 확인하는 방법

`recall`은 임베딩과 재순위화 기반 검색이고 `reflect`는 LLM을 포함한 추론 루프다. 따라서 같은 `budget`도 전자는 검색 깊이, 후자는 탐색 반복을 뜻한다. `max_tokens` 역시 전자는 반환 기억의 크기, 후자는 최종 답변 길이를 제한한다. 최종 답변 제한을 전체 검색 비용 상한으로 해석하면 안 된다.

다음은 적용 시 사용할 평가 질문이며 제품의 성능 보장은 아니다.

- 같은 사실 질문을 반복했을 때 원문과 시점이 맞는 근거를 찾는가?
- 과거 사실과 새 사실이 충돌할 때 근거를 남기고 구분하는가?
- 종합 답변의 인용이 실제 결론을 뒷받침하는가?
- 검색만 할 때와 종합할 때 지연, 호출 비용과 오류가 얼마나 달라지는가?

## 출처

- [Hindsight: Structured Agent Memory that Retains, Recalls, and Reflects — ACL Anthology](https://aclanthology.org/2026.acl-demo.27/)
- [recall vs reflect: Search Your Agent's Memory, or Ask It — Hindsight](https://hindsight.vectorize.io/blog/2026/07/24/recall-vs-reflect)

## 관련 문서

- [[Context-Engineering|컨텍스트 엔지니어링]]
- [[Agentic-Context-Platform|에이전트 컨텍스트 플랫폼]]
- [[AI-Workflow-Knowledge-Loop|AI 업무와 지식 환류]]
