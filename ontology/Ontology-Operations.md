---
tags: [ai, ontology, context, retrieval, mcp]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["Ontology Operations", "온톨로지 실행 절차"]
---

# 개발 판단 온톨로지 실행 절차

`ontology/`는 이 Vault의 committed Markdown을 읽는 Node.js 실행 코드와 문서의 위치다. Markdown이 지식 정본이고 snapshot JSONL은 Git 밖 캐시에 만드는 파생물이다.

## 구현 범위

| 항목 | 현재 동작 |
| --- | --- |
| 입력 | Git `HEAD`의 tracked regular Markdown blob, 기본 범위 `README.md`, `biz/`, `econ/`, `fit/`, `ontology/`, `tech/` |
| 제외 | `AGENTS.md`, `CLAUDE.md`, 비 Markdown, symlink, untracked와 dirty worktree 본문. `.agents/`, `.claude/`는 기본 범위 밖 |
| 추출 | frontmatter, heading section, 위키링크, 명시 `ontology_relations` |
| 관계 | `contains`, 해석 가능한 `links_to`, schema와 entity ID가 맞는 명시 relation |
| 근거 | 원문 path, pinned revision, UTF-8 byte anchor, 해당 byte SHA-256, 마지막 변경 commit 시각 |
| 조회 | exact label, alias, tag, heading과 키워드, source-confirmed relation 1 또는 2 hop |
| MCP | stdio 서버의 읽기 전용 `context_lookup` 하나 |

관계 ID는 subject, predicate, object, evidence unit ID, occurrence의 안정 JSON SHA-256이다. section ID의 heading component는 `encodeURIComponent`로 인코딩하고 빈 heading은 `%`로 구분한다. 같은 heading path의 occurrence를 ID와 anchor에 보존한다. 이 때문에 `A/B` heading과 `A` 아래의 `B` heading이 다른 entity가 된다. 위키링크 대상은 파일 경로와 파일명으로 찾는다. H1 제목과 frontmatter alias는 검색에만 사용한다.

`config.json`의 `repository_id`는 이 Vault의 고정 ID다. 장비나 checkout 경로가 바뀌어도 유지해야 Markdown에 기록한 typed relation이 보존된다. 이 runtime 설치는 Vault 하나를 대상으로 하며, 다른 독립 Vault를 구축할 때는 ID를 분리한다. cache와 snapshot fingerprint는 실제 checkout 경로도 구분한다.

## 설치와 명령

Node.js 22 이상에서 실행한다. `ontology/`에서 의존성을 설치한다.

```bash
npm ci --ignore-scripts
npm test
npm run build -- --committed-only
npm run lookup -- --committed-only --query "transactional outbox"
npm run status
npm run serve
```

`build`와 `lookup`은 `--repo <absolute-path>`, `--cache <absolute-path>`, 반복 가능한 `--scope <repository-relative-prefix>`를 받는다. `lookup`은 `--allow`, `--depth 1|2`, `--max-bytes <positive-integer>`도 받는다. `--allow`를 생략하면 기본 범위 `README.md`, `biz/`, `econ/`, `fit/`, `ontology/`, `tech/`를 사용하며, 반복 지정하면 필요한 경로로 허용 범위를 제한한다. `lookup`에서 `--scope`를 생략하면 해당 allowlist를 색인과 요청 범위로 사용한다. scope는 glob이 아닌 repository-relative prefix이며 상위 경로 이동과 wildcard를 거부한다.

기본 cache는 `~/.cache/context-ontology/<repository-hash>/`다. cache는 source repository 밖이어야 하고, `active.json`, `runs.jsonl`, fingerprint별 immutable snapshot을 보관한다. build 실행 로그 기록이 실패하면 성공한 snapshot 활성화를 되돌리지 않고 `warnings: [run_log_unavailable]`을 반환한다. snapshot에는 `schema.json`, `source-manifest.json`, `entities.jsonl`, `relations.jsonl`이 있으며 artifact와 manifest hash를 검증한 뒤에만 활성화한다.

## Git 상태와 재생성

기본 build는 dirty worktree를 거부한다. `--committed-only`를 명시하면 dirty 상태여도 `HEAD` blob만 읽어 snapshot을 만들 수 있다. 어느 경우도 working tree 파일이나 untracked 파일을 evidence로 읽지 않는다. 원문의 마지막 변경 시각을 재현하기 위해 shallow clone은 거부한다. UTF-8이 아닌 본문이나 Git 경로도 추정 변환하지 않고 오류로 중단하며 기존 snapshot을 보존한다.

