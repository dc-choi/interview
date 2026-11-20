---
tags: [ontology, schema, validation, reference]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["온톨로지 타입 스키마", "Ontology Schema"]
---

# 온톨로지 타입 스키마와 선언 형식

schema 2(extractor 13)가 허용하는 클래스, 관계와 Markdown 선언 형식, 위반 판정을 정리한다. 스키마의 정본은 `ontology/src/schema.mjs`이며 snapshot의 `schema.json`은 이 모듈에서 생성한다. 개념 질의는 [[Ontology-Concept-Query]], 선언을 추가하는 절차는 [[Ontology-Curation]]을 따른다.

## 범위

이 스키마는 타입이 있는 개념, 정의역과 치역이 있는 관계, 제약 검증을 갖춘 경량 지식 온톨로지다. OWL 추론기, RDF 저장과 내보내기, 그래프 DB, 데이터 변경 액션은 구현하지 않는다. 추론은 질의 시점의 관계 규칙 4종과 하위 개념의 문서를 문서 목록에 더하는 문서 전파로 한정하며 snapshot에 저장하지 않는다.

## 클래스

| 클래스 | 상위 | 내용 | 근거 필수 |
| --- | --- | --- | --- |
| `Entity` | 없음 | 추상 최상위 | 해당 없음 |
| `Document` | `Entity` | Markdown 파일 | 해당 없음 |
| `EvidenceUnit` | `Entity` | 추상. 원문 byte 범위를 가리키는 근거 단위 | 해당 없음 |
| `Section` | `EvidenceUnit` | heading 단위 본문 | 해당 없음 |
| `RelationAssertion` | `EvidenceUnit` | frontmatter `ontology_relations`의 한 항목 | 해당 없음 |
| `ConceptDeclaration` | `EvidenceUnit` | frontmatter `ontology_concepts`의 한 항목 | 해당 없음 |
| `Concept` | `Entity` | 추상. 아래 6개 개념의 상위 | 해당 없음 |
| `Topic` | `Concept` | 태그가 가리키는 주제 | 아니오 |
| `Category` | `Concept` | 문서 `category` 값이 가리키는 분류 | 아니오 |
| `Problem` | `Concept` | 해결하려는 실패, 제약 또는 목표 | 예 |
| `Approach` | `Concept` | 원문이 설명하는 해결 방법이나 설계 선택지 | 예 |
| `Condition` | `Concept` | 방법의 적용 여부를 바꾸는 전제와 제외 조건 | 예 |
| `Tradeoff` | `Concept` | 추가 운영, 복잡도, 지연과 포기하는 성질 | 예 |

근거 필수 클래스의 선언은 `evidence` 위키링크가 Section 하나로 해석될 때만 entity가 된다.

## 관계

정의역과 치역은 클래스 계층을 따른다. 치역이 `Concept`이면 `Problem`도 허용한다.

| predicate | 정의역 → 치역 | 성질 | 역방향 표기 | 작성 | 근거 필수 |
| --- | --- | --- | --- | --- | --- |
| `contains` | Document → EvidenceUnit | 없음 | 없음 | parser | 해당 없음 |
| `links_to` | Document → Document, Section | 없음 | 없음 | parser | 해당 없음 |
| `declares` | Document → Concept | 없음 | 없음 | parser | 해당 없음 |
| `tagged_with` | Document → Concept | 없음 | 없음 | parser | 해당 없음 |
| `in_category` | Document → Category | 없음 | 없음 | parser | 해당 없음 |
| `addresses` | Approach → Problem | 없음 | `addressed_by` | frontmatter | 예 |
| `requires` | Approach → Condition | 없음 | `required_by` | frontmatter | 예 |
| `has_tradeoff` | Approach → Tradeoff | 없음 | `tradeoff_of` | frontmatter | 예 |
| `alternative_to` | Approach → Approach | 대칭, 비반사 | 없음 | frontmatter | 예 |
| `broader` | Concept → Concept | 추이, 비반사, 비순환 | `narrower` | frontmatter | 아니오 |
| `supported_by` | Concept, RelationAssertion → Section | 없음 | 없음 | frontmatter | 아니오 |
| `contradicted_by` | Concept, RelationAssertion → Section | 없음 | 없음 | frontmatter | 아니오 |
| `mentions` | Document, Section → Concept | 없음 | 없음 | frontmatter | 아니오 |

