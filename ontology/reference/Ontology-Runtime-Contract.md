---
tags: [ontology, retrieval, snapshot, reference]
status: done
category: "AI엔지니어링(AIEngineering)"
---

# 온톨로지 검색, 관계와 snapshot의 실행 계약

현재 조회기의 선택 순서와 저장 계약을 설명한다. 설치와 MCP 등록은 [[Ontology-Operations]], 관측 이력은 [[Ontology-History]]에서 확인한다.

## 구현 범위

| 항목 | 현재 동작 |
| --- | --- |
| 입력 | Git `HEAD`의 tracked regular Markdown blob, 기본 범위 `README.md`, `biz/`, `econ/`, `fit/`, `ontology/`, `tech/` |
| 제외 | `AGENTS.md`, `CLAUDE.md`, 비 Markdown, symlink, untracked와 dirty worktree 본문. `.agents/`, `.claude/`는 기본 범위 밖 |
| 추출 | frontmatter의 `aliases`, `tags`, `category`, `status`, `verified_at`, heading section, 위키링크, 명시 `ontology_relations` |
| 관계 | `contains`, 해석 가능한 `links_to`와 선택적 구조 역할 `link_role`, schema와 entity ID가 맞는 명시 relation |
| 근거 | 원문 path, pinned revision, UTF-8 byte anchor, 해당 byte SHA-256, 마지막 변경 commit 시각 |
| 조회 | exact label, alias, tag, heading과 키워드, source-confirmed relation 1 또는 2 hop |
| MCP | stdio 서버의 읽기 전용 `context_search`, `context_lookup`, `context_outline`, `context_read` |

관계 ID는 subject, predicate, object, evidence unit ID, occurrence의 안정 JSON SHA-256이다. section ID의 heading component는 `encodeURIComponent`로 인코딩하고 빈 heading은 `%`로 구분한다. 같은 heading path의 occurrence를 ID와 anchor에 보존한다. 이 때문에 `A/B` heading과 `A` 아래의 `B` heading이 다른 entity가 된다. 위키링크 대상은 파일 경로와 파일명으로 찾으며, 표 셀 안에서 파이프를 escape한 `[[대상\|별칭]]` 표기도 대상만 추출한다. H1 제목과 frontmatter alias는 검색에만 사용한다. Document의 `verified_at`은 조회 결과의 entity 속성으로 반환하지만 freshness 판정에는 아직 쓰지 않는다.

`config.json`의 `repository_id`는 이 Vault의 고정 ID다. 장비나 checkout 경로가 바뀌어도 유지해야 Markdown에 기록한 typed relation이 보존된다. 이 runtime 설치는 Vault 하나를 대상으로 하며, 다른 독립 Vault를 구축할 때는 ID를 분리한다. cache와 snapshot fingerprint는 실제 checkout 경로도 구분한다.

## 후보 검색과 순위

검색은 실제 field equality가 있는 label, alias, tag, heading과 entity ID를 부분 어휘 점수보다 먼저 순위에 두고, 문서당 읽기 시작 Section과 상위 root 6개를 선택한다. 정규화와 키워드 확장 뒤 2~3개 토큰인 짧은 질의는 문서 빈도를 이용해 구체 용어가 없는 일반어 후보를 제외한다. 더 긴 자연어 질의에는 이 제외 규칙을 적용하지 않는다. 정규화와 확장 후 8개 미만 토큰인 질문에서는 개별 토큰이 Document 제목 또는 alias 전체와 같은 후보를 일반 어휘 점수보다 먼저 둔다. `status: index`인 목차는 이 우선권에서 제외한다. tag는 이 주제명 우선권에 사용하지 않고, 질문 전체의 정확한 metadata 일치는 계속 최우선이다. 8개 이상이면 여러 조건이 일반 주제명에 밀리지 않도록 기존 어휘 순위를 유지한다. 정규화 후 한 토큰인 exact alias 또는 title 질의는 전체 색인 본문 스캔을 생략하되, 정확히 찾은 후보 문서의 유용한 Section 본문은 읽어 시작점을 고른다. 점수 기반 읽기 시작점에서는 heading이 없는 기존 root Section을 제외하지만, query가 root ID 전체와 정확히 일치하면 이 조회는 보존한다.

