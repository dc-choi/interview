---
tags: [ai, ontology, retrieval, mcp, search]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["온톨로지 문서 검색", "Ontology Document Search"]
---

# 문서 후보를 페이지로 찾기

`context_search`는 pinned snapshot 안에서 어휘가 겹치는 `Document` 후보를 찾는다. 본문이나 section 발췌는 반환하지 않는다. 많은 후보를 먼저 훑고 필요한 원문만 후속 도구로 읽기 위한 탐색 API다.

검색의 후보 순위는 `context_lookup`이 root 6개를 자르기 전 사용하는 순위와 같다. 따라서 `context_search`는 lookup보다 더 많은 문서를 페이지로 보이지만, 의미 관계나 최종 답변의 근거를 확정하지 않는다.

## 입력

| 입력 | 의미 |
| --- | --- |
| `query` | 필수. 공백만 있는 값은 거부한다. |
| `scope` | 선택. repository-relative prefix 배열로 검색 범위를 더 좁힌다. |
| `max_bytes` | 선택. JSON 응답 전체 예산이다. 기본 65,536 byte이고 서버 상한도 65,536 byte다. |
| `cursor` | 선택. 이전 응답의 `pagination.next_cursor`를 그대로 전달한다. |

`depth`는 문서 검색 입력이 아니다. host allowlist, snapshot의 indexed path, 요청 `scope`의 교집합 밖 문서는 후보에 넣지 않는다. 범위가 색인되지 않았으면 결과는 비어 있고 `index_sync`와 `coverage_gaps`에 그 상태가 남는다.

## 응답

응답은 `query`, `result_status`, `index_sync`, `matching`, `candidates`, `coverage_gaps`, `limitations`, `pagination`, `budget`을 담는다. `matching`에는 기존 조회 진단과 정규화된 `query_terms`가 있다.

각 `candidates` 항목은 다음 필드로 구성된다.

| 필드 | 의미 |
| --- | --- |
| `document` | 공개 Document metadata다. 원문 path, revision, hash와 body는 여기에 없다. |
| `source_uri` | 후보 원문 경로다. |
| `matched_terms` | source URI, label, alias, tag, heading과 여러 Section 본문의 어휘 겹침을 합친 검색어다. 의미적 적합성 점수나 본문 주장 검증 결과가 아니다. |
| `best_evidence_ref` | 문서 root 점수와 독립적으로 고른 근거 또는 기본 Section의 ID, type, label, source URI, revision, hash, anchor다. 없으면 `null`이다. 본문은 포함하지 않는다. |

부분 매칭은 internal ID prefix, source ID, percent-encoded anchor 같은 storage 표현을 사용하지 않는다. 다만 query가 entity ID 전체와 정확히 같으면 exact ID 검색은 유지한다. partial score가 우연히 exact score와 같은 값이 되어도 `matching.assessment: exact_metadata`는 exact field equality가 있을 때만 설정된다. 실제 field equality가 있는 Document와 Section은 부분 어휘 점수보다 먼저 순위에 반영된다.

정규화 후 한 토큰인 exact alias 또는 title 질의는 전체 색인 문서의 본문 스캔을 생략한다. 대신 정확히 찾은 후보 문서의 유용한 Section 본문만 읽어 `best_evidence_ref`의 읽기 시작점을 고른다. 점수 기반의 읽기 시작점 선택에서는 heading이 없는 기존 root Section을 제외한다. 다만 query가 그 root ID 전체와 정확히 일치하면 이 예외를 보존한다. 문서 root의 frontmatter provenance는 `context_lookup`의 근거 흐름에서 별도로 보존한다. `best_evidence_ref`는 원문을 읽기 위한 시작점이지만 fallback reference의 본문이 검색어를 포함한다고 보장하지 않는다. `matched_terms`도 여러 Section의 겹침을 합치므로 이 참조의 본문에 모두 있다고 가정하지 않는다. `matching.assessment`와 후보 존재만으로 문서가 질문에 답한다고 판단하지 않는다.

