---
tags: [ontology, concept, inference, mcp, reference]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["개념 질의", "context_concept", "Ontology Concept Query"]
---

# 개념 질의와 질의 시점 추론

`context_concept`와 CLI `concept`는 타입이 있는 개념 하나를 찾아 원문에서 확인된 관계, 정의 근거와 관련 문서를 반환한다. 클래스와 predicate의 정의는 [[Ontology-Schema]]를 따른다. 자유 문장 질문은 `context_lookup`을 쓰고, 이 도구는 개념 이름을 이미 아는 구조 질문에 쓴다.

## 입력

| 필드 | 규칙 |
| --- | --- |
| `concept` | 필수. entity ID, `concept:<slug>`, slug, label 또는 alias. 최대 1,024 byte |
| `predicates` | 선택. predicate 이름 또는 역방향 표기(`addressed_by`, `required_by`, `tradeoff_of`, `narrower`) 1~16개 |
| `types` | 선택. 상대 개념의 클래스 1~16개. 하위 클래스를 포함하므로 `Concept`은 6개 개념 클래스 전부에 해당 |
| `depth` | 선택. 1, 2 또는 3. 기본 1. `broader` 계층을 따라가는 hop 수 |
| `include_inferred` | 선택. 기본 true |
| `max_bytes` | 선택. 기본 24,000, 서버 상한 65,536 |

`predicates`에 schema의 predicate 이름을 주면 방향과 관계없이 그 predicate의 관계를 모두 반환한다. `requires`는 Condition에서 질의하면 `required_by`로 표시된 관계도 통과시키고, `broader`는 `narrower`도 통과시킨다. 역방향 표기는 `include_inferred`가 true일 때만 관계를 반환한다. false이면 들어오는 관계가 schema의 predicate 이름과 `direction: in`으로 표시되므로 schema 이름으로 거른다. `predicates`는 `documents`에도 적용되므로 `tagged_with`, `mentions`, `in_category`가 목록에 없으면 문서는 반환되지 않는다. `types`는 관계의 상대 개념에만 적용된다.

입력 전체는 최대 8,192 byte이고 알 수 없는 field는 거부한다. CLI는 `node src/cli.mjs concept "<이름>" --predicate <이름> --type <클래스> --depth <1|2|3> --no-inferred` 형식이다.

## 개념 찾기

