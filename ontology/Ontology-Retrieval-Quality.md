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

목차 기능을 구현한 시점의 Node suite는 100/100이었다. 당시 query의 어휘 겹침 metadata와 공백 입력 수정을 적용한 회귀 결과는 [final-regression-report-2026-09-08.json](evaluation/final-regression-report-2026-09-08.json)에 남겼다. 관계 탐색을 보강한 현재 suite는 103/103을 통과했다. 원래 실패한 질문을 성공으로 바꾸거나 과거 보고서의 코드 hash를 현재 코드로 덮지 않았다.

`ontology/`에서 저장소 밖 cache를 준비한 뒤 실행한다.

```bash
node src/cli.mjs build --committed-only --cache <저장소-밖-cache>
node evaluation/outline-navigation.mjs --cache <같은-cache> --check
```

이 명령의 `--check`는 목차 API와 페이지 계약 검사다. 검색 실패는 보고서의 별도 품질 지표로 남기며 본문 조건을 통과시킨 것으로 바꾸지 않는다. 검색 조건 전체 검사는 `evaluation/run.mjs --cases <사례-json> --check`이며, 알려진 누락이 있으면 실패한다.

관계 탐색의 새 표본은 `node evaluation/run.mjs --cache <같은-cache> --cases evaluation/graph-ranking-cases-2026-09-08.json`으로 재실행한다. 남은 실패 때문에 `--check`를 붙이면 종료 코드 1이다. 보고서의 전후 비교는 위 `ce24717`의 query와 수정 query를 같은 snapshot 및 공통 runtime 모듈로 실행한 결과다.

다음 검증은 문서 검색 누락과 한국어 상황 설명의 표현 차이, 모델의 관련 heading 선택, 필요한 본문과 예외의 후속 읽기, 최종 판단 정확도를 대상으로 한다. 모든 반환 문서의 목차를 여는 방식은 탐색 가능한 범위를 관찰하기 위한 것으로, 비용을 줄인 기본 사용 전략이 검증된 것은 아니다. 일반화 성능을 다시 판단할 때는 아직 코드 조정에 사용하지 않은 새 표본이 필요하다.

상위: [[Development-Ontology]]. 이전 관찰: [[Development-Ontology-Evaluation]]. 운영: [[Ontology-Operations]].
