---
tags: [database, search, opensearch, mysql, postgresql, inverted-index, btree]
status: done
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch vs RDB Search", "RDB vs 검색엔진 도입 판단", "검색엔진 도입 판단 프레임"]
---
# RDB vs 검색엔진 — 도입 판단 프레임

검색 요구가 나오면 바로 OpenSearch를 꺼내는 것도, 무조건 MySQL로 버티는 것도 설계가 아니다. 판단의 밑단은 자료구조다. B-tree는 값에서 위치로 가는 정렬 탐색이고, 역색인은 term에서 문서 목록으로 가는 조회다. 이 차이에서 어떤 요구까지 RDB가 커버되고 어디서부터 검색엔진이 정당화되는지가 갈린다. 도입 이후의 비용은 [[OpenSearch-Indexing-Internals|색인 내부와 동기화]], 관리형 서비스 선택은 [[OpenSearch-Service]] 참고. 이 문서는 도입 이전의 판단 층만 다룬다.

## B-tree vs 역색인


|        | B-tree index                | 역색인 (inverted index)              |
| ------ | --------------------------- | --------------------------------- |
| 키      | 컬럼 값 전체를 정렬해 유지             | analyzer가 분해한 term                |
| 답하는 질문 | 이 값(또는 prefix, 범위)은 어디 있나   | 이 term을 포함한 문서는 무엇인가              |
| 탐색     | 정렬 순서를 따라 root에서 leaf로      | term dictionary에서 posting list 조회 |
| 잘 하는 것 | equality, range, prefix, 정렬 | 전문 검색, 관련도 랭킹, 다중 term 교집합        |
| 못 하는 것 | 중간 문자열 매칭, 관련도              | 다중 행 transaction, join            |


### LIKE '%x%'가 인덱스를 못 타는 이유

B-tree는 키를 문자열 전체 기준으로 정렬해 둔다. `LIKE 'x%'`는 정렬 순서상 연속 구간이므로 range scan이 가능하지만, `LIKE '%x%'`는 x가 어느 위치에든 올 수 있어 정렬 순서로 후보를 좁힐 방법이 없다. MySQL 공식 문서도 wildcard로 시작하지 않는 문자열 prefix만 index를 사용한다고 명시한다. covering index면 full table scan 대신 full index scan으로 바뀔 수는 있지만 여전히 모든 키를 훑는 O(n)이다. 인덱스가 없어서 느린 게 아니라, 있어도 자료구조상 못 타는 것이다.

역색인은 색인 시점에 텍스트를 term으로 분해해 두므로 검색 시점 비용이 posting list 조회로 바뀐다. 비용을 읽기에서 쓰기(색인)로 옮기는 구조다.

## MySQL FULLTEXT의 실제 한계

InnoDB FULLTEXT(`MATCH ... AGAINST`)가 있으니 MySQL도 되지 않느냐가 면접 단골 꼬리다. 되는 범위와 안 되는 범위를 정량으로 답해야 한다.

### 랭킹과 한국어

- 관련도는 문서 내 빈도와 collection 내 희소성 기반 가중치(TF-IDF 계열)다. field별 가중치, 랭킹 함수 교체나 튜닝, function score 같은 수단이 없다. OpenSearch의 BM25와 튜닝 축은 [[OpenSearch-Query-Relevance]] 참고.
- 기본 parser는 공백 기준 토큰화에 `innodb_ft_min_token_size` 기본 3이라 한국어에 사실상 부적합하다. 형태소 분석(조사 분리, 어간 추출)이 없어 검색은 [[OpenSearch-Korean-Text-Analysis|Nori]] 같은 층위로 못 간다.

### ngram parser의 대가

한국어 대응으로 ngram parser를 쓰면(`ngram_token_size` 기본 2, 범위 1~10, [[MySQL-Aurora-Parameter-Tuning]]에서 표준값 근거) 새 제약이 생긴다.

- `ngram_token_size`는 read-only 서버 변수라 변경에 재시작이 필요하고 기존 FULLTEXT 인덱스는 재생성해야 한다.
- 모든 텍스트를 N글자 단위로 중첩 분해하므로 인덱스가 원문 대비 크게 팽창하고, token size 1이면 후보 폭발로 부하가 급증한다.
- 검색어는 ngram phrase로 변환된다. bigram에서 abc 검색은 "ab bc" phrase가 된다. prefix가 token size 이상인 wildcard 검색(`abc*`)은 wildcard가 무시되고 phrase 검색으로 동작한다.
- 형태소가 아니라 기계적 분해이므로 의미 없는 부분 일치가 관련도 노이즈로 올라온다.

### InnoDB FTS 운영 제약