기존 시스템 predicate 7개(`calls`, `publishes`, `consumes`, `reads_from`, `writes_to`, `constrained_by`, `verified_by`)는 정의역과 치역을 제한하지 않고 유지한다.

schema 1은 `supported_by`, `contradicted_by`, `mentions`의 양 끝을 제한하지 않았다. schema 2에서는 Document를 주어로 한 `supported_by`와 `contradicted_by`가 `domain_violation`, Document나 Section을 목적어로 한 `mentions`가 `range_violation`이 된다. 2026-11-19 기준 `HEAD`의 frontmatter에는 `ontology_relations`가 없어 영향받는 원문이 없다.

## 개념 선언

`ontology_concepts`는 어느 Markdown 문서의 frontmatter에도 쓸 수 있다. 블록 형식과 한 줄 flow 형식을 모두 읽는다.

```yaml
ontology_concepts:
  - id: transactional-outbox
    type: Approach
    label: Transactional Outbox
    aliases: ["아웃박스 패턴"]
    evidence: "[[Transactional-Outbox#Transactional Outbox Pattern]]"
    broader: messaging-reliability
  - {id: kubernetes, type: Topic, label: Kubernetes, aliases: [k8s, 쿠버네티스]}
```

| 필드 | 규칙 |
| --- | --- |
| `id` | slug. `^[a-z0-9][a-z0-9-]{0,79}$`, Vault 전체에서 유일 |
| `type` | `Concept`의 말단 클래스 6개 중 하나 |
| `label` | 비어 있지 않은 대표 이름 |
| `aliases` | 선택. 다른 이름의 목록 |
| `evidence` | Section 하나로 해석되는 위키링크. 근거 필수 클래스에서는 필수 |
| `broader` | 선택. 상위 개념의 slug. `broader` 관계를 쓴 것과 같다 |

entity ID는 `concept:<repository_id>:<slug>`다. 선언마다 `unit:<repository_id>:<path>:frontmatter.ontology_concepts[<index>]` 근거 단위가 생기고, parser는 `declares`, 근거가 해석되면 `supported_by`, `broader`가 있으면 `broader` 관계를 만든다. 위키링크의 heading은 원문 표기 그대로 쓴다. 색인은 heading의 backtick을 제거해 저장하고 backtick을 뺀 링크도 대부분 해석하지만, `Promise<T>`처럼 backtick 없이는 HTML로 읽히는 문자가 있는 heading은 backtick이 있어야 해석된다. `]`나 `|`가 들어간 heading과 같은 문서 안에서 이름이 겹치는 heading은 근거로 쓸 수 없다. 파일명이 같은 문서가 둘이면 링크가 모호해져 `missing_evidence`가 된다.

## 관계 선언

```yaml
ontology_relations:
  - subject: "concept:transactional-outbox"
    predicate: addresses
    target: "concept:dual-write-problem"
    evidence: "[[Transactional-Outbox#Transactional Outbox Pattern]]"
```

`subject`와 `target`은 전체 entity ID, 축약 `concept:<slug>`, 위키링크(`[[Doc]]`, `[[Doc#Heading]]`, `[[#Heading]]`) 중 하나다. `subject`를 생략하면 선언한 Document가 주어다. `evidence`가 해석되면 해당 `RelationAssertion`에서 그 Section으로 `supported_by` 관계가 추가된다. 근거 필수 predicate는 `evidence`가 없거나 해석되지 않으면 관계가 되지 않는다.

## 태그와 카테고리 연결

모든 개념의 slug, label과 alias로 이름 색인을 만든다. 비교 키는 NFC 정규화, 소문자화 뒤 공백, `_`, `-`를 제거한 문자열이다. 문서의 태그 키가 개념 하나에 대응하면 `tagged_with` 관계가 생긴다. `category` 값은 `Category`의 label과 alias에만 대응시키며(slug는 쓰지 않는다) 하나에 대응하면 `in_category` 관계가 생긴다. 두 개념이 같은 키를 가지면 그 키는 어느 개념에도 대응하지 않는다.

