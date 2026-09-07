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
| 추출 | frontmatter의 `aliases`, `tags`, `category`, `status`, `verified_at`, heading section, 위키링크, 명시 `ontology_relations` |
| 관계 | `contains`, 해석 가능한 `links_to`, schema와 entity ID가 맞는 명시 relation |
| 근거 | 원문 path, pinned revision, UTF-8 byte anchor, 해당 byte SHA-256, 마지막 변경 commit 시각 |
| 조회 | exact label, alias, tag, heading과 키워드, source-confirmed relation 1 또는 2 hop |
| MCP | stdio 서버의 읽기 전용 `context_lookup` 하나 |

관계 ID는 subject, predicate, object, evidence unit ID, occurrence의 안정 JSON SHA-256이다. section ID의 heading component는 `encodeURIComponent`로 인코딩하고 빈 heading은 `%`로 구분한다. 같은 heading path의 occurrence를 ID와 anchor에 보존한다. 이 때문에 `A/B` heading과 `A` 아래의 `B` heading이 다른 entity가 된다. 위키링크 대상은 파일 경로와 파일명으로 찾으며, 표 셀 안에서 파이프를 escape한 `[[대상\|별칭]]` 표기도 대상만 추출한다. H1 제목과 frontmatter alias는 검색에만 사용한다. Document의 `verified_at`은 조회 결과의 entity 속성으로 반환하지만 freshness 판정에는 아직 쓰지 않는다.

`config.json`의 `repository_id`는 이 Vault의 고정 ID다. 장비나 checkout 경로가 바뀌어도 유지해야 Markdown에 기록한 typed relation이 보존된다. 이 runtime 설치는 Vault 하나를 대상으로 하며, 다른 독립 Vault를 구축할 때는 ID를 분리한다. cache와 snapshot fingerprint는 실제 checkout 경로도 구분한다.

검색은 정확한 label과 alias를 우선하고, 문서당 최고점 section과 상위 root 6개를 선택한다. 정규화와 키워드 확장 뒤 2~3개 토큰인 짧은 질의는 문서 빈도를 이용해 구체 용어가 없는 일반어 후보를 제외한다. 더 긴 자연어 질의에는 이 제외 규칙을 적용하지 않는다. 직접 근거를 먼저 담은 뒤 관계, 양 끝 entity, 소유 문서와 원문 근거를 한 묶음으로 추가한다. 예산에 맞지 않는 묶음은 누락 수로 보고하며, 최종 축소에서도 남은 관계와 직접 근거에 필요한 문서를 보존한다. 작은 예산에서 모든 관계의 반환을 보장하지는 않는다.

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

`build`와 `lookup`은 `--repo <absolute-path>`, `--cache <absolute-path>`, 반복 가능한 `--scope <repository-relative-prefix>`를 받는다. `lookup`은 `--allow`, `--depth 1|2`, `--max-bytes <positive-integer>`도 받는다. `--allow`를 생략하면 기본 범위 `README.md`, `biz/`, `econ/`, `fit/`, `ontology/`, `tech/`를 사용하며, 반복 지정하면 필요한 경로로 허용 범위를 제한한다. `lookup`의 snapshot 범위는 항상 allowlist이고 `--scope`는 요청 범위만 좁힌다. 요청 scope 때문에 활성 snapshot을 다시 만들지 않는다 (2026-09-07 수정. 이전에는 `--scope tech` 조회가 활성 snapshot을 `tech` 전용으로 교체했다). scope는 glob이 아닌 repository-relative prefix이며 상위 경로 이동과 wildcard를 거부한다.

