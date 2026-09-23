---
tags: [ontology, runtime, evaluation, history]
status: done
category: "AI엔지니어링(AIEngineering)"
---

# 온톨로지 runtime 검증 이력

아래는 2026-09-05부터 2026-09-08까지 기록한 구현 검증 이력이다. 테스트 개수, 색인 수와 연결 상태는 각 관측 시점의 결과다. 현재 설치와 실행 계약은 [[Ontology-Operations]], 후속 검색 개선 검증은 [[Ontology-Retrieval-Quality]]를 따른다.

## MCP 연결의 초기 검증

2026-09-05 범위 확장 전 장비에서 Codex 사용자 등록 `enabled: true`, Claude 사용자 등록 `Connected`를 확인했다. 당시 `--allow tech` 등록과 같은 명령을 사용하는 SDK client로 `/private/tmp`에서 `tools/list`와 실제 조회를 검증했다. Outbox 원문 근거를 반환했고 `fit` 요청의 evidence는 0개였다. 이어 Codex 세션에 노출된 `context_lookup` 도구를 직접 호출해 원문 경로, heading, revision과 hash를 받았다. 이는 당시 연결과 호출 검증이며 전체 기본 범위의 현재 동작이나 모든 모델의 자동 도구 선택을 증명하지는 않는다. 새 세션에서 도구가 보이지 않으면 CLI와 원문 검색으로 보완한다.

같은 날 범위 확장 후 Codex와 Claude의 사용자 등록에서 `--allow tech`를 제거했다. 두 등록의 실행 파일과 인자가 동일함을 확인하고, 해당 명령으로 새 MCP 프로세스를 실행해 여섯 범위 각각의 원문 제목 조회와 scope 밖 근거 제외를 확인했다. scope 생략 조회도 `ontology/Ontology-Operations.md`를 반환했다. 이미 열린 MCP 연결은 이전 설정을 유지하므로 새 세션에서 확장된 등록과 도구 설명을 사용한다.

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

2026-09-07 suite 67개 테스트를 통과했다. 추가 검증은 표 셀의 escape된 파이프 위키링크 해석, 요청별 메모리 snapshot 고정, 요청 scope가 활성 snapshot을 바꾸지 않음, 비활성 snapshot과 오래된 임시 디렉터리 삭제, cache 소유권 표식, cache lock 대기와 정상 해제 순간 재시도, 보유자 확인 중 lock이 사라지는 handoff 재시도, 죽은 프로세스 lock의 `cache_lock_stale` 중단, malformed lock의 `snapshot_integrity_error` 중단, lock 대기 뒤 source revision 재확인, `snapshots` 상위 symlink 거부, 이전 구현이 남긴 `.lock.dead-*` 정리, 다른 extractor 버전이거나 디렉터리 또는 artifact가 사라진 활성 snapshot의 자동 재빌드, 같은 fingerprint의 불완전한 디렉터리 교체, symlink 거부, dirty worktree 오류의 사유 표시, `status`의 `snapshot_status`, `verified_at` 보존이다.
검증 세션에서 lock 없이 직전 활성 snapshot만 지우던 중간 구현은 scope가 다른 build 두 개의 동시 실행 90회 중 4회에서 활성 포인터가 사라져 폐기됐고, 디렉터리 lock을 삭제로 회수하던 구현도 죽은 lock을 두 build가 동시에 회수할 때 40회 중 21회 실패했다. symlink lock 자동 회수 구현은 같은 fixture의 scope가 다른 build 2개 100회, 죽은 pid lock을 미리 둔 build 2개 100회와 3개 40회에서 관찰된 실패가 없었지만, 독립 검토에서 세 contender가 겹칠 때 후속 보유자의 lock을 옮길 수 있는 경쟁 조건이 확인되어 최종 구현에서는 자동 회수를 제거했다.
revision `bf77c8484d7ecbdf5d02f828df89b504fef1952a`의 committed Markdown을 extractor 10으로 색인한 결과는 1,869 Document, 21,458 unit, 35,427 relation(`links_to` 13,969), coverage gap 2다. 이전 extractor 9의 gap 114건 중 112건은 표 안의 `[[대상\|별칭]]` 표기를 파서가 해석하지 못한 것이었고 수정 뒤 `links_to` 112개로 해석됐다. 남은 2건은 `tags`에 따옴표 없는 `null`이 있던 문서 2개이며 원문을 고쳤다. 검증 당시 코드와 문서 수정은 미커밋이라 `unindexed_worktree`가 표시됐다. Claude와 Codex 사용자 등록도 절대경로 Node로 등록해 Claude `Connected`를 확인했다.

