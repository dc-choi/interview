---
tags: [business, product, design, ux, search]
status: done
verified_at: 2026-07-21
category: "비즈니스&제품(Business&Product)"
aliases: ["Search UX", "검색 UX", "검색 설계"]
---

# 검색 UX 설계

검색 UX는 검색창 하나가 아니라 사용자의 의도를 query로 표현하고, 결과를 해석하고, 다시 좁히거나 넓혀 원하는 행동에 도달하는 반복 과정이다. 목적형 검색과 탐색형 검색은 유용한 구분이지만 둘로 고정되지 않는다. 같은 사용자도 제목을 정확히 입력했다가 출연작을 훑고, 장르 facet으로 좁히는 식으로 행동을 바꾼다.

## 먼저 구분할 검색 의도

Broder의 웹 검색 분류와 탐색적 검색 연구를 제품 설계 언어로 옮기면 다음처럼 볼 수 있다. 한 query가 여러 의도를 가질 수 있으므로 규칙만으로 단정하지 말고 query와 후속 행동을 함께 본다.

| 의도 | 사용자가 원하는 것 | UX 우선순위 | 예시 |
|---|---|---|---|
| Known-item, navigational | 이미 아는 대상에 바로 도달 | 정확한 일치, 별칭, 오타 교정 | `다만악에서 구하소서` |
| Transactional, action | 특정 행동을 완료 | 이용 가능 여부, 가격, CTA | `넷플릭스에서 볼 영화` |
| Informational lookup | 사실이나 답을 확인 | 근거가 보이는 snippet, 최신성 | `아수라 감독` |
| Exploratory, compare | 후보를 발견하고 비교 | facet, 관련 키워드, 다양한 결과 | `해외 배경 첩보 액션` |
| Ambiguous | 의미나 대상이 여러 개 | 의도 선택, 안전한 clarification | `아수라` |

## 여정은 고정 단계가 아니라 진단 프레임

사용자는 아래 구간을 순서대로 모두 거치지 않는다. 어느 구간에서 막혔는지 찾기 위한 관찰 단위다.

1. **진입과 입력**: 검색 범위를 이해하고 query를 만들 수 있는가.
2. **결과 해석**: 왜 이 결과인지, 원하는 대상인지 빠르게 판단할 수 있는가.
3. **수정과 탐색**: query, facet, sort, scope를 바꾸며 비용 적게 이동할 수 있는가.
4. **행동과 복귀**: 상세 보기, 재생, 구매 같은 목표를 수행하고 결과 상태로 돌아올 수 있는가.

## 화면 요소별 제품 계약

| 요소 | 사용자에게 필요한 것 | 데이터와 동작 계약 |
|---|---|---|
| 검색창 | 현재 scope와 입력 예시 | placeholder만으로 label을 대체하지 않고, 전송과 초기화 동작을 일관되게 제공 |
| 자동완성 | 적은 입력으로 의도 표현 | query suggestion, entity, 최근 검색을 시각적으로 구분하고 출처별 개인정보 및 삭제 정책 정의 |
| 인기 검색어 | 탐색 시작점 | 집계 시간창, 중복 제거, 어뷰징 방어, 급상승과 누적 인기의 정의 공개 |
| 결과 카드 | 클릭 전 적합성 판단 | match 근거가 드러나는 제목, 속성, snippet, 이용 가능 여부와 광고 표시 |
| Facet | 결과 집합을 이해하며 좁히기 | 현재 query를 보존하고, 선택 상태와 count를 표시하며, 0건 조합을 예방하거나 복구 경로 제공 |
| Sort | 다른 가치 기준으로 재배열 | 관련도, 최신, 인기의 의미와 tie-breaker를 정의하고 필터와 혼동하지 않게 표시 |
| Scope | 검색 공간 전환 | 통합 검색, 작품, 인물처럼 범위를 명시하고 전환 시 query 보존 여부를 예측 가능하게 설계 |
| 0건 화면 | 실패 원인 이해와 복구 | 오타, 필터 과다, 색인 누락, 권한 제한을 구분하고 근거 없는 결과 확장은 피함 |

