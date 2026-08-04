---
tags: [senior, ai, agent, code-search, code-intelligence, embeddings, lsp, knowledge-graph, mcp]
status: done
verified_at: 2026-08-04
category: "Senior - AI 엔지니어링"
aliases: ["Agent Code Search", "에이전트 코드 검색", "Semantic Code Search", "Code Intelligence", "Semble", "Serena", "Graphify"]
---

# 에이전트 코드 인텔리전스 — 문자열, 의미, 심볼, 그래프의 역할 분리

코딩 에이전트의 탐색은 하나의 검색기로 끝나지 않는다. 정확 문자열 검색, 의미 기반 후보 발견, 현재 심볼과 참조 확인, 저장소 전체의 구조 경로는 서로 다른 질문이다. 각 도구를 증거 수준에 맞게 조합해야 컨텍스트를 줄이면서도 누락과 잘못된 수정을 막을 수 있다.

이는 [[Tool-Output-Filtering|도구 출력 필터링]]과 [[Agent-Context-Budget|컨텍스트 예산]]의 코드 탐색 버전이다. 목표는 무조건 적게 읽는 것이 아니라 **필요한 근거를 가장 작은 단위로 읽고, 정확성에 필요한 전수 확인을 남기는 것**이다.

## 질문별 도구 선택

| 질문 | 우선 도구 | 강점 | 최종 증거로 쓰기 전 경계 |
|---|---|---|---|
| 이 문자열, route, 설정을 쓰는 모든 곳은 어디인가 | `rg` | 정확 값의 빠른 전수 검색 | 이름이 다른 같은 개념은 놓침 |
| 인증 흐름을 구현한 후보 코드는 어디인가 | Semble 같은 의미 검색 | 자연어 의도와 다른 명명의 후보 발견 | 순위 밖 누락 가능, 원문 확인 필요 |
| 이 심볼의 정의, 참조와 구현체는 무엇인가 | Serena 같은 심볼 도구 | LSP 또는 IDE index 기반의 구조적 탐색과 refactor | 언어 서버와 코드 구조의 한계를 가짐 |
| 이 모듈에서 결제까지 어떤 경로로 연결되는가 | Graphify 같은 코드 그래프 | call/import/inheritance 경로와 cluster 탐색 | snapshot freshness와 정적 분석 한계 |

정확 문자열과 모든 참조가 필요한 질문에는 처음부터 `rg`를 쓴다. 의미 검색과 그래프는 후보와 가설을 만들고, 심볼 도구와 원문, 호출부, 테스트가 이를 검증한다.

## 의미 검색 — 이름을 모를 때 후보를 좁힌다

Semble은 코드를 tree-sitter로 함수와 클래스 단위로 나누고, 정적 임베딩과 BM25 결과를 RRF로 합친 뒤 코드 시그널로 재정렬한다.

- 임베딩은 자연어 의도와 동의어를, BM25는 식별자와 API명의 정확 일치를 보완한다.
- 정의, 식별자 형태, 파일 응집도와 테스트 또는 legacy 경로 같은 시그널로 후보를 재정렬한다.
- 관련 snippet만 반환해 매칭 파일 전체를 컨텍스트에 넣는 비용을 줄인다.
- 첫 검색의 index와 이후 변경 감지를 운영해야 오래된 후보를 피할 수 있다.

공식 저장소의 자체 benchmark는 일반적인 grep + 파일 읽기보다 큰 토큰 절감과 낮은 지연을 보고하지만, 이는 특정 dataset과 측정 계약의 결과다. 도입 판단은 자기 저장소의 질의 set에서 Recall@K, 관련 snippet 비율, index 시간과 end-to-end 토큰을 다시 측정한다.

## 심볼 계층 — 현재 코드의 구조를 읽고 바꾼다

Serena는 기본적으로 언어 서버의 symbol index를 사용하고, 선택적 JetBrains backend에서는 IDE index 기능을 더 활용한다. 파일 전체 대신 symbol outline, 정의, 참조와 짧은 주변 문맥을 요청할 수 있고, 안정적인 symbol path를 대상으로 본문 교체, 앞뒤 삽입과 rename 같은 변경을 수행할 수 있다.

심볼 도구의 이득이 큰 경우:

- 같은 이름이 여러 scope에 있고 정확한 정의를 골라야 할 때
- cross-file 참조를 확인한 뒤 rename 또는 safe delete를 할 때
- 긴 파일에서 특정 class나 method body만 읽고 바꿀 때
- interface 구현과 호출자를 따라 영향 범위를 좁힐 때

