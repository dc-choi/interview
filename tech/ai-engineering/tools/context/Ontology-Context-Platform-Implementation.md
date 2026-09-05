---
tags: [ai, ontology, knowledge-graph, context, implementation]
status: done
verified_at: 2026-09-05
category: "AI엔지니어링(AIEngineering)"
aliases: ["Ontology Context Platform Implementation", "온톨로지 컨텍스트 플랫폼 구축"]
---

# 온톨로지 기반 개발 컨텍스트 플랫폼: 구축 방법과 검증 기준

> 유형: 구축 계약과 후속 확장 설계. 이 문서의 모든 항목이 구현 완료된 것은 아니다.
> 상태: 루트 `ontology/`에 Markdown 색인, CLI와 MCP 구현 (2026-09-05). 실제 지원 범위, 실행과 검증은 [[Ontology-Operations]]를 따른다.
> 범위: [[Agentic-Context-Platform|에이전트 컨텍스트 플랫폼]]의 일반 계약을 기존 Markdown에 적용하는 구축 순서와 검증 기준

## 목표와 비목표

목표는 학습 Vault의 기존 Markdown을 그대로 지식 원본으로 사용하면서, 개발 요청마다 전체 저장소와 문서를 다시 읽는 비용을 줄이고 확인할 원문을 근거와 함께 찾는 것이다.

- 작업과 관련된 서비스, 모듈, API, 이벤트, 저장소와 불변 조건을 찾는다.
- 각 관계에서 원본 코드, 설정, 테스트나 문서 위치로 돌아갈 수 있게 한다.
- 오래됐거나 충돌하거나 근거가 부족한 정보는 정상 상태로 노출한다.
- 에이전트에는 전체 그래프가 아니라 현재 질문에 필요한 작은 하위 그래프만 공급한다.
- 지식 변경은 Markdown에서 먼저 수행하고 온톨로지와 관계 색인은 원문에서 다시 생성한다.

이 시스템은 소스 코드, 테스트, 배포 설정과 런타임 관측을 대체하지 않는다. 전사 개념을 먼저 완성하거나 에이전트의 자동 추론을 검증된 사실로 저장하는 것도 목표가 아니다.

## 핵심 개념

| 계층 | 역할 | 산출물 |
|---|---|---|
| Markdown 지식 정본 | 사람이 읽고 수정하는 실제 지식 | frontmatter, heading, 위키링크와 본문 |
| 온톨로지 | 어떤 개념과 관계를 허용할지 정의 | 엔터티 타입, 관계 타입과 제약 |
| 지식 그래프 | Markdown 구조와 검증된 근거를 온톨로지에 맞춰 색인 | 재생성 가능한 노드와 관계 |
| 컨텍스트 조회기 | 질문에 맞는 관계와 원문만 선택 | 에이전트용 context pack |

온톨로지는 용어와 관계의 계약이고 지식 그래프는 그 계약을 따르는 파생 색인이다. 그래프에만 존재하는 본문이나 claim은 두지 않는다. 개발을 쉽게 만드는 직접적인 장치는 색인을 질문별 Markdown 원문 조회로 연결하는 컨텍스트 조회기다. AI가 질문 시점에 색인을 탐색하고 원문을 다시 읽는 경로는 [[Ontology-Context-Platform-AI-Runtime|Markdown Vault를 읽는 AI 런타임]]에서 다룬다.

## 파일럿 질문부터 정한다

스키마보다 먼저 반복되는 개발 질문 하나를 고른다. 첫 후보는 다음처럼 답을 검증할 수 있는 질문이어야 한다.

- 이 이벤트나 API 계약을 바꾸면 어떤 소비자와 저장소가 영향받는가?
- 이 데이터는 어디에서 생성되고 변환되어 조회되는가?
- 이 불변 조건을 구현하고 검증하는 코드와 테스트는 어디인가?

