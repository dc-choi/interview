---
tags: [ai, ontology, retrieval, evaluation]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["온톨로지 검색 품질", "Ontology Retrieval Quality"]
---

# 자연어 검색과 후속 탐색의 품질

2026-09-07~08에 검색 순위, 잘린 본문 읽기와 문서 목차 탐색을 각각 검증했다. 현재 구현은 원문을 보존하며 후속 탐색할 수 있지만, 자연어 질문에서 필요한 문서를 항상 찾지는 못한다. 테스트 통과, heading 발견과 본문 조건 충족을 같은 성공으로 합치지 않는다.

초기 검색과 목차 비교의 원문은 revision `19df3d8159689f41ab8d5a2b5def14c864016cf8`에 고정했다. snapshot은 1,870 Document, 21,467 unit, 35,450 relation, coverage gap 0이다. 코드와 문서는 미커밋 상태라 `unindexed_worktree`를 유지했다. 후속 관계 탐색 비교의 원문 revision은 아래에 별도로 기록한다. 원문 snapshot의 gap 0은 검색 누락이나 의미적 충돌이 없다는 뜻이 아니다.

## 순위 개선과 새 표본의 첫 관찰

본문 점수에 `1 + 0.2 * log1p(body.length / 200)`를 나눠 긴 section의 일반어 반복 영향을 줄였다. `body.length`는 소문자로 변환한 section 본문의 JavaScript 문자열 길이다. 정확한 제목과 alias 등 metadata 점수는 유지한다. 반복 단어 점수 상한은 그대로 두고, 전체 본문 소문자 변환과 부분 문자열 개수 계산의 불필요한 반복을 줄였다.

기존 검색 표본 19개(기술 질문 4개, 짧은 검색 진단 2개, 다도메인 표본 9개, 후속 표본 4개)의 전체 조건 충족은 14/19에서 15/19로 늘었다. Dreyfus 학습 단계 사례가 추가로 통과했고 기존 문서/heading/본문 적중의 회귀는 없었다. 이 표본은 이미 알려진 회귀 자료다. 한국어 접미사 확장 등의 후보는 다른 사례의 적중을 잃어 적용하지 않았다.

별도 작업자가 query 구현과 실행 결과를 보지 않고 pinned 원문에서 자연어 사례 10개를 준비했다. 양성 8개는 tech 4개, biz 2개, econ 1개, fit 1개이며, 음성 2개는 의미 없는 문자열과 가상의 장치 질문이다. 순위 변경 후보를 고정한 뒤 처음 공개하고 실행했다.

| 첫 관찰 항목 | 변경 전 | 길이 감점 후 |
| --- | ---: | ---: |
| 새 10개 사례의 전체 조건 충족 | 2/10 | 2/10 |
| 양성 사례의 본문 조건 충족 | 1/8 | 1/8 |
| 음성 사례의 빈 결과 충족 | 1/2 | 1/2 |

사례는 [generalization-cases-2026-09-07.json](evaluation/generalization-cases-2026-09-07.json), 첫 관찰과 전후 코드 hash는 [retrieval-quality-report-2026-09-07.json](evaluation/retrieval-quality-report-2026-09-07.json)에 보존한다. 사례 파일 SHA-256은 `4e5761f129542615c9a0584d17194af31f3411df61c7e506401cae01dadd7a86`이다. 첫 관찰 이후 원인 분석과 목차 기능 설계에 사용했으므로 이후 결과는 독립 holdout 성능으로 부르지 않는다. 누락에 맞춰 기대 경로나 본문 조건을 변경하지 않았다.

## 빠진 근거의 두 종류

[[Ontology-Evidence-Read|context_read]]는 이미 찾은 section의 잘린 뒷부분을 읽는다. 기존 필수 근거 진단 3개에서는 첫 조회 1/3, 후속 읽기 후 3/3, 필수 그룹 2/4에서 4/4를 확인했다. 그러나 새 10개 사례에서는 잘린 반환 근거를 모두 읽어도 전체 조건 충족이 2/10 그대로였다. 다른 heading이나 문서가 빠졌기 때문이다.

[[Ontology-Document-Outline|context_outline]]은 검색에 나온 Document의 모든 Section ID, heading, byte anchor와 hash를 페이지로 반환한다. 호출자가 필요한 section을 골라 `context_read`로 본문을 읽을 수 있다. 목차만으로 문장 속 조건과 예외를 확인했다고 판단하지 않는다.

## 실제 MCP 목차 탐색

