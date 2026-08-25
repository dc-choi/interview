---
tags: [database, search, opensearch, modeling, denormalization]
status: done
verified_at: 2026-08-12
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Entity Relationship Search", "개체 관계 검색 모델링", "인물 출연작 검색"]
---

# OpenSearch 개체 관계 검색 모델링

인물을 검색하면 그 인물이 출연한 작품이 나오는 검색은 단어 매칭이 아니라 개체 사이의 관계(출연, 감독, 소속)를 검색하는 요구다. `_search`의 query DSL에는 임의의 cross-index join이 없다. SQL plugin의 JOIN은 best-effort 지원이라 집계와 규모 제약 때문에 검색 경로로 쓰기 어렵고, `terms` lookup은 다른 문서 하나의 값 목록을 가져오는 제한적 경로이며, 같은 index 안의 parent-join조차 mapping에 미리 선언한 색인 구조다. 그래서 이 관계는 색인 시점에 문서 구조로 실체화되어야 한다. 동의어 사전으로 흉내 낼 수도 있지만, 그 순간 랭킹 제어와 데이터 관리가 함께 무너진다. 이 문서는 그 이유와 올바른 색인 설계를 다룬다.

## 판별 기준: 같은 것의 다른 이름인가

동의어는 같은 개체나 개념의 다른 표기를 같은 term 공간으로 잇는 어휘 장치다. 서로 다른 개체를 잇는 순간 동의어가 아니라 관계가 되고, 관계는 어휘 계층이 아니라 데이터 계층의 문제다.

| 예 | 성격 | 해결 장치 |
|---|---|---|
| 마동석, Don Lee, 마블리 | 같은 개체의 표기 변형 | 동의어 |
| 오픈서치, opensearch | 같은 개념의 표기 변형 | 동의어 |
| 마동석과 범죄도시 | 서로 다른 개체 사이의 관계 (출연) | 문서 필드 (색인 설계) |