entity ID, 축약 ID 순으로 찾고, 없으면 slug, label, alias의 비교 키가 입력의 키와 같은 개념을 찾는다. 비교 키의 정의는 [[Ontology-Schema#태그와 카테고리 연결]]과 같다.

| `result_status` | 의미 | 다음 행동 |
| --- | --- | --- |
| `ok` | 개념 하나를 찾았고 상한 안에서 모두 반환 | 근거를 `context_read`로 확인 |
| `partial` | 관계 50개 또는 문서 20개 상한을 넘었거나 byte 예산 때문에 일부만 반환 | `predicates`나 `types`로 좁히거나 `max_bytes`를 늘려 재질의 |
| `ambiguous_concept` | 같은 이름의 개념이 둘 이상 | `candidates`의 ID로 재질의 |
| `concept_not_found` | 정확히 같은 이름의 개념이 없음 | `candidates`가 있으면 그 ID로 재질의, 비어 있으면 `context_lookup` 또는 `context_search` |

정확히 같은 이름이 없을 때 `candidates`는 slug, label 또는 alias가 입력을 포함하거나 입력에 포함되는 개념을 최대 8개 제안한다. 겹친 길이를 두 키 중 긴 쪽의 길이로 나눈 값이 큰 순서, 같으면 ID 순서로 정렬하므로 입력과 가장 가까운 이름이 앞에 온다. 잘린 수는 `budget.omitted_candidates`로 보고한다. 제안된 개념을 자동으로 선택하지 않으며 2자 미만의 키는 제안하지 않는다. 짧은 입력은 무관한 개념을 제안할 수 있으므로 label과 alias를 확인하고 고른다.

## 응답

- `concept`: ID, 클래스, label, alias, 선언 문서와 `definition_evidence`. 정의 근거는 선언 항목의 frontmatter 위치와 그 선언이 가리키는 원문 Section이다.
- `relations`: predicate, 방향, 상대 개념, `inferred`, `evidence`. 추론 관계는 `rule`과 근거가 된 관계 ID `derived_from`을 함께 가진다.
- `documents`: 이 개념에 `tagged_with`, `mentions`, `in_category`로 연결된 문서. `status: vocabulary` 문서는 제외한다.
- `index_sync`, `coverage_gaps`: 다른 조회 도구와 같은 형식이다.
- `traversal`, `budget`: 개념 질의 전용 필드를 가진다. `traversal`은 `depth`, `include_inferred`, `max_relations`, `max_documents`, `limit_reached`, `budget`은 byte 수와 `omitted_relations`, `omitted_documents`, `omitted_candidates`다.

관계의 `evidence`는 관계를 지지하는 원문 Section을 먼저, 그 관계를 선언한 frontmatter 항목을 다음에 둔다. 각 항목의 `evidence_unit_id`, `content_hash`와 `index_sync`의 revision을 `context_read`에 전달해 원문을 읽는다. 두 문서가 같은 관계를 선언하면 한 행으로 합치고 근거를 모두 담는다.

허용 범위 밖의 개념, 상대 개념, 문서와 근거는 반환하지 않는다. 관계를 선언한 문서가 허용 범위 밖이면 양 끝 개념이 범위 안이어도 그 관계를 반환하지 않는다. 선언 문서는 범위 안이고 근거 원문만 범위 밖이면 관계는 반환하되 근거에는 선언한 frontmatter 항목만 담긴다. 허용 범위가 색인 범위보다 좁으면 다른 문서의 개념이나 경로를 언급하는 선언 위반 gap의 `message`를 빼고 `reason`과 위치만 반환한다.

## 추론 규칙

추론은 요청마다 schema의 성질에서 계산하며 snapshot에 저장하지 않는다. 추론 결과는 항상 `inferred: true`다. `include_inferred: false`이면 원문에 선언된 방향의 관계만 반환한다.

| `rule` | 조건 | 결과 |
| --- | --- | --- |
| `symmetric` | 대칭 predicate(`alternative_to`)가 반대 방향으로 선언됨 | 같은 predicate의 나가는 관계 |
| `inverse` | 역방향 표기가 있는 predicate의 목적어가 질의 개념 | 역방향 표기의 나가는 관계. `addresses`의 목적어 Problem에서는 `addressed_by` |
| `transitive` | `broader` 계층에서 2 hop 이상 떨어진 개념이 `depth` 안에 있음 | `broader` 또는 `narrower` 관계. `derived_from`에 경로의 관계를 모두 기록 |
| 클래스 계층 | `types`에 상위 클래스를 지정 | 하위 클래스의 상대 개념도 통과 |

관계 규칙과 별도로, 문서 목록에는 하위 개념의 문서가 `inferred: true`와 그 하위 개념의 `concept_id`로 추가된다. 이 행에는 `rule`과 `derived_from`이 없다. Topic `messaging`을 질의하면 `depth` 안의 하위 Topic에 태그된 문서도 반환한다. 잘못된 `broader` 선언은 이 경로로 무관한 문서를 반환하게 하므로 계층 선언은 [[Ontology-Curation#통제 어휘의 유지]]의 기준을 따른다.

관계에 대해 추론하지 않는 것은 다음과 같다. `broader` 외 predicate의 추이, `alternative_to`의 추이, 하위 개념의 관계를 상위 개념으로 올리는 상속, 서로 다른 predicate를 조합한 새 관계. 문서 목록의 전파는 위에 적은 한 가지뿐이다.

## 예산과 상한

관계는 50개, 문서는 20개까지 반환하고 넘친 수를 `budget.omitted_relations`, `omitted_documents`로 보고한다. 질의 개념의 문서를 경로순으로, 이어서 하위 개념의 문서를 개념별 경로순으로 놓고 20개에서 자르며 다음 페이지를 읽는 입력은 없다. 태그된 문서가 20개를 넘는 Topic(예: `kafka`)은 항상 `partial`이므로 나머지 문서는 `context_search`로 찾는다. byte 예산이 부족하면 문서를 관계보다 먼저 줄이며 개념 자체는 자르지 않는다. `budget.used_bytes`는 직렬화한 응답의 크기와 같다.

## context_lookup과의 연결

snapshot에 개념이 있으면 `context_lookup` 응답에 `concepts`가 추가될 수 있다. 상위 후보 문서가 선언했거나 그 문서의 Section을 근거로 삼는 개념을 최대 8개 담으며, 여기서 얻은 ID로 `context_concept`를 호출한다. 반환한 근거 단위를 근거로 삼는 개념, 질의어가 label이나 alias에 많이 겹치는 개념 순서로 고른다.

이 목록은 근거 선택이 끝난 뒤 남은 byte에만 담는다. 근거 선택과 근거의 byte는 바꾸지 않는다. 2026-11-19 실제 Vault에서 24,000 byte 예산의 조회는 근거가 약 23,960 byte를 채워 개념이 0개 또는 1개만 담겼고, 65,536 byte에서는 8개가 담겼다. 기본 예산에서는 이 목록이 비어 있을 수 있으므로, 구조 질문이면 목록을 기다리지 말고 `context_concept`를 직접 호출한다. 개념 선언과 `ontology_relations`가 없는 snapshot의 응답은 버전과 fingerprint 필드, 검색 cursor를 빼면 schema 1 코드와 같다.

개념 label로 검색어를 넓히는 확장(`matching.expanded_terms`)은 구현돼 있으나 `CONCEPT_QUERY_EXPANSION = false`로 꺼 둔다. 2026-11-19 측정에서 한 단어가 넓은 Topic에 걸려 일부 사례 묶음의 순위가 나빠졌다. 결과는 [[Ontology-Competency-Evaluation#검색어 확장의 측정]]에 있다.

## 해석의 한계

- 타입 관계는 원문이 그렇게 서술한다는 기록이다. 현재 프로젝트에 그 방법이 맞는지는 확정하지 않는다.
- `requires`는 그 원문의 문맥에 한정된 전제다. 모든 구현의 필수 조건으로 읽지 않는다.
- 관계가 없다는 결과는 선언이 없다는 뜻이다. 원문에 그 지식이 없다는 뜻이 아니다. 2026-11-19 기준 Problem, Approach, Condition, Tradeoff 선언은 이벤트 발행 영역에만 있다.
- 이름이 정확히 같아야 개념을 찾으므로 표현이 다르면 `concept_not_found`가 된다. 측정한 해석률은 [[Ontology-Competency-Evaluation]]에 있다.

## 관련 문서

상위: [[Ontology-Reference]]. 전체 지도: [[Development-Ontology]].

- [[Ontology-Schema]]
- [[Ontology-Curation]]
- [[Ontology-Evidence-Read]]
- [[Ontology-Competency-Evaluation]]
