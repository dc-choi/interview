---
tags: [ai, ontology, evidence, mcp]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["온톨로지 근거 이어 읽기", "Ontology Evidence Read"]
---

# 조회한 근거를 같은 원문에서 끝까지 읽기

`context_lookup`의 발췌는 section 앞부분을 최대 1,400 byte까지 반환한다. `context_search`는 본문 없이 `best_evidence_ref`만 반환한다. 정규화 후 한 토큰인 exact alias 또는 title 질의도 전체 색인 본문을 훑는 대신 그 후보 문서의 유용한 Section을 읽어 시작점을 고를 수 있다. 중요한 조건이나 예외가 잘렸거나 검색 후보의 원문을 확인해야 할 때 `context_read`로 해당 근거를 더 읽을 수 있다. `best_evidence_ref`가 fallback으로 선택됐을 때는 그 본문에 query 어휘가 있다는 보장이 없으므로 읽은 뒤에 확인한다. 원문 탐색과 역할/적용 판단은 [[Development-Ontology-Contract]]를 따른다.

## MCP 입력과 응답

`context_lookup`의 evidence unit, [[Ontology-Document-Search|문서 검색]]의 `best_evidence_ref`, 또는 [[Ontology-Document-Outline|문서 목차]]의 section에서 다음 세 값을 그대로 복사한다.

| 입력 | 의미 |
| --- | --- |
| `evidence_unit_id` | 조회 결과의 `id`. snapshot에서 해당 근거를 찾는 키 |
| `source_revision` | 조회한 Git commit |
| `content_hash` | 조회 결과의 `sha256:...` 값. 전체 근거 단위의 원문 hash |
| `offset_bytes` | 선택. 근거 단위 시작 기준 상대 byte 위치이며 기본값은 0 |
| `max_bytes` | 선택. JSON 응답 전체의 byte 예산이며 기본 24,000, 상한 65,536 |

파일 경로, anchor, 저장소와 cache는 호출자가 지정하지 않는다. 서버는 검증된 snapshot에서 원문 위치를 찾고, host allowlist와 indexed scope 안에 있는 `Section` 또는 `RelationAssertion`만 읽는다. `Document` ID는 원문 읽기 입력으로 사용할 수 없다.

근거 ID와 입력 JSON 전체는 각각 최대 65,536 UTF-8 byte다. 성공한 조회 응답의 긴 ID도 읽기 입력으로 사용할 수 있도록 조회 출력 상한과 같은 크기로 제한한다.

응답의 `evidence_unit`은 원래 ID, revision, anchor와 전체 원문 hash를 유지한다. `excerpt`에는 이번 페이지 본문이 담긴다. `pagination`은 이번 시작 위치, 전체 byte 수, 다음 위치와 끝 도달 여부를 반환한다.

`pagination.complete`가 false이면 같은 ID, revision과 hash를 사용하고 `pagination.next_offset_bytes`를 다음 요청의 `offset_bytes`로 넘긴다. 처음부터 전체 근거를 읽으려면 0에서 시작해 마지막 페이지까지 순서대로 이어 붙인다. 이어 붙인 UTF-8 본문의 SHA-256은 `content_hash`와 같아야 한다.

`evidence_unit.truncated`가 false인 경우는 offset 0에서 근거 전체를 한 번에 반환했을 때다. 여러 페이지로 읽은 마지막 페이지는 `pagination.complete: true`여도 그 페이지 단독으로 전체 근거가 아니므로 `truncated: true`다.

페이지 경계는 UTF-8 문자를 자르지 않는다. 문자의 중간 byte를 시작 위치로 지정하면 거부한다. 남은 내용이 있는데 한 문자와 메타데이터도 예산에 담지 못하면 빈 페이지로 반복하지 않고 `budget_too_small`로 끝낸다. 상한은 본문뿐 아니라 JSON escape와 메타데이터를 포함하며 `budget.used_bytes`는 실제 JSON 직렬화 크기다. 이 도구의 페이지 예산과 별개로 `context_lookup` 근거 pack은 `budget.exhausted`를 제한의 정본으로 보고, `output_limit_reached` coverage gap은 최종 응답에 여유가 있을 때만 붙인다.

긴 ID나 anchor 때문에 `budget_too_small`이면 같은 시작 위치에서 `max_bytes`를 최대 65,536까지 늘려 다시 읽을 수 있다. 상한에서도 읽을 수 없으면 근거 부족으로 남긴다.

## 원문이 바뀌었을 때

MCP와 CLI는 요청 시작에 현재 snapshot을 확인한다. 요청 revision과 snapshot revision이 다르면 `snapshot_revision_mismatch`, revision이 같아도 근거 hash가 다르면 `evidence_mismatch`로 거부한다. 이때 `context_lookup`을 다시 호출하고 새 근거의 처음부터 읽는다. 이전 페이지와 새 조회의 페이지를 합치지 않는다.

서버가 허용 범위를 바꾸거나 근거가 사라져 읽을 수 없으면 `evidence_not_found`로 끝난다. 임의의 과거 Git revision을 읽는 API가 아니며, 캐시가 바뀌었다고 다른 원문으로 자동 대체하지 않는다.

읽을 때 pinned Git blob에서 근거 단위의 byte 범위를 확인하고, 해당 범위의 SHA-256을 검증한다. 미커밋 본문은 읽지 않는다. dirty worktree이면 pinned 원문을 반환하되 `index_sync`에 `unindexed_worktree`를 표시한다. 원문의 내용과 현재 코드가 같은 의미인지, 최신인지, 현재 프로젝트에 적합한지는 이 무결성 검사와 별도로 확인한다.

## CLI

`ontology/`에서 `node src/cli.mjs read`를 실행한다. 실제 조회 결과에서 세 식별 값을 가져와 아래 자리표시자를 바꾼다.

```bash
node src/cli.mjs read --committed-only \
  --evidence-unit-id '<조회 결과의 id>' \
  --source-revision '<조회 결과의 source_revision>' \
  --content-hash '<조회 결과의 content_hash>' \
  --offset-bytes 0 --max-bytes 24000
```

`--repo`, `--cache`, 반복 가능한 `--allow`도 받는다. `read`의 대상은 근거 ID 하나이므로 `--query`, `--depth`, `--scope`는 받지 않는다. 다음 페이지도 같은 명령에서 `--offset-bytes`만 반환된 다음 위치로 바꾼다.

## 적용 범위

새 MCP 프로세스는 `context_search`, `context_lookup`, `context_outline`, `context_read` 네 도구를 노출한다. `context_search`에서 Document 후보를 고른 뒤 `best_evidence_ref`를 바로 읽거나, 다른 heading도 확인해야 하면 `context_outline`으로 section receipt를 찾고 읽는다. 이미 연결된 프로세스는 이전 코드를 유지하므로 새 도구의 사용 가능 여부를 실제 `tools/list`로 확인한다. 현재 세션에 도구가 없으면 CLI 또는 같은 revision의 Git 원문 읽기로 보완한다.

근거 이어 읽기는 이미 찾은 section의 누락된 뒷부분을 제공한다. 찾지 못한 문서의 검색 순위, 의미적 충돌 판정이나 모델의 자동 도구 선택을 해결했다는 뜻은 아니다. 검증 결과는 [[Development-Ontology-Evaluation]]에 기록한다.

상위: [[Development-Ontology]]. 운영: [[Ontology-Operations]]. 근거 관리: [[Ontology-Evidence-Lifecycle]].