- FULLTEXT 인덱스를 처음 만들 때 hidden column `FTS_DOC_ID`가 추가되며 table rebuild가 발생한다. 대형 테이블이면 사전에 명시적으로 정의해 회피한다.
- 역색인이 6개 auxiliary table로 분할 저장되고, delete는 즉시 지워지지 않고 `FTS_*_DELETED`에 쌓여 검색 시 필터링된다. 공간 회수는 `innodb_optimize_fulltext_only=ON` 상태의 `OPTIMIZE TABLE`을 별도로 돌려야 한다.
- FULLTEXT 검색은 committed 데이터만 본다. 같은 transaction 안에서 방금 넣은 행이 MATCH에 안 잡힌다.

## PostgreSQL의 커버 범위

- tsvector와 tsquery, GIN 인덱스 조합은 stemming 기반 전문 검색을 내장한다. 다만 내장 text search configuration은 영어 등 유럽어 중심이고 한국어 형태소 사전이 없다(외부 dictionary 확장 필요).
- 랭킹(ts_rank, ts_rank_cd)은 공식 문서가 명시하듯 global 정보를 사용하지 않는다. 문서 내 빈도와 근접도만 보고 corpus 전체의 term 희소성(IDF)을 반영하지 못하며, 매칭된 각 문서의 tsvector를 읽어야 해 I/O bound로 비싸질 수 있다.
- pg_trgm은 trigram으로 `LIKE`, `ILIKE`(9.1+), 정규식(9.3+) 검색을 GIN 또는 GiST 인덱스로 가속하고 similarity 연산(`%`, 기본 threshold 0.3)으로 오타 fuzzy 매칭을 준다. 중간 문자열 검색의 현실적 1차 해법이지만, 이것은 문자열 유사도이지 관련도 랭킹이 아니고 패싯이나 자동완성의 답도 아니다.

## 검색엔진 도입의 대가

검색엔진 선택은 기능을 얻는 결정이 아니라 비용을 옮기는 결정이다.

- 동기화 파이프라인이 하나의 운영 시스템이 된다. dual-write gap, 이벤트 순서 역전, reconciliation, freshness SLO 전부 [[OpenSearch-Indexing-Internals|색인 내부]]의 동기화 섹션이 다루는 비용이다.
- 다중 행 transaction, foreign key, join이 없다. 역정규화로 join 비용을 쓰기로 옮기므로 원본 한 건 변경이 갱신할 검색 문서 수를 설계해야 한다.
- 기본 `refresh_interval` 1초의 near real-time이라 read-after-write가 필요한 화면은 검색엔진이 아니라 원본 DB를 읽게 경로를 나눠야 한다.
- mapping 비호환 변경은 reindex와 alias 전환이 필요하고, 클러스터 자체가 관리 대상이다(관리형이어도 [[OpenSearch-Service|책임 경계]]가 남는다).

## 도입 판단 사다리


| 단계  | 수단                           | 커버하는 요구                         | 한계 신호                |
| --- | ---------------------------- | ------------------------------- | -------------------- |
| 1   | B-tree + `LIKE 'x%'`         | prefix 검색, 정확 일치                | 중간 문자열 요구 등장         |
| 2   | pg_trgm 또는 소규모 `LIKE '%x%'`  | 부분 문자열, 오타 fuzzy                | 관련도 순 정렬 요구          |
| 3   | MySQL FULLTEXT ngram, PG FTS | 단순 전문 매칭, 낮은 랭킹 요구              | 형태소 품질, 랭킹 튜닝, 패싯 요구 |
| 4   | 검색엔진 (OpenSearch)            | 형태소 관련도 랭킹, 패싯과 필터 조합, 자동완성, 규모 | 동기화 운영 부담 감수         |


도입이 정당화되는 요구는 대체로 이 순서로 온다. 형태소 기반 관련도 랭킹(검색 품질이 지표에 직결), 다중 filter와 facet 집계를 검색과 한 질의로 조합, 자동완성과 오타 보정, 그리고 원본 DB의 쿼리 부하 분리가 필요한 규모. 반대로 요구가 admin 화면의 이름 부분 검색 수준이면 사다리 1~2단이 정답이고 검색엔진은 과설계다.

## 도입 질문에 먼저 물을 숫자 4개

사다리의 어느 단이 정답인지는 기술 지식이 아니라 정량 요구가 정한다. "검색엔진 도입할까요?"에 대한 첫 반응은 기술 이름이 아니라 이 숫자들을 묻는 것이다.

