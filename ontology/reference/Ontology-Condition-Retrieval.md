---
tags: [ai, ontology, retrieval, evidence, mcp]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["Condition Retrieval", "조건별 근거 탐색"]
---

# 조건별 근거 탐색

> 유형: 여러 근거가 필요한 질문의 일반 조회 원칙과 상세 평가 절차
> 현재 범위: 기존 `context_lookup`, `context_search`, `context_outline`, `context_read`의 호출 순서를 제한하고 첫 lookup의 선택적 lexical `conditions` 단서를 사용한다. 서버의 의미 판정은 추가하지 않는다.

Codex와 Claude의 `development-context` 스킬은 일반 조회 원칙을 적용하고, 조회 평가나 실패 원인 분석 때만 이 문서의 상세 절차를 읽는다. 스킬은 다음 파일 로드부터 읽히며, 이미 연결된 서버의 설명이 자동으로 바뀌었다고 가정하지 않는다.

## 일반 조회와 상세 평가의 구분

일반 조회는 필요한 근거와 미확인 조건을 짧게 정리하고, 원문 위치와 판단에 사용한 내용을 남긴다. 고정 ID 목록, 호출별 실제 byte 직렬화와 receipt를 복제한 trace는 요구하지 않는다. 후속 읽기의 ID, revision과 hash 전달, 원문 일관성 확인은 그대로 지킨다.

일반 조회도 첫 lookup 이후 추가 lookup/search 2회, outline 2회, read 4회 및 전체 8회 상한을 따른다. 호출별 `max_bytes`는 24,000 이하, 누적 예산은 64,000 이하로 관리한다. 성공 응답은 요청 상한으로 보수적으로 차감하고, 요청 상한을 넘을 수 있는 오류 응답만 실제 byte로 보정한다. 남은 예산이 부족하면 중단한다. 같은 질문의 scope를 유지하고 확인하지 못한 조건은 한계로 밝힌다.

아래 고정 조건 목록, 실제 응답 byte 집계와 trace 형식은 조회 평가와 실패 원인 분석에 적용한다. 평가에서는 재현 가능한 비교를 위해 실제 응답량을 집계한다.

## 목적

한 문서의 제목이나 첫 발췌만으로 조건과 예외를 모두 확인했다고 말하지 않는다. host가 질문의 필요한 근거를 나누고, 이미 찾은 원문의 본문을 먼저 확인한 뒤, 정말 빠진 조건만 제한적으로 재탐색한다.

이는 조건을 자동 충족시키는 검색 알고리즘이 아니다. `supported`와 `contradicted`는 host가 실제로 읽은 원문 본문을 해석한 결과이며 서버가 보증하는 status가 아니다.

## 조건을 적는 시점

첫 도구 호출 전에 사용자 질문에서 필요한 근거 질문을 최대 3개 그룹으로 적되 필요한 조건을 누락하지 않는다. 한 그룹 안에서도 동작 원리, 실패 경계, 예외와 적용 맥락처럼 따로 설명해야 하는 원자 요구를 고정 `id`와 `question`으로 적어 `conditions[].requirements`에 남긴다. 이 inventory는 반환된 source를 읽기 전에 완성하며, 발견한 근거에 맞춰 추가, 삭제 또는 재서술하지 않는다. 예를 들어 한 설계 제안을 검토할 때 필요한 전제, 예외와 현재 적용 범위를 각각 조건 또는 한 조건의 원자 요구로 둘 수 있다.

- `stated_requirement`: 사용자가 분명히 요청하거나 제약으로 적은 근거 질문
- `assumption`: host가 질문을 해석하려고 둔 가정. 조건으로 몰래 추가하거나 충족된 것으로 취급하지 않는다.

조건은 사실이 참이라는 claim이 아니라 답변에 필요한 evidence question일 수 있다. 평가 사례의 정답 경로, heading이나 본문 문구는 이 목록이나 후속 탐색의 입력이 아니다.

