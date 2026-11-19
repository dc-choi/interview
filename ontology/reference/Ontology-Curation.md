---
tags: [ontology, curation, vocabulary, validation, reference]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["온톨로지 선언 절차", "Ontology Curation"]
---

# 개념과 관계를 선언하는 절차

개념과 관계는 후보 제안, 원문 대조 검증, 선언 문서 반영의 세 단계를 거쳐 색인에 들어간다. AI가 제안한 항목은 검증 전까지 후보이며 색인은 후보 파일을 읽지 않는다. 형식과 위반 판정은 [[Ontology-Schema]]를 따른다.

## 선언의 위치

| 위치 | 내용 | 클래스 |
| --- | --- | --- |
| `ontology/vocabulary/` | 태그와 카테고리 표기를 묶는 통제 어휘. 목차는 [[Ontology-Vocabulary]] | Topic, Category |
| `ontology/instances/` | 영역별 판단 개념과 관계. 목차는 [[Ontology-Instances]] | Problem, Approach, Condition, Tradeoff |
| `ontology/candidates/*.jsonl` | 후보와 검증 기록. 색인 대상이 아님 | 해당 없음 |

두 선언 폴더의 선언 문서는 `status: vocabulary`로 두어 어휘 검색의 후보와 근거에서 제외한다. 각 폴더의 목차 문서는 `status: index`다. 선언마다 원문 Section을 `evidence`로 연결하므로 지식 원문의 frontmatter는 고치지 않는다.

`ontology_concepts`와 `ontology_relations`는 지식 문서의 frontmatter에도 쓸 수 있다. 2026-11-19에 선언 문서로 모으는 방식을 택한 이유는 셋이다. 긴 지식 문서의 frontmatter가 수십 줄 늘어난다. 자동 학습이 그 문서를 고칠 때마다 커밋 검증이 실행돼 무인 커밋이 막힐 수 있다. 모아 두면 지식 원문을 건드리지 않고 되돌릴 수 있다. 대가는 원문의 heading을 바꿔도 커밋 시점에는 드러나지 않고 다음 build의 `missing_evidence`로 드러난다는 점이다.

## 후보 파일

후보는 한 줄에 JSON 객체 하나다.

| 필드 | 내용 |
| --- | --- |
| `id` | 파일 안에서 유일한 후보 ID |
| `kind` | `concept` 또는 `relation` |
| `slug`, `type`, `label`, `aliases`, `broader` | `kind: concept`일 때. `aliases`와 `broader`는 선택 |
| `subject`, `predicate`, `target` | `kind: relation`일 때. 개념은 `concept:<slug>`로 적는다 |
| `home` | 근거 원문의 경로 |
| `evidence` | `path`, `heading`과 원문에서 그대로 옮긴 `quote` |
| `status` | `candidate`, `approved`, `rejected` |
| `proposed_by`, `proposed_at` | 제안자와 날짜 |
| `reviewed_by`, `reviewed_at`, `review_note` | 검증자, 날짜와 판정 사유. `approved`와 `rejected`에는 검증자와 날짜가 필수 |

```bash
node src/cli.mjs candidates --check candidates/event-publishing.jsonl
```

검사는 `HEAD`의 원문과 대조한다. 형식, 근거 Section의 존재, `quote`가 그 Section 본문에 있는지(NFC와 공백 정규화 뒤 비교), predicate의 정의역과 치역, 관계의 양 끝과 `broader`가 색인에 있거나 같은 파일에서 반려되지 않은 개념인지 확인하고 문제가 있으면 종료 코드 1로 끝난다. 반려되지 않은 두 줄이 같은 slug를 제안하면 문제로 보고한다. 승인된 줄은 다른 문서로 옮겨지므로 관계의 양 끝을 같은 문서 링크(`[[#Heading]]`)로 적거나 `subject`를 생략하면 문제로 보고한다. `rejected` 줄은 레코드 형식(ID, 종류, 상태, 제안자와 검증자, 알 수 없는 필드, `evidence`의 모양)만 검사하고 schema나 원문과는 대조하지 않는다.

## 검증 기준

제안자와 다른 검증자가 원문을 읽고 판정한다. 검증자에게는 후보와 원문만 주고 제안자의 결론은 주지 않는다.