## 근거 구성과 응답 예산

정확한 metadata 조회의 응답 예산은 body direct 근거, graph bundle, 선택 frontmatter provenance 순으로 쓴다. 자연어 조회의 추가 절 선택 순서는 다음 문단을 따른다. 작은 예산에서 선택한 direct 근거 없이 선택 provenance만 남겨 성공으로 반환하지 않으며, direct 근거 하나와 필수 메타데이터도 담지 못하면 `budget_too_small`로 끝난다. 구성 중에는 `budget.exhausted`만 제한을 기록하고, 최종 응답에 여유가 있을 때만 `output_limit_reached` coverage gap을 보충한다. direct 근거가 남은 positive pack은 예산 제한으로 축소됐으면 `partial`로 반환한다. 예산에 맞지 않는 묶음은 누락 수로 보고하며, 최종 축소에서도 남은 직접 근거에 필요한 문서를 보존한다. 작은 예산에서 모든 관계의 반환을 보장하지는 않는다.

정확한 metadata 일치가 없는 조회에서는 직접 근거를 담고 응답 전체에서 직접 관계 하나를 먼저 추가한 뒤, 선택된 root와 graph 문서에서 질의어가 겹치는 절을 최대 6개 보충한다. 이미 반환된 본문에 반복된 질의어의 가중치를 낮춰 다른 어휘를 다루는 절을 우선한다. heading 없는 root와 출처/관련 문서 절은 제외한다. 보충 절은 1,400 byte 접두를 먼저 담되 검색어가 뒤에만 있으면 전체 절이 예산에 맞을 때만 추가한다. 선택한 절의 전체 본문 확장, 나머지 graph 묶음과 provenance, 마지막 본문 확장 순으로 남은 예산을 사용한다. 문서 소유권과 ID/revision/hash/anchor는 보존하며, 상세 비교와 한계는 [[Ontology-Search-Selection]]을 따른다. 더 깊은 문맥은 `context_outline`과 `context_read`로 확인한다.

`conditions` 힌트를 전달하면 정확한 metadata 일치가 있어도 보충 절 선택을 수행한다. 각 조건의 어휘 겹침을 단서로 사용하며, 의미적 충족 판정과 호출 제한은 [[Ontology-Condition-Retrieval]]을 따른다.

## 문서 검색과 원문 일치

부분 매칭은 source URI, label, alias, tag, heading, section 본문만 사용한다. internal ID prefix, source ID와 percent-encoded anchor는 storage 표현이라 부분 매칭에서 제외한다. query가 entity ID 전체와 정확히 같은 exact ID 검색은 유지한다. `exact_metadata`는 점수와 별도로 실제 필드의 완전 일치 여부로 판정한다.

`search`와 `context_search`는 같은 root 순위를 상위 6개로 자르기 전에 사용해 Document 후보를 페이지로 반환한다. 페이지는 최대 20개 후보이며 body나 excerpt를 반환하지 않는다. 검색어, effective scope, snapshot과 query 코드가 바뀌지 않는 한 cursor로 이어 읽고, 다음 페이지에서 `max_bytes`는 바꿀 수 있다. 후보의 `matched_terms`는 실제 source 표현과 여러 section의 어휘 겹침이므로 의미적 적합성 판정이 아니다. `best_evidence_ref`는 문서 root 점수와 독립적으로 읽기 시작 section을 고르지만 fallback reference 자체에 query body가 있다는 보장은 없다. root frontmatter provenance는 lookup 근거로 별도 보존한다. 계약과 후속 읽기 흐름은 [[Ontology-Document-Search]]를 따른다.

## 관계 탐색