### 자동완성과 접근성

자동완성은 WAI-ARIA combobox pattern을 참고해 키보드 이동, 현재 선택, focus, popup 상태를 보조 기술에 전달해야 한다. 시각적으로 보이는 suggestion만 만들고 화살표, Enter, Escape 동작이나 결과 announcement를 빠뜨리면 키보드와 스크린리더 사용자는 검색을 완료하기 어렵다.

### 0건과 완화 전략

0건은 하나의 원인이 아니다. 먼저 query 분석 결과, 필터 교집합, 데이터 freshness, 권한, 문서 존재 여부를 관측한다. 완화는 오타 후보 제시, 제거 가능한 필터 안내, 인접 taxonomy 제안처럼 사용자가 변화를 알 수 있게 한다. 필터를 몰래 제거하거나 전혀 다른 query로 바꾸면 결과는 생겨도 신뢰가 무너진다.

## 백엔드와 분석 이벤트 계약

정렬, facet, suggestion은 UI 옵션이 아니라 검색 모델과 데이터 파이프라인의 계약이다.

- 최신순은 시간 field와 누락 값 정책, 인기순은 집계 event와 갱신 주기, 관련도순은 scoring과 tie-breaker가 필요하다.
- Facet은 keyword 또는 taxonomy field, multi-select의 AND/OR 의미, count 계산 기준이 필요하다.
- 인기 검색어와 suggestion은 로그 수집, 정규화, 시간창, 어뷰징 필터, 삭제 요청 반영이 필요하다.
- 검색 문서의 광고, 연령, 지역, 구독 가능 여부는 filter 가능한 구조화 field와 갱신 책임자가 필요하다.

최소 분석 event에는 `event_id`, ISO 8601 `timestamp`, 가명 `client_id`, `session_id` 또는 `search_journey_id`, `query_id`, `request_id`, 원문 query와 정규화 버전, scope, filter, sort, 실험 variant, 결과 object ID와 position, latency를 연결한다. `query_id`는 한 query와 결과/행동을 잇고, client와 journey ID는 연속 query를 묶는다. 클릭, 상세 진입, 재생, 구매, 저장과 검색 이탈/재개도 같은 journey와 query에 귀속한다. `event_id`로 재전송을 중복 제거하고 client/session ID는 회전과 삭제가 가능한 가명 식별자로 둔다. 원문 query는 개인정보가 될 수 있으므로 접근 통제, 보존 기간과 삭제 정책을 별도로 둔다.

### 재현 가능한 지표 계약

- Reformulation률: 분석 가능한 첫 query 중 정해진 window 안에 정규화 query가 달라진 다음 query가 있는 비율이다. 동일 query retry는 dedup하고 관찰 window가 끝나지 않은 journey는 censor 처리한다.
- 첫 유효 행동까지 시간: query `timestamp`부터 사전 정의한 첫 성공 action까지의 차이다. Window 안에 성공이 없는 query는 성공 소요 시간 평균에서 조용히 제외하지 않고 성공률과 censor 비율을 함께 보고한다.
- 검색 재개율: 결과 화면을 떠난 journey 중 window 안에 `search_resume` 후 query 또는 상태 복원 event가 있는 비율이다. 상태 복원 성공률은 resume event를 분모로 별도 계산한다.
- 모든 비율은 population, denominator, window, timezone, bot/filter, event dedup과 late-arrival cutoff를 metric version에 고정한다.

## 개인화의 위치와 경계

개인화는 후보 자격과 사용자의 명시적 조건을 덮는 만능 점수가 아니다. 먼저 권한, 연령, 지역, 구독 가능 여부 같은 hard constraint를 적용하고 query 의도로 후보를 만든 뒤, 그 후보 안에서 개인화 rerank를 실험하는 편이 진단 가능하다.

