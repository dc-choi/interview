---
tags: [senior, ai, agent, context, platform, provenance]
status: done
category: "Senior - AI 엔지니어링"
aliases: ["Agentic Context Platform", "Context Provider", "컨텍스트 프로바이더", "에이전트 컨텍스트 플랫폼"]
---

# 에이전트 컨텍스트 플랫폼(Agentic Context Platform)

## 정의

조직의 문서, 대화, 코드와 운영 자산을 수집해 AI 에이전트가 근거 있는 업무 판단에 사용할 수 있는 컨텍스트로 공급하는 계층이다. 단순 검색 결과가 아니라 원문 위치, 변경 시점, 충돌과 불확실성까지 함께 제공해야 한다.

좋은 검색 결과와 신뢰할 수 있는 컨텍스트는 다르다. 검색 관련성이 높아도 오래됐거나, 비공식 복사본이거나, 다른 근거와 충돌할 수 있다. 따라서 플랫폼은 retrieval과 trust 판단을 분리한다.

## Context Engineering과의 경계

| 구분 | Context Engineering | Context Platform |
|---|---|---|
| 관점 | 현재 작업에 무엇을 넣을지 | 조직 지식을 어떻게 공급할지 |
| 범위 | 세션과 컨텍스트 윈도우 | 팀과 조직의 지식 기반 |
| 핵심 제약 | 토큰 예산, Context Rot | 출처, 최신성, 충돌, 누락 |
| 산출물 | 선택, 압축, 격리된 작업 컨텍스트 | 검증 가능한 컨텍스트 단위와 관계 |

플랫폼이 신뢰 가능한 후보 풀을 만들고, [[Context-Engineering]]이 현재 작업에 필요한 최소 근거를 선택한다.

## 품질을 한 점수로 합치지 않는다

| 축 | 확인할 질문 | 실패 예시 |
|---|---|---|
| Granularity | 질문에 맞는 의미 단위인가 | 문서 전체를 한 청크로 저장 |
| Faithfulness | 원문 의미와 위치를 보존했는가 | 요약에서 예외 조건 누락 |
| Staleness | 최신 변경을 반영했는가 | 폐기된 API 문서를 현행으로 제시 |
| Canonicality | 별칭과 동일 개념을 일관되게 통합했는가 | 같은 대상을 분리하거나 동명이인을 합침 |
| Consistency | 다른 근거와 충돌하는가 | 두 문서가 서로 다른 정책을 주장 |
| Coverage | 필요한 영역을 충분히 포함하는가 | 핵심 저장소가 수집 대상에서 빠짐 |

단일 quality score는 어떤 실패인지 숨긴다. 각 축을 별도 상태로 유지해야 검색, 답변 보류, 사람 검토 같은 후속 정책을 다르게 적용할 수 있다.

## 출처별 의미 단위

고정 토큰 길이만으로 자르면 출처의 구조와 판단 근거가 사라진다.

- 문서는 heading section을 기본 단위로 삼고 상위 제목 경로를 보존한다.
- 메신저는 개별 메시지보다 thread를 보존하고 질문, 선택지, 결정, 미해결 상태를 구분한다.
- 코드는 parser가 찾은 symbol을 원자 단위로 삼는다. 여러 symbol에 걸친 동작은 별도의 behavior card로 연결한다.
- 데이터와 API는 schema, owner, lineage, version 같은 운영 metadata를 원문과 함께 저장한다.

모든 단위는 최소한 다음 계약을 공유한다.

```yaml
id: stable-source-scoped-id
source_type: document | thread | code | schema
unit_type: section | conversation | symbol | behavior
source_uri: canonical-location
anchor: heading-or-line-span
content_hash: hash-of-source-content
source_updated_at: source-timestamp
observed_at: ingestion-timestamp
extraction_version: parser-or-prompt-version
metadata: source-specific-fields
```

요약이나 추출된 개념만 남기지 않는다. 항상 원문 anchor로 돌아갈 수 있어야 한다.

## 개념과 근거 관계

서로 다른 출처에서 같은 개념을 말하더라도 텍스트 유사도만으로 합치면 안 된다. 임베딩은 관계 후보를 넓게 찾는 데 사용하고, 후보 관계는 별도로 검증한다.

```text
source unit --mentions------> concept
claim -------supported_by---> evidence unit
claim -------contradicted_by-> evidence unit
```

관계에는 관계 유형, 양쪽 anchor, 검증 방식, confidence와 검증 시각을 붙인다. 검증 실패나 낮은 confidence는 관계 없음이 아니라 미확인 상태다. 근거가 부족하면 `insufficient_evidence`를 정상 결과로 반환한다.

## 변경 기반 검증 파이프라인

```text
source discovery
  -> source-aware extraction
  -> stable ID와 content hash 비교
  -> 변경 단위만 관계 후보 생성
  -> 결정론적 검사
  -> 필요한 후보만 의미 검증
  -> conflict와 freshness 상태 갱신
  -> serving index 반영
```