`outline-navigation.mjs`는 새 SDK stdio 연결에서 조회 결과의 모든 Document를 탐색한다. 정답 경로를 보고 문서를 고르지 않으며, 어휘 겹침이 약하다고 표시된 질문은 추가 탐색을 건너뛴다. heading 평가는 본문 문자열 조건을 제외한 별도 검사다.

| 양성 8개 사례의 탐색 범위 | 첫 조회 | 목차 탐색 후 |
| --- | ---: | ---: |
| 기대 문서 발견 | 5/8 | 5/8 |
| 필수 heading 조합 전체 발견 | 1/8 | 5/8 |
| 필수 그룹의 heading 조건 충족 | 4/13 | 9/13 |

페이지 cursor 계약, 결제 재시도 키의 다른 payload 거부, 지표 해석과 자산 분산 사례에서 빠진 heading을 추가로 찾았다. 재시도 폭증, 한정 재고와 사용자 전환 인터뷰 사례는 기대 문서가 응답에 없어 보완되지 않았다. 일부 질문은 정답 목록 밖의 관련 문서를 반환하므로 실패를 관련 지식 전부의 부재로 해석하지 않는다.

목차 탐색 뒤 본문을 읽어 최종 답변까지 평가한 결과는 아니다. 양성 8개 전체를 분모로 유지했으며, 성공적으로 탐색한 질문만 추려 회수율을 높이지 않는다.

평가기는 각 응답의 text/structured JSON 일치, 실제 byte 예산, source revision, 전체 Section ID 집합, heading 순서와 hash, 페이지 cursor 진행과 끝 도달을 대조한다. 페이지당 24,000 byte, 문서당 32페이지, 전체 목차 응답 2MiB로 제한한다. 보고서는 [outline-navigation-report-2026-09-08.json](evaluation/outline-navigation-report-2026-09-08.json)에 둔다.

최종 실행은 조회 10회에 212,960 byte, 목차 77회에 766,898 byte, 합계 979,858 byte를 반환했다. 약 23.2초가 걸렸고 중단된 사례는 없었다. 크기는 MCP envelope를 제외한 각 JSON payload의 합계다. 목차 호출 77회 모두 한 페이지에서 완료됐으며, 여러 페이지 연결은 별도 runtime fixture에서 검증했다. 이 비용은 모든 반환 문서를 여는 검사 방식의 관찰값으로, 모델이 관련 문서를 골라 쓰는 실제 사용 비용을 뜻하지 않는다.

## 약한 어휘 겹침과 입력 검사

정규화와 확장 후 검색어가 8개 이상이고 같은 section에서 최대 1~2개만 겹치면 `matching.assessment: weak_lexical_overlap`을 반환한다. 이 값은 의미적 신뢰도 점수가 아니며 후보를 제거하지 않는다. 질문과 무관한 결과인지 확인하고 표현 또는 scope를 바꿔 다시 찾는 단서다.

가상의 장치 질문은 검색어 10개 중 최대 2개가 겹쳐 이 표시를 받았다. 평가기는 그 질문의 목차 탐색을 생략했지만 원래 빈 결과 검사는 여전히 실패로 남겼다. 이 표시를 오탐 해결이나 지식 부재의 증명으로 세지 않는다.

독립 검토에서는 공백만 있는 질문이 빈 root metadata와 정확히 일치해 임의의 문서를 반환하는 기존 오류도 확인했다. 공백만 있는 입력은 `invalid_query`로 거부하고 빈 문자열의 metadata 일치를 막았다. 회귀 테스트는 수정 전 실패를 재현했다.

## 관계를 설명하는 본문을 먼저 탐색

2026-09-08에 기존 작업을 커밋한 뒤, 원문 revision `ce2471718128cfe786335d2ef05b752d1826c677`에서 관계 탐색 순서를 비교했다. snapshot은 1,873 Document, 21,487 unit, 35,499 relation, coverage gap 0이다. 이전 구현은 각 entity의 관계를 ID 순으로 자르고 탐색했다. 현재는 관계 근거의 query 점수, 상대 entity 소유 Document의 query 점수, ID 순으로 고른다. root 순위와 개수, scope, hop, entity/edge 제한과 JSON 예산은 유지한다.

