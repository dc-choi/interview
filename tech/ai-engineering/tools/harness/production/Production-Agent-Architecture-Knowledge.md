---
tags: [ai, agent, architecture, knowledge-management]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["Production Agent Architecture Knowledge", "에이전트 Metric Registry와 지식 체계"]
---

# 프로덕션 에이전트 아키텍처: 지식 체계

같은 질문에 같은 답을 내도록 정의를 명시적으로 인코딩하는 Metric Registry, 조회 우선순위와 Auto Memory 비활성화를 다룬다. 상위: [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처]].

## 지식 체계: 정의의 명확성

같은 질문에 매번 다른 답이 나오는 원인은 보통 **정의 부재**다. 검증 가능한 지식을 명시적으로 인코딩한다.

### Metric Registry

핵심 지표를 YAML로 정의해 자연어 표현을 단일 산식으로 수렴시킨다.

```yaml
- id: gmv_total
  description: 총거래액 (Gross Merchandise Value)
  keywords: ["GMV", "거래", "총거래"]
  kind: sum
  expression: SUM(<payment_amount>)
  notes: 기본은 결제 거래액 기준. 취소분 반영 여부는 요청 맥락에 따라 분기.
```

- "거래 얼마야" = "GMV 뽑아줘" = "총거래액" → 모두 `gmv_total` 산식으로 수렴
- 정의 변경은 Registry 한 줄 수정 = 전사 일관성

### 조회 우선순위

1. **Metric Registry** (사람이 관리하는 핵심 지표 — 가장 강한 정의)
2. **DBT 메타데이터** (컬럼 단위 정의)
3. **직접 쿼리 탐색** (새 데이터 — 가장 약한 정의, 재확인 권장)

### Auto Memory 비활성화

LLM의 자동 메모리는 **무엇을 기억하고 있는지 불투명** → 회사 기준과 어긋난 답변이 누적된다. 명시적, 검증 가능한 지식만 정책으로 인정한다.

## 출처
- [Product Engineer | 하루 500건 분석 요청을 받아내는, 데이터 에이전트 — 일을 돕는 AI에서 일을 수행하는 AI로 — 마이리얼트립 Product](https://medium.com/myrealtrip-product/product-engineer-%ED%95%98%EB%A3%A8-500%EA%B1%B4-%EB%B6%84%EC%84%9D-%EC%9A%94%EC%B2%AD%EC%9D%84-%EB%B0%9B%EC%95%84%EB%82%B4%EB%8A%94-%EB%8D%B0%EC%9D%B4%ED%84%B0-%EC%97%90%EC%9D%B4%EC%A0%84%ED%8A%B8-%EC%9D%BC%EC%9D%84-%EB%8F%95%EB%8A%94-ai%EC%97%90%EC%84%9C-%EC%9D%BC%EC%9D%84-%EC%88%98%ED%96%89%ED%95%98%EB%8A%94-ai%EB%A1%9C-dde9b6a891c5)

## 관련 문서
- [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처 (묶음 인덱스)]]
- [[Production-Agent-Architecture-Orchestration|분업과 오케스트레이션]]
- [[Production-Agent-Architecture-Guardrails|다층 안전망과 루프 가드레일]]
- [[Production-Agent-Architecture-Eval-and-Operations|Eval, 운영 루프와 고가용성]]
- [[Production-Agent-Architecture-Delegation|Closure-loop 위임 경계와 자율권]]
- [[Production-Agent-Architecture-Cases-and-Interview|사례와 면접 포인트]]
- [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링 (구조화 조회, Progressive Disclosure 탐색)]]