대응하지 않는 태그는 위반이 아닌 지표다. manifest의 `counts`가 `concepts`, `typed_relations`, `tags_distinct`, `tags_mapped`, `tags_unmapped`, `categories_unmapped`를 보고한다. `typed_relations`는 frontmatter에 쓸 수 있는 predicate의 관계 수다. 선언한 관계뿐 아니라 `broader`와, parser가 선언의 `evidence`에서 만든 `supported_by`도 센다. `status: vocabulary`인 문서는 선언 자료이므로 `context_lookup`과 `context_search`의 어휘 검색 후보와 근거에서 제외한다.

## 위반 판정

위반한 항목은 entity나 관계로 승격하지 않고 coverage gap으로 남긴다.

| reason | 조건 |
| --- | --- |
| `invalid_concept_declaration` | 필드 누락, 잘못된 형식, 알 수 없는 필드 또는 YAML alias |
| `unsupported_concept_type` | `type`이 말단 개념 클래스가 아님 |
| `duplicate_concept_id` | 이미 개념이 된 slug를 다시 선언. 앞선 선언이 근거 부족 등으로 개념이 되지 못했으면 뒤의 유효한 선언이 개념이 된다 |
| `concept_label_collision` | 두 개념이 같은 비교 키를 공유. 개념은 남고 그 키만 색인에서 빠짐 |
| `domain_violation`, `range_violation` | 주어 또는 목적어의 클래스가 predicate에 맞지 않음 |
| `reflexive_relation` | 비반사 predicate의 주어와 목적어가 같음 |
| `missing_evidence` | 근거가 필수인데 없거나 해석되지 않음. 선택 근거가 해석되지 않으면 gap만 남기고 선언은 유지 |
| `hierarchy_cycle` | `broader`가 순환을 닫음. 순환 안에서 주어 ID, 목적어 ID, 원문 경로 순으로 가장 뒤인 관계를 제외. 선언 목록 안의 위치는 결과에 영향을 주지 않는다 |
| `undeclared_category` | `Category` 개념이 하나 이상 있을 때, 대응하는 개념이 없는 문서 `category` |

기존 `UnsupportedOntologyPredicate`, `UnverifiedOntologyRelation`, `InvalidOntologyRelation`, `unresolved_relation`은 그대로다.

## 검증 명령과 커밋 차단

```bash
node src/cli.mjs validate
node src/cli.mjs validate --staged
```

`validate`는 `HEAD` tree를 해석해 gap과 개수를 JSON으로 출력하고, 온톨로지 gap이 하나라도 있으면 종료 코드 1로 끝난다. frontmatter YAML 오류(`MalformedFrontmatter`)도 선언을 조용히 잃게 하므로 이 판정에 포함한다. `--staged`는 index tree를 해석하며 cache를 쓰지 않는다. `HEAD`에 이미 있던 gap은 경고로만 보고하고, stage한 변경이 새로 만든 위반이 있을 때만 종료 코드 1이다. 같은 위반이 여러 개면 개수로 비교한다. 목록 안의 위치는 비교하지 않고 그 항목이 선언한 내용으로 비교한다. 관계는 적힌 그대로의 (subject, predicate, target), 개념은 `id`, 형식이 깨진 항목은 항목 전체가 기준이다. 그래서 항목을 중간에 끼워 넣어도 기존 위반이 새 위반으로 바뀌지 않고, 위반 하나를 고치면서 같은 사유의 다른 위반을 넣으면 새 위반으로 잡는다. 위반이 있는 문서의 경로를 바꾸면 그 위반은 새 위반으로 보고된다.

`undeclared_category`는 일반 문서의 `category` 값에서 생기므로 `--staged`에서 다르게 다룬다. `HEAD`와 index 사이에 Category 개념의 ID, label 또는 alias가 달라졌을 때만 커밋을 막고, 그렇지 않으면 경고로 보고한다. 새 category 문자열을 쓴 지식 문서가 선언 문서와 함께 stage돼도 그 커밋을 막지 않는다.

`.claude/hooks/vault_guard.py`의 커밋 검사는 다음 중 하나일 때만 `validate --staged`를 실행한다.

