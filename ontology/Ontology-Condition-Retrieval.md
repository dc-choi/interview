---
tags: [ai, ontology, retrieval, evidence, mcp]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["Condition Retrieval", "조건별 근거 탐색"]
---

# 조건별 근거 탐색

> 유형: 여러 근거가 필요한 질문을 위한 host 작업 계약
> 현재 범위: 기존 `context_lookup`, `context_search`, `context_outline`, `context_read`의 호출 순서를 제한하고 첫 lookup의 선택적 lexical `conditions` 단서를 사용한다. 서버의 의미 판정은 추가하지 않는다.

Codex와 Claude의 `development-context` 스킬에 같은 절차를 반영했다. 스킬은 다음 파일 로드부터, 상주 MCP의 갱신된 도구 설명은 재연결부터 읽힌다. 이미 연결된 서버의 설명이 자동으로 바뀌었다고 가정하지 않는다.

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

일반 작업의 내부 메모에는 첫 호출 전에 고정한 조건과 원자 요구, 호출 이유, 실제 response byte, status와 아래 receipt를 남긴다. quote는 실제로 도구가 반환한 본문에서 그대로 옮긴 짧은 문장이다. 평가의 `requirements`는 사전 inventory의 `id`와 `question`을 순서까지 그대로 옮긴다. 조건의 `supported` 또는 `contradicted`는 그 조건의 모든 원자 요구가 각각 receipt를 가질 때만 쓴다.

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

## 첫 관찰과 비교, 2026-09-08

별도 작성자가 검색 구현과 결과를 보지 않고 committed 원문에서 새 질문 6개를 만들었다. 기술 4개, 사업 1개, 경제 1개이며 모두 근거가 존재하는 양성 사례다. 질문과 정답 파일을 분리한 뒤 다른 host가 질문과 실제 반환 결과만 보고 탐색했다. 정답이나 64KB 대조 결과로 후속 대상을 고르지 않았다.

원문 revision은 `4af3516d519b62d6840b04c79d1e25aba846d80d`, fingerprint는 `7ffdefc7aea57c401552d40e5b97e2082aa528c451650b4ec1261fe05a0f5991`이다. 검색 함수는 이번 작업에서 바꾸지 않았다. 성공한 응답의 색인 상태는 `unindexed_worktree`이며 미커밋 지식을 검색한 결과가 아니다.

| 방식 | 필수 근거 모두 충족 | 근거 그룹 충족 | 6문항 응답 byte 합계 | 도구 실행 중앙값 |
| --- | ---: | ---: | ---: | ---: |
| 단일 검색, 질문당 24,000 상한 | 1/6 | 5/12 | 143,205 | 696ms |
| 단일 검색, 질문당 64,000 상한 | 2/6 | 7/12 | 365,003 | 687ms |
| 조건별 후속 탐색, 질문당 합계 64,000 상한 | 3/6 | 7/12 | 186,617 | 1,028ms |

byte는 실제 `structuredContent` JSON 합계이며 MCP envelope는 제외했다. 같은 64,000 상한 비교도 실제 사용량은 다르다. 시간은 고정한 경로의 MCP 재실행 1회 관측으로, host의 사고 시간과 실제 작업 전체 시간을 포함하지 않는다. 모델과 reasoning 설정은 host 실행 기록에 남기지 못했다.

- 24KB 첫 검색 대비 refresh token 동시 갱신과 가격 인상 후 매출 질문이 추가 통과했고, 통과하던 질문의 손실은 없었다.
- 64KB 단일 검색 대비 위 두 질문은 추가 통과했지만 schema rollout 질문의 통과를 잃었고, metric cardinality 질문의 부분 근거도 줄었다. 전체 그룹 수는 7/12로 같으므로 일반적인 검색 우위를 주장하지 않는다.
- 실제 호출은 lookup 6회, outline 3회, read 5회로 총 14회다. read 실패 1회도 포함한다. 질문별로 1~4회, 최대 43,204 byte를 사용했다. 추가 query 검색은 이 표본에서 사용하지 않았으므로 그 효과는 아직 관측하지 않았다.
- host가 적은 15개 조건은 모두 `supported`였지만 이 조건 목록과 평가의 12개 그룹은 기준이 다르다. 인용 문장이 존재한다는 검사만으로 의미적 완결성이나 최종 답변의 정확도를 입증하지 않는다. 음성 질문의 오탐도 이번 표본에 포함하지 않았다.

별도 검토자는 점수상 실패한 rollout, metric, invariant 질문에서도 다른 반환 원문이 관련 설명을 제공한다고 확인했다. 고정 정답 목록이 유효한 대안 원문을 빠뜨릴 수 있다는 관찰이며, 이번 점수를 높이려고 정답 경로를 추가하지 않았다. 15개 조건 중 backfill 중단과 재개 조건은 반환된 전체 본문에 설명이 있지만 trace에 옮긴 인용은 배치 실행만 언급해 불충분했다. 이 인용과 판정 기록도 사후에 고치지 않고 한계로 보존했다.

