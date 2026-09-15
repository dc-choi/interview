---
tags: [ai, ontology, context, retrieval, mcp]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["Ontology Operations", "온톨로지 실행 절차"]
---

# 개발 판단 온톨로지 실행 절차

`ontology/`는 이 Vault의 committed Markdown을 읽는 Node.js 실행 코드와 문서의 위치다. Markdown이 지식 정본이고 snapshot JSONL은 Git 밖 캐시에 만드는 파생물이다.

## 구현 범위

Git `HEAD`의 Markdown에서 문서, 절과 명시 관계를 추출하고, 질문에 맞는 원문을 revision, 위치와 hash와 함께 반환한다. 검색 순위, 근거 선택, scope와 예산의 상세 계약은 [[Ontology-Runtime-Contract#구현 범위]]를 따른다.

## 기존 목차와 위키링크의 역할

원문에 명시된 목차, 상위 문서와 관련 문서의 탐색 역할은 [[Ontology-Runtime-Contract#기존 목차와 위키링크의 역할]]에서 관리한다.

## 설치와 명령

Node.js 22 이상에서 실행한다. `ontology/`에서 의존성을 설치한다.

```bash
npm ci --ignore-scripts
npm test
npm run build -- --committed-only
npm run lookup -- --committed-only --query "transactional outbox"
node src/cli.mjs search --committed-only --query "transactional outbox"
npm run status
npm run serve
```

`build`, `lookup`, `search`는 `--repo <absolute-path>`, `--cache <absolute-path>`, 반복 가능한 `--scope <repository-relative-prefix>`를 받는다. `lookup`은 `--allow`, `--depth 1|2`, `--max-bytes <positive-integer>`와 반복 가능한 `--condition`을 받는다. `search`는 `--allow`, `--max-bytes <positive-integer>`, `--cursor <opaque-token>`을 받으며 `--depth`는 받지 않는다. `--allow`를 생략하면 기본 범위 `README.md`, `biz/`, `econ/`, `fit/`, `ontology/`, `tech/`를 사용하며, 반복 지정하면 필요한 경로로 허용 범위를 제한한다. `lookup`과 `search`의 snapshot 범위는 항상 allowlist이고 `--scope`는 요청 범위만 좁힌다. 요청 scope 때문에 활성 snapshot을 다시 만들지 않는다 (2026-09-07 수정. 이전에는 `--scope tech` 조회가 활성 snapshot을 `tech` 전용으로 교체했다). scope는 glob이 아닌 repository-relative prefix이며 상위 경로 이동과 wildcard를 거부한다.

기본 cache는 `~/.cache/context-ontology/<checkout-hash>/`에 둔다. 소유권 표식, 동시 build 잠금, snapshot 교체와 무결성 검사는 [[Ontology-Runtime-Contract#Snapshot 저장과 무결성]]을 따른다.

## Git 상태와 재생성

기본 build는 dirty worktree를 거부한다. `--committed-only`를 명시하면 dirty 상태여도 `HEAD` blob만 읽어 snapshot을 만들 수 있다. 어느 경우도 working tree 파일이나 untracked 파일을 evidence로 읽지 않는다. 원문의 마지막 변경 시각을 재현하기 위해 shallow clone은 거부한다. UTF-8이 아닌 본문이나 Git 경로도 추정 변환하지 않고 오류로 중단하며 기존 snapshot을 보존한다.

`lookup`, `search`, `context_lookup`, `context_search`는 요청 시작에 active snapshot의 revision과 indexed scope를 현재 `HEAD`와 비교한다. clean worktree에서 다르면 새 snapshot을 만든다. dirty 상태에서 `--committed-only`가 없으면 기존 clean snapshot만 유지하고 query 결과는 `unindexed_worktree`로 표시한다. 기존 snapshot도 없으면 오류로 끝난다. `--committed-only`면 dirty 상태에서도 pinned `HEAD` snapshot을 만들고 결과에 `unindexed_worktree`를 표시한다.

`read`와 `context_read`도 같은 snapshot 확인 경로를 사용한다. 조회 결과의 ID, revision과 hash에 맞는 근거를 예산 안에서 페이지로 읽으며, revision이나 hash가 달라졌으면 재조회를 요구한다. 입력, 페이지 연결과 오류 처리의 정본은 [[Ontology-Evidence-Read]]다.

`outline`과 `context_outline`도 같은 snapshot 확인 경로를 사용한다. 찾은 Document의 section 목록을 페이지로 반환하고, 선택한 section의 본문은 `context_read`로 읽는다. 입력, 목차 cursor와 원문 무결성 검사는 [[Ontology-Document-Outline]]을 따른다.

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

MCP host는 tool argument로 repository나 cache 경로를 바꿀 수 없다. `context_lookup`은 `query`, 선택 `conditions`, `scope`, `depth`, `max_bytes`를 받고 알 수 없는 field와 크기 제한 초과 입력을 거부한다. `context_search`는 `query`, 선택 `scope`, `max_bytes`, `cursor`를 받고 document 후보만 페이지로 반환한다. cursor는 인증 정보가 아닌 consistency token이므로 query, scope, snapshot, query 코드가 바뀌면 재사용할 수 없다. tool 결과는 JSON text와 동일한 structured content다. 스킬의 일반 요청 예산은 24KB, 서버 상한은 64KiB다. 특정 host를 제한해야 하면 등록 명령에 `--allow <repository-relative-prefix>`를 반복해 추가한다.

`context_read`는 `evidence_unit_id`, `source_revision`, `content_hash`, 선택 `offset_bytes`, `max_bytes`를 받는다. 근거 ID와 도구 입력 전체는 각각 최대 65,536 UTF-8 byte다. 긴 heading에서 생성돼 조회 응답에 담긴 ID도 그대로 읽을 수 있도록 읽기 입력 한도를 조회 출력 상한에 맞췄다. `context_lookup`의 입력 전체 제한은 8,192 byte다. 읽기 결과도 JSON text와 structured content가 일치하며 같은 host allowlist를 적용한다.

`context_outline`은 `document_id`, `source_revision`, 선택 `offset_sections`, `max_bytes`를 받는다. 문서 ID와 전체 입력 한도는 각각 65,536 UTF-8 byte이며, 목차 응답도 동일한 JSON 예산과 host allowlist를 따른다. 각 section의 ID/revision/hash는 `context_read` 입력으로 사용할 수 있다.

이전 장비의 MCP 등록과 범위 확장 관측은 [[Ontology-Runtime-Verification#MCP 연결의 초기 검증]]에 보존한다. 현재 연결의 사용 가능 여부는 실제 도구 호출로 확인한다.

Codex의 온톨로지 우선 조회 규칙은 사용자 전역 `~/.codex/AGENTS.md`에 둔다. 상세 절차는 이 Vault의 `.agents/skills/development-context/SKILL.md`를 따른다.

전역 지침은 장비별 파일이므로 다른 장비에도 별도로 반영해야 한다. 이미 실행 중인 다른 Codex 세션에는 갱신을 가정하지 않고 새 세션에서 적용한다. 지침 탐색은 실행 시작 때 이뤄진다. [OpenAI, Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)

## runtime 검증

이전 테스트와 색인, 실제 MCP 호출 관측은 [[Ontology-Runtime-Verification]]에 보존한다. 검색 품질과 후속 실험은 [[Ontology-History]]에서 해당 기록을 찾는다. 현재 checkout의 검사는 `ontology/`에서 `npm test`로 실행한다.

## 검색 품질 확인

`npm run evaluate`는 이미 생성한 snapshot에서 `evaluation/cases.json`의 기존 기술 질문 4개를 실행한다. `-- --cases evaluation/diagnostic-cases.json`처럼 사례 파일을 지정하면 각 사례의 scope와 예산으로 조회한다. `-- --cache <absolute-path>`로 평가 cache를 지정할 수 있다. 기본 예산은 24,000 byte다.

평가는 허용 원문과 heading의 일치, 선택적인 본문 문자열(`any_text`), 금지 경로, 최소 relation 수와 범위 밖 근거를 검사한다. 기대 원문, heading과 본문 문자열이 pinned snapshot에 실제로 있는지 먼저 확인하며, 없는 정답을 검색 실패로 세지 않고 실행 오류로 처리한다. `expected_evidence`의 항목은 허용 대안이며 그중 하나의 같은 section 안에서 조건을 충족해야 한다. `expected_empty` 사례는 정상 색인 범위에서 entity, evidence, relation이 없는 응답을 요구한다.

여러 근거가 모두 필요한 사례는 `expected_evidence_groups`를 사용한다. 그룹은 모두 충족해야 하며 그룹 안의 `any_of`는 대안이다. 같은 본문의 조건과 예외를 함께 요구할 때는 target에 `all_text`를 지정한다. `any_text`와 함께 있으면 두 문구 조건을 모두 검사한다. 기존 기대 근거 형식과 그룹 형식은 한 사례에 혼용하지 않는다. 보고서의 `missing_evidence_groups`와 `evidence_recall`은 지정한 필수 그룹의 누락과 충족률이며, 반환/잘림 evidence 수도 함께 기록한다. 전체 검색 recall이나 최종 판단의 정확도를 뜻하지 않는다. 입력 예시와 근거 관리 절차는 [[Ontology-Evidence-Lifecycle]]을 따른다.

보고서에는 문서와 heading 적중, 본문 검사 대상 수와 적중, 처리 시간, 응답 크기, relation 수, 예산과 탐색 상한, 사례와 코드 hash를 남긴다. 기존 4개 사례에는 본문 조건이 없으므로 `body_asserted_cases`는 0이며 heading 일치만 검증한다. `--check`를 추가하면 사례 조건을 충족하지 못할 때 종료 코드 1로 끝난다. 생략하면 품질 관찰 결과를 출력하고, 잘못된 사례나 예산 위반 같은 실행 오류만 실패한다.

현재 진단 확인 명령은 `npm run evaluate -- --cases evaluation/diagnostic-cases.json --check`다. 다도메인 표본의 역할, 재사용 여부와 전후 결과는 [[Development-Ontology-Evaluation#검색 순위와 관계 응답 보강]]을 따른다. 부분 문자열 적중은 답변 전체의 정확성이나 적용 판단의 성공을 뜻하지 않는다.

필수 조건과 예외의 누락은 `npm run evaluate -- --cases evaluation/context-integrity-cases.json`으로 관찰한다. 이 진단은 현 조회기의 한계를 드러내는 표본이며 `--check`를 붙이면 누락이 있는 동안 실패한다. 짧은 검색 진단과 필수 근거 진단의 통과 여부를 합쳐 모든 조회가 성공했다고 표시하지 않는다.

초기 검색 관측은 [[Development-Ontology-Evaluation]], 이후 개선은 [[Ontology-History]]를 따른다. 검색 결과가 부족하면 기술 용어 후보로 다시 조회하고, 파일명과 heading으로 scope를 좁히거나 직접 원문 검색으로 보완한다.

후속 자연어 표본과 목차 탐색은 [[Ontology-Retrieval-Quality]]를 따른다. `node evaluation/outline-navigation.mjs --cache <absolute-path> --check`는 실제 MCP 목차의 무결성, 페이지 완료와 응답 예산을 검사한다. 이 명령의 `--check`는 protocol 검사만 수행하며 알려진 검색 실패를 통과로 바꾸지 않는다. heading 회수와 본문 조건 충족은 별도 지표다.

## 후속 설계

- code repository의 symbol, framework 설정, migration, test와 runtime evidence 색인
- embedding, LLM semantic inference, candidate relation review queue
- 승인된 typed relation의 authoring UX와 stale, conflict 판정
- holdout 기반 retrieval recall, 불필요한 근거, 탐색 시간과 사용자 재설명 감소 측정
- JSONL 병목이 확인된 뒤 SQLite, graph DB 또는 RDF 검토
- 긴 자연어 질문의 section 랭킹과 root 상한 6개, 관계 탐색 순위의 재검토. 짧은 용어 검색과 관계 응답의 개선 결과는 [[Development-Ontology-Evaluation#검색 순위와 관계 응답 보강]]을 따른다

현재 검색은 label, alias, tag, heading, 제한된 한영 키워드 확장과 명시 관계 탐색을 사용한다. 일반적인 동의어, 문맥, 인과관계와 코드 호출 관계를 추론하지 않으며 LLM이 relation을 자동 확정하지 않는다.

## 관련 문서

- [[Ontology-Reference]]
- [[Ontology-History]]
- [[Development-Ontology]]
- [[Development-Ontology-Contract]]
- [[Development-Ontology-Evaluation]]
- [[Ontology-Evidence-Lifecycle]]
- [[Ontology-Evidence-Read]]
- [[Ontology-Document-Outline]]
- [[Ontology-Document-Search]]
- [[Ontology-Retrieval-Quality]]
- [[Ontology-Context-Platform-Implementation]]
- [[Ontology-Context-Platform-AI-Runtime]]