첫 적용 지도는 [[Development-Ontology-Event-Publishing|이벤트 발행]]이고, [[Development-Ontology|개발 판단 온톨로지]]에서 시작한다. 개별 판단의 파일럿 범위는 질문 하나와 업무 도메인 하나로 제한한다. 검색 색인 흐름을 예로 들 수 있지만, 실제 착수 시점의 소스와 배포 상태를 다시 확인해야 하며 이 문서는 해당 작업의 승인이나 배정을 뜻하지 않는다.

## 최소 온톨로지

처음에는 실제 질문에 필요한 타입만 둔다.

| 엔터티 | 포함하는 대상 |
|---|---|
| `Document` | Markdown 파일 |
| `Section` | heading으로 구분하며 MVP에서 EvidenceUnit 계약도 구현하는 원문 단위 |
| `Concept` | MVP 뒤, canonical ID와 alias가 필요할 때 추가하는 정규화된 개념 |
| `Claim` | MVP 뒤, 근거와 충돌을 독립적으로 추적할 때 추가하는 정규화된 주장 |
| `Category` | frontmatter와 인덱스가 나타내는 분류 |
| `SystemEntity` | 질문에 필요할 때만 구분하는 component, interface, event와 datastore |
| `Invariant` | 반드시 유지할 업무나 데이터 조건 |
| `EvidenceUnit` | 문서 section과 frontmatter relation assertion, 확장 시 코드 symbol, 설정과 테스트 |

MVP 관계는 `contains`, `links_to`로 시작하고 category는 Document 속성으로만 둔다. `mentions`는 Concept, `supported_by`와 `contradicted_by`는 Claim 계층을 실제로 추가할 때 사용한다. `calls`, `publishes`, `consumes`, `reads_from`, `writes_to`, `constrained_by`, `verified_by`는 개발 질문에 필요하고 원문 근거를 확인했을 때만 추가한다.

본문에서 실제 파일과 section으로 해석되는 위키링크는 `links_to`로 확정한다. 검토자가 typed relation 후보를 승인할 때는 생성 색인을 고치지 않고 canonical Markdown의 선택적 frontmatter에 기록한다. `subject`를 생략하면 해당 Document ID를 사용하고, 다른 주체면 이미 존재하는 canonical entity ID를 명시해야 한다. `target`도 같은 snapshot의 canonical entity ID로 해석되어야 하며 실패하면 relation 대신 coverage gap으로 남긴다. extractor는 각 항목을 `frontmatter.ontology_relations[index]` anchor를 가진 `relation_assertion` EvidenceUnit으로 materialize하고 이 표기만 `source_confirmed`로 승격한다.

```yaml
ontology_relations:
  - predicate: verified_by
    target: "unit:target-id"
```

MVP의 `Document` ID는 `document:<repo-id>:<relative-path>`, Section EvidenceUnit ID는 `unit:<repo-id>:<relative-path>:<encoded-heading-path>#<occurrence>`, frontmatter assertion ID는 `unit:<repo-id>:<relative-path>:frontmatter.ontology_relations[<index>]`로 만든다. `entities.jsonl`의 Section과 relation assertion record가 공통 EvidenceUnit 계약의 source, anchor, revision과 hash를 함께 가지며 relation의 `evidence_unit_id`는 이 `unit:*` ID를 직접 참조한다. `content_hash`는 pinned Git blob에서 anchor가 가리키는 원문 byte의 SHA-256, `source_updated_at`은 filesystem mtime이 아니라 manifest revision에서 해당 path를 마지막으로 바꾼 commit 시각이다. edge ID는 `[subject, predicate, object, evidence_unit_id, assertion_occurrence]` canonical JSON의 SHA-256으로 만들고 occurrence는 해당 EvidenceUnit 안의 source 순서다. heading component는 `encodeURIComponent`로 인코딩한다. anchor에는 원래 heading, occurrence와 pinned revision의 line span도 보존한다. rename은 삭제와 신규 생성으로 처리하고, 외부 관계가 rename 뒤에도 같은 대상을 가리켜야 할 때만 canonical Markdown에 명시적 `id`나 block ID를 추가한다. `SystemEntity`는 `event:content-updated`처럼 표시 이름과 분리한 ID를 쓰고 한글명, 코드 symbol과 과거 명칭은 alias로 연결한다. 같은 triple도 source와 anchor가 다르면 별도 assertion edge로 보존하고, 하나의 `Claim`에 여러 EvidenceUnit을 연결한다. 이름 유사성만으로 엔터티나 assertion을 자동 병합하지 않는다.