## 한 질문의 호출 순서

1. 원래 질문과 선택한 scope로 `context_lookup`, `max_bytes: 24000`을 한 번 호출한다. 조건 힌트는 기본으로 생략한다. 사용자가 탐색 표현을 지정했거나 힌트 사용을 요청했고 도구가 지원하면 `stated_requirement` 그룹에서만 1~3개 `conditions` 탐색 표현을 함께 보낸다. 원래 질문을 바꾸지 않으며, 이 표현은 보충 절의 어휘 단서일 뿐 조건 충족 근거나 server의 의미 판정이 아니다. 이미 연결한 server가 이 필드를 받지 않으면 생략한다.
2. 반환된 본문으로 조건을 확인한다. 중요한 receipt가 `truncated: true`이면 같은 receipt를 `context_read`로 읽는다.
3. 반환된 Document가 관련 있지만 다른 조건이나 예외가 빠졌으면 `context_outline`으로 section receipt를 받고, 선택한 section을 `context_read`로 읽는다. 목차와 heading 자체는 근거가 아니다.
4. 아직 `unresolved`이고 처음 결과에 Document 후보도 없을 때만 그 조건을 query로 `context_lookup` 또는 `context_search`한다. `context_search`의 `best_evidence_ref`는 읽기 시작점일 뿐 본문 적중 보장이 아니다.
5. 모든 조건이 `supported` 또는 `contradicted`가 되거나 상한에 닿으면 멈춘다. 더 좁은 scope, 새 해석이나 무관한 query로 조용히 탐색 범위를 바꾸지 않는다.

`context_search`의 cursor 다음 페이지, `context_outline`의 다음 section 페이지와 `context_read`의 다음 byte 페이지도 각각 한 번의 호출이다.

## 예산과 일관성

| 항목 | 상한 |
| --- | ---: |
| 첫 원문 `context_lookup` | 1회, 24,000 byte 요청 |
| 추가 `context_lookup` 또는 `context_search` | 합계 2회, `unresolved` 조건만 |
| `context_outline` | 2회 |
| `context_read` 페이지 | 4회 |
| 모든 도구 호출 | 8회 |
| 모든 실제 `structuredContent` 직렬화 byte | 64,000 byte |
| 호출별 `max_bytes` | 남은 합계와 24,000 중 작은 값 이하 |

행별 상한을 모두 소진해도 전체 8회를 넘을 수는 없다. 성공, error payload, cursor 재시작과 revision 재시작 모두 호출 수와 실제 byte 합계에 넣는다. 남은 byte로 최소 응답을 받을 수 없으면 `unresolved: budget_limit`으로 멈춘다.

모든 lookup/search는 첫 요청의 scope를 그대로 쓴다. outline에는 반환된 Document의 ID를 `document_id`로, 조회 revision을 `source_revision`으로 전달한다. read에는 반환된 section의 ID를 `evidence_unit_id`로, 같은 receipt의 `source_revision`과 `content_hash`를 전달한다. revision 또는 hash가 바뀌면 이전 탐색의 receipt와 페이지를 섞지 않는다. 남은 상한 안에서 처음부터 재조회하지 않으면 해당 조건을 `unresolved: source_changed`로 남긴다.

## 조건 판정과 기록

각 조건과 그 원자 요구는 다음 중 하나로만 기록한다.

- `supported`: 실제 반환된 source body가 조건을 직접 지지한다.
- `contradicted`: 실제 반환된 source body가 조건과 직접 충돌한다.
- `unresolved`: 본문으로 판단하지 못했다. 이유는 `not_found`, `truncated`, `budget_limit`, `source_changed`처럼 남긴다.

제목, heading, `matched_terms`, 위키링크, relation, `source_confirmed`, `context_outline`과 검색 점수는 탐색 단서다. 이들만으로 조건의 status를 정하지 않는다. 일부 문장만 관련 있거나 예외 또는 적용 맥락이 빠진 source는 해당 원자 요구를 `unresolved`로 남긴다.