반대로 한 줄 변경, config와 자유 텍스트, private symbol의 단순 수정은 `rg`와 patch가 더 직접적일 수 있다. 동적 언어의 약한 type 정보, 거대한 비모듈 함수와 언어 서버별 capability 차이도 고려한다. 파일 변경과 shell 도구를 노출할 수 있으므로 MCP 연결 자체를 sandbox로 오해하지 않는다.

## 그래프 계층 — 저장소 전체 관계를 지도화한다

Graphify는 tree-sitter AST에서 함수, class, import와 call 관계를 추출해 code knowledge graph를 만든다. code 구조는 로컬의 결정론적 pass로 뽑고, 문서와 이미지 같은 비코드 관계는 선택적 model pass로 보강할 수 있다.

- `query`, `path`, `explain`으로 전체 report 대신 필요한 subgraph만 읽는다.
- extracted edge와 inferred 또는 ambiguous edge의 증거 수준을 구분한다.
- community는 결합된 영역의 후보를, 연결 차수가 큰 node는 영향 조사 후보를 보여 준다.
- vector index가 아니라 typed edge를 따라 구조적 관계를 탐색한다.

높은 중심성은 business criticality나 설계 결함의 증명이 아니다. reflection, dependency injection의 runtime binding, generated code와 문자열 기반 dispatch는 정적 graph에서 누락되거나 부정확할 수 있다. graph는 snapshot이므로 큰 변경 뒤 update, watch 또는 hook으로 갱신한다.

## 조합 워크플로우

1. 요구사항을 exact, semantic, symbol, architecture 질문으로 나눈다.
2. 이름을 모르면 의미 검색으로 관련 파일과 심볼 후보를 좁힌다.
3. 구조 영향이 넓으면 graph의 scoped query와 path로 예상 경계를 만든다.
4. inferred와 ambiguous edge는 가설로 표시한다.
5. 심볼 도구로 현재 정의, 참조와 구현체를 다시 확인한다.
6. 정확 문자열, 설정, route와 모든 언급은 `rg`로 전수 확인한다.
7. symbol 중심 변경은 구조 도구로, 작은 text 변경은 patch로 수행한다.
8. diff, diagnostics, lint와 test를 통과시킨 뒤 graph와 의미 index를 갱신한다.

```text
후보 발견 -> 구조 경로 -> 현재 심볼 검증 -> 정확 참조 전수 확인
          -> 최소 변경 -> 정적 검사와 테스트 -> index 갱신
```

## 실패를 줄이는 검증 경계

| 위험 | 방어 |
|---|---|
| 의미 검색의 false negative | 정확 이름을 찾은 뒤 `rg`, caller와 test 전수 확인 |
| graph의 stale edge | commit 또는 큰 변경 뒤 갱신, diff와 현재 원문 대조 |
| 정적 분석이 runtime 연결을 놓침 | DI 설정, reflection, code generation과 integration test 확인 |
| symbol backend의 언어별 차이 | 실제 반환 capability를 확인하고 text 검색으로 보완 |
| 큰 tool output이 다시 context를 채움 | subgraph, symbol body와 결과 수를 제한 |
| 구조상 안전해 보이는 잘못된 변경 | compiler, typecheck, lint, test와 contract 검증 |

## 체크포인트

- 의미 검색은 candidate discovery이고 정확 검색은 exhaustive evidence라는 역할 구분
- 심볼 index와 code graph의 차이 (현재 symbol operation vs 저장소 관계 snapshot)
- extracted edge와 inferred edge를 같은 신뢰도로 다루면 안 되는 이유
- graph 중심성이 business criticality나 결함을 증명하지 않는 이유
- 수정 뒤 source 검증뿐 아니라 index freshness까지 복구해야 하는 이유

## 출처

- [Semble — Fast and Accurate Code Search for Agents](https://github.com/MinishLab/semble)
- [Serena — Coding Agent Toolkit](https://github.com/oraios/serena)
- [Serena 기능과 backend](https://oraios.github.io/serena/01-about/025_features.html)
- [Serena 도구 목록](https://oraios.github.io/serena/01-about/035_tools.html)
- [Serena 보안 경계](https://oraios.github.io/serena/02-usage/070_security.html)
- [Graphify 공식 저장소](https://github.com/Graphify-Labs/graphify)
- [Graphify와 Serena 조합 사례](https://blog.slpower.co.kr/ai/graphify-serena/)

## 관련 문서

- [[Tool-Output-Filtering|도구 출력 필터링]]
- [[Agent-Context-Budget|에이전트 컨텍스트 예산]]
- [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링]]
- [[MCP|MCP와 도구 신뢰 경계]]
- [[AI-Native-System|AI 네이티브 시스템의 검증 계층]]