| 물을 숫자 | 결정되는 것 |
|---|---|
| 데이터 크기와 성장률 | primary shard 수 — [[OpenSearch-Shard-Sizing|샤드 사이징 계산식]]의 입력 |
| 검색 QPS와 p95 목표 | replica와 node 수, 애초에 사다리 몇 단이 필요한지 |
| 변경 발생량 (하루 건수와 peak) | 동기화 relay 방식 — 폴링으로 충분한지 CDC가 필요한지 ([[Transactional-Outbox|relay 구현 방식]]) |
| freshness 허용치 (초냐 분이냐) | 동기화 사다리의 단 — 배치 재색인, outbox, CDC — 과 refresh 설계 |

동기화에도 사다리가 있다. freshness가 분 단위면 `updated_at` 커서 폴링 배치로 충분하고(삭제 감지 안 됨, soft delete 필요), 초 단위 요구와 단일 코드베이스면 outbox와 폴링 relay, 쓰기 경로가 여러 시스템에 흩어져 있거나 대규모면 CDC. 숫자 없이 고른 기술은 방어가 안 되고, 숫자가 있으면 낮은 단이 정답인 경우가 자주 드러난다.

## 면접 꼬리: 왜 MySQL로 안 했나

설계 의사결정 답변은 요구, 대안 검증, 대가 인지, 판단의 4단이 안전하다.

1. 요구 정의: 한국어 상품명 검색에서 관련도 순 정렬과 카테고리 패싯이 필요했다.
2. 대안 검증: `LIKE '%x%'`는 B-tree 정렬 탐색이 불가능해 규모에서 탈락. FULLTEXT ngram은 bigram 기계 분해라 관련도 노이즈가 크고 랭킹 튜닝 수단이 없었다.
3. 대가 인지: 검색엔진은 동기화 파이프라인과 정합성 지연이라는 운영 비용을 새로 만든다는 것을 알고 시작했다.
4. 판단: 검색 품질 요구가 그 운영 비용보다 컸고, source of truth는 RDB에 남겨 검색엔진 장애가 쓰기를 막지 않게 격리했다.

거꾸로 왜 검색엔진을 안 썼냐는 꼬리에도 같은 프레임으로, 요구가 사다리 몇 단인지로 답하면 된다.

## 자주 틀리는 오개념

- `LIKE '%x%'`가 느린 이유를 인덱스가 없어서라고 답하는 것. 인덱스가 있어도 leading wildcard는 정렬 탐색을 못 쓴다는 자료구조 층위로 내려가야 한다.
- FULLTEXT가 있으니 MySQL도 검색엔진과 동급이라는 답. 랭킹 알고리즘 교체와 field 가중치가 없고 형태소 분석이 없다는 차이가 핵심이다.
- 검색엔진 도입을 DB 교체로 이해하는 것. 검색엔진은 read model이고 원장 요구(transaction, join, 유일 보관소)에는 단독 사용하지 않는다.
- pg_trgm이면 전문 검색이 끝난다는 답. trigram 유사도는 부분 문자열과 오타 대응이지 corpus 통계 기반 관련도가 아니다.
- PostgreSQL FTS 랭킹을 BM25급으로 아는 것. ts_rank는 global 통계를 쓰지 않는다고 공식 문서가 명시한다.

## 관련 문서

- [[OpenSearch|OpenSearch 학습 지도]], [[OpenSearch-Mapping-Text-Analysis|다음: 매핑과 텍스트 분석]]
- [[OpenSearch-Service|Amazon OpenSearch Service 적합과 부적합]]
- [[OpenSearch-Indexing-Internals|색인 내부와 운영 DB 동기화]]
- [[OpenSearch-Query-Relevance|BM25 관련도와 Query DSL]]
- [[OpenSearch-Korean-Text-Analysis|한국어 Nori 분석]]
- [[MySQL-Aurora-Parameter-Tuning|ngram_token_size 표준값]]

## 출처

- [ngram Full-Text Parser - MySQL 8.4 Reference Manual](https://dev.mysql.com/doc/refman/8.4/en/fulltext-search-ngram.html)
- [Fine-Tuning MySQL Full-Text Search - MySQL 8.4 Reference Manual](https://dev.mysql.com/doc/refman/8.4/en/fulltext-fine-tuning.html)
- [InnoDB Full-Text Indexes - MySQL 8.4 Reference Manual](https://dev.mysql.com/doc/refman/8.4/en/innodb-fulltext-index.html)
- [Natural Language Full-Text Searches - MySQL 8.4 Reference Manual](https://dev.mysql.com/doc/refman/8.4/en/fulltext-natural-language.html)
- [Comparison of B-Tree and Hash Indexes - MySQL 8.4 Reference Manual](https://dev.mysql.com/doc/refman/8.4/en/index-btree-hash.html)
- [Controlling Text Search (ts_rank) - PostgreSQL Documentation](https://www.postgresql.org/docs/current/textsearch-controls.html)
- [pg_trgm - PostgreSQL Documentation](https://www.postgresql.org/docs/current/pgtrgm.html)