평가 기록에는 첫 호출 전에 고정한 조건과 원자 요구, 호출 이유, 실제 response byte, status와 아래 receipt를 남긴다. quote는 실제로 도구가 반환한 본문에서 그대로 옮긴 짧은 문장이다. 평가의 `requirements`는 사전 inventory의 `id`와 `question`을 순서까지 그대로 옮긴다. 조건의 `supported` 또는 `contradicted`는 그 조건의 모든 원자 요구가 각각 receipt를 가질 때만 쓴다.

```json
{
  "conditions": [{
    "id": "exception",
    "question": "예외와 적용 맥락은 무엇인가?",
    "origin": "stated_requirement",
    "requirements": [{
      "id": "exception-context",
      "question": "예외와 적용 맥락을 직접 설명하는가?"
    }]
  }],
  "assessments": [{
    "condition_id": "exception",
    "status": "supported",
    "reason": "예외를 포함한 원자 요구가 각각 본문으로 확인됐다.",
    "requirements": [{
    "id": "exception-context",
    "question": "예외와 적용 맥락을 직접 설명하는가?",
    "status": "supported",
    "reason": "반환된 본문이 예외와 맥락을 함께 설명한다.",
    "evidence": [{
      "id": "unit:...",
      "source_revision": "<commit>",
      "content_hash": "sha256:<hash>",
      "quote": "<returned source body excerpt>"
    }]
    }]
  }]
}
```

현재 trace는 아래 충분성도 함께 남긴다. `sufficient`는 사전 inventory의 모든 원자 요구가 해결됐을 때만 쓴다. 일부 원자 요구가 남고 다른 요구에는 직접 근거가 있으면 `partial`, 직접 근거가 하나도 없으면 `insufficient`다. 어휘 적중, 반환 문서 수와 heading은 이 status를 올리는 근거가 아니다. 이전 trace에 원자 요구가 없으면 재생기는 `not_assessed`로만 표시하며, 과거의 모든 `supported`를 충분한 답변으로 추론하지 않는다.

```json
{
  "sufficiency": {
    "status": "partial",
    "reason": "예외의 본문 근거가 아직 없다.",
    "unresolved_condition_ids": ["exception"]
  }
}
```

평가 trace의 각 호출은 실행 전에 `steps[]`에 `name`, `arguments`, `reason`, `condition_ids`를 기록한다. 답변 전에는 원 질문과 설명을 다시 대조한다. 패턴 이름의 언급만으로 동작 이유나 보장 경계를 설명했다고 판정하지 않는다.

평가에서는 이 기록 형식의 trace를 별도 입력으로 보관한다. trace는 평가 gold와 분리하며, gold는 결과 검사에만 쓴다.

## 평가 이력

첫 6문항 비교, 재현 명령과 trace 정정, 후속 충분성 및 음성 질문 관측은 [[Ontology-Condition-Evaluation]]에 보존한다. 결과의 범위와 한계는 해당 관측 기록을 따른다.

## 경계

이 절차는 lexical candidate의 recall, 문서 내 heading 탐색과 잘린 근거 이어 읽기를 조합한다. 의미적 관계 추론, 실제 프로젝트 적용 판단, 최신성 판정과 최종 답변의 정확도를 자동으로 해결하지 않는다. 해당 판단은 receipt의 원문과 현재 코드, 설정 및 런타임 근거를 별도로 대조한다.

## 관련 문서

- [[Development-Ontology|개발 판단 지도와 적용 절차]]
- [[Ontology-Evidence-Read|조회한 근거를 같은 원문에서 끝까지 읽기]]
- [[Ontology-Document-Outline|문서 목차 탐색]]
- [[Ontology-Document-Search|문서 후보 검색]]
- [[Ontology-Evidence-Lifecycle|근거 관리와 필수 근거 평가]]

상위: [[Ontology-Reference]].
