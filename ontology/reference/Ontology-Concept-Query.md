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
| `concept_not_found` | 정확히 같은 이름의 개념이 없음 | `candidates`의 label, 클래스와 `match`를 확인하고 맞는 ID로 재질의, 비어 있거나 맞는 것이 없으면 `context_lookup` 또는 `context_search` |

정확히 같은 이름이 없을 때 `candidates`는 표현이 다른 개념을 최대 8개 제안하고, 각 후보에 일치한 방식 `match`를 붙인다. 잘린 수는 `budget.omitted_candidates`로 보고한다. 제안된 개념을 자동으로 선택하지 않는다. 입력의 비교 키가 2자 미만이면 후보를 제안하지 않고, 비교 키가 2자 미만인 이름은 `name` 일치에서 제외한다.

| `match` | 조건 |
| --- | --- |
| `name` | slug, label 또는 alias가 입력을 포함하거나 입력에 포함된다. 짧은 쪽의 단어가 긴 쪽 단어의 앞부분과 맞아야 하므로 `seconds` 안의 `econ` 같은 단어 중간 일치는 제외한다 |
| `name_tokens` | 이름이 입력 단어의 절반 이상이자 2개 이상을 가진다. 단어가 하나인 입력은 그 단어 |
| `evidence_heading` | 개념이나 그 관계를 지지하는 원문 Section의 heading 경로가 입력 전체 또는 위 기준의 단어를 가진다 |
| `evidence_text` | 같은 Section의 본문이 가진다 |

단어는 NFC와 소문자화 뒤 한글 연속과 그 밖의 글자, 숫자 연속으로 나누며 2자 미만은 버린다. 단어는 그 단어로 시작하는 낱말과 일치하므로 조사가 붙은 한글도 찾는다. `name_tokens`, `evidence_heading`, `evidence_text`에서는 그 영역에서 허용 범위 안 개념 8개보다 많은 개념에 나타나는 표현과 단어를 쓰지 않는다. 구별하는 힘이 없기 때문이다. `name` 일치는 개수와 관계없이 후보가 되고 8개를 넘는 수는 `budget.omitted_candidates`로 센다. 2자 이상의 단어가 없는 입력(`I/O`, `c++` 등)은 `name` 일치만 쓴다. `name`의 단어 경계 확인은 짧은 쪽의 2자 이상 단어로 하고, 2자 이상 단어가 없는 쪽만 1자 단어로 한다. 그래서 `d i`는 `Redis` 안에서 일치하지 않고, `멱등성키`와 `멱등성 키`처럼 1자 단어를 붙여 쓴 차이는 일치한다. 글자와 숫자가 없는 입력만 단어 경계를 확인하지 못한다.

순서는 이름 일치(`name`, `name_tokens`), `evidence_heading`, `evidence_text`다. 이름 일치 안에서는 입력 단어를 더 많이 가진 이름이 앞에 오므로 `SQS FIFO dedup`에서 단어 하나만 겹치는 Topic `sqs`보다 세 단어를 모두 가진 개념이 먼저 나온다. 근거 일치는 선언과 그 근거 Section, 관계를 선언한 항목과 상대 개념이 모두 허용 범위 안일 때만 쓴다.

첫 후보가 맞는 개념이라는 보장은 없다. 넓은 Topic이 이름 한 단어로 먼저 나올 수 있고, 본문 일치는 그 표현을 언급만 한 절의 개념을 제안할 수 있다. 측정한 정확도는 [[Ontology-Competency-Evaluation#이름 해석 개선과 새 미공개 질문]]에 있다. 본문 일치는 근거 문서의 고정된 Git blob을 `context_lookup`과 같은 방식으로 읽으므로 찾지 못한 질의는 찾은 질의보다 수십 ms 더 걸린다. 허용 범위 안 개념을 뒷받침하는 근거 문서 가운데 하나라도 작업 트리에서 그 경로나 상위 폴더가 symlink면 찾지 못한 질의는 입력과 관계없이 모두 `symlink_path`, Git object가 없으면 `source_unavailable` 오류가 되고, byte가 `content_hash`와 맞지 않는 Section은 근거 일치에 쓰지 않는다.

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

snapshot에 개념이 있으면 `context_lookup` 응답에 `concepts`가 추가될 수 있다. 최대 8개를 담으며, 여기서 얻은 ID로 `context_concept`를 호출해 그 개념의 대안, 전제, 비용과 다루는 문제를 확인한다. 개념은 두 종류다.

- **근거 연결 개념**: 응답이 반환한 근거 단위가 그 개념의 선언 근거이거나, 그 개념이 양 끝인 관계 선언의 근거인 개념이다. 해당 근거 단위의 위치를 `evidence_unit_index`(응답의 `evidence_units` 순서)로 함께 준다.
- **문서 연결 개념**: 상위 후보 문서가 선언했거나 그 문서의 Section을 근거로 삼는 그 밖의 개념이다. `id`, `type`, `label`만 준다.

근거 연결 개념이 앞에 오며, 더 앞선 근거 단위가 뒷받침하는 개념, Problem, Approach, Condition, Tradeoff를 Topic과 Category보다, 질의어가 label이나 alias에 더 많이 겹치는 개념, ID 순서로 놓는다. 문서 연결 개념은 질의어 겹침, 문서 순위, 선언 문서 여부, ID 순서다.

근거 연결 개념은 최대 5개까지 예산의 1/20 안에서 자리를 미리 확보한다. 근거가 예산을 채웠으면 이미 잘린 발췌문부터 같은 길이로 줄여 자리를 만들며, 근거 단위의 수, 순서와 ID는 바꾸지 않고, 줄인 발췌문은 `truncated: true`로 표시한다. 발췌문을 512 byte 아래로 줄이지 않으며 이미 그보다 짧은 발췌문은 줄이지 않는다. 줄여도 자리가 나지 않으면 개념 수를 하나씩 줄이고, 0개가 되면 응답은 예약하지 않았을 때와 같다. 문서 연결 개념은 근거와 근거 연결 개념을 담고 남은 byte에만 담는다. 반환한 근거가 어떤 개념도 뒷받침하지 않으면 아무것도 확보하지 않으므로 응답은 개념이 없는 snapshot의 응답과 같다. 2026-11-20 측정(선언 확장 전)에서 24,000 byte 예산의 판단 질문 56건 중 `concepts`를 받은 질문은 예약 전 6건에서 29건이 됐고, 발췌문이 줄어든 양은 응답당 최대 720 byte였으며 빠진 근거 단위는 없었다. 개념 선언과 `ontology_relations`가 없는 snapshot의 응답은 검색어 8개 미만이고 영문이나 숫자 뒤 조사 규칙이 토큰을 바꾸지 않는 질문에서 버전과 fingerprint 필드, 검색 cursor를 빼면 schema 1 코드와 같다. 8개 이상인 질문은 긴 질문 규칙([[Ontology-Runtime-Contract#후보 검색과 순위]], [[Ontology-Runtime-Contract#근거 구성과 응답 예산]]) 때문에 순위와 반환 근거가 다를 수 있다.

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