관계 탐색에서는 근거 unit의 현재 질문 점수를 먼저 본다. Section은 metadata와 본문 점수, RelationAssertion은 predicate와 endpoint 등의 metadata 점수를 사용한다. 동점이면 상대 entity 소유 Document의 점수, 구조 역할, relation ID 순으로 선택한다. 구조 역할은 `index_member`와 `parent_index`, `related_document`, 역할 없는 연결 순이며 두 질문 점수를 바꾸지 않는다. `출처`, `관련 문서`, `관련문서` section에는 이 우선순위용 점수를 부여하지 않는다. 관계가 기록된 본문과 상대 문서의 다른 본문을 구분하기 위한 순서이며, 원문 확정 상태와 scope, hop, entity와 edge 상한은 그대로 검사한다.

## 검색 비용과 진단

정규화 후 한 토큰이며 정확한 metadata가 일치하면 전체 색인 본문 스캔은 생략한다. 정확히 찾은 후보 문서의 유용한 Section 본문과, 관계 순위에 필요한 현재 탐색 entity의 연결 근거 본문만 batch로 읽고 재사용한다. 검색어 가중치는 1이며 동일한 metadata 점수와 길이 감점을 적용한다. 이 추가 점수는 root 순위를 바꾸지 않는다.

본문 점수에는 section 길이에 따른 완만한 감점을 적용하며 정확한 metadata 점수는 유지한다. `matching.query_term_count`는 정규화와 확장 후 검색어 수, `max_section_term_matches`는 같은 section의 metadata와 본문에 겹친 서로 다른 검색어 수의 최댓값이다. `assessment`는 `exact_metadata`, `lexical_overlap`, `no_lexical_overlap`, `weak_lexical_overlap`, `not_evaluated`를 구분한다. 검색어 8개 이상이면서 최대 겹침이 1~2개이면 `weak_lexical_overlap`이다. 후보를 삭제하는 규칙이나 의미적 적합성, 지식 부재의 확정 판정이 아니며, 관련성을 확인하고 재조회할 단서다.

전체 본문 스캔은 고정 revision의 파일 목록을 한 번 해석해 조회 대상 Document의 OID를 얻고 기존 `readBlobs`로 읽는다. scope, 경로별 symlink 검사와 대상 문서 수를 확인하며, 반환 근거의 hash 검사는 그대로 수행한다. 좁은 exact/graph 읽기는 기존 batch 경로를 쓴다. 응답 byte 계산도 한 번의 직렬화로 줄였으며, 출력 동등성과 반복 시간 비교는 [[Ontology-Retrieval-Latency]]를 따른다.

## 기존 목차와 위키링크의 역할

extractor 11은 Markdown에 이미 적힌 탐색 역할을 `links_to` 관계의 `link_role`로 보존한다. predicate, relation ID, 원문 section과 occurrence는 그대로 유지하며 새 의미 관계를 생성하지 않는다.

| 역할 | 원문 표기 |
| --- | --- |
| `index_member` | `status: index` 문서의 `목차`, `하위 영역`, `하위 폴더 인덱스`, `하위 문서` 아래 링크. `목차 (설명)`과 `하위 폴더 인덱스 (숫자개)`도 허용 |
| `parent_index` | 같은 줄의 명시적인 `상위:` 바로 뒤 링크. `> 상위:` 같은 인용 블록 표기도 포함 |
| `related_document` | `관련 문서` 또는 `관련문서` 아래 링크 |

인용 블록 안의 heading은 블록 안팎의 목차/관련 역할을 결정하지 않으며, 자기 문서 section 링크에도 역할을 붙이지 않는다. 구체적인 인식 범위와 제외 사례는 `test/markdown.test.mjs`에서 검증한다. 역할이 불명확하면 기존 `links_to`만 유지한다. 폴더 위치 자체를 개념 계층으로 추론하거나 Obsidian 설정을 읽고 수정하지 않는다. 검색과 목차, 원문 읽기의 입력은 동일하며 `context_lookup`은 역할과 기존 근거를 함께 반환한다. extractor가 바뀌었으므로 새 CLI 또는 MCP 프로세스가 snapshot을 다시 만든다. 기존 MCP 프로세스는 재연결해야 변경된 코드를 읽는다.