동의어의 방향, 배포와 갱신 경로는 [[OpenSearch-Korean-Text-Analysis#사용자 사전, 동의어, 불용어는 목적이 다르다|사전과 동의어]]가 정본이다.

## 동의어로 관계를 풀면 무너지는 것

`인물명, 작품명1, 작품명2` 동등 그룹이든 `인물명 => 작품명1, 작품명2` 단방향 치환이든, 사전에 넣으면 검색은 동작하는 것처럼 보인다. 동등 그룹은 서로 다른 개체를 term 수준에서 등가로 선언하고, 단방향 치환은 인물명 token 자체를 작품명으로 바꿔치기해 인물 자신의 문서가 매치에서 빠질 수도 있다. 어느 쪽이든 무너지는 것은 세 가지다.

- 랭킹 제어가 사라진다. 어느 형태든 token 수준의 무차별 연결이라 매치가 출연 관계 때문인지 제목 일치 때문인지 점수에서 구분되지 않고, 주연작을 조연작보다 위에 두는 식의 관계 단위 가중치를 줄 자리가 없다. 확장된 작품들의 순서는 field 길이 같은 관계와 무관한 신호로 정해진다. 동의어 적용 field를 분리해 boost를 나누는 우회로 일부는 흉내 낼 수 있지만 관계 속성은 여전히 담을 수 없다. 작품 제목이 일반 명사(사랑, 괴물)면 동등 그룹에서는 오염이 반대 방향으로도 퍼진다.
- Analyzer 설정이 그림자 DB가 된다. 인물 수만 명에 출연작을 곱한 규모의 규칙은 원본 DB의 관계 테이블을 사전 파일로 복제한 것이다. 신작 개봉과 출연진 정정이 데이터 변경이 아니라 사전 배포가 되고, 두 저장소가 드리프트하는 순간 검색이 조용히 틀리기 시작한다.
- 개체를 구분하지 못하고 근거 설명이 어려워진다. 동의어는 문자열 층위라 동명이인 배우 두 명의 출연작이 한 규칙에 섞인다. 사용자가 입력한 인물명은 작품 문서 본문에 없으므로 [[OpenSearch-Highlighting|highlight]]에는 확장된 작품명만 강조되어 사용자에게는 이 결과가 나온 이유가 보이지 않고, `_explain`은 Synonym 확장을 그대로 보여주지만 원인 추적은 사전 파일과 analyzer 설정을 아는 운영자만 할 수 있는 일이 된다.

## 관계는 문서 구조로 실체화한다

RDB에서 join으로 풀던 관계를 색인 시점에 미리 join해서 문서 안에 넣는다. 구조는 요구가 복잡한 순서대로 고른다. 평탄화 필드로 충분한지 먼저 확인하고, 부족한 요구가 측정될 때만 아래로 내려간다.

| 구조 | 선택 조건 | 비용 |
|---|---|---|
| 평탄화 필드 (기본) | 관계 상대의 이름으로 문서가 검색되면 충분할 때 | 관계 변경 시 문서 갱신 |
| `nested` | 관계 자체에 속성(배역명, 크레딧 순서)이 있고 원소 단위 매칭 조건이 필요할 때 | 내부적으로 별도 document, query 비용 증가 |
| Parent-join | 관계 문서와 부모 문서의 갱신 주기를 분리해야 할 때 | 같은 shard routing 강제, query 비용 최대 |
| 별도 인물 인덱스 | 인물 자체가 검색 결과(인물 페이지 랜딩)일 때 | 인덱스 하나 추가 운영 |

`nested`와 parent-join의 mapping 선택은 [[OpenSearch-Mapping-Text-Analysis#`object`, `nested`, `flat_object`|nested 매핑 선택]], 매치된 내부 문서 반환은 [[OpenSearch-Inner-Hits|inner_hits]]에서 다룬다.

### 평탄화 필드 예시

작품 문서에 출연진과 감독 이름을 필드로 함께 색인한다.

```json
PUT works-v1
{
  "mappings": {
    "properties": {
      "title": {"type": "text"},
      "cast": {"type": "text"},
      "directors": {"type": "text"},
      "person_ids": {"type": "keyword"}
    }
  }
}
```

```json
GET works-v1/_search
{
  "query": {
    "multi_match": {
      "query": "마동석",
      "fields": ["title^3", "cast^1.5", "directors"]
    }
  }
}
```

- 인물명 검색이 출연작의 `cast` field에 실제 term으로 매치되므로 field별 boost로 제목 일치와 출연 일치의 순위를 제어할 수 있고, highlight와 `_explain`의 매치 근거도 그대로 남는다.
- `person_ids` 같은 ID 필드를 함께 두면 동명이인 구분과 인물 페이지 연동을 문자열이 아니라 개체 기준으로 처리할 수 있다.
- 인물명 field는 본문용 형태소 분석이 이름을 쪼갤 수 있으므로 본문 analyzer를 그대로 쓰지 말고 이름 전용 분석이나 exact field를 함께 검토한다.

## Denormalization의 갱신 비용

역정규화가 join 비용을 쓰기로 옮긴다는 트레이드오프 자체는 [[OpenSearch-vs-RDB-Search#검색엔진 도입의 대가|검색엔진 도입의 대가]]가 정본이다. 여기서 중요한 것은 비용이 사라지지 않는다는 점이다. 동의어 방식에서 사전 배포에 숨어 있던 갱신 비용이, 버전 관리와 검증이 가능한 색인 파이프라인으로 옮겨온다.

- 신작 추가는 문서 1건 색인으로 끝난다. 반대로 배우가 개명하면 그 인물의 출연작 전부를 갱신해야 한다. `_update_by_query`나 영향 문서 재색인으로 전파한다.
- 기존 index에 새 field를 더하는 것은 update mapping API로 가능하다. 다만 기존 문서에 값이 채워지는 것은 아니므로 backfill 갱신이 필요하고, 기존 field의 타입 변경은 [[OpenSearch-Index-Lifecycle#매핑 변경과 무중단 전환|재색인과 alias 전환]]으로 푼다.
- 관계 원본이 바뀌면 영향받는 문서 ID를 찾아 부분 갱신하는 경로가 필요하다. 원본 DB와의 동기화 구조는 [[OpenSearch-Indexing-Internals#운영 DB와의 동기화|RDB 동기화]], 누락과 정합성 검증은 [[OpenSearch-Indexing-Pipeline-Reliability|색인 파이프라인 정합성]]이 정본이다.

## 체크포인트

- 새 검색 요구가 오면 먼저 묻는다. 이것은 같은 것의 다른 이름인가(동의어), 서로 다른 개체 사이의 관계인가(색인 설계).
- 관계 field를 더할 때는 갱신 전파 경로를 함께 설계한다. 어떤 원본 변경이 어떤 문서 집합을 다시 색인하는가.
- 검색 요구 하나가 늘면 색인 설계가 같이 늘어나는 것이 정상이다. 색인 구조에 없는 것은 검색되지 않는다는 것을 설계 전제로 두고, script query나 derived field 같은 query 시점 계산은 비용 때문에 예외 경로로만 쓴다.
- 면접 답변 축: 검색 경로에 쓸 수 있는 RDB식 join이 없다는 제약이 denormalization을 강제하고, 그 대가인 쓰기 증폭을 파이프라인으로 관리한다.

## 관련 문서

- [[OpenSearch|OpenSearch 학습 지도]]
- [[OpenSearch-vs-RDB-Search|검색엔진 도입 판단과 역정규화의 대가]]
- [[OpenSearch-Korean-Text-Analysis|한국어 분석과 사전 운영]]
- [[OpenSearch-Mapping-Text-Analysis|매핑과 저장 구조]]
- [[OpenSearch-Inner-Hits|nested와 parent-join의 내부 매치 반환]]
- [[OpenSearch-Query-Relevance|BM25와 Query DSL]]
- [[Recommendation-System-OTT-Discovery-Architecture|OTT 통합 디스커버리]]

## 출처

- [OpenSearch Documentation, Synonym graph token filter](https://docs.opensearch.org/latest/analyzers/token-filters/synonym-graph/)
- [OpenSearch Documentation, Terms query](https://docs.opensearch.org/latest/query-dsl/term/terms/)
- [OpenSearch Documentation, SQL and PPL limitations](https://docs.opensearch.org/latest/sql-and-ppl/limitation/)
- [OpenSearch Documentation, Joining queries](https://docs.opensearch.org/latest/query-dsl/joining/index/)
- [OpenSearch Documentation, Has child query](https://docs.opensearch.org/latest/query-dsl/joining/has-child/)
- [OpenSearch Documentation, Derived field type](https://docs.opensearch.org/latest/mappings/supported-field-types/derived/)
- [OpenSearch Documentation, Script query](https://docs.opensearch.org/latest/query-dsl/specialized/script/)
- [OpenSearch Documentation, Multi-match queries](https://docs.opensearch.org/latest/query-dsl/full-text/multi-match/)
- [OpenSearch Documentation, Nested field type](https://docs.opensearch.org/latest/mappings/supported-field-types/nested/)
- [OpenSearch Documentation, Join field type](https://docs.opensearch.org/latest/mappings/supported-field-types/join/)
- [OpenSearch Documentation, Update mapping API](https://docs.opensearch.org/latest/api-reference/index-apis/put-mapping/)
- [OpenSearch Documentation, Update by query API](https://docs.opensearch.org/latest/api-reference/document-apis/update-by-query/)