- 문서는 stable ID와 content hash로 변경 구간을 찾는다.
- 코드는 commit, file, symbol span hash를 조합해 이동과 수정을 구분한다.
- 삭제된 원문에 매달린 관계는 함께 제거하거나 tombstone으로 표시한다.
- URI 일치, schema 호환성, commit 존재 여부 같은 값싼 결정론적 검사를 먼저 수행한다.
- 의미 판단이 필요한 변경분에만 LLM 검증을 사용한다.

전체 지식 그래프를 매번 재계산하지 않으면 비용과 비결정성을 줄이면서 최신성을 유지할 수 있다.

## 충돌과 불확실성은 상태다

충돌하는 정보를 조용히 덮어쓰거나 하나로 합치면 중요한 맥락이 사라진다.

- `verified`: 현재 근거로 지지됨
- `disputed`: 유효한 근거가 서로 충돌함
- `stale_risk`: 원문 또는 의존 근거가 오래됐을 가능성이 큼
- `insufficient_evidence`: 판단할 근거가 부족함
- `superseded`: 더 최신의 canonical source가 대체함

충돌을 발견한 시각, 관련 owner와 근거를 보존한다. 정책상 우선순위가 명확할 때만 자동 선택하고, 그렇지 않으면 답변에 충돌을 노출하거나 보류한다.

## 에이전트에 공급하는 계약

검색 API는 텍스트 묶음만 반환하지 않고 다음을 함께 제공한다.

- 질문과 직접 관련된 claim
- claim별 evidence link와 원문 anchor
- provenance와 canonical source 여부
- freshness와 conflict 상태
- coverage gap과 사용상 제한

이 계약이 있어야 에이전트가 근거를 인용하고, 불확실할 때 [[LLM-Abstention|답변을 보류]]하며, 사용자가 원문을 확인할 수 있다.

## 사람 검토의 위치

모든 수집 결과를 사람이 승인하면 확장되지 않는다. 다음처럼 자동 판단의 기대 손실이 큰 경우에만 review queue로 보낸다.

- 서로 다른 시스템에서 같은 이름을 쓰는 애매한 alias
- 결제, 권한, 보안 정책처럼 영향이 큰 충돌
- canonical source를 자동 결정할 수 없는 문서 집합
- 반복해서 낮은 confidence가 나오는 extraction rule

검토 결과는 일회성 수정이 아니라 alias rule, source priority와 validator로 환류한다.

## 운영 지표

- source와 업무 영역별 coverage gap
- 원문 anchor가 사라진 orphan relation 비율
- evidence가 연결되지 않은 claim 비율
- stale 상태 비율과 갱신 지연
- conflict queue의 크기와 대기 시간
- 사람 승인과 반려 결과를 기준으로 한 자동 검증 precision
- 근거 부족으로 보류한 query 비율과 이후 해결률

검색 클릭률만 높고 evidence coverage가 낮다면 신뢰 가능한 컨텍스트 플랫폼이라고 보기 어렵다.

## 작게 시작하는 순서

1. 반복 질문이 많고 canonical source가 비교적 명확한 한 영역을 고른다.
2. 출처별 의미 단위와 공통 provenance 계약을 정의한다.
3. 검색보다 먼저 원문 anchor, 최신성, 삭제 전파를 검증한다.
4. 자주 발생하는 관계 두세 개만 typed relation으로 만든다.
5. conflict와 coverage gap을 관찰해 다음 수집 범위를 정한다.

## 피해야 할 설계

- 모든 출처를 같은 고정 길이로 청킹한다.
- 임베딩 유사도를 사실 관계로 확정한다.
- 최신 문서가 발견되면 과거 충돌 근거를 삭제한다.
- 근거 부족을 낮은 관련성으로 취급하고 그럴듯한 답을 만든다.
- 원문 hash와 extraction version 없이 생성 결과만 저장한다.
- 전사 지식 그래프를 한 번에 완성하려 한다.

## 면접 체크포인트

- Retrieval relevance와 context trust를 분리했는가?
- source별 의미 단위와 공통 provenance 계약이 있는가?
- 변경분만 재검증하고 삭제를 관계에 전파하는가?
- conflict, stale, insufficient evidence가 명시적 상태인가?
- 사람이 검토한 결과가 다음 자동화 규칙으로 환류하는가?

## 출처

- [LLM은 똑똑한데, 왜 우리 회사 일은 모를까 - 토스테크](https://toss.tech/article/llm_context_topic)
- [사람과 AI Agent를 위한 통합 Context Provider 구축 - NAVER D2](https://d2.naver.com/helloworld/7056385)
- [PROV-O: The PROV Ontology - W3C](https://www.w3.org/TR/prov-o/)

## 관련 문서

- [[Context-Engineering|컨텍스트 엔지니어링]]
- [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링]]
- [[LLM-Abstention|LLM 답변 보류와 선택적 응답]]
- [[Agent-Code-Search|에이전트 코드 검색]]
- [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처]]
- [[MCP|Model Context Protocol]]
