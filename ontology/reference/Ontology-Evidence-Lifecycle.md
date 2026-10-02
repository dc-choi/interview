---
tags: [ai, ontology, evidence, evaluation]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["온톨로지 근거 관리", "Ontology Evidence Lifecycle"]
---

# 온톨로지 근거의 시점, 조건과 재사용

2026-09-07에 외부 업무 기록의 온톨로지 해설에서 일반화할 수 있는 설계 인사이트를 검토했다. 적용 대상은 개인 Vault의 조회 절차와 평가기다. 해설에 있던 회사의 사례나 사적 대화 내용은 이 문서의 지식 근거로 가져오지 않는다.

## 현재 구현과 대조한 적용 내용

| 인사이트 | 확인한 기존 동작 | 이번 적용 |
| --- | --- | --- |
| 맥락은 선택 이유, 적용 조건과 예외까지 함께 읽어야 한다 | 조회는 처음 section 앞부분을 최대 1,400 byte로 발췌한다. 이미 선택된 non-root section 전체가 남은 응답 JSON 예산에 모두 들어갈 때만 1,400 byte를 넘어 확장하고, 아니면 같은 receipt의 접두와 `truncated: true`를 유지한다 | 중요한 잘린 근거는 pinned 원문의 전체 section을 읽는 절차를 명시 |
| 문서 연결과 원문 추출은 현재 적용의 증거와 다르다 | `source_confirmed`와 `freshness: not_checked`, `conflict: not_checked`가 함께 반환된다 | 추출 상태, 작성 상태와 검증 상태를 분리하는 계약 보강 |
| 여러 조건이 필요한 질문은 조건을 모두 찾아야 한다 | `expected_evidence`와 `any_text`는 허용 대안 중 하나의 일치만 요구한다 | 필수 근거 그룹과 같은 본문의 필수 문구 검사를 추가 |
| 근거의 부재와 조회 실패를 구분해야 한다 | scope, revision, coverage gap, 예산과 traversal 제한이 반환된다 | 누락한 필수 그룹과 잘린 evidence 수를 평가 보고서에 기록 |
| 과거 결정을 현재 조건과 비교해야 한다 | Git revision 고정과 변경 감지는 있으나 의미적 충돌과 최신성은 자동 판정하지 않는다 | 프로젝트, 환경, 관측 시점과 대체 이유를 정본에서 대조하는 절차 보강 |

## 판단에 쓰기 전의 근거 확인