상대 문서 점수만 우선하는 초기 후보는 기존 TypeScript 오버로딩 질문의 `함정` 근거를 잃었다. 관계가 기록된 본문을 우선하자 이 근거를 보존했다. 단순 문장 분해와 depth 2 확대도 별도 임시 비교에서 전체 조건 충족을 늘리지 못해 기본 동작에 추가하지 않았다. 적용 근거는 [[RAG-Retrieval-Engineering#품질을 분해하는 평가 모델|검색과 context 구성의 구분]]이며, 문서 연결 자체를 의미적 적합성의 증명으로 사용하지 않는다.

후보 코드를 고정한 다음, 구현과 기존 평가를 보지 않은 별도 작업자가 준비한 새 질문 8개를 처음 실행했다. 양성은 tech 3개, biz/econ/fit 각 1개이고 음성은 가상 용어 질문과 원예 질문이다. 원문의 제한된 본문 조건을 검사하는 합성 자료이며 사용자의 실제 처우나 업무 기록이 아니다. 사례는 [graph-ranking-cases-2026-09-08.json](evaluation/graph-ranking-cases-2026-09-08.json)에 보존한다. 첫 실행 전 음성 사례의 필수 빈 배열 누락만 수정했고, query와 양성 정답은 바꾸지 않았다. 원본/수정본 hash와 고정 시점은 보고서에 남겼다.

| 관계 탐색 비교 항목 | ID 순서 | 근거 우선순위 |
| --- | ---: | ---: |
| 알려진 10개 표본의 전체 조건 충족 | 2/10 | 3/10 |
| 새 8개 표본의 전체 조건 충족 | 2/8 | 3/8 |
| 새 양성 표본의 본문 조건 충족 | 2/6 | 3/6 |
| 새 양성 표본의 기대 문서 발견 | 4/6 | 4/6 |
| 새 음성 표본의 빈 결과 충족 | 0/2 | 0/2 |

알려진 표본에서는 자산 분산의 상관관계, 새 표본에서는 Canary 배포의 판정 게이트를 추가로 반환했다. 기존 32개와 새 8개에서 문서/heading/본문/필수 그룹 적중의 회귀는 없었다. 문서 자체의 회수율과 음성 사례는 개선되지 않았으며, 적은 표본의 1건 증가를 일반적인 의미 검색 성능으로 확대하지 않는다. 새 8개도 이후 조정에 재사용하면 회귀 표본으로 전환한다.

새 8개에서 단발 조회 payload 합계는 186,726 byte에서 186,074 byte로 바뀌었고 양쪽 모두 8회 호출이었다. 모든 응답은 24,000 byte 이내였다. 실행 시간은 코드와 함께 기록하되 단회 관측으로 속도 향상을 주장하지 않는다. 현재 수정 코드는 같은 committed snapshot을 읽으며 양쪽 결과에 `unindexed_worktree`를 보존했다.

전후 결과, 사례/코드 hash, 폐기 후보와 새 MCP 검증은 [graph-ranking-report-2026-09-08.json](evaluation/graph-ranking-report-2026-09-08.json)에 둔다. 실제 새 SDK stdio 연결에서 TypeScript 오버로딩과 자산 분산 두 질문의 원문 조건 2/2, 응답 예산과 후속 읽기 무결성을 확인했다. 모델의 자동 도구 선택이나 최종 답변 품질을 평가한 것은 아니다.

후속 독립 검토에서는 한 토큰의 정확한 제목 검색이 전체 본문 스캔을 생략하면서 관계의 본문 점수까지 빠뜨리는 경로를 발견했다. 또 RelationAssertion의 metadata 점수가 0으로 처리되어 명시적 typed relation이 일반 링크에 밀리는 오류를 확인했다. 연결된 Section 근거만 batch로 읽고, RelationAssertion의 metadata 점수를 보존하도록 보완했다. 위 표는 최초 고정 코드(`0b1cc1a6`)의 관측으로 보존하고, 보완 코드의 40개 재실행은 보고서의 `post_review_regression`에 기록했다. 전후 적중 지표와 반환 byte 수는 같았으며, 이 재실행을 새로운 독립 표본 결과로 계산하지 않는다.

## 실행과 남은 검증

목차 기능을 구현한 시점의 Node suite는 100/100이었다. 당시 query의 어휘 겹침 metadata와 공백 입력 수정을 적용한 회귀 결과는 [final-regression-report-2026-09-08.json](evaluation/final-regression-report-2026-09-08.json)에 남겼다. 관계 탐색 당시 suite는 103/103, 문서 검색 추가 시점은 112/112였다. 아래 metadata와 본문 선택의 첫 보완 후 suite는 116/116, 첫 독립 검토 보완 후에는 119/119, 두 번째 보완 후에는 121/121, 예산/진단 보완 후에는 123/123, 누락 요약 보완까지 포함한 최종 결과는 124/124다. 원래 실패한 질문을 성공으로 바꾸거나 과거 보고서의 코드 hash를 현재 코드로 덮지 않았다.

`ontology/`에서 저장소 밖 cache를 준비한 뒤 실행한다.

```bash
node src/cli.mjs build --committed-only --cache <저장소-밖-cache>
node evaluation/outline-navigation.mjs --cache <같은-cache> --check
```

이 명령의 `--check`는 목차 API와 페이지 계약 검사다. 검색 실패는 보고서의 별도 품질 지표로 남기며 본문 조건을 통과시킨 것으로 바꾸지 않는다. 검색 조건 전체 검사는 `evaluation/run.mjs --cases <사례-json> --check`이며, 알려진 누락이 있으면 실패한다.

관계 탐색의 새 표본은 `node evaluation/run.mjs --cache <같은-cache> --cases evaluation/graph-ranking-cases-2026-09-08.json`으로 재실행한다. 남은 실패 때문에 `--check`를 붙이면 종료 코드 1이다. 보고서의 전후 비교는 위 `ce24717`의 query와 수정 query를 같은 snapshot 및 공통 runtime 모듈로 실행한 결과다.

## 문서 검색을 후속 탐색으로 추가

2026-09-08에는 원문 revision `a179f4f55a805e2c2bcc734a7dfe988c4302f7be`에서 비교했다. snapshot은 1,873 Document, 21,488 unit, 35,501 relation, coverage gap 0이다. [[Ontology-Document-Search|context_search]]는 lookup의 root 6개 제한 전에 있는 후보를 페이지로 반환한다. 순위와 기존 lookup 결과는 유지하며 문서 metadata만 넓혀 본다. 기존 40개 질문은 같은 snapshot과 dirty 상태에서 전체 lookup JSON이 변경 전과 40/40 동일했고, 원래 본문 조건의 전체 통과는 22/40 그대로였다.

평가 정책은 각 질문에서 lookup 한 번과 search 최대 두 페이지를 각각 실행하는 것이다. 페이지 예산은 사례에 정한 값을 유지하며 보통 24,000 byte다. 기대 경로를 보고 중간에 멈추지 않는다. lookup에서 이미 찾은 문서를 보존한 합집합도 별도로 계산한다. 이는 관련 문서를 고르는 모델의 사용 비용이 아니라 고정된 탐색 범위의 관찰이다.

아래 문서 발견은 각 필수 근거 그룹의 허용 경로 중 하나가 Document metadata에 있는지 검사한다. 같은 문서의 heading 두 개를 요구해도 여기서는 그 문서 발견만 검사한다. 기존 `scoreResult`의 evidence unit 기반 문서 적중, heading, 본문 조건과는 별도 지표다.

| 문서 발견 항목 | lookup | search 첫 페이지 | search 최대 두 페이지 | lookup과 search 합집합 |
| --- | ---: | ---: | ---: | ---: |
| 알려진 양성 질문 35개 | 28/35 | 29/35 | 31/35 | 31/35 |
| 알려진 음성 질문의 빈 결과 | 2/5 | 2/5 | 2/5 | 2/5 |
| 새 양성 질문 4개 | 3/4 | 3/4 | 3/4 | 3/4 |
| 새 음성 질문의 빈 결과 | 0/2 | 0/2 | 0/2 | 0/2 |

알려진 질문에서는 긴 계산으로 인한 요청 지연, 제품 인터뷰와 재시도 폭증 사례의 문서를 추가로 찾았다. 새 사례는 구현과 기존 평가를 보지 않은 별도 작업자가 원문에서 만든 합성 질문 6개다. query와 평가 정책을 고정한 뒤 처음 공개했다. tech 2개, biz/econ 각 1개와 날씨/가상 왕국 음성 2개이며 [사례 원본](evaluation/document-search-cases-2026-09-08.json)의 SHA-256은 `a45607c714de84af95890c6379dc828800ac478d032537f75cb660deef0f1d7b`다. 새 표본에서의 발견 개선은 관찰되지 않았고, 근거 부족 응답 처리 문서는 여전히 빠졌다. 이후 이 사례를 조정에 사용하면 회귀 표본으로 취급한다.

알려진 40개에서 lookup은 40회/833,264 byte, search 최대 두 페이지는 73회/1,530,328 byte, 둘의 합계는 113회/2,363,592 byte였다. 새 6개에서는 각각 6회/140,475 byte, 12회/270,872 byte, 합계 18회/411,347 byte였다. 모든 개별 응답은 해당 예산 이내였으며 크기는 MCP envelope를 제외한 JSON payload다. 페이지를 늘리는 비용과 무관한 후보를 사람이 검토하는 비용이 있으므로 전부 수집하는 것을 기본 사용법으로 강제하지 않는다.

본문을 자동으로 추가하는 후보와 관계 근거 재정렬 후보는 알려진 질문의 적중을 잃거나 전체 성공을 늘리지 못해 적용하지 않았다. 단어 시작 경계로 오탐을 줄이는 후보도 `OpenSearch`, `refreshToken`, `강제청산`, `2차원`의 부분어 검색을 잃어 폐기했다. 이 시점의 `matched_terms`에는 internal ID 같은 metadata 겹침도 들어갔다. 그 문제는 아래 보완에서 수정했다. `best_evidence_ref`의 본문에 검색어가 있다는 보장은 없으며, 탐색 단서를 의미 적합성이나 지식 부재의 판정으로 사용하지 않는다.

재현은 `node evaluation/document-search.mjs --cache <같은-cache> --cases evaluation/document-search-cases-2026-09-08.json`으로 한다. byte, provenance와 페이지 계약 위반은 실행을 실패시키고 문서 누락은 별도 지표로 남긴다. 고정 시점, 코드 hash, 첫 관찰, lookup 동일성, 폐기 후보와 MCP 연결 검증은 [문서 검색 보고서](evaluation/document-search-report-2026-09-08.json)에 둔다.

## 내부 식별자 오탐과 본문 선택 보완

원문 revision `3134d051dd453eee173e0c94ea2cfc107748b710`에서 1,874 Document, 21,496 unit, 35,519 relation, coverage gap 0인 snapshot을 고정했다. 내부 ID의 `document:`, `unit:`, source ID와 percent-encoded heading 조각까지 부분 매칭하는 오류를 제거했다. 실제 source URI, label, alias, tag, heading과 본문은 계속 검색하고, entity ID 전체를 지정하는 조회도 유지한다. 같은 문자열이 실제 원문에 있으면 검색 단서로 남는다.

| 기술 문서 검색 진단 | 변경 전 후보 수 | 변경 후 후보 수 |
| --- | ---: | ---: |
| `document` | 1,498 | 82 |
| `unit` | 1,498 | 124 |
| `95` | 1,274 | 84 |
| `interview-vault` | 1,498 | 2 |

이 수치는 구조 ID로 추가되던 후보를 제외한 결과다. 감소분 전체를 의미적 오탐으로 검증한 수치나 최종 답변의 정확도로 해석하지 않는다. 실제 부분어 검색은 유지하므로 어휘가 우연히 겹치는 후보는 남는다.

Document의 정확한 alias 점수 1,000이 실제 설명 section 점수보다 높으면, 이전에는 `direct`가 비어 기본 H1으로 돌아갔다. 문서 순위와 읽을 근거 선택을 분리해, 이미 계산한 section 점수로 읽기 시작점을 고른다. heading 없는 root는 새 선택 후보에서 제외하고 기존 provenance 경로로 보존한다. root까지 포함한 초기 후보는 알려진 alias 사례의 본문을 잃어 폐기했다. 현재는 `Kano Model`이 `사용자 피드백 관리` H1 대신 `Kano 모델` 설명을 반환한다. alias가 본문에 없는 경우의 fallback은 여전히 필요하다.

또한 부분 매칭 100개가 점수 1,000을 만들어 `exact_metadata`로 오인되는 오류를 수정했다. 실제 필드 일치 여부를 점수와 별도로 검사한다. 이 오류와 구조 ID 오탐은 수정 전 실패하는 Markdown fixture로 재현했고, 정확한 ID/경로/heading과 alias provenance 보존을 함께 검사했다.

기존 46개 질문은 같은 dirty 상태, snapshot과 byte 예산에서 전체 조건 충족 23/46, 본문 조건 20/35, 필수 그룹 27/47, Document metadata 발견 31/39와 후속 두 페이지 발견 34/39를 유지했다. 개별 적중 지표의 회귀도 없었다. lookup 46회는 양쪽 모두 973,739 byte였으며, 결과 전체 JSON이 동일하다는 검사는 아니다.

별도 작업자가 구현과 기존 사례를 읽지 않고 만든 새 합성 질문 6개는 코드를 고정한 뒤 처음 실행했다. 양성은 tech 2개, biz/econ 각 1개이고 음성은 tech/biz 각 1개다. [사례 원본](evaluation/metadata-ranking-cases-2026-09-08.json)의 SHA-256은 `76b413409e9f442f0890078de2ae65b5e7cdf56aa1a200889230f1c4d116f103`이다. `AARRR`의 실제 설명을 추가로 반환해 전체 조건 충족은 1/6에서 2/6, 양성 본문 조건은 1/4에서 2/4로 늘었다. 문서 발견은 4/4로 같았고 음성의 빈 결과는 0/2 그대로다. lookup 6회 payload 합계는 132,459에서 132,086 byte로 바뀌었다. 작은 표본의 한 사례 개선을 일반적인 답변 정확도 향상으로 확대하지 않는다.

새 SDK stdio 연결에서 `Kano Model`의 검색 참조, lookup 본문과 `context_read`의 revision/hash/anchor 일치를 검증했다. 실제 이전 코드 bytes로 발급한 cursor는 새 코드에서 `cursor_mismatch`로 거부했다. 이는 새 프로세스의 API 검증이며 기존 host 연결의 재시작이나 모델의 자동 도구 선택을 검증한 것은 아니다.

고정 시점, 코드 hash, 전후 지표와 MCP 검증은 [metadata 검색 보완 보고서](evaluation/metadata-ranking-report-2026-09-08.json)에 보존한다. 새 사례는 `node evaluation/run.mjs --cache <위-snapshot-cache> --cases evaluation/metadata-ranking-cases-2026-09-08.json`으로 재실행할 수 있다. 기대 조건을 모두 충족하지 못하므로 `--check`는 종료 코드 1이다. 이후 이 사례를 조정에 쓰면 회귀 표본으로 취급한다.

독립 검토에서는 부분 alias로 선택된 기존 root가 그대로 남는 경로, 100개 이상의 부분 일치 점수가 정확한 제목보다 앞서는 경로, 작은 응답 예산에서 본문 대신 frontmatter만 남는 경로를 확인했다. 정확한 필드 일치를 문서와 section의 별도 순위 기준으로 두고, root는 ID 전체를 직접 지정한 경우만 점수 기반 읽기 시작점으로 허용한다. 응답에는 선택한 직접 근거, 관계와 양 끝 entity 및 근거 묶음, 선택 frontmatter provenance 순서로 담는다. 선택 근거가 빠진 자리를 provenance만으로 채워 성공 처리하지 않는다. 예산으로 발췌를 더 줄일 때도 제한 도달을 표시한다.

검토에서 추가한 fixture 세 개는 첫 고정 코드에서 모두 실패했고 수정 후 통과했다. root ID 전체 조회를 별도로 검사하고, 기존 예산 fixture의 연결 대상도 실제 파일명으로 고쳐 `links_to` 두 개가 존재함을 확인한다. 전체 suite는 119/119다. 최초 고정 코드 `c67f375c`의 관찰은 그대로 보존하고 최종 코드의 재실행을 보고서 `post_review_regression`에 분리했다. 46개와 재사용 6개 모두 개별 문서/heading/본문/필수 그룹 및 문서 발견 지표를 유지했다. 이 단계의 lookup payload는 각각 977,246 byte와 130,686 byte이며, 모든 응답은 각 예산 이내다. 이 재실행은 독립 표본 평가가 아니다. 새 SDK 연결에서도 부분 alias `Knowledge`의 읽기 시작점이 root를 벗어났고, 전체 alias 조회는 3,000/4,000 byte에서 선택한 heading 근거를 유지했다. 2,600 byte에서는 `budget_too_small`로 한계를 명시했다.

다음 검토에서는 한 토큰의 정확한 alias와 파일명이 같으면 모든 section의 경로 점수가 같아 첫 H1에 머무는 사례를 재현했다. 전체 자료 스캔은 생략하되 정확히 찾은 후보 문서의 유용한 section 본문은 읽어 시작점을 비교한다. 또 선택 provenance 추가 실패 때 제한 안내가 이미 담은 관계를 밀어내는 경계를 수정했다. `budget.exhausted`와 중복되는 `output_limit_reached` gap을 관계보다 먼저 생략하므로 작은 예산에서도 허용된 근거 묶음을 우선 유지한다.

두 번째 검토의 회귀 두 개도 이전 코드 `84076863`에서 각각 실패한 뒤 최종 코드에서 통과했다. 정확한 H1이 있는 독립 fixture의 2,440 byte 경계에서 관계와 양 끝 entity, 원문 근거가 남는 것을 직접 검사했다. 이 단계의 suite는 121/121이며, 52개 재실행의 기존 적중 지표는 유지했다. 이 단계의 lookup payload는 알려진 46개 977,246 byte, 재사용 6개 132,575 byte다. 새 SDK 검증도 같은 최종 코드로 통과했다. 보고서의 `previous_review_regression`과 `second_review_regression`에 앞선 검토 결과를 보존한다.

마지막 예산 검토에서는 중복 제한 안내가 첫 직접 근거를 넣는 것까지 막는 경로를 확인했다. `budget.exhausted`를 먼저 기록하고, 패킹 중에는 근거가 있는 응답의 `partial` 상태 크기로 계산한다. `output_limit_reached`는 근거 구성 후 공간이 있을 때만 추가한다. 정확한 한 토큰 조회의 로컬 본문 일치도 `max_section_term_matches`에 반영한다. 실제 SDK에서 2,630 byte의 ontology alias 조회가 root가 아닌 근거를 반환하고, `Dunbar`와 `Semble`의 본문 일치 개수가 1임을 확인했다.

마지막 회귀 두 개는 이전 코드 `0bc4879c`에서 실패하고 최종 코드에서 통과했다. 단위 fixture에서는 1,976 byte에서도 선택 본문을 담을 수 있음을 검증했다. 이 단계의 suite는 123/123이며, 52개 재실행에서 기존 문서/heading/본문/필수 그룹과 문서 발견 적중 지표를 유지했다. 최종 lookup payload는 알려진 46개 979,336 byte, 재사용 6개 133,249 byte다. 이 단계의 기록은 보고서 `third_review_regression`에 보존한다.

누락 근거가 많은 응답에서는 목록 축소가 `coverage_gaps_omitted`를 일반 항목으로 다시 세어 요약을 중복하는 문제도 확인했다. 기존 요약을 일반 gap과 분리하고 이미 숨긴 수 및 알려진 전체 수를 보존해, 반복 축소 후에도 요약을 하나만 반환한다. 12개 원문 gap이 있는 예산 제한 조회와 검색 두 페이지의 회귀는 이전 코드 `ad4a3bf2`에서 실패하고 최종 코드에서 통과했다. 최종 suite는 124/124이며, 52개 사례의 적중과 위 payload 합계는 유지됐다. 최신 코드 hash, 테스트, SDK와 사례별 결과는 보고서 `post_review_regression`에 보존한다.

다음 검증은 남은 문서 누락과 한국어 표현 차이, 모델의 관련 heading 선택, 필요한 본문과 예외의 후속 읽기, 최종 판단 정확도를 대상으로 한다. 현재 평가만으로 검색이나 답변 품질이 완성됐다고 판단하지 않는다.

## 기존 목차와 위키링크 역할 활용

2026-09-08 원문 revision `4af3516d519b62d6840b04c79d1e25aba846d80d`에 고정해 extractor 10과 11을 비교했다. Document 1,874개, unit 21,497개와 relation 35,521개의 ID는 유지됐고 entity artifact는 byte 단위로 같았다. 기존 연결에 목차 소속 `index_member` 887개, 상위 문서 `parent_index` 31개, 관련 문서 `related_document` 7,628개를 표시했다. 이는 작성된 탐색 구조이며 적용 조건이나 인과관계를 새로 확정한 수치가 아니다.

lookup은 근거와 상대 문서의 질문 점수가 같을 때 구조 역할로 우선순위를 정한다. 기존 52개 합성 질문은 변경 전후 전체 조건 25/52, 본문 조건 22/39로 같았으며 개별 문서, heading, 본문과 필수 그룹의 적중 변화도 없었다. 이 재사용 표본에서 검색 품질 개선을 확인한 것은 아니다. 52회 lookup payload 합계는 1,112,585 byte에서 1,113,415 byte로 늘었고 각 응답은 기존 예산을 지켰다.

탐색 상한에서 빠지던 명시적 상위 링크를 동점 우선순위로 보존하는 fixture를 추가했다. 더 관련된 본문은 구조 역할보다 먼저 선택되고, 요청 scope와 문서 검색 순위는 유지된다. 인용 heading의 범위, 같은 줄의 상위 표기, 설명이 붙은 목차, 상대경로와 percent-encoded 자기 section 링크도 검사한다. 최종 suite는 127/127이다.

새 SDK stdio 연결에서 Controller 목차의 하위/관련 링크와 AI 도구 목차의 상위 링크를 조회했다. 세 역할 모두 검색, lookup, 목차, 원문 읽기를 거쳐 revision과 hash를 검증했다. Obsidian 설정 파일 4개는 작업 전후 해시가 같았다. 기존 host 프로세스의 교체를 검증한 것은 아니므로 MCP 재연결 후 새 코드를 사용한다.

코드와 사례 hash, 전후 결과, 보존 검사와 MCP 근거는 [구조 역할 검증 보고서](evaluation/link-role-report-2026-09-08.json)에 남긴다. 비교 중 코드와 문서는 미커밋 상태이며 양쪽 조회에 `unindexed_worktree`를 유지했다. 세부 추출 계약은 [[Ontology-Operations#기존 목차와 위키링크의 역할]]을 따른다.

## 선택한 문서의 조건과 잘린 본문 보완

2026-09-08에 위와 같은 `4af3516` 원문과 extractor 11 snapshot을 고정하고 응답 구성을 수정했다. 기존 근거와 관계 묶음을 보존한 뒤, 정확한 metadata 일치가 없으면 남는 공간으로 최상위 문서의 점수가 있는 절 하나를 보충한다. 이어 전체 section이 남은 응답 예산에 들어가면 이미 선택된 발췌를 끝까지 확장한다. 문서 순위, 원문 ID/revision/hash, 요청 범위와 응답 상한은 유지한다. 판단 근거는 [[RAG-Retrieval-Engineering#Context packing과 근거 추적]]이다.

재사용한 52개 합성 질문의 전체 조건 충족은 25/52에서 27/52, 본문 조건은 22/39에서 24/39로 늘었다. 일반화 표본은 3/10 그대로이고, 필수 근거 진단은 1/3에서 3/3이 됐다. 개별 문서, heading, 본문과 근거 그룹 적중의 회귀는 없었다. 52회 payload 합계는 1,113,415에서 1,124,976 byte로 늘었다. 모든 문서에 절을 추가한 후보는 Canary 판정 근거를 밀어내 폐기했다. 최상위 문서만 먼저 보충한 후보는 29/52였지만 작은 예산의 관계 보존 fixture에서 실패해 보충 순서를 뒤로 옮겼다. 문서 어휘 겹침 수를 우선하는 순위 후보도 기존 성공 3건을 잃어 폐기했다.

구현과 기존 평가를 보지 않은 별도 작업자가 만든 새 질문 6개는 초안 코드를 고정한 뒤 처음 실행했다. 전체 조건은 3/6, 양성 본문은 3/4, 음성 빈 결과는 0/2로 전후 같았다. 검토 수정 후의 회귀 재실행도 같은 결과였다. 새 표본에서 개선을 확인한 것은 아니며, 남은 표현 차이와 문서 누락, 무관한 결과의 문제는 계속 남는다. 실제 답변 정확도와 사용자 시간 절감도 미검증이다.

새 SDK stdio 연결에서 이전에 잘리던 두 절의 전체 본문과 후속 `context_read`의 일치를 확인했다. 최종 suite는 129/129이며, 동시 색인 잠금 테스트가 한 차례 실패한 뒤 개별 5회와 전체 재실행에서 통과한 관찰도 보고서에 남겼다. 코드 hash, 사례별 전후 결과와 검증 범위는 [응답 구성 보고서](evaluation/context-packing-report-2026-09-08.json), 새 질문은 [사례 원본](evaluation/context-packing-cases-2026-09-08.json)에 보존한다. 재실행은 `node evaluation/run.mjs --cases evaluation/context-packing-cases-2026-09-08.json`이며, 남은 실패를 포함한 `--check`는 종료 코드 1이다. 기존 MCP 연결에는 재연결 후 새 코드를 적용한다.

후속 후보 검색 비교는 [[Ontology-Search-Algorithms]]에서 관리한다. BM25, 다국어 임베딩, RRF와 추가 절 구성을 같은 원문과 응답 예산으로 비교하며 새 합성 표본을 따로 고정한다. 같은 후보의 모델 재정렬은 전체 통과가 41/94에서 40/94로 줄어 미채택했고 [[Ontology-Search-Rerank]]에 기록했다. 이후 관계보다 보충 근거를 먼저 담는 수정으로 기존 94개는 41개에서 43개 통과로 늘고 새 10개는 1개 통과로 같았다. 현재 적용 구성과 최신 검증은 [[Ontology-Search-Selection#후속 개선: 관계보다 조건 근거를 먼저 확보]]를 따른다.

상위: [[Development-Ontology]]. 이전 관찰: [[Development-Ontology-Evaluation]]. 운영: [[Ontology-Operations]].