## Snapshot 저장과 무결성

기본 cache는 `~/.cache/context-ontology/<checkout-hash>/`다. cache는 source repository 밖이어야 하고, `active.json`, `runs.jsonl`, `.context-ontology-cache` 소유권 표식과 활성 snapshot을 보관한다.

비어 있지 않은 사용자 지정 cache에 표식이 없으면 `invalid_cache_path`로 거부해 다른 데이터를 정리 대상으로 오인하지 않는다. 최초 표식의 내용이 아직 비어 있거나 정상 내용의 앞부분만 기록됐으면 50ms 간격으로 최대 20회 재확인한다.

총 대기 1초 뒤에도 불완전하거나 내용 또는 파일 형식이 잘못됐으면 계속 `invalid_cache_path`로 거부하며, 중단된 초기화를 자동 복구하지 않는다. build는 기존 snapshot 재사용 검증, 활성화와 삭제를 cache의 `.lock`으로 프로세스 간 직렬화한다.

lock symlink 대상은 보유 프로세스 pid와 무작위 token을 함께 가지므로 종료 시 후속 보유자의 lock을 지우지 않는다. 살아 있는 보유자는 최대 10분 기다리며, 보유 프로세스가 사라진 lock은 `cache_lock_stale`, 형식이 잘못된 lock은 `snapshot_integrity_error`로 중단한다.

자동 stale-lock 회수는 원자적 소유권 교체를 보장할 수 없어 하지 않으며, 실행 중인 build가 없음을 확인한 뒤 해당 `.lock`만 수동 제거한다. 정상 활성화 뒤에는 활성 snapshot 외의 fingerprint 디렉터리와 10분이 지난 `.building-*`, `.active-*`, 이전 구현이 남긴 `.lock.dead-*` 임시 항목을 삭제해 `pruned_snapshots`, `pruned_temporaries`로 건수를 보고한다.

조회는 lock 없이 읽으므로 파일 존재 확인 뒤 실제 읽기 사이에 이전 snapshot이 삭제돼도 `snapshot_not_found`로 분류한다. CLI와 MCP 조회는 clean worktree이거나 `--committed-only`이면 같은 요청에서 필요한 범위로 다시 빌드한다.

이미 메모리에 읽은 snapshot은 요청이 끝날 때까지 유지한다. `snapshots` 경로가 symlink이거나 디렉터리가 아니면 `snapshot_integrity_error`로 거부한다.

같은 fingerprint 디렉터리에 artifact가 빠져 있으면 build가 방금 만든 snapshot으로 교체하고, snapshot 디렉터리 symlink이나 artifact hash 변조는 `snapshot_integrity_error`, 같은 fingerprint의 다른 manifest는 `non_deterministic_build`로 거부한다. build 실행 로그 기록이나 삭제가 실패하면 성공한 snapshot 활성화를 되돌리지 않고 `warnings: [run_log_unavailable]` 또는 `[prune_unavailable]`을 반환한다.

snapshot에는 `schema.json`, `source-manifest.json`, `entities.jsonl`, `relations.jsonl`이 있으며 artifact와 manifest hash를 검증한 뒤에만 활성화한다. schema 또는 extractor 버전이 다른 활성 snapshot은 `snapshot_incompatible`, 디렉터리나 artifact 파일이 사라진 활성 snapshot은 `snapshot_not_found`로 판정하고, clean worktree이거나 `--committed-only`인 다음 build 또는 조회에서 다시 만든다.

dirty worktree에서 `--committed-only` 없이 조회하면 `unindexed_worktree` 오류 메시지가 그 사유를 알린다. `status`는 snapshot을 제공하지 못하는 사유를 `snapshot_status`로 보고한다.

## 관련 문서

상위: [[Ontology-Reference]]. 전체 지도: [[Development-Ontology]].

- [[Ontology-Operations]]
- [[Ontology-Evidence-Lifecycle]]
- [[Ontology-Runtime-Verification]]