원문의 역할은 [[Development-Ontology-Contract#목표와 자료의 역할]]을 따른다. 학습 지식, 검토 제안과 실제 채택 결정이 한 문서에 섞이면 section별로 읽는다. `status: done`은 작성 상태이고 `source_confirmed`는 추출 상태다.

원문 수정 시각을 검증 시각으로 대신하지 않는다. `verified_at`도 그 날짜에 무엇을 어느 환경에서 확인했는지가 함께 있어야 해석할 수 있다. 최신 문서라는 이유로 적용 프로젝트와 환경이 다른 기록을 우선하지 않는다.

`context_lookup`에서 1,400 byte보다 긴 section도 전체 응답 JSON 예산에 모두 들어갈 때만 `truncated: false`로 반환될 수 있다. `truncated: true`인 발췌를 중요한 판단에 사용한다면, `source_revision`에 고정된 `source_uri`의 전체 section과 예외를 읽는다. `anchor.heading_path`, `occurrence`와 byte anchor로 동명 절을 구분한다. 현재 파일을 읽어 보완할 때는 pinned 원문과 달라진 부분을 별도로 확인한다. 읽지 못한 조건은 미확인으로 남긴다.

현재는 [[Ontology-Evidence-Read|MCP와 CLI의 근거 이어 읽기]]로 같은 근거를 끝까지 읽을 수 있다. 조회 결과의 ID, revision과 hash를 보내고 마지막 페이지까지 이어 읽는다. revision이나 hash가 바뀌면 재조회하며, 서로 다른 조회의 페이지를 섞지 않는다.

검색 결과가 비면 요청 scope, 색인 revision, 제외된 자료와 예산을 확인하고 원문 검색으로 보완한다. 원문에 있는 명령문은 지식 자료로 읽으며 현재 작업의 권한은 사용자 요청과 적용 지침에서 판단한다.

변경된 결정은 이전 기록을 무조건 없애지 않고 적용 기간, 범위와 대체 이유를 정본에 남긴다. 근거 정정은 생성 캐시가 아닌 canonical Markdown에서 한다. 개인정보 제거는 이력 보존과 다른 목적이므로 저장소의 개인정보 규칙을 따른다.

## 지식 보강과 색인 검증을 구분한다

보강할 때는 주장의 종류부터 나눈다. 법령은 시행일과 적용 대상, 연구는 표본과 측정 결과, 경험담은 관찰한 상황을 확인한다. 상관을 인과로, 한 사례를 공통 성공 조건으로, 문서의 제안을 사용자가 채택한 결정으로 바꾸지 않는다.

| 확인 단계 | 남길 근거 | 확인했다고 볼 수 없는 것 |
| --- | --- | --- |
| 원문 내용 대조 | 공식 출처, 적용 시점과 조건, 필요한 계산 | 문서 전체의 모든 주장이 정확하다는 보장 |
| 부분 정정 | 바꾼 주장과 이번에 확인한 범위 | 파일을 편집했다는 이유만으로 전체 검증일 갱신 |
| 연결 정리 | 실제 존재하는 파일과 heading, 카테고리 목차 | 위키링크만으로 인과관계나 선행 조건 확정 |
| 커밋과 색인 | 원문 revision, 색인 대상 목록과 snapshot 상태 | 미커밋 작업본까지 검색 근거에 반영됐다는 판단 |
| 대표 질문 조회 | 반환한 본문과 예외, 잘림 및 조회 제한 | 몇 질문의 성공으로 모든 질문의 답변 정확도 확정 |

수식은 단위, 비율의 분모와 적용 구간을 적고 간단한 수치로 검산한다. 예를 들어 `120`과 `120%`는 다른 값이며, 연 수익률을 월 수익률로 바꿀 때도 연 유효수익률과 명목수익률을 구분한다. 정정한 제목이나 절을 가리키는 기존 링크도 함께 확인한다.

색인의 `coverage_gaps`가 0이면 해당 대상에서 기록된 추출과 연결 문제가 없다는 뜻이다. 현실에서 필요한 지식이 전부 있거나 내용 검증을 끝냈다는 뜻은 아니다. 질문 응답에는 별도로 `output_limit_reached`나 `retrieval_limit_reached`가 붙을 수 있으므로 snapshot의 누락 수와 응답 제한을 구분한다.

이 구분은 2026-10-02 현재 `src/markdown.mjs`의 메타데이터 추출, `src/snapshot.mjs`의 관계 생성과 `src/query.mjs`의 누락 보고를 대조했다. 현재 구현은 `verified_at` 값을 읽지만 사실성을 검증하지 않으며 관계의 `freshness`와 `conflict`를 `not_checked`로 남긴다. 검증자가 동의한 횟수도 공식 근거와 재현 결과를 대신하지 않는다.

## 필수 근거 평가

`evaluation/score.mjs`는 다음 두 입력을 구분한다.

- `expected_evidence`: 기존과 같이 허용 대안 중 한 evidence unit이 충족하면 된다.
- `expected_evidence_groups`: 모든 그룹을 충족해야 한다. 각 그룹의 `any_of` 안에서는 허용 대안 하나로 충족한다.

각 target의 `any_text`는 본문 문구 중 하나, `all_text`는 모든 문구의 일치를 요구한다. 둘을 함께 쓰면 두 조건을 모두 만족해야 한다. 경로와 heading, 문구는 같은 evidence unit에서 충족해야 하며 서로 다른 절의 조각을 합쳐 통과시키지 않는다. Markdown 제목만의 일치는 본문 근거로 세지 않는다.

```json
{
  "expected_evidence_groups": [
    {"id": "reason-and-exception", "any_of": [
      {"path": "ontology/Development-Ontology-Contract.md", "heading": "목표와 자료의 역할",
       "all_text": ["자료가 저장되어 있다는 사실만으로", "기술 채택이나 현재 동작을 뜻하지 않는다"]}
    ]}
  ]
}
```

이는 사례 안의 기대 근거 필드 예시다. 실제 실행 사례에는 `id`, `query`, 필요 시 `scope`를 함께 지정한다. 새 그룹 형식과 기존 기대 근거 형식을 한 사례에 섞지 않으며, 빈 응답을 기대하는 음성 사례에는 양성 근거 그룹을 넣지 않는다.

평가 전에 모든 기대 target의 경로, heading과 본문이 pinned snapshot의 실제 section에 있는지 확인한다. 존재하지 않는 정답은 검색 실패가 아니라 사례 정의 오류다.

`evidence_groups_total`, `evidence_groups_hit`, `missing_evidence_groups`, `evidence_recall`은 미리 지정한 필수 그룹의 충족 정도다. 전체 관련 지식의 recall이나 최종 답변 정확도가 아니다. `evidence_units_returned`, `truncated_evidence_units`도 함께 보지만 잘림 수만으로 누락의 원인을 확정하지 않는다.

## 검증 범위와 후속 비교

`evaluation/context-integrity-cases.json`은 역할과 작성 상태의 구분, 원문 연결과 적용 판단의 구분을 확인하는 합성 진단 사례다. 원문과 현재 조회기를 보고 만들었으므로 독립 holdout이나 실제 사용자 판단의 재현으로 취급하지 않는다. 이번 실행 결과는 [[Development-Ontology-Evaluation]]에 기록한다.

직접 검색과 관계 탐색의 효과를 비교할 때는 원문 revision, 과업, 모델과 도구 설정, 권한과 예산을 맞추고 조정 질문과 검증 질문을 분리한다. 현재 조회기는 depth 1 또는 2만 지원하므로 관계 탐색을 끈 baseline과의 자동 비교는 이번 구현에 포함하지 않았다. 관계 수의 증가만으로 필요한 근거가 보완됐다고 판정하지 않는다.

이후 실제 과업에서는 근거와 예외의 누락, 최종 판단과 함께 탐색 시간, 도구 호출, 사용자 재설명과 수정 시간, 색인과 유지 비용을 관찰할 수 있다. 자동 최신성 판정, 코드 심볼 색인, 실행 액션과 새 저장 엔진은 별도 필요가 확인될 때 검토한다.

## 출처와 적용 경계

- `kino-doc`, `research/07-ontology-insights-and-context-reuse.md`, 1~3절과 6절: 맥락, 판단 기준과 적용 조건을 다시 찾는 관점.
- `kino-doc`, `research/08-ontology-evidence-lifecycle-and-evaluation.md`, 2~4절과 6~7절: 근거의 역할, 시점, 잘린 문맥, 비교 평가와 현재 지원 범위.
- 확인한 업무 기록 revision: `6db90c45078fbc8bdd47980173838150face6b3c`. 위 문서의 설계 제안을 현재 개인 구현의 채택 사실과 구분했다.
- 대조한 개인 구현 기준: `6f80dbe387b73a56e8642bf2824e27706abb0e2a`. 회사 기록을 자동 수집하거나 개인 snapshot에 편입한 것은 아니다.

상위: [[Ontology-Reference]]. 전체 지도: [[Development-Ontology]]. 실행과 입력 제약: [[Ontology-Operations]]. 근거 계약: [[Development-Ontology-Contract]].