기본 cache는 `~/.cache/context-ontology/<checkout-hash>/`다. cache는 source repository 밖이어야 하고, `active.json`, `runs.jsonl`, `.context-ontology-cache` 소유권 표식과 활성 snapshot을 보관한다. 비어 있지 않은 사용자 지정 cache에 표식이 없으면 `invalid_cache_path`로 거부해 다른 데이터를 정리 대상으로 오인하지 않는다. 최초 표식의 내용이 아직 비어 있거나 정상 내용의 앞부분만 기록됐으면 50ms 간격으로 최대 20회 재확인한다. 총 대기 1초 뒤에도 불완전하거나 내용 또는 파일 형식이 잘못됐으면 계속 `invalid_cache_path`로 거부하며, 중단된 초기화를 자동 복구하지 않는다. build는 기존 snapshot 재사용 검증, 활성화와 삭제를 cache의 `.lock`으로 프로세스 간 직렬화한다. lock symlink 대상은 보유 프로세스 pid와 무작위 token을 함께 가지므로 종료 시 후속 보유자의 lock을 지우지 않는다. 살아 있는 보유자는 최대 10분 기다리며, 보유 프로세스가 사라진 lock은 `cache_lock_stale`, 형식이 잘못된 lock은 `snapshot_integrity_error`로 중단한다. 자동 stale-lock 회수는 원자적 소유권 교체를 보장할 수 없어 하지 않으며, 실행 중인 build가 없음을 확인한 뒤 해당 `.lock`만 수동 제거한다. 정상 활성화 뒤에는 활성 snapshot 외의 fingerprint 디렉터리와 10분이 지난 `.building-*`, `.active-*`, 이전 구현이 남긴 `.lock.dead-*` 임시 항목을 삭제해 `pruned_snapshots`, `pruned_temporaries`로 건수를 보고한다. 조회는 lock 없이 읽으므로 파일 존재 확인 뒤 실제 읽기 사이에 이전 snapshot이 삭제돼도 `snapshot_not_found`로 분류한다. CLI와 MCP 조회는 clean worktree이거나 `--committed-only`이면 같은 요청에서 필요한 범위로 다시 빌드한다. 이미 메모리에 읽은 snapshot은 요청이 끝날 때까지 유지한다. `snapshots` 경로가 symlink이거나 디렉터리가 아니면 `snapshot_integrity_error`로 거부한다. 같은 fingerprint 디렉터리에 artifact가 빠져 있으면 build가 방금 만든 snapshot으로 교체하고, snapshot 디렉터리 symlink이나 artifact hash 변조는 `snapshot_integrity_error`, 같은 fingerprint의 다른 manifest는 `non_deterministic_build`로 거부한다. build 실행 로그 기록이나 삭제가 실패하면 성공한 snapshot 활성화를 되돌리지 않고 `warnings: [run_log_unavailable]` 또는 `[prune_unavailable]`을 반환한다. snapshot에는 `schema.json`, `source-manifest.json`, `entities.jsonl`, `relations.jsonl`이 있으며 artifact와 manifest hash를 검증한 뒤에만 활성화한다. schema 또는 extractor 버전이 다른 활성 snapshot은 `snapshot_incompatible`, 디렉터리나 artifact 파일이 사라진 활성 snapshot은 `snapshot_not_found`로 판정하고, clean worktree이거나 `--committed-only`인 다음 build 또는 조회에서 다시 만든다. dirty worktree에서 `--committed-only` 없이 조회하면 `unindexed_worktree` 오류 메시지가 그 사유를 알린다. `status`는 snapshot을 제공하지 못하는 사유를 `snapshot_status`로 보고한다.

## Git 상태와 재생성

기본 build는 dirty worktree를 거부한다. `--committed-only`를 명시하면 dirty 상태여도 `HEAD` blob만 읽어 snapshot을 만들 수 있다. 어느 경우도 working tree 파일이나 untracked 파일을 evidence로 읽지 않는다. 원문의 마지막 변경 시각을 재현하기 위해 shallow clone은 거부한다. UTF-8이 아닌 본문이나 Git 경로도 추정 변환하지 않고 오류로 중단하며 기존 snapshot을 보존한다.

`lookup`과 `context_lookup`은 요청 시작에 active snapshot의 revision과 indexed scope를 현재 `HEAD`와 비교한다. clean worktree에서 다르면 새 snapshot을 만든다. dirty 상태에서 `--committed-only`가 없으면 기존 clean snapshot만 유지하고 query 결과는 `unindexed_worktree`로 표시한다. 기존 snapshot도 없으면 오류로 끝난다. `--committed-only`면 dirty 상태에서도 pinned `HEAD` snapshot을 만들고 결과에 `unindexed_worktree`를 표시한다.

조회는 evidence byte hash를 다시 확인하고 section excerpt, source revision, anchor를 함께 반환한다. allowlist, indexed path와 요청 scope의 교집합 밖 원문은 반환하지 않는다. 출력에는 `index_sync`, coverage gap, output byte budget과 제한으로 빠진 record를 보존한다.

## MCP 연결

다른 개발 프로젝트에서도 이용하려면 이 Vault 안에서 다음 명령으로 각 장비의 사용자 설정에 등록한다. Node.js 경로와 Vault 경로는 해당 장비에서 계산한다. `node`가 nvm 셸 함수인 환경에서는 `command -v node`가 절대경로를 주지 않으므로 `process.execPath`를 사용한다. `process.execPath`는 nvm 버전 디렉터리 안의 경로라 그대로 등록하면 node 버전을 바꿀 때 재등록해야 한다. 아래 명령은 `~/.local/bin/node` symlink가 있으면 그 경로를 대신 쓰며, 이 장비는 그렇게 등록했으므로 버전을 바꾸면 symlink 대상만 바꾼다.