같은 날 동시 실행 오류를 수정한 뒤 suite 70개 테스트를 통과했다. 추가한 3개 테스트는 최초 소유권 표식의 빈 내용을 읽은 뒤 다른 프로세스가 기록을 마치는 경우의 재확인, 중단되거나 잘못된 표식의 거부와 기존 데이터 보존, 파일 존재 확인과 읽기 사이에 다른 CLI build가 snapshot을 삭제했을 때 같은 요청에서 재빌드하는 동작을 검증한다. 이 중 두 동시 실행 테스트는 수정 전 실패하고 수정 후 통과했다.

같은 날 검색과 응답 구성 보강 후 suite 78개 테스트를 통과했다. 추가 검증은 짧은 복합 질의의 일반어 잡음 제외, 긴 질문의 관련 문서 보존, 24KB 관계 묶음, 작은 예산에서 고아 근거 제거와 소유 문서 보존, 평가기의 본문 조건, 대안 근거, 금지 경로, 범위와 음성 사례다. 실제 Vault를 대상으로 새 MCP stdio 프로세스의 조회도 확인했다. 이미 실행 중인 MCP 프로세스는 재시작해야 수정한 query 모듈을 읽는다.

이후 필수 근거 평가를 보강한 suite는 82개 테스트를 통과했다. 추가 검증은 모든 필수 그룹 충족과 그룹 내 대안, 같은 본문의 필수 문구와 잘린 예외, 본문 조건 없는 대안의 지표 분리, 그룹 입력과 pinned 원문의 검사다. 실제 필수 근거 진단에서 발견한 발췌 누락과 별도 원문 읽기 결과는 [[Development-Ontology-Evaluation#필수 근거와 잘린 예외의 진단]]에 기록한다.

같은 날 `context_read`와 CLI `read`를 추가한 suite는 91개 테스트를 통과했다. 추가 검증은 같은 ID/revision/hash의 전체 근거 읽기, UTF-8 페이지 연결과 마지막 페이지 예산, 잘못된 cursor와 작은 예산의 중단, 허용 범위와 symlink 거부, dirty 본문 제외, 원문 커밋 변경 뒤 재조회 요구, 긴 한글 heading의 ID 읽기, MCP 입력 계약과 CLI 인자 조합이다. 새 stdio 프로세스로 연결한 SDK client에서 실제 도구 호출을 검증했으며, 기존 연결에 새 도구가 자동 등록됐다는 의미는 아니다.

이 검증은 Markdown parser와 snapshot 조회의 계약을 확인한다. 실제 프로젝트 버그, 의미적으로 올바른 기술 추천, code repository index, deployment 또는 runtime behavior를 확인하지 않는다.

2026-09-08 suite는 103개 테스트를 통과했다. 추가 검증은 짧은 관련 section의 순위 보존, 긴 질문의 어휘 겹침 진단, 공백만 있는 질문의 거부, 문서 목차의 순서와 페이지 예산, ID/revision/허용 범위/원문 hash 검사, 목차에서 고른 section의 후속 읽기, 새 MCP stdio의 세 도구와 CLI 인자 조합이다. 관계 우선순위 fixture 3개는 일반 본문 질의, 한 토큰의 정확한 제목 질의, 명시적 typed relation을 검사한다. 일반 링크 50개 이상에서 관련 근거가 밀리는 오류를 실제 Markdown으로 재현했으며 각각 수정 전 실패했다. 실제 Vault의 검색 회귀와 목차 탐색 결과는 [[Ontology-Retrieval-Quality]]에 분리해 기록한다.

## 초기 검색 관측

최초 독립 표본은 기대 문서 2/4, 기대 heading 1/4였다. 자세한 입력, 실행 결과와 해석은 [[Development-Ontology-Evaluation]]에 남긴다.

## 관련 문서

상위: [[Ontology-History]]. 전체 지도: [[Development-Ontology]].

- [[Ontology-Operations]]
- [[Development-Ontology-Evaluation]]