- stage한 Markdown의 frontmatter 안에 `ontology_concepts` 또는 `ontology_relations`라는 key 이름이 있다. 따옴표로 감싼 key, 콜론 앞의 공백과 flow mapping도 포함한다. 닫는 줄이 없는 frontmatter는 색인과 같이 파일 끝까지로 본다. 본문의 코드 블록에 적은 예시는 해당하지 않는다.
- stage한 Markdown의 `HEAD` 내용이 frontmatter에 그 key 이름을 가지고 있다. 선언 문서의 삭제, 이름 변경과 key를 모두 지우는 변경이 여기에 해당한다.
- stage한 경로가 `ontology/vocabulary/` 또는 `ontology/instances/` 아래다. 추가, 수정, 삭제, 이름 변경을 모두 포함한다.

조건에 해당하지 않는 커밋은 Node.js 없이도 통과한다. 조건에 해당하면 Node.js 22 이상과 `ontology/node_modules`가 필요하며, 없으면 필요한 조치를 알리고 커밋을 막는다. 검증은 100초 안에 끝나지 않으면 중단하고 커밋을 막는다. 조건을 판정하는 git 명령이 실패하면 안내와 hook 기록을 남기고 검증 없이 통과시킨다. 검증으로 넘기면 Node.js 부재나 시간 초과가 선언과 무관한 무인 커밋을 막기 때문이다. 검증을 실행한 뒤의 예상하지 못한 오류는 커밋을 막는다.

알려진 사각은 다음과 같다.

- 선언의 근거나 양 끝이 가리키는 원문을 고치는 커밋은 검사하지 않는다. heading의 이름 변경, 절의 이동과 분할, 같은 이름의 heading 추가, 파일의 이름 변경과 삭제가 해당한다. 다음 build에서 `missing_evidence` 또는 `unresolved_relation` gap으로 드러나고, 근거가 필수인 개념과 그 관계는 색인에서 빠진다. 2026-11-19 기준 선언 68개가 `Transactional-Outbox.md`의 heading을 근거로 삼는다. 이 문서를 분할한 뒤에는 `node src/cli.mjs validate`로 확인하고 선언 문서의 `evidence`를 고친다.
- 자동 학습처럼 선언 문서를 건드리지 않는 무인 커밋은 위 사각을 그대로 통과한다. 차단하면 자동 학습이 선언 문서를 고칠 수 없어 멈추므로 차단하지 않는다. 드러내는 수단은 주기적인 `validate`와 조회 응답의 coverage gap 수다. 2026-11-19부터 자동 학습의 일일 다이제스트가 `validate`를 실행해 위반이 있으면 사유별 건수와 문서 경로를 알린다.
- 선언이 없는 일반 문서가 새 `category` 문자열을 쓰면 검사 없이 `HEAD`에 들어가고 `validate`의 `undeclared_category`로 드러난다.
- `Category` 선언을 모두 지우면 `undeclared_category` 판정 자체가 꺼지므로 gap이 생기지 않는다.
- `--staged`의 비교에 남은 한계는 셋이다. 개념의 `broader`만 해석되지 않는 다른 slug로 바꾸면 같은 `id`의 위반으로 보아 새 위반으로 잡지 못한다. `MalformedFrontmatter`는 문서와 YAML 오류 문구로 비교한다. 내용이 같은 선언은 서로 구분하지 않고 개수로만 비교한다.
- hook은 YAML escape로 적은 key(예: `"ontology\x5fconcepts"`)를 인식하지 못한다. 두 선언 폴더 밖의 문서에 그렇게 적으면 검사가 실행되지 않는다.
- frontmatter를 닫지 않았고 본문에 key 이름이 있는 문서를 stage하면 선언이 없는 커밋도 검증 대상이 되고 `MalformedFrontmatter`로 막힌다. frontmatter의 값, 태그나 주석에 key 이름을 적은 문서도 커밋마다 검증 대상이 된다.
- 조건 판정이 실패한 커밋은 선언을 바꿨더라도 검증 없이 통과한다. hook 기록의 `ontology detect-failed`와 다음 `validate`로 확인한다.

## 관련 문서

상위: [[Ontology-Reference]]. 전체 지도: [[Development-Ontology]].

- [[Ontology-Concept-Query]]
- [[Ontology-Curation]]
- [[Ontology-Runtime-Contract]]
- [[Development-Ontology-Contract]]