`lookup`과 `context_lookup`은 요청 시작에 active snapshot의 revision과 indexed scope를 현재 `HEAD`와 비교한다. clean worktree에서 다르면 새 snapshot을 만든다. dirty 상태에서 `--committed-only`가 없으면 기존 clean snapshot만 유지하고 query 결과는 `unindexed_worktree`로 표시한다. 기존 snapshot도 없으면 오류로 끝난다. `--committed-only`면 dirty 상태에서도 pinned `HEAD` snapshot을 만들고 결과에 `unindexed_worktree`를 표시한다.

조회는 evidence byte hash를 다시 확인하고 section excerpt, source revision, anchor를 함께 반환한다. allowlist, indexed path와 요청 scope의 교집합 밖 원문은 반환하지 않는다. 출력에는 `index_sync`, coverage gap, output byte budget과 제한으로 빠진 record를 보존한다.

## MCP 연결

다른 개발 프로젝트에서도 이용하려면 이 Vault 안에서 다음 명령으로 각 장비의 사용자 설정에 등록한다. Node.js 경로와 Vault 경로는 해당 장비에서 계산한다.

```bash
vault_root="$(git rev-parse --show-toplevel)"
node_bin="$(command -v node)"
codex mcp add development-context -- "$node_bin" \
  "$vault_root/ontology/src/cli.mjs" serve \
  --repo "$vault_root" --committed-only
claude mcp add --scope user --transport stdio development-context -- "$node_bin" \
  "$vault_root/ontology/src/cli.mjs" serve \
  --repo "$vault_root" --committed-only
codex mcp get development-context
claude mcp get development-context
```

MCP host는 tool argument로 repository나 cache 경로를 바꿀 수 없다. `context_lookup`은 `query`, 선택 `scope`, `depth`, `max_bytes`만 받고 알 수 없는 field와 크기 제한 초과 입력을 거부한다. tool 결과는 JSON text와 동일한 structured content다. 스킬의 일반 요청 예산은 24KB, 서버 상한은 64KiB다. 특정 host를 제한해야 하면 등록 명령에 `--allow <repository-relative-prefix>`를 반복해 추가한다.

2026-09-05 범위 확장 전 장비에서 Codex 사용자 등록 `enabled: true`, Claude 사용자 등록 `Connected`를 확인했다. 당시 `--allow tech` 등록과 같은 명령을 사용하는 SDK client로 `/private/tmp`에서 `tools/list`와 실제 조회를 검증했다. Outbox 원문 근거를 반환했고 `fit` 요청의 evidence는 0개였다. 이어 Codex 세션에 노출된 `context_lookup` 도구를 직접 호출해 원문 경로, heading, revision과 hash를 받았다. 이는 당시 연결과 호출 검증이며 전체 기본 범위의 현재 동작이나 모든 모델의 자동 도구 선택을 증명하지는 않는다. 새 세션에서 도구가 보이지 않으면 CLI와 원문 검색으로 보완한다.

같은 날 범위 확장 후 Codex와 Claude의 사용자 등록에서 `--allow tech`를 제거했다. 두 등록의 실행 파일과 인자가 동일함을 확인하고, 해당 명령으로 새 MCP 프로세스를 실행해 여섯 범위 각각의 원문 제목 조회와 scope 밖 근거 제외를 확인했다. scope 생략 조회도 `ontology/Ontology-Operations.md`를 반환했다. 이미 열린 MCP 연결은 이전 설정을 유지하므로 새 세션에서 확장된 등록과 도구 설명을 사용한다.

Codex의 온톨로지 우선 조회 규칙은 사용자 전역 `~/.codex/AGENTS.md`에 둔다. 상세 절차는 이 Vault의 `.agents/skills/development-context/SKILL.md`를 따른다.

전역 지침은 장비별 파일이므로 다른 장비에도 별도로 반영해야 한다. 이미 실행 중인 다른 Codex 세션에는 갱신을 가정하지 않고 새 세션에서 적용한다. 지침 탐색은 실행 시작 때 이뤄진다. [OpenAI, Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)

## runtime 검증

`ontology/`의 Node test suite는 parser, snapshot, query, MCP stdio를 검증한다. 2026-09-05 범위 확장 전 suite는 40개 테스트를 통과했다. 별도의 SDK 조회와 범위 제한도 검증했다. 검증한 경계는 다음과 같다.

- UTF-8 byte anchor와 content hash, duplicate heading, `encodeURIComponent` ID component
- malformed frontmatter, candidate relation 제외, broken link와 ambiguous anchor coverage gap
- deterministic snapshot, artifact hash, corrupt snapshot 거부, rename과 deletion 전파
- dirty와 untracked 본문 미색인, explicit committed-only build, cache source repository 분리
- allowlist와 scope 교집합, output budget, dirty snapshot 상태
- `context_lookup` tool schema, read-only annotation, stdio structured result