- 개인화 여부와 baseline을 비교할 수 있게 variant를 기록한다.
- 사용자가 선택한 sort와 facet은 개인화가 조용히 무시하지 않는다.
- 최근 행동 편향을 해제하거나 초기화할 수단을 제공한다.
- 추천 이유를 과장하지 말고 실제 ranking signal과 설명 문구가 일치하게 한다.

## 지표를 읽는 법

| 구간 | 관찰 지표 | 해석할 때 주의점 |
|---|---|---|
| 입력 | query 제출률, suggestion 채택률 | 채택률 상승이 목표 성공을 보장하지 않음 |
| 결과 | 0건율, reformulation률, filter churn | query 유형, 신규/기존 사용자, device로 나눠 봄 |
| 행동 | 첫 유효 행동까지 시간, 성공 event율 | 클릭을 성공으로 정의하지 않고 도메인 목표와 연결 |
| 복귀 | 검색 재개, 결과 상태 복원 실패 | 재검색이 탐색의 일부인지 실패인지 구분 |
| 품질 | nDCG/MRR, task success, 만족도 | offline judgment와 온라인 실험을 함께 사용 |

클릭과 abandonment는 맥락이 필요하다. 상위 노출은 더 많이 클릭되는 position bias가 있고, 클릭 없이 답을 얻는 good abandonment도 있다. 따라서 CTR 하나로 관련도를 판정하지 않는다. Offline judgment로 relevance를 비교하고, 온라인에서는 A/B test나 interleaving으로 실제 행동 영향을 검증하며 guardrail로 latency, 0건율, 오류율을 함께 본다.

## 자주 실패하는 설계

- 모든 query에 인기순을 섞어 known-item 검색의 정확한 일치를 밀어낸다.
- 비슷한 taxonomy와 태그를 정리하지 않은 채 facet만 늘려 선택 비용을 키운다.
- 자동완성 채택률만 최적화해 자극적인 query가 실제 목표 달성을 방해한다.
- 0건을 숨기려고 필터를 몰래 풀어 사용자가 요청하지 않은 결과를 보여준다.
- 광고를 organic result처럼 보여 단기 클릭과 장기 신뢰를 맞바꾼다.
- 검색 로그의 원문 query를 일반 analytics처럼 장기 보관한다.

## 면접과 설계 검토 체크리스트

- [ ] 핵심 query를 의도와 빈도, 실패 비용으로 분류했는가
- [ ] Query 입력부터 downstream 성공까지 같은 ID로 관측 가능한가
- [ ] Facet, sort, scope의 의미와 backend field가 일치하는가
- [ ] 0건 원인을 구분하고 사용자가 이해할 수 있는 복구 수단이 있는가
- [ ] Keyboard와 screen reader로 자동완성을 완료할 수 있는가
- [ ] Click bias와 good abandonment를 고려해 지표를 해석하는가
- [ ] Offline relevance 평가와 온라인 실험, latency guardrail을 함께 두었는가

## 관련 문서

- [[OpenSearch|OpenSearch 학습 지도]]
- [[OpenSearch-Search-Quality-Evaluation|검색 품질 평가]]
- [[Pagination-Patterns|페이지네이션 UX 패턴]]
- [[User-Guidance-Patterns|사용자 가이드 제공 패턴]]
- [[Personalization-Recommendation|개인화와 추천]]
- [[Recommendation-System-OTT-Discovery-Architecture|OTT 검색, 추천과 browse 통합 아키텍처]]

## 출처

- [A Taxonomy of Web Search - Andrei Broder](https://sigir.hosting.acm.org/files/forum/F2002/broder.pdf)
- [Exploratory Search: From Finding to Understanding - Gary Marchionini](https://doi.org/10.1145/1121949.1121979)
- [Good Abandonment in Mobile and PC Internet Search - Google Research](https://research.google/pubs/good-abandonment-in-mobile-and-pc-internet-search/)
- [Combobox Pattern - W3C WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
- [UBI index schemas - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/ubi/schemas/)
