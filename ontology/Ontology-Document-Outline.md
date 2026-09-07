---
tags: [ai, ontology, evidence, mcp]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["온톨로지 문서 목차 조회", "Ontology Document Outline"]
---

# 찾은 문서에서 다른 근거 section 탐색하기

`context_lookup`은 문서당 가장 높은 점수의 section 하나를 주로 반환한다. 관련 문서가 있어도 다른 조건이나 예외를 설명한 heading은 응답에서 빠질 수 있다. `context_outline`은 그 문서의 전체 section 목록을 제공하고, 필요한 본문은 [[Ontology-Evidence-Read|context_read]]로 읽는다.

## 입력

| 입력 | 의미 |
| --- | --- |
| `document_id` | 조회 응답 `entities`에서 `type: Document`인 항목의 `id` |
| `source_revision` | 같은 조회 응답 `index_sync`의 원문 revision |
| `offset_sections` | 선택. section 목록의 시작 인덱스, 기본 0 |
| `max_bytes` | 선택. JSON payload 전체 예산, 기본 24,000, 상한 65,536 byte |

문서 ID와 입력 JSON 전체는 각각 최대 65,536 UTF-8 byte다. 경로, anchor, cache와 저장소 위치는 도구 인자로 받지 않는다. host allowlist와 snapshot의 indexed scope 양쪽에 포함된 실제 Document만 허용한다.

## 응답과 후속 읽기

`document`는 문서 ID, 원문 경로, revision과 파일 전체 SHA-256을 담는다. `sections`는 원문 byte 위치와 ID 순서로 정렬된 Section 목록이다. 각 항목의 `id`, `source_revision`, `content_hash`를 그대로 `context_read`에 전달할 수 있다. heading 경로, occurrence와 byte anchor가 있으므로 동명 heading도 구분된다.

문서의 frontmatter/root Section도 목록에 포함된다. 별도 RelationAssertion은 목차 항목이 아니다. 목차에는 본문 발췌가 없으며, heading이 발견됐다는 사실을 본문 조건 충족이나 최종 답변의 근거로 세지 않는다.

`pagination.complete`가 false이면 같은 Document와 revision에서 `next_offset_sections`를 다음 요청의 `offset_sections`로 전달한다. byte 위치를 받는 `context_read.offset_bytes`와 단위가 다르다. 끝 인덱스를 요청하면 완료된 빈 목록을 받을 수 있다. 남은 항목이 있는데 하나도 예산에 담지 못하면 `budget_too_small`로 끝난다. 필요하면 예산을 상한까지 늘리고, 그래도 읽지 못하면 원문 조회의 한계로 남긴다.

목차 조회는 같은 pinned Git blob에서 Document 전체 hash와 각 Section의 UTF-8 byte 범위 및 SHA-256을 검증한다. symlink 경로와 범위 밖 문서를 거부하며 미커밋 본문은 사용하지 않는다. dirty 상태는 `index_sync`에 표시한다. 원문의 현재 의미나 적용 가능성을 검증한 결과는 아니다.

MCP와 CLI는 요청 시작에 snapshot을 확인한다. 요청 revision과 snapshot revision이 다르면 `snapshot_revision_mismatch`로 끝나며, 새 `context_lookup` 결과로 처음부터 다시 탐색한다. 문서가 없거나 허용 범위 밖이거나 ID가 Document가 아니면 `document_not_found`다. 임의의 과거 revision을 여는 도구가 아니다.

## CLI

`ontology/`에서 조회 응답의 실제 값으로 자리표시자를 바꿔 실행한다.

```bash
node src/cli.mjs outline --committed-only \
  --document-id '<Document의 id>' \
  --source-revision '<조회의 원문 revision>' \
  --offset-sections 0 --max-bytes 24000
```

`--repo`, `--cache`, 반복 가능한 `--allow`를 지원한다. `--scope`, `--query`, `--depth`, `--evidence-unit-id`, `--content-hash`, `--offset-bytes`는 이 명령의 인자가 아니다.

## 적용 범위

새 MCP 프로세스에서 `context_lookup`, `context_outline`, `context_read`를 함께 사용한다. 현재 연결에 도구가 보이지 않으면 CLI로 보완하고 재연결 후 실제 `tools/list`를 확인한다.

목차는 이미 발견한 Document 안의 탐색을 돕는다. 검색에서 문서 자체가 빠진 경우는 표현과 scope를 바꾸거나 별도 원문 탐색이 필요하다. 모델이 자동으로 올바른 heading을 고르거나 불필요한 읽기를 줄이는지는 별도 평가 대상이다.

상위: [[Development-Ontology]]. 운영: [[Ontology-Operations]]. 평가: [[Ontology-Retrieval-Quality]].