## 페이지와 cursor

한 페이지는 후보를 최대 20개 담는다. 응답 예산이 먼저 차면 더 적게 담고 `budget.exhausted`를 `true`로 표시한다. 후보 하나도 넣을 수 없으면 반복되는 빈 페이지 대신 `budget_too_small`로 끝난다. `context_lookup`의 근거 pack은 `budget.exhausted`를 제한의 정본으로 보고, `output_limit_reached` coverage gap은 최종 응답에 여유가 있을 때만 보충한다. gap이 없어도 예산 제한이 없었다는 뜻은 아니다.

`pagination.offset_documents`는 현재 후보 인덱스, `returned_documents`는 이번 개수, `total_candidates`는 이 검색의 전체 후보 수다. `complete: false`면 `next_cursor`를 다음 요청으로 넘긴다. 마지막 페이지는 `complete: true`, `next_cursor: null`이다. 후보가 없으면 `result_status: insufficient_evidence`이며 완료된 빈 결과를 반환한다. 후보가 남으면 `partial`, 마지막 비어 있지 않은 페이지면 `ok`다.

다음 페이지에서 `max_bytes`는 바꿔도 된다. cursor는 exact query, effective scope, snapshot fingerprint, manifest hash, 로드한 query 코드 hash를 함께 묶는다. 하나라도 달라지면 `cursor_mismatch`로 처음부터 다시 검색해야 한다. 형식이 잘못됐거나 2,048 byte를 넘는 cursor는 `invalid_cursor`다.

cursor는 서명이나 인증 수단이 아닌 unsigned consistency token이다. 보관하거나 해석하거나 다른 검색에 재사용하지 않는다.

## 근거 확인 흐름

1. 첫 페이지를 보고 필요한 문서가 없으면 같은 `query`, `scope`와 `next_cursor`로 한 페이지 더 탐색한다. 두 페이지 뒤에도 부족하면 표현이나 scope를 조정한다. 관련 문서를 찾으면 바로 목차나 원문을 읽는다.
2. 후보의 제목, 경로와 `matched_terms`를 보고 확인할 Document를 고른다.
3. `best_evidence_ref`가 있으면 그 ID, `source_revision`, `content_hash`를 [[Ontology-Evidence-Read|context_read]]에 전달해 본문을 읽는다.
4. 같은 Document의 다른 조건, 예외 또는 관련 heading도 확인해야 하면 [[Ontology-Document-Outline|context_outline]]에 `document.id`와 `index_sync`의 revision을 전달한다. 필요한 section receipt를 골라 `context_read`로 읽는다.
5. 읽은 원문과 현재 프로젝트의 코드, 설정, 운영 근거를 대조한 뒤에만 적용 판단을 한다.

목차는 source navigation이며 본문 근거가 아니다. `context_read`는 pinned Git blob을 읽으므로 dirty worktree의 새 본문을 섞지 않고 `index_sync`에 `unindexed_worktree` 상태를 표시한다.

## CLI와 MCP

`ontology/`에서 CLI를 실행할 수 있다.

```bash
node src/cli.mjs search --committed-only \
  --scope tech \
  --query 'transactional outbox' \
  --max-bytes 24000
```

다음 페이지는 같은 `--query`, `--scope`에 반환된 `--cursor '<next_cursor>'`를 추가한다. `--allow`는 host 또는 CLI의 허용 범위를 정하고, `--scope`는 그 안에서 이번 검색 범위만 줄인다. `--repo`와 `--cache`도 지원한다.

MCP는 `context_search`로 같은 `query`, 선택 `scope`, `max_bytes`, `cursor`를 받는다. 저장소나 cache 경로는 tool argument로 바꿀 수 없다. 새 MCP 프로세스를 연결한 뒤 `tools/list`에서 도구가 보이는지 확인한다.

상위: [[Development-Ontology]]. 운영: [[Ontology-Operations]]. 후속 읽기: [[Ontology-Evidence-Read]], [[Ontology-Document-Outline]].