```bash
vault_root="$(git rev-parse --show-toplevel)"
node_bin="$(node -p process.execPath)"
[ -x "$HOME/.local/bin/node" ] && node_bin="$HOME/.local/bin/node"
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

2026-09-07 회사 장비에서 suite 67개 테스트를 통과했다. 추가 검증은 표 셀의 escape된 파이프 위키링크 해석, 요청별 메모리 snapshot 고정, 요청 scope가 활성 snapshot을 바꾸지 않음, 비활성 snapshot과 오래된 임시 디렉터리 삭제, cache 소유권 표식, cache lock 대기와 정상 해제 순간 재시도, 보유자 확인 중 lock이 사라지는 handoff 재시도, 죽은 프로세스 lock의 `cache_lock_stale` 중단, malformed lock의 `snapshot_integrity_error` 중단, lock 대기 뒤 source revision 재확인, `snapshots` 상위 symlink 거부, 이전 구현이 남긴 `.lock.dead-*` 정리, 다른 extractor 버전이거나 디렉터리 또는 artifact가 사라진 활성 snapshot의 자동 재빌드, 같은 fingerprint의 불완전한 디렉터리 교체, symlink 거부, dirty worktree 오류의 사유 표시, `status`의 `snapshot_status`, `verified_at` 보존이다.
검증 세션에서 lock 없이 직전 활성 snapshot만 지우던 중간 구현은 scope가 다른 build 두 개의 동시 실행 90회 중 4회에서 활성 포인터가 사라져 폐기됐고, 디렉터리 lock을 삭제로 회수하던 구현도 죽은 lock을 두 build가 동시에 회수할 때 40회 중 21회 실패했다. symlink lock 자동 회수 구현은 같은 fixture의 scope가 다른 build 2개 100회, 죽은 pid lock을 미리 둔 build 2개 100회와 3개 40회에서 관찰된 실패가 없었지만, 독립 검토에서 세 contender가 겹칠 때 후속 보유자의 lock을 옮길 수 있는 경쟁 조건이 확인되어 최종 구현에서는 자동 회수를 제거했다.
같은 장비에서 revision `bf77c8484d7ecbdf5d02f828df89b504fef1952a`의 committed Markdown을 extractor 10으로 색인한 결과는 1,869 Document, 21,458 unit, 35,427 relation(`links_to` 13,969), coverage gap 2다. 이전 extractor 9의 gap 114건 중 112건은 표 안의 `[[대상\|별칭]]` 표기를 파서가 해석하지 못한 것이었고 수정 뒤 `links_to` 112개로 해석됐다. 남은 2건은 `tags`에 따옴표 없는 `null`이 있던 문서 2개이며 원문을 고쳤다. 검증 당시 코드와 문서 수정은 미커밋이라 `unindexed_worktree`가 표시됐다. Claude와 Codex 사용자 등록도 이 장비에서 절대경로 Node로 등록해 Claude `Connected`를 확인했다.

같은 날 동시 실행 오류를 수정한 뒤 suite 70개 테스트를 통과했다. 추가한 3개 테스트는 최초 소유권 표식의 빈 내용을 읽은 뒤 다른 프로세스가 기록을 마치는 경우의 재확인, 중단되거나 잘못된 표식의 거부와 기존 데이터 보존, 파일 존재 확인과 읽기 사이에 다른 CLI build가 snapshot을 삭제했을 때 같은 요청에서 재빌드하는 동작을 검증한다. 이 중 두 동시 실행 테스트는 수정 전 실패하고 수정 후 통과했다.

같은 날 검색과 응답 구성 보강 후 suite 78개 테스트를 통과했다. 추가 검증은 짧은 복합 질의의 일반어 잡음 제외, 긴 질문의 관련 문서 보존, 24KB 관계 묶음, 작은 예산에서 고아 근거 제거와 소유 문서 보존, 평가기의 본문 조건, 대안 근거, 금지 경로, 범위와 음성 사례다. 실제 Vault를 대상으로 새 MCP stdio 프로세스의 조회도 확인했다. 이미 실행 중인 MCP 프로세스는 재시작해야 수정한 query 모듈을 읽는다.

이후 필수 근거 평가를 보강한 suite는 82개 테스트를 통과했다. 추가 검증은 모든 필수 그룹 충족과 그룹 내 대안, 같은 본문의 필수 문구와 잘린 예외, 본문 조건 없는 대안의 지표 분리, 그룹 입력과 pinned 원문의 검사다. 실제 필수 근거 진단에서 발견한 발췌 누락과 별도 원문 읽기 결과는 [[Development-Ontology-Evaluation#필수 근거와 잘린 예외의 진단]]에 기록한다.

이 검증은 Markdown parser와 snapshot 조회의 계약을 확인한다. 실제 프로젝트 버그, 의미적으로 올바른 기술 추천, code repository index, deployment 또는 runtime behavior를 확인하지 않는다.

## 검색 품질 확인

`npm run evaluate`는 이미 생성한 snapshot에서 `evaluation/cases.json`의 기존 기술 질문 4개를 실행한다. `-- --cases evaluation/diagnostic-cases.json`처럼 사례 파일을 지정하면 각 사례의 scope와 예산으로 조회한다. `-- --cache <absolute-path>`로 평가 cache를 지정할 수 있다. 기본 예산은 24,000 byte다.

평가는 허용 원문과 heading의 일치, 선택적인 본문 문자열(`any_text`), 금지 경로, 최소 relation 수와 범위 밖 근거를 검사한다. 기대 원문, heading과 본문 문자열이 pinned snapshot에 실제로 있는지 먼저 확인하며, 없는 정답을 검색 실패로 세지 않고 실행 오류로 처리한다. `expected_evidence`의 항목은 허용 대안이며 그중 하나의 같은 section 안에서 조건을 충족해야 한다. `expected_empty` 사례는 정상 색인 범위에서 entity, evidence, relation이 없는 응답을 요구한다.

여러 근거가 모두 필요한 사례는 `expected_evidence_groups`를 사용한다. 그룹은 모두 충족해야 하며 그룹 안의 `any_of`는 대안이다. 같은 본문의 조건과 예외를 함께 요구할 때는 target에 `all_text`를 지정한다. `any_text`와 함께 있으면 두 문구 조건을 모두 검사한다. 기존 기대 근거 형식과 그룹 형식은 한 사례에 혼용하지 않는다. 보고서의 `missing_evidence_groups`와 `evidence_recall`은 지정한 필수 그룹의 누락과 충족률이며, 반환/잘림 evidence 수도 함께 기록한다. 전체 검색 recall이나 최종 판단의 정확도를 뜻하지 않는다. 입력 예시와 근거 관리 절차는 [[Ontology-Evidence-Lifecycle]]을 따른다.

보고서에는 문서와 heading 적중, 본문 검사 대상 수와 적중, 처리 시간, 응답 크기, relation 수, 예산과 탐색 상한, 사례와 코드 hash를 남긴다. 기존 4개 사례에는 본문 조건이 없으므로 `body_asserted_cases`는 0이며 heading 일치만 검증한다. `--check`를 추가하면 사례 조건을 충족하지 못할 때 종료 코드 1로 끝난다. 생략하면 품질 관찰 결과를 출력하고, 잘못된 사례나 예산 위반 같은 실행 오류만 실패한다.

현재 진단 확인 명령은 `npm run evaluate -- --cases evaluation/diagnostic-cases.json --check`다. 다도메인 표본의 역할, 재사용 여부와 전후 결과는 [[Development-Ontology-Evaluation#검색 순위와 관계 응답 보강]]을 따른다. 부분 문자열 적중은 답변 전체의 정확성이나 적용 판단의 성공을 뜻하지 않는다.

필수 조건과 예외의 누락은 `npm run evaluate -- --cases evaluation/context-integrity-cases.json`으로 관찰한다. 이 진단은 현 조회기의 한계를 드러내는 표본이며 `--check`를 붙이면 누락이 있는 동안 실패한다. 짧은 검색 진단과 필수 근거 진단의 통과 여부를 합쳐 모든 조회가 성공했다고 표시하지 않는다.

최초 독립 표본은 기대 문서 2/4, 기대 heading 1/4였다. 자세한 입력, 실행 결과와 해석은 [[Development-Ontology-Evaluation]]에 남긴다. 검색 결과가 부족하면 기술 용어 후보로 다시 조회하고, 파일명과 heading으로 scope를 좁히거나 직접 원문 검색으로 보완한다.

## 후속 설계

- code repository의 symbol, framework 설정, migration, test와 runtime evidence 색인
- embedding, LLM semantic inference, candidate relation review queue
- 승인된 typed relation의 authoring UX와 stale, conflict 판정
- holdout 기반 retrieval recall, 불필요한 근거, 탐색 시간과 사용자 재설명 감소 측정
- JSONL 병목이 확인된 뒤 SQLite, graph DB 또는 RDF 검토
- 긴 자연어 질문의 section 랭킹과 root 상한 6개, 관계 탐색 순위의 재검토. 짧은 용어 검색과 관계 응답의 개선 결과는 [[Development-Ontology-Evaluation#검색 순위와 관계 응답 보강]]을 따른다

현재 검색은 label, alias, tag, heading, 제한된 한영 키워드 확장과 명시 관계 탐색을 사용한다. 일반적인 동의어, 문맥, 인과관계와 코드 호출 관계를 추론하지 않으며 LLM이 relation을 자동 확정하지 않는다.

## 관련 문서

- [[Development-Ontology]]
- [[Development-Ontology-Contract]]
- [[Development-Ontology-Evaluation]]
- [[Ontology-Evidence-Lifecycle]]
- [[Ontology-Context-Platform-Implementation]]
- [[Ontology-Context-Platform-AI-Runtime]]
