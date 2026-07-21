---
tags: [database, search, opensearch, api-design, caching, resilience]
status: done
verified_at: 2026-07-15
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Search API Layer", "검색 API 계층", "검색 서비스 계층 설계"]
---

# OpenSearch 검색 API 서비스 계층

엔진을 아는 것과 검색을 서비스로 노출하는 것은 다른 문제다. 클라이언트와 OpenSearch 사이의 API 계층은 네 가지를 책임진다. 무엇을 받을지 정하는 계약, 그것을 query로 만드는 번역, 엔진과 사용자를 서로에게서 지키는 보호, 엔진이 아플 때의 폴백이다. 엔진 쪽 실행 제어(`timeout`, partial result, `preference`)는 [[OpenSearch-Search-Features#검색 실행 제어|검색 실행 제어]]가 정본이다.

## 한 장으로 보는 구조

```text
Client
  -> 검색 API
     1. 계약 검증 (파라미터 allowlist, cursor 해석)
     2. 쿼리 빌더 (검색어 + filter + 권한 주입)
     3. 캐시 조회
     4. 실행 (타임아웃 예산, 재시도, circuit breaker)
     5. 응답 매핑 (내부 구조 은닉) 또는 폴백
  -> OpenSearch
```

## 계약: Query DSL을 노출하지 않는다

- 클라이언트가 DSL을 직접 보내는 구조는 임의 aggregation, wildcard, 깊은 페이지 요청으로 cluster를 세울 권한을 주는 것이다. 받는 것은 검색어, 정해진 filter 목록, 정해진 sort 목록, cursor뿐이고 field명과 sort key는 allowlist로 제한한다.
- `search_after`의 정렬 값을 그대로 응답에 내보내지 말고 opaque cursor로 감싼다. 내부 정렬 키와 페이지네이션 방식을 바꿀 자유가 생긴다. 방식 선택 자체는 [[OpenSearch-Aggregations-Pagination|페이지네이션]]을 따른다.
- 깊은 페이지는 `max_result_window` 초과 오류로 만나지 말고 계약에서 막는다. 일정 페이지를 넘으면 조건을 좁히도록 유도하는 것이 제품 관점에서도 낫다.
- Search template은 query 구조의 드리프트를 줄이는 도구이지 계약 검증의 대체가 아니다. Parameter의 타입과 범위 검증은 여전히 이 계층의 몫이다. Template 운영은 [[OpenSearch-Search-Features#Search template|Search template]]이 정본이다.

## 쿼리 빌더와 권한 주입

- 조건은 filter context로, 검색어는 query context로 보낸다. 점수 계산과 캐시 효율이 갈린다. 구분 기준은 [[OpenSearch-Query-Relevance#Query context와 Filter context|Query와 Filter context]]다.
- 권한 filter(tenant, 공개 상태, 차단 목록)는 클라이언트 입력과 무관하게 서버가 항상 주입한다. Endpoint마다 각자 붙이는 구조는 하나를 빠뜨리는 순간 유출이므로, 쿼리 빌더 한 곳을 통과해야만 query가 만들어지게 강제한다.
- 엔진 수준의 이중 방어가 필요하면 [[OpenSearch-Security-Production#DLS와 FLS의 중요한 한계|DLS]]를 함께 쓴다. 애플리케이션 filter는 성능이 좋고 DLS는 우회가 어렵다. 하나를 고르는 문제가 아니라 계층 방어다.
- 자동완성 경로에도 같은 권한 filter를 태운다. 후보 노출이 곧 문서 존재의 유출인 이유와 suggestion 문서 설계는 [[OpenSearch-Search-Features#자동완성 선택지|자동완성 선택지]]가 정본이다.

## 캐싱 계층

| 계층 | 대상 | 무효화 |
|---|---|---|
| Shard request cache | 기본값에선 `size: 0` 집계 위주 응답 (2.19 이상은 `indices.requests.cache.maximum_cacheable_size`로 확장) | refresh마다, 자주 refresh되는 index에선 효과 제한 |
| 애플리케이션 캐시 (Redis 등) | 인기 검색어 결과 첫 페이지, 자동완성 prefix 응답 | TTL |
| HTTP와 CDN | 완전 공개이고 파라미터가 적은 응답 | TTL |

- 검색 결과 캐시는 이벤트 기반 무효화가 사실상 안 된다. 문서 하나가 바뀔 때 그 문서를 포함했던 query 결과를 역추적할 수 없기 때문이다. TTL로 신선도와 부하를 교환하고, 가격과 재고처럼 신선도가 민감한 값은 캐시된 결과 위에 별도 조회로 덧씌우는 분리를 검토한다.
- 캐시 키에 권한 컨텍스트를 포함한다. Tenant가 다른 사용자가 같은 키에 적중하면 그대로 유출이다.
- 검색 트래픽은 소수 head query에 몰리므로 첫 페이지 캐시의 효율이 좋다. Top-k 추출 설계는 [[OpenSearch-Popular-Keywords-TopK|인기 검색어 top-k]]를 참고한다.
- Request cache에서 제외되는 요청(profile, scroll, DFS, `now` 같은 상대 시간)과 나머지 cache 계층의 함정은 [[OpenSearch-Performance-Troubleshooting#Cache를 구분하기|cache 구분]]이 정본이다.

## 타임아웃 예산과 폴백

- 전체 API SLO에서 역산해 client timeout > API server timeout > OpenSearch 호출 timeout 순서를 지킨다. 거꾸로면 이미 포기된 요청을 위해 일하게 된다.
- OpenSearch의 `timeout`은 soft다. Hard deadline은 HTTP client 쪽에 건다. 응답의 `timed_out`, `_shards.failed` 확인은 실행 제어 정본을 따른다.
- 검색은 read라 재시도가 안전하지만, timeout 재시도는 장애 중 부하를 배로 만든다. Backoff와 jitter, 그리고 재시도 총량 예산(retry budget)으로 제한한다.
- 클라이언트 측 circuit breaker를 둔다. OpenSearch 내부의 memory circuit breaker와는 다른 것이다. 연속 실패 시 호출을 차단하고 half-open으로 회복을 탐지해, 죽은 엔진에 계속 붙는 connection과 thread 고갈을 막는다.
- 폴백 메뉴를 좋은 순서로 준비한다. 첫째 stale 캐시 결과에 안내 문구, 둘째 인기 검색어나 추천 목록, 셋째 카테고리 브라우징 유도. 자동완성 실패는 조용히 숨긴다. 자동완성이 죽었다고 검색창까지 막히면 안 된다.
- 폴백 발동률을 지표로 둔다. 폴백이 상시 발동 중인데 아무도 모르는 상태가 최악이다.

## 부하 보호

- 자동완성은 keystroke마다 호출된다. 클라이언트 debounce를 계약에 명시하고, 클라이언트는 통제할 수 없으므로 서버 rate limit을 별도로 둔다.
- 검색 API는 파라미터 조합이 무한해 크롤링 대상이 되기 쉽다. 봇 트래픽을 식별해 별도 한도나 캐시 전용 경로로 격리한다.
- 고비용 패턴을 계약에서 차단한다. Leading wildcard, 과도한 page size, 빈 검색어의 전체 매칭 같은 것들이다.

## API 계층에서 재는 것

- 전체 latency와 엔진 latency를 분리 측정한다. 느려졌을 때 엔진 문제인지 애플리케이션과 네트워크 문제인지의 첫 갈림길이다.
- 캐시 히트율, 폴백 발동률, 오류율을 endpoint별로 본다.
- Query 로그(검색어, filter, 결과 수, 클릭 연결용 query id)를 남기는 곳이 이 계층이다. 품질 루프의 원료가 된다. 검색어에는 이름과 전화번호 같은 개인정보가 들어오므로 수집 시점의 마스킹과 보존 기간을 정한다. 수집 이후의 활용은 [[OpenSearch-Search-Quality-Evaluation#UBI: 행동 데이터 수집|UBI]]와 로그 백로그 루프로 이어진다.

## 관련 문서

- [[OpenSearch|OpenSearch 학습 지도]]
- [[OpenSearch-Search-Features|검색 실행 제어와 search template]]
- [[OpenSearch-Query-Relevance|Query DSL과 관련도]]
- [[OpenSearch-Aggregations-Pagination|정렬과 페이지네이션]]
- [[OpenSearch-Query-Understanding|쿼리 이해와 검색어 전처리]]
- [[OpenSearch-Security-Production|보안과 DLS]]
- [[OpenSearch-Popular-Keywords-TopK|인기 검색어 top-k]]
- [[Search-UX|검색 UX 설계]]

## 출처

- [Search API - OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/search-apis/search/)
- [Index request cache - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/caching/request-cache/)
- [Paginate results - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/searching-data/paginate/)
- [Search settings - OpenSearch Documentation](https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/search-settings/)
- [Index settings (max_result_window) - OpenSearch Documentation](https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/index-settings/)
- [Timeouts, retries, and backoff with jitter - AWS Builders' Library](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)