- **개념**: label이 원문의 표현과 범위를 벗어나지 않는가. 클래스가 맞는가. 이미 있는 개념과 같은 대상이 아닌가.
- **관계**: 근거 Section이 그 관계를 직접 서술하는가. 여러 절을 조합해야 나오는 관계, 일반 지식으로는 맞지만 원문에 없는 관계는 반려한다.
- **범위**: 특정 제품의 설정이나 한 구현의 성질을 일반 개념에 붙이지 않는다. 필요하면 범위를 한정한 개념을 따로 제안한다.
- **alias**: 같은 대상을 가리키는 다른 표현만 넣는다. 평가 질문의 문장을 맞추기 위한 alias는 넣지 않는다.
- **고아 개념**: 승인된 관계가 하나도 남지 않은 개념은 반려한다.

판정이 갈리면 엄격한 쪽을 택한다. 반려한 후보는 사유와 함께 파일에 남겨 같은 제안이 반복되지 않게 한다.

## 선언 문서 반영과 확인

승인된 후보를 선언 문서의 `ontology_concepts`와 `ontology_relations`에 한 줄씩 옮긴다. 선언 문서가 정본이고 후보 파일은 검증 기록이다. 이후의 정정은 선언 문서를 고치고 사유를 후보 파일의 `review_note`에 남긴다.

1. 선언 문서를 stage하고 커밋한다. 커밋 hook이 `validate --staged`를 실행해 새 위반이 있으면 막는다.
2. `node src/cli.mjs validate`로 `HEAD` 전체의 gap이 0인지 확인한다.
3. `node src/cli.mjs concept "<label>" --committed-only`로 관계와 근거가 의도대로 나오는지 표본을 확인한다.

build는 `HEAD`만 읽으므로 커밋 전에는 색인에 반영되지 않는다. 커밋 전에 확인하려면 임시 clone에 커밋해 `--repo`로 build한다.

## 통제 어휘의 유지

- **alias**: 그 태그가 붙은 문서 전부가 해당 개념의 문서가 된다. 약어의 다른 뜻, 제품명과 일반 기법처럼 뜻이 갈리는 표기는 묶지 않는다. Vault에서 그 태그가 실제로 쓰인 문서를 읽고 판단한다.
- **`broader`**: 하위 개념이 붙은 모든 문서가 상위 개념의 문서이기도 할 때만 선언한다. 자주 함께 쓰인다는 이유로 선언하지 않는다.
- **충돌**: 두 개념이 같은 비교 키를 가지면 그 키는 어느 쪽에도 대응하지 않는다. alias를 추가한 뒤 `validate`의 `concept_label_collision`을 확인한다.
- **미대응 태그**: `tags_unmapped`는 지표다. 사용 빈도가 높은 태그부터 개념을 추가하며, 모든 태그를 채우는 것을 목표로 하지 않는다.
- 문서의 태그와 `category` 값은 그대로 둔다. 표기의 통합과 상하위 관계는 어휘 문서에서만 고친다. 예외는 한 태그가 여러 뜻으로 쓰이는 경우다. 어휘는 같은 태그를 뜻에 따라 나눌 수 없으므로, 정확도가 필요하면 소수 의미 문서의 태그를 그 도메인 지침에 따라 고친다. 확인된 사례는 [[Ontology-Vocabulary#뜻이 섞인 개념]]에 있다.
- 태그는 Category의 label과 alias에도 대응한다. Category와 같은 키의 Topic을 추가하면 충돌한다.

## 새 영역을 추가할 때

실제 요청에서 구조 질문이 반복되는 영역만 추가한다. 영역의 원문 목록을 정하고, 원문 전체에서 후보를 추출한 뒤 위 검증을 거친다. 추출 개수를 목표로 주면 원문을 덜 다루므로 원문 범위를 기준으로 삼는다. 평가 질문은 후보를 만드는 작업자에게 보여 주지 않는다. 기록은 [[Ontology-Competency-Evaluation]]에 남긴다.

## 관련 문서

상위: [[Ontology-Reference]]. 전체 지도: [[Development-Ontology]].

- [[Ontology-Schema]]
- [[Ontology-Concept-Query]]
- [[Development-Ontology-Contract]]
