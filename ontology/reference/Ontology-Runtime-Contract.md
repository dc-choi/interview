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
| 추출 | frontmatter의 `aliases`, `tags`, `category`, `status`, `verified_at`, heading section, 위키링크, 명시 `ontology_concepts`와 `ontology_relations` |
| 관계 | `contains`, 해석 가능한 `links_to`와 선택적 구조 역할 `link_role`, schema의 정의역, 치역과 근거 요건에 맞는 명시 relation, 개념 선언에서 파생한 `declares`, `tagged_with`, `in_category` |
| 근거 | 원문 path, pinned revision, UTF-8 byte anchor, 해당 byte SHA-256, 첫 부모와 비교한 마지막 변경 commit 시각 |
| 조회 | exact label, alias, tag, heading과 키워드, source-confirmed relation 1 또는 2 hop, 개념 이름으로 찾는 타입 관계 |
| MCP | stdio 서버의 읽기 전용 `context_search`, `context_lookup`, `context_concept`, `context_outline`, `context_read` |

schema 2(extractor 13)의 클래스, predicate, 선언 형식과 위반 판정은 [[Ontology-Schema]], 개념 질의의 입력과 추론 규칙은 [[Ontology-Concept-Query]]를 따른다. 개념 선언과 `ontology_relations`가 없는 저장소에서는 entity가 schema 1과 같다. 그런 저장소의 조회 응답은 검색어 8개 미만이고 영문이나 숫자 뒤 조사 규칙([[#후보 검색과 순위]])이 토큰을 바꾸지 않는 질문에서 버전과 fingerprint 필드, 검색 cursor를 빼면 schema 1과 같다. 8개 이상인 질문은 2026-11-21에 바꾼 긴 질문 규칙([[#후보 검색과 순위]], [[#근거 구성과 응답 예산]], [[#검색 비용과 진단]]) 때문에 root 순위, 읽기 시작 Section, 관계 탐색 순서와 반환 근거가 schema 1 시점과 다를 수 있다. `status: vocabulary` 문서는 선언 자료이므로 `context_lookup`과 `context_search`의 후보와 근거에서 제외한다.

관계 ID는 subject, predicate, object, evidence unit ID, occurrence의 안정 JSON SHA-256이다. section ID의 heading component는 `encodeURIComponent`로 인코딩하고 빈 heading은 `%`로 구분한다. 같은 heading path의 occurrence를 ID와 anchor에 보존한다. 이 때문에 `A/B` heading과 `A` 아래의 `B` heading이 다른 entity가 된다. 위키링크 대상은 파일 경로와 파일명으로 찾으며, 표 셀 안에서 파이프를 escape한 `[[대상\|별칭]]` 표기도 대상만 추출한다. H1 제목과 frontmatter alias는 검색에만 사용한다. Document의 `verified_at`은 조회 결과의 entity 속성으로 반환하지만 freshness 판정에는 아직 쓰지 않는다.

`config.json`의 `repository_id`는 이 Vault의 고정 ID다. 장비나 checkout 경로가 바뀌어도 유지해야 Markdown에 기록한 typed relation이 보존된다. 이 runtime 설치는 Vault 하나를 대상으로 하며, 다른 독립 Vault를 구축할 때는 ID를 분리한다. cache와 snapshot fingerprint는 실제 checkout 경로도 구분한다.

## 후보 검색과 순위

검색은 실제 field equality가 있는 label, alias, tag, heading과 entity ID를 부분 어휘 점수보다 먼저 순위에 두고, 문서당 읽기 시작 Section과 상위 root 6개를 선택한다. 정규화는 소문자로 바꾸고 끝의 조사를 뗀다. ASCII 영문, 숫자, 밑줄과 하이픈으로만 된 2자 이상의 단어(끝은 영문이나 숫자) 바로 뒤에 조사나 가벼운 어미(`로`, `에서는`, `된` 등 정해 둔 목록)가 붙으면 그 꼬리를 뗀다(`CDC로`는 `cdc`). `LG전자`, `for문`, `10만`처럼 목록에 없는 한글 꼬리는 단어의 일부로 남긴다. 목록의 `도`는 숫자 뒤에서도 떼므로 `90도`는 `90`이 된다. 검색어 수는 조사를 떼고 같은 단어를 합친 뒤에 세므로 `Kafka로`, `Kafka의`, `Kafka`는 한 단어다. 정규화와 키워드 확장 뒤 2~3개 토큰인 짧은 질의는 문서 빈도를 이용해 구체 용어가 없는 일반어 후보를 제외한다. 더 긴 자연어 질의에는 이 제외 규칙을 적용하지 않는다. 정규화와 확장 후 8개 미만 토큰인 질문에서는 개별 토큰이 Document 제목 또는 alias 전체와 같은 후보를 일반 어휘 점수보다 먼저 둔다. `status: index`인 목차는 이 우선권에서 제외한다. tag는 이 주제명 우선권에 사용하지 않고, 질문 전체의 정확한 metadata 일치는 계속 최우선이다. 8개 이상이면 여러 조건이 일반 주제명에 밀리지 않도록 이 우선권 없이 어휘 점수로 순위를 정하고, 문서 점수에 coverage 가산점을 더한다. 기준은 그 문서에서 본문까지 읽어 점수를 매긴 유용한 Section 중 점수가 가장 높은 Section이며, 문서 점수를 metadata 일치가 정했어도 같다. 가산 대상은 heading이 있는 다른 유용한 Section 본문에 있지만 제외 어휘가 아닌 질의어다. 제외 어휘는 기준 Section의 본문과 metadata(경로, H1을 포함한 heading 경로)에 겹친 질의어와, 문서 점수를 정한 근거의 metadata(본문이 이끌면 기준 Section, metadata가 이끌면 그 단위의 경로, 제목, alias, tag와 heading 경로)에 겹친 질의어다. 문서 metadata가 점수를 정한 경우 기준 Section의 본문 어휘는 점수에 들지 않았지만 보수적으로 함께 제외한다. 기준 Section이 H1 아래에 있거나 문서 metadata가 점수를 정하면, 파일 이름이나 제목의 어휘가 H1 Section 본문에 다시 나와도 가산하지 않는다. heading 없는 root 단위(frontmatter와 첫 heading 앞의 본문)는 `aliases:` 같은 key가 질의어와 겹칠 수 있으므로 세지 않고, `출처`와 `관련 문서` Section도 세지 않는다. 질의어마다 그 어휘를 담은 Section 중 가장 큰 값 하나만 더한다. 값은 그 Section에서 한 번 등장한 본문 점수, 즉 8 곱하기 문서 빈도 가중치를 그 Section의 길이 감점으로 나눈 값의 0.3배다. 번역어 검색어의 2배 가중치와 같은 Section 안의 반복 횟수는 반영하지 않는다. 질문의 조건이 한 문서의 여러 Section에 나뉘어 있어도 그 문서가 root 후보에 들게 하려는 규칙이며, 의미적 충족 판정은 아니다. 검색어 수에는 정규화가 덧붙이는 번역어도 들어간다. `재색인`은 `reindex`, `alias`, `backfill`을, `발행`은 `publish`, `event`, `outbox`를 더하므로 `재색인 발행` 같은 두 단어 질의도 8개로 세어 긴 질문 규칙을 받는다. 이 경계는 주제명 우선권과 `weak_lexical_overlap` 판정에도 같은 방식으로 쓰인다. 2026-11-21 기준 평가 질문 191건 중 번역어 때문에 경계를 넘은 질문은 없었다. 정규화 후 한 토큰인 exact alias 또는 title 질의는 전체 색인 본문 스캔을 생략하되, 정확히 찾은 후보 문서의 유용한 Section 본문은 읽어 시작점을 고른다. 점수 기반 읽기 시작점에서는 heading이 없는 기존 root Section을 제외하지만, query가 root ID 전체와 정확히 일치하면 이 조회는 보존한다.

## 근거 구성과 응답 예산

정확한 metadata 조회의 응답 예산은 body direct 근거, graph bundle, 선택 frontmatter provenance 순으로 쓴다. 자연어 조회의 추가 절 선택 순서는 다음 문단을 따른다. 작은 예산에서 선택한 direct 근거 없이 선택 provenance만 남겨 성공으로 반환하지 않으며, direct 근거 하나와 필수 메타데이터도 담지 못하면 `budget_too_small`로 끝난다. 구성 중에는 `budget.exhausted`만 제한을 기록하고, 최종 응답에 여유가 있을 때만 `output_limit_reached` coverage gap을 보충한다. direct 근거가 남은 positive pack은 예산 제한으로 축소됐으면 `partial`로 반환한다. 예산에 맞지 않는 묶음은 누락 수로 보고하며, 최종 축소에서도 남은 직접 근거에 필요한 문서를 보존한다. 작은 예산에서 모든 관계의 반환을 보장하지는 않는다.

정확한 metadata 일치가 없는 조회에서는 직접 근거를 담고 응답 전체에서 직접 관계 하나를 먼저 추가한 뒤, 선택된 root와 graph 문서에서 질의어가 겹치는 절을 최대 6개 보충한다. 검색어 8개 미만인 질문은 이미 반환된 본문에 반복된 질의어의 가중치를 낮춰 다른 어휘를 다루는 절을 우선한다. 8개 이상인 질문은 반복 감점 없이 관련도 순으로 고른다. 관련도는 절 본문에 겹친 질의어마다 한 번씩 센 문서 빈도 가중치 합을 그 절의 길이 감점으로 나누고, 절이 속한 문서의 root 순위 점수(coverage 가산점 포함)를 곱한 값이다. 반복 횟수와 번역어의 2배 가중치는 반영하지 않는다. 긴 질문에는 조건이 아닌 일반어가 많아 아직 반환되지 않은 어휘가 모두 새 조건처럼 보이고, 그 어휘를 담았을 뿐인 다른 문서의 절이 상위 문서의 관련 절을 밀어내기 때문이다. 대가로 상위 문서에 절이 몰리고, root가 아닌 graph 문서의 절은 덜 보충된다. 정확한 metadata 일치 질의에 `conditions`를 더해 긴 질문이 되면 그 문서의 점수(1000 이상)가 곱해지므로, 조건 보완 순서가 같은 경우 남은 자리는 그 문서의 절이 차지한다. `conditions` 힌트를 주면 두 경우 모두 조건 보완 순서를 먼저 적용한다. heading 없는 root와 출처/관련 문서 절은 제외한다. 보충 절은 1,400 byte 접두를 먼저 담되 검색어가 뒤에만 있으면 전체 절이 예산에 맞을 때만 추가한다. 선택한 절의 전체 본문 확장, 나머지 graph 묶음과 provenance, 마지막 본문 확장 순으로 남은 예산을 사용한다. 문서 소유권과 ID/revision/hash/anchor는 보존하며, 상세 비교와 한계는 [[Ontology-Search-Selection]]을 따르고, 긴 질문의 보완 순서 변경은 [[Ontology-Long-Query-Evidence-Selection]]에 기록했다. 더 깊은 문맥은 `context_outline`과 `context_read`로 확인한다.

`conditions` 힌트를 전달하면 정확한 metadata 일치가 있어도 보충 절 선택을 수행한다. 각 조건의 어휘 겹침을 단서로 사용하며 의미적 충족 판정과 호출 제한은 [[Ontology-Condition-Retrieval]]을 따른다.

## 문서 검색과 원문 일치

부분 매칭은 source URI, label, alias, tag, heading, section 본문만 사용한다. internal ID prefix, source ID와 percent-encoded anchor는 storage 표현이라 부분 매칭에서 제외한다. query가 entity ID 전체와 정확히 같은 exact ID 검색은 유지한다. `exact_metadata`는 점수와 별도로 실제 필드의 완전 일치 여부로 판정한다.

`search`와 `context_search`는 같은 root 순위를 상위 6개로 자르기 전에 사용해 Document 후보를 페이지로 반환한다. 페이지는 최대 20개 후보이며 body나 excerpt를 반환하지 않는다. 검색어, effective scope, snapshot과 query 코드가 바뀌지 않는 한 cursor로 이어 읽고, 다음 페이지에서 `max_bytes`는 바꿀 수 있다. 후보의 `matched_terms`는 실제 source 표현과 여러 section의 어휘 겹침이므로 의미적 적합성 판정이 아니다. `best_evidence_ref`는 문서 root 점수와 독립적으로 읽기 시작 section을 고르지만 fallback reference 자체에 query body가 있다는 보장은 없다. root frontmatter provenance는 lookup 근거로 별도 보존한다. 계약과 후속 읽기 흐름은 [[Ontology-Document-Search]]를 따른다.

## 관계 탐색

관계 탐색에서는 근거 unit의 현재 질문 점수를 먼저 본다. Section은 metadata와 본문 점수, RelationAssertion은 predicate와 endpoint 등의 metadata 점수를 사용한다. 동점이면 상대 entity 소유 Document의 점수, 구조 역할, relation ID 순으로 선택한다. 검색어 8개 이상인 질문에서는 Section 점수에 긴 질문의 길이 감점이, Document 점수에 coverage 가산점이 들어가므로 탐색할 상대 문서와 관계 순서도 짧은 질문 규칙과 달라질 수 있다. 구조 역할은 `index_member`와 `parent_index`, `related_document`, 역할 없는 연결 순이며 두 질문 점수를 바꾸지 않는다. `출처`, `관련 문서`, `관련문서` section에는 이 우선순위용 점수를 부여하지 않는다. 관계가 기록된 본문과 상대 문서의 다른 본문을 구분하기 위한 순서이며, 원문 확정 상태와 scope, hop, entity와 edge 상한은 그대로 검사한다.

## 검색 비용과 진단

정규화 후 한 토큰이며 정확한 metadata가 일치하면 전체 색인 본문 스캔은 생략한다. 정확히 찾은 후보 문서의 유용한 Section 본문과, 관계 순위에 필요한 현재 탐색 entity의 연결 근거 본문만 batch로 읽고 재사용한다. 검색어 가중치는 1이며 동일한 metadata 점수와 길이 감점을 적용한다. 이 추가 점수는 root 순위를 바꾸지 않는다.

본문 점수는 `1 + 기울기 * log1p(section 본문 길이 / 200)`로 나눠 긴 section을 감점하며 정확한 metadata 점수는 유지한다. 기울기는 검색어 8개 미만이면 0.2, 8개 이상이면 1이다. 긴 질문은 긴 section의 일반어와 우연히 더 많이 겹치기 때문이다. 이 Section 점수가 root 순위, 문서별 읽기 시작 Section 선택, 관계 탐색의 근거 순서와 보충 절의 동점 정리에 함께 쓰이고, 길이 감점은 긴 질문의 보충 절 관련도에도 쓰인다. `matching.query_term_count`는 정규화와 확장 후 검색어 수, `max_section_term_matches`는 같은 section의 metadata와 본문에 겹친 서로 다른 검색어 수의 최댓값이다. `assessment`는 `exact_metadata`, `lexical_overlap`, `no_lexical_overlap`, `weak_lexical_overlap`, `not_evaluated`를 구분한다. 검색어 8개 이상이면서 최대 겹침이 1~2개이면 `weak_lexical_overlap`이다. 후보를 삭제하는 규칙이나 의미적 적합성, 지식 부재의 확정 판정이 아니며, 관련성을 확인하고 재조회할 단서다.

전체 본문 스캔과 좁은 exact/graph 읽기가 읽은 고정 revision의 원문은 프로세스 안의 cache에 두고 이후 조회에서 다시 쓴다. cache는 저장소 경로와 revision 한 쌍만 보관하며, revision이 40~64자리 16진수 object 이름이 아니면 그 요청에서만 쓰는 cache를 따로 만든다. Document마다 blob, 소문자로 바꾼 본문, 인접한 UTF-16 코드 단위 쌍의 Bloom filter와 Section byte 범위별 본문을 담는다. Bloom filter 크기는 64bit 이상인 2의 거듭제곱으로, 코드 단위당 2bit 이상이며 32 단위 이상의 본문에서는 4bit 미만이다. 같은 revision의 blob은 바뀌지 않으므로 cache 내용은 원문과 같고, 다른 revision을 조회하면 cache 전체를 교체한다. 전체 본문 스캔은 대상 Document 중 cache에 없는 것이 있을 때만 고정 revision의 파일 목록을 한 번 해석해 대상 문서 수를 확인하고, 없는 Document만 OID로 기존 `readBlobs`가 읽는다. 좁은 exact/graph 읽기는 cache와 관계없이 기존 batch 경로로 Git에서 읽는다. 따라서 전체 본문 스캔에서는 이미 cache에 있는 Document의 Git 읽기 실패가 드러나지 않는다. 범위 안에 Document가 하나도 없으면 cache가 비어 있어도 파일 목록을 해석하지 않으므로 그때의 Git 실패도 드러나지 않는다. 경로별 symlink 검사는 두 경로 모두 요청마다 수행한다. 전체 본문 스캔은 모든 대상 Document를 검사하되 같은 요청에서 이미 확인한 디렉터리만 다시 검사하지 않는다. 문서 빈도는 Bloom filter가 배제하지 못한 Document의 본문에서 실제로 세므로 값이 바뀌지 않는다. Section 본문이 소속 Document 본문의 일부로 확인되면 그 Document 본문에 있는 검색어만 Section에서 찾는다. 정규화한 metadata는 snapshot record마다 한 번 계산해 두되, 읽는 필드까지 동결된 record만 보관한다. `loadSnapshot`은 모든 record를 깊게 동결한다. 대상 Document와 Section, ID 색인, 관계 인접 목록 같은 색인은 마지막 요청의 record 배열과 scope(요청 범위와 개념 범위) 조합 하나만 보관하고, 다음 요청이 동결된 같은 record를 같은 순서와 같은 scope로 보낼 때만 재사용한다. 반환 근거의 hash 검사는 그대로 수행한다. 2026-11-22 이 Vault(Document 5,366개, 소문자 본문 약 2,794만 자)에서 강제 GC 뒤에도 남은 메모리 증가는 heap 약 132MB와 Buffer 약 54MB였다. 이 값은 정상 상태이며, snapshot을 다시 빌드하거나 새 snapshot으로 바뀐 뒤 다음 lookup이나 search 전까지는 이전 세대의 record와 원문이 한 벌 더 남는다. 응답 byte 계산은 한 번의 직렬화로 줄였다. 출력 동등성 확인 방법은 [[Ontology-Retrieval-Latency]]를 따르며, 이 cache의 출력 동등성과 지연 측정은 [[Ontology-Long-Query-Evidence-Selection]]에 기록한다. 요청마다의 저장소 상태 확인과 snapshot 검증 재사용은 [[#Snapshot 저장과 무결성]]을 따른다.

## 기존 목차와 위키링크의 역할

extractor 12부터 Markdown에 이미 적힌 탐색 역할을 `links_to` 관계의 `link_role`로 보존한다. `source_updated_at`은 first-parent diff로 파일을 바꾼 최신 commit의 committer 시각이다. 따라서 병합 충돌 해결로 바뀐 본문은 병합 commit 시각을 기록한다. predicate, relation ID, 원문 section과 occurrence는 그대로 유지하며 새 의미 관계를 생성하지 않는다.

| 역할 | 원문 표기 |
| --- | --- |
| `index_member` | `status: index` 문서의 `목차`, `하위 영역`, `하위 폴더 인덱스`, `하위 문서` 아래 링크. `목차 (설명)`과 `하위 폴더 인덱스 (숫자개)`도 허용 |
| `parent_index` | 같은 줄의 명시적인 `상위:` 바로 뒤 링크. `> 상위:` 같은 인용 블록 표기도 포함 |
| `related_document` | `관련 문서` 또는 `관련문서` 아래 링크 |

인용 블록 안의 heading은 블록 안팎의 목차/관련 역할을 결정하지 않으며, 자기 문서 section 링크에도 역할을 붙이지 않는다. 구체적인 인식 범위와 제외 사례는 `test/markdown.test.mjs`에서 검증한다. 역할이 불명확하면 기존 `links_to`만 유지한다. 폴더 위치 자체를 개념 계층으로 추론하거나 Obsidian 설정을 읽고 수정하지 않는다. 검색과 목차, 원문 읽기의 입력은 동일하며 `context_lookup`은 역할과 기존 근거를 함께 반환한다. extractor가 바뀌었으므로 새 CLI 또는 MCP 프로세스가 snapshot을 다시 만든다. 기존 MCP 프로세스는 재연결해야 변경된 코드를 읽는다.

## Snapshot 저장과 무결성

기본 cache는 `~/.cache/context-ontology/<checkout-hash>/`다. cache는 source repository 밖이어야 하고 `active.json`, `runs.jsonl`, `.context-ontology-cache` 소유권 표식과 활성 snapshot을 보관한다.

비어 있지 않은 사용자 지정 cache에 표식이 없으면 `invalid_cache_path`로 거부해 다른 데이터를 정리 대상으로 오인하지 않는다. 최초 표식의 내용이 아직 비어 있거나 정상 내용의 앞부분만 기록됐으면 50ms 간격으로 최대 20회 재확인한다.

총 대기 1초 뒤에도 불완전하거나 내용 또는 파일 형식이 잘못됐으면 계속 `invalid_cache_path`로 거부하며 중단된 초기화를 자동 복구하지 않는다. build는 기존 snapshot 재사용 검증, 활성화와 삭제를 cache의 `.lock`으로 프로세스 간 직렬화한다.

lock symlink 대상은 보유 프로세스 pid와 무작위 token을 함께 가지므로 종료 시 후속 보유자의 lock을 지우지 않는다. 살아 있는 보유자는 최대 10분 기다리며, 보유 프로세스가 사라진 lock은 `cache_lock_stale`, 형식이 잘못된 lock은 `snapshot_integrity_error`로 중단한다.

자동 stale-lock 회수는 원자적 소유권 교체를 보장할 수 없어 하지 않으며, 실행 중인 build가 없음을 확인한 뒤 해당 `.lock`만 수동 제거한다. 정상 활성화 뒤에는 활성 snapshot 외의 fingerprint 디렉터리와 10분이 지난 `.building-*`, `.active-*`, 이전 구현이 남긴 `.lock.dead-*` 임시 항목을 삭제해 `pruned_snapshots`, `pruned_temporaries`로 건수를 보고한다.

조회는 lock 없이 읽으므로 파일 존재 확인 뒤 실제 읽기 사이에 이전 snapshot이 삭제돼도 `snapshot_not_found`로 분류한다. CLI와 MCP 조회는 clean worktree이거나 `--committed-only`이면 같은 요청에서 필요한 범위로 다시 빌드한다.

CLI 조회와 MCP 도구 호출은 snapshot을 다시 빌드하지 않으면 요청마다 저장소 상태를 한 번 확인한다. `rev-parse` 한 번으로 작업 트리 root와 `HEAD`를, `status` 한 번으로 미커밋 변경과 추적하지 않는 파일을 읽고, 그 값으로 snapshot 갱신 여부를 정한 뒤 같은 값을 `index_sync`에 쓴다. 다시 빌드한 요청은 build 안의 확인과 별도로 빌드가 끝난 뒤 상태를 다시 읽어 `index_sync`에 쓴다. `--cache` 없이 실행한 CLI는 기본 cache 위치를 찾으려고 `rev-parse --show-toplevel`을 한 번 더 실행한다.

이미 메모리에 읽은 snapshot은 요청이 끝날 때까지 유지한다. `snapshots` 경로가 symlink이거나 디렉터리가 아니면 `snapshot_integrity_error`로 거부한다.

같은 프로세스가 마지막으로 검증한 snapshot과 manifest hash가 같고 세 artifact 파일의 장치, inode, 크기, mtime과 ctime이 그 검증 때와 같으면 artifact를 다시 읽거나 hash하지 않고 검증한 record를 쓴다. 파일에 쓰면 ctime이, 파일을 교체하면 inode나 ctime이 바뀌므로 그다음 요청은 artifact 전체를 다시 검증한다. 세 artifact 모두 ctime이 검증을 시작한 시각보다 2초를 넘게 앞설 때만 식별 정보를 기록하므로, 시각 단위가 2초 이하인 파일 시스템에서는 검증 뒤의 쓰기가 항상 다른 ctime을 남긴다. 파일 시각을 이 장비의 시계와 비교하므로 시계가 다른 네트워크 파일 시스템에 cache를 두거나 시계를 되돌리면 이 보장이 약해지며, 그런 변경은 프로세스를 다시 시작할 때 전체 검증으로 드러난다. `active.json`과 manifest를 읽어 manifest hash를 확인하는 일, artifact의 regular file과 symlink 검사, 반환 근거의 hash 검사는 요청마다 그대로 한다.

같은 fingerprint 디렉터리에 artifact가 빠져 있으면 build가 방금 만든 snapshot으로 교체하고, snapshot 디렉터리 symlink이나 artifact hash 변조는 `snapshot_integrity_error`, 같은 fingerprint의 다른 manifest는 `non_deterministic_build`로 거부한다. build 실행 로그 기록이나 삭제가 실패하면 성공한 snapshot 활성화를 되돌리지 않고 `warnings: [run_log_unavailable]` 또는 `[prune_unavailable]`을 반환한다.

snapshot에는 `schema.json`, `source-manifest.json`, `entities.jsonl`, `relations.jsonl`이 있으며 artifact와 manifest hash를 검증한 뒤에만 활성화한다. schema 또는 extractor 버전이 다른 활성 snapshot은 `snapshot_incompatible`, 디렉터리나 artifact 파일이 사라진 활성 snapshot은 `snapshot_not_found`로 판정하고, clean worktree이거나 `--committed-only`인 다음 build 또는 조회에서 다시 만든다.

dirty worktree에서 `--committed-only` 없이 조회하면 `unindexed_worktree` 오류 메시지가 그 사유를 알린다. `status`는 snapshot을 제공하지 못하는 사유를 `snapshot_status`로 보고한다.

## 관련 문서

상위: [[Ontology-Reference]]. 전체 지도: [[Development-Ontology]].

- [[Ontology-Operations]]
- [[Ontology-Evidence-Lifecycle]]
- [[Ontology-Runtime-Verification]]