## 사실과 근거 계약

관계 한 건은 최소한 다음 정보를 가진다.

```json
{
  "id": "edge:sha256:<canonical-tuple-hash>",
  "subject": "document:interview:tech/ai-engineering/tools/context/Agentic-Context-Platform.md",
  "predicate": "links_to",
  "object": "document:interview:tech/ai-engineering/tools/context/Context-Engineering.md",
  "evidence_unit_id": "unit:interview:tech/ai-engineering/tools/context/Agentic-Context-Platform.md:관련-문서#1",
  "assertion_occurrence": 1,
  "extraction_method": "parser",
  "extraction_version": "EXTRACTOR_VERSION",
  "verification": "source_confirmed",
  "freshness": "not_checked",
  "conflict": "not_checked"
}
```

`evidence_unit_id`는 [[Agentic-Context-Platform#출처별 의미 단위|공통 EvidenceUnit 계약]]의 source, anchor와 revision을 참조한다. 검증은 `source_confirmed`, `candidate`, `insufficient_evidence`, 최신성은 `not_checked`, `current`, `stale_risk`, `superseded`, 충돌은 `not_checked`, `none`, `disputed`로 분리한다. 의미 충돌 검사가 없는 MVP relation은 `not_checked`이고 실제 검사를 통과한 뒤에만 `none`이 된다. 수집 시각인 `observed_at`은 immutable snapshot 밖의 실행 로그에만 둔다. `verified_at`은 canonical Markdown의 원문이나 검토 metadata에 명시된 경우에만 relation에 복사하며 재현성 fingerprint에서 제외한다. confidence는 모델이 제안한 후보에만 기록한다. 최신성은 검증 시각, 대체 관계와 관련 근거로 판단하고 checkout과 manifest의 차이만으로 바꾸지 않는다. 검증 시각이나 freshness policy가 없으면 `current`로 추정하지 않고 `not_checked`로 둔다. 색인 동기화는 `synced`, `revision_mismatch`, `unindexed_worktree`, `source_unavailable` 중 하나로 조회 시 source별 계산하며 relation에 저장하지 않는다. MVP는 `document/section`과 `document/relation_assertion`만 사용한다. 코드 근거 확장 시 `code/symbol|behavior`, `config/setting`, `test/test_case|behavior`, `schema/definition`을 사용하고 런타임은 `runtime_not_checked`로 반환한다.

근거의 역할도 분리한다.

- manifest에 고정한 revision의 코드, 설정과 테스트는 해당 revision의 구현 사실을 뒷받침한다.
- 설계 문서와 결정 기록은 의도와 합의 근거이며 현재 배포 상태를 증명하지 않는다.
- 실제 실행, 트래픽과 배포 여부는 로그, trace, 배포 설정이나 live query가 있어야 확인할 수 있다.

## 수집과 갱신 파이프라인

값싼 결정론적 추출을 먼저 하고 의미 판단은 필요한 후보에만 사용한다.

1. source manifest에는 source별 저장소 식별자, revision, 포함과 제외 경로, schema와 추출기 버전, 결정론적 build 설정 hash와 완료 여부를 기록한다. 재현성 fingerprint는 이 입력들로 만들고 실행 시각과 오류 코드는 snapshot 밖의 run log에만 기록하며, 완료되지 않은 build는 serving index로 사용하지 않는다. 기본 build는 dirty working tree를 거부한다. `--committed-only`를 명시하면 `HEAD` blob만 색인하고 `unindexed_worktree`로 미반영 상태를 보고한다. 코드 저장소를 추가할 때는 source별 항목으로 확장한다.
2. worktree를 순회하지 않고 manifest revision의 Git tree에서 tracked regular Markdown blob만 경로순으로 열거해 frontmatter, heading, 위키링크와 원문 anchor를 추출한다. untracked, ignored와 symlink entry는 읽지 않는다.
3. 파일을 `Document`, heading section과 frontmatter relation assertion을 EvidenceUnit record, category와 alias를 속성으로 만든다. 실제 대상으로 해석된 위키링크는 `source_confirmed`인 `links_to`, 깨진 링크는 source, scope, anchor, reason과 unresolved target을 가진 manifest의 결정론적 `coverage_gaps`로 기록한다.
4. LLM은 개념 정규화와 비명시 관계 후보를 별도 candidate queue에 제안하되 결정론적 serving index에 섞거나 자동 확정하지 않는다.
5. 개발 질문에 필요할 때만 코드 parser, framework 설정, schema와 migration에서 시스템 관계를 보충한다.
6. commit과 content hash를 비교해 변경된 단위만 다시 추출한다.
7. 삭제된 원문에 연결된 관계는 제거하거나 tombstone으로 남긴다.
8. artifact는 UTF-8과 LF, 재귀적으로 정렬한 JSON object key, ID순 JSONL record와 schema가 정한 unordered array 순서로 직렬화하고 마지막 LF까지 SHA-256 hash에 포함한다.
9. fingerprint별 임시 snapshot에 모든 artifact를 쓴 뒤 manifest의 artifact hash와 완료 상태를 검증한다. 같은 fingerprint가 이미 있으면 manifest hash 일치 시 재사용하고 다르면 `non_deterministic_build`로 실패한다. 새 snapshot을 불변 경로로 rename한 다음 `active.json` pointer만 원자적으로 교체한다.

manifest가 있어야 관계가 없다는 결과와 해당 범위를 수집하지 못했다는 결과를 구분할 수 있다. 현재 checkout과 manifest revision이 다르면 `revision_mismatch`, dirty 상태면 `unindexed_worktree`로 표시하되 claim의 최신성은 별도로 판단한다. MVP 조회는 활성 manifest revision에만 고정하고 과거 revision을 지정하는 질의는 실제 요구가 생길 때 입력 계약을 추가한다. 정적 분석은 reflection, 동적 dispatch, dependency injection의 런타임 binding과 외부 시스템 동작을 놓칠 수 있으므로 최종 변경 전에는 현재 호출부, 설정, 테스트와 필요한 런타임 근거를 다시 확인한다.

## 가장 작은 파생 색인

첫 구현에는 그래프 DB가 필요하지 않다.

```text
<vault-root>/                              # 기존 Markdown, 유일한 지식 편집 지점
<local-cache>/context-ontology/<repo-id>/  # Git 저장소 밖의 파생 색인
  active.json                              # fingerprint와 manifest hash만 가리킴
  runs.jsonl                               # fingerprint, observed_at과 오류 코드
  snapshots/
    <fingerprint>/                         # 게시 뒤에는 수정하지 않음
      schema.json
      source-manifest.json                 # artifact hash, coverage_gaps와 completed=true
      entities.jsonl
      relations.jsonl
```

Git이 Markdown 변경 이력을 관리하고 작은 CLI가 저장소 밖의 로컬 캐시에 색인을 생성하면 된다. build와 조회는 고정 파일을 덮어쓰지 않으며 조회기는 각 요청 시작에 `active.json`을 한 번 읽고 그 요청 동안 같은 snapshot만 사용한다. clean 검사는 Vault worktree에만 적용하고 캐시 경로는 manifest 입력 범위에서 제외한다. 생성 파일은 직접 편집하지 않는다. 조회 알고리즘, Context Pack과 MCP 계약은 [[Ontology-Context-Platform-AI-Runtime|AI 런타임 설계]]를 따른다.

## 단계별 구축 순서

1. **평가 세트**: 초기에는 과거 작업 10건 안팎을 설계 조정용 calibration과 조정에 쓰지 않을 holdout으로 나눈다. 조회 입력은 변경 전 revision과 당시 manifest로 고정하고 이후 diff와 검토는 필수 edge와 anchor 정답표에만 쓴다. 삭제, rename, 중복 heading, stale, candidate 제외와 부분 수집 실패를 포함하고 대상 사용자, 반복 횟수, 관찰 기간, 누락과 무관 edge 허용치, 탐색 시간, 컨텍스트 크기와 리뷰 수정 목표를 구현 전에 정한다.
2. **Markdown 추출기와 CLI**: frontmatter, heading과 위키링크에서 최소 엔터티와 관계를 생성한다. calibration에서 조회 계약을 조정한 뒤 스키마와 규칙을 고정하고 holdout을 한 번 평가한다.
3. **변경분과 코드 근거 확장**: Git 변경분만 다시 색인하고, 실제 질문에 필요할 때 import, route, event와 schema를 보충한다. LLM 추출은 candidate queue만 만들며 삭제 전파, content hash와 commit별 snapshot을 검증한다.
4. **에이전트 연결**: [[Ontology-Context-Platform-AI-Runtime#최소 구현과 학습 순서|AI 런타임 순서]]에 따라 CLI 조회와 결과 계약이 안정된 뒤 읽기 전용 MCP Tool로 노출한다. 반환 크기, 권한, timeout과 감사 로그를 제한하고 EvidenceUnit 인용과 불확실성 보존을 확인한다.
5. **저장소 확장**: JSONL 탐색이 실제 병목이면 SQLite로 옮긴다. 가변 길이 경로와 동시 질의가 반복 병목일 때만 graph DB를, 조직 간 ontology 교환이나 표준 추론이 필요할 때만 RDF와 OWL을 검토한다.

## 성공 기준과 보류 기준

- 반환한 모든 사실에 현재 확인 가능한 원문 anchor가 있다.
- manifest, run log와 index sync가 source별 revision, 수집 범위, 실패, 추출기 버전과 artifact hash를 보여 빈 결과, 미수집, source 변경과 손상된 snapshot을 구분한다.
- 원문 변경과 삭제가 stale 상태나 관계 제거로 전파된다.
- serving 조회에는 `source_confirmed`만 포함되고 candidate queue는 결과와 분리된다.
- 검사하지 않은 의미 충돌은 `none`이 아니라 `not_checked`와 limitation으로 노출된다.
- 검증 시각이나 freshness policy가 없으면 `current`가 아니라 `not_checked`로 노출된다.
- 파생 색인을 삭제하고 Markdown에서 다시 생성해도 수동 편집한 사실이 유실되지 않는다.
- holdout에서 필수 edge 누락과 무관 edge 허용치를 지키면서 탐색 시간, 컨텍스트 크기와 리뷰 수정이 사전 목표를 충족한다.
- 줄어든 탐색 비용보다 관계 유지비가 크거나 stale 정보가 판단을 더 자주 흐리면 범위를 넓히지 않는다.
- 정적 그래프만으로 런타임 동작이나 배포 상태를 확정하지 않는다.

현재 구현 이후의 범위 확대는 측정 개선이 확인될 때 진행한다. 자동 추론, 코드 저장소 색인과 graph DB는 실제 누락과 병목이 확인된 뒤 검토한다. 파일 기반 지도는 [[Development-Ontology]]에 유지한다.

## 출처

- [W3C, OWL 2 Web Ontology Language Primer](https://www.w3.org/TR/owl2-primer/)
- [W3C, RDF 1.1 Concepts and Abstract Syntax](https://www.w3.org/TR/rdf11-concepts/)
- [W3C, PROV-O: The PROV Ontology](https://www.w3.org/TR/prov-o/)
- [Model Context Protocol, Architecture overview](https://modelcontextprotocol.io/docs/learn/architecture)
- [Tree-sitter, Using Parsers](https://tree-sitter.github.io/tree-sitter/using-parsers/)

## 관련 문서

- [[Agentic-Context-Platform|에이전트 컨텍스트 플랫폼]]
- [[Ontology-Context-Platform-AI-Runtime|Markdown Vault를 읽는 AI 런타임]]
- [[Context-Engineering|컨텍스트 엔지니어링]]
- [[MCP|Model Context Protocol]]