2026-09-05 범위 확장 전에 revision `3c41985f38e6b8ea0b6cdde43daf54e862e34c5d`의 `tech` 범위를 임시 cache에 build해 1,498 Document, 16,848 unit, 27,422 relation, 166 coverage gap을 만들었다. build wall time은 약 2.9초였다. 이 수치는 해당 revision과 실행 환경의 build 관찰이며, query 품질이나 실제 개발 판단 정확도를 뜻하지 않는다.

범위 확장 전 최종 extractor 9는 같은 revision에서 숫자로 시작하는 heading 링크 4개를 추가로 해석했다. 당시 설치된 `tech` snapshot은 1,498 Document, 16,848 unit, 27,426 relation, 162 coverage gap이다. 해결되지 않은 링크와 metadata 문제를 숨기지 않고 조회 결과의 gap과 요약에 남긴다.

범위 확장 후 suite는 43개 테스트를 통과했다. 추가 검증은 전체 기본 범위의 문서 포함, 도메인 사이 링크와 자기참조 링크 해석, 깊이 2의 순환 탐색 종료, 요청 scope와 명시 allowlist 제한, CLI에서 `--allow`만 지정했을 때의 범위 판정이다. `ontology/`의 문서도 다른 Markdown과 같은 원문 근거 계약으로 조회하며 그 내용의 현재 정확성은 별도로 확인한다.

실제 사용자 cache는 revision `6df8bb9965139dab76e9f5974c03c950c701b5d5`의 committed Markdown을 새 기본 범위로 색인했다. 결과는 1,869 Document(`README.md` 1, `biz` 59, `econ` 35, `fit` 271, `ontology` 5, `tech` 1,498), 21,458 unit, 35,315 relation, 114 coverage gap이다. `tech`에서 `ontology` 문서로 향하는 링크 7개도 해석했다. 검증 당시 코드와 문서 수정은 미커밋 상태라 `unindexed_worktree`가 표시됐고, 원문은 위 revision에 고정됐다. 각 범위의 대표 제목 조회는 원문을 반환했지만 일부 응답은 예산이나 탐색 제한에 따라 `partial`이었다. 이는 영역별 접근과 근거 반환 검증이며 모든 질문의 검색 품질을 보장하지 않는다.

이 검증은 Markdown parser와 snapshot 조회의 계약을 확인한다. 실제 프로젝트 버그, 의미적으로 올바른 기술 추천, code repository index, deployment 또는 runtime behavior를 확인하지 않는다.

## 검색 품질 확인

`npm run evaluate`는 이미 생성한 snapshot에서 scope를 `tech`로 제한해 `evaluation/cases.json`의 기존 기술 질문 4개를 실행하고 문서와 heading 일치, 처리 시간과 응답 크기를 JSON으로 출력한다. `-- --cache <absolute-path>`로 평가 cache를 지정할 수 있다. 단위 테스트와 달리 검색 품질을 관찰하는 명령이며 결과 건수만으로 전체 도메인의 성능을 일반화하지 않는다.

최초 독립 표본은 기대 문서 2/4, 기대 heading 1/4였다. 자세한 입력, 실행 결과와 해석은 [[Development-Ontology-Evaluation]]에 남긴다. 검색 결과가 부족하면 기술 용어 후보로 다시 조회하고, 파일명과 heading으로 scope를 좁히거나 직접 원문 검색으로 보완한다.

## 후속 설계

- code repository의 symbol, framework 설정, migration, test와 runtime evidence 색인
- embedding, LLM semantic inference, candidate relation review queue
- 승인된 typed relation의 authoring UX와 stale, conflict 판정
- holdout 기반 retrieval recall, 불필요한 근거, 탐색 시간과 사용자 재설명 감소 측정
- JSONL 병목이 확인된 뒤 SQLite, graph DB 또는 RDF 검토

현재 검색은 label, alias, tag, heading, 제한된 한영 키워드 확장과 명시 관계 탐색을 사용한다. 일반적인 동의어, 문맥, 인과관계와 코드 호출 관계를 추론하지 않으며 LLM이 relation을 자동 확정하지 않는다.

## 관련 문서

- [[Development-Ontology]]
- [[Development-Ontology-Contract]]
- [[Development-Ontology-Evaluation]]
- [[Ontology-Context-Platform-Implementation]]
- [[Ontology-Context-Platform-AI-Runtime]]