실행 중 문구와 인자 설명을 보강했으므로 이 결과는 사전에 상한을 전달한 초안 host 절차의 첫 관찰이다. 최종 스킬 파일의 지시를 그대로 재현한 성능 평가로 부르지 않는다. 보고서의 `replay_artifact_hashes`는 재실행 시점의 파일 hash다.

## 재현과 감사 기록

[질문](evaluation/condition-followup/questions-2026-09-08.json), [평가 정답](evaluation/condition-followup/labels-2026-09-08.json), [고정 탐색 기록](evaluation/condition-followup/plans-2026-09-08.json), [비교 보고서](evaluation/condition-followup/report-2026-09-08.json)와 [작성 및 정정 이력](evaluation/condition-followup/provenance-2026-09-08.json)을 분리해 보관한다.

최초 trace에서 실패한 CLI 요청의 ID를 성공한 요청의 ID로 잘못 옮겨, 재실행기가 정답 파일을 열기 전에 불일치를 거부했다. 실제 실행 로그와 대조해 그 필드 하나만 원래의 오타 ID로 복구했다. [최초 trace](evaluation/condition-followup/plans-initial-2026-09-08.json)도 보존하며, 실제 실패 1회를 지우거나 성공으로 대체하지 않았다.

아래 명령은 현재 조회 코드로 고정 경로를 다시 실행한다. 같은 관측을 비교하려면 보고서의 코드 hash, revision과 fingerprint도 일치하는지 확인한다. 스킬의 지시를 실행하거나 질문의 재해석과 모델의 탐색 선택을 다시 생성하는 명령은 아니다.

```bash
node ontology/evaluation/condition-followup.mjs \
  --questions ontology/evaluation/condition-followup/questions-2026-09-08.json \
  --labels ontology/evaluation/condition-followup/labels-2026-09-08.json \
  --plans ontology/evaluation/condition-followup/plans-2026-09-08.json \
  --expected-plans-hash 0cfeebf5b4b6c9d31dfba61fb008f3e9124e439ba3afc10a1d2b80e2e012da62 \
  --output /tmp/ontology-condition-replay.json
```

검증기는 정해진 실패를 포함한 호출, 총 byte, scope, revision, 인용 ID와 hash, 이전에 반환된 목차 위치와 검색 cursor, 연속 읽기와 완전한 본문의 hash를 검사한다. lookup/search의 fingerprint와 manifest hash 및 실행 전후 snapshot을 대조하며 정답은 전체 탐색 후에만 읽는다. 모델의 의미 판단은 자동 검증하지 않는다. 테스트 136개가 통과했고 실제 MCP 재실행에서도 상한과 receipt 검사가 통과했다.

## 충분성과 음성 질문의 새 관측

별도 작성자와 탐색 host를 분리한 새 합성 질문 9개에서 조회 21회를 기록했다. 양성 4개, 현재 운영 사실 3개와 혼합 2개이며 질문별 scope를 미리 지정했다. 첫 lookup의 조건 힌트 비교는 전체 충분성 개선 없이 일부 근거의 증가와 손실을 함께 보였다. 최종 host 스킬은 힌트를 기본으로 생략한다.

host가 충분하다고 판정한 양성 4개 중 2개는 독립 검토에서 Relay 중복 발생 경계 또는 jitter가 재시도 파형을 분산하는 설명이 빠졌다. 운영 사실 3개를 미확인, 혼합 2개를 부분 근거로 남긴 판단에는 문제가 발견되지 않았다. 최종 스킬은 동작 원리와 보장 경계를 명시적으로 대조하지만 이 문구 보강의 효과를 새 표본에서 입증한 것은 아니다.

원본 trace는 호출 전 `reason`과 `condition_ids`가 없어 검증기가 재생 전에 거부했다. 사후 inventory export를 호출 전 hash 고정으로 주장하지 않는다. 최종 규칙의 완전한 실행 평가가 아닌 첫 관측으로 [질문, 기준과 실제 응답](evaluation/sufficiency/sufficiency.md)을 보존한다. 현재 구현의 Node 테스트 145개는 통과했다.

## 경계

이 절차는 lexical candidate의 recall, 문서 내 heading 탐색과 잘린 근거 이어 읽기를 조합한다. 의미적 관계 추론, 실제 프로젝트 적용 판단, 최신성 판정과 최종 답변의 정확도를 자동으로 해결하지 않는다. 해당 판단은 receipt의 원문과 현재 코드, 설정 및 런타임 근거를 별도로 대조한다.

## 관련 문서

- [[Development-Ontology|개발 판단 지도와 적용 절차]]
- [[Ontology-Evidence-Read|조회한 근거를 같은 원문에서 끝까지 읽기]]
- [[Ontology-Document-Outline|문서 목차 탐색]]
- [[Ontology-Document-Search|문서 후보 검색]]
- [[Ontology-Evidence-Lifecycle|근거 관리와 필수 근거 평가]]
