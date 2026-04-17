---
tags: [database, search, opensearch, elasticsearch, cqrs, inverted-index]
status: done
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch", "Elasticsearch", "ES", "검색 엔진", "역색인"]
---

# OpenSearch · Elasticsearch — 검색 엔진

**역색인(Inverted Index)** 기반의 분산 검색 엔진. 텍스트 전문 검색·자동완성·집계·로그 분석에 사용된다. OpenSearch는 2021년 Elasticsearch 라이선스 변경(SSPL) 이후 AWS가 포크한 오픈소스 버전으로, 기본 API와 데이터 모델이 호환된다.

## 왜 RDBMS로 부족한가

RDBMS는 **정렬된 인덱스**(B-Tree)로 범위·동등 조건은 잘 처리하지만, **전문 검색(Full-Text Search)·다량 OR·대규모 집계**에서 약하다.

- `LIKE '%키워드%'` — 선행 와일드카드는 인덱스를 못 탐 → 테이블 스캔
- `IN (수천 개)` — 옵티마이저가 포기하거나 filesort 폭발
- 형태소 분석·동의어·유사도 점수(TF-IDF·BM25) — DB에 내장되지 않음
- 수억 문서 실시간 집계 — RDBMS는 OLAP 전용이 아니라 느림

검색 엔진은 **역색인 + 분산 샤딩**으로 이런 워크로드에 최적화.

## Elasticsearch vs OpenSearch

| 항목 | Elasticsearch (Elastic) | OpenSearch (AWS) |
|---|---|---|
| 라이선스 | Elastic License 2.0 + SSPL (상용 제약) | Apache 2.0 (완전 오픈소스) |
| 분기 시점 | - | 2021, ES 7.10.2 기반 포크 |
| 공식 지원 | Elastic Cloud·Elastic 자체 | AWS OpenSearch Service·자체 운영 |
| 기본 보안 기능 | 기본 ES는 유료, X-Pack 포함 | 기본 제공 (SSL·RBAC·감사) |
| 벡터 검색 | 8.x 이후 네이티브 | 2.x 이후 네이티브 + kNN |
| 생태계 | Kibana, Beats, Logstash | OpenSearch Dashboards, Data Prepper |

AWS 생태계·오픈소스 우선은 OpenSearch, 최신 기능·Elastic Cloud 호환은 Elasticsearch.

## 핵심 개념

### Index·Document·Shard

- **Index**: RDBMS의 테이블에 해당. 문서(JSON) 모음
- **Document**: JSON 형식의 단일 레코드. `_id`로 식별
- **Shard**: Index를 쪼갠 단위. **Primary**(원본) + **Replica**(복제본) — 샤드 단위로 분산·병렬 처리
- **Node·Cluster**: 노드는 ES 프로세스, 여러 노드가 모여 클러스터

### 역색인 (Inverted Index)

"단어 → 문서 목록" 매핑을 미리 만들어둠. 반대로 RDBMS는 "문서 → 단어"(행 → 컬럼 값).

```
원본:  doc1="사과 주스",  doc2="오렌지 사과"
역색인:
  사과   → [doc1, doc2]
  주스   → [doc1]
  오렌지 → [doc2]
```

"사과" 검색 시 단어만 보면 되므로 문서 양과 무관하게 빠름.

### Analyzer·Tokenizer

텍스트를 어떻게 쪼개고 정규화할지 정의.

- **Standard**: 공백·구두점 기준 분리 (영어 기본)
- **Nori**(한국어): 형태소 분석기 — "사과를"을 "사과"+"를"로 분해
- **Custom**: 동의어·금칙어·ngram 조합

한국어 서비스에서 Nori의 `decompound` / `deinflect` / `pos_tagging` 옵션 튜닝이 검색 품질을 좌우한다.

## 아키텍처 선택 — CQRS with OpenSearch

운영 DB(MySQL·Postgres) 위에 OpenSearch를 **읽기 전용 검색 레이어**로 얹는 패턴이 표준.

```
Write  → MySQL (Source of Truth)
             ↓ CDC / 이벤트 / 배치
         OpenSearch (비정규화된 Read Model)
Read   → OpenSearch (검색·리스트·집계)
```

- 쓰기는 MySQL에서 ACID로, 검색은 OpenSearch에서 저지연으로
- **비정규화**: 조인이 필요한 데이터를 하나의 문서에 평탄화해 넣어 IN 다중·JOIN 지연 제거
- 데이터 동기화는 **CDC(Debezium)** 또는 이벤트 발행이 일반적

### CQRS가 가져오는 장애 격리

- OpenSearch가 장애여도 **MySQL은 살아있음** → 쓰기는 계속 처리
- 읽기 경로는 캐시·폴백으로 대응 가능

## 샤드·인덱스 설계

### 샤드 크기 가이드
- **샤드당 10~50GB**가 경험칙. 너무 작으면 관리 오버헤드, 너무 크면 rebalance 비용 폭발
- 샤드 수는 **나중에 늘리기 어려움** → 초기 추정 필요 (Shrink API로 줄이기는 가능)

### Rollover
- 시계열 인덱스(로그·이벤트)에서 주기적으로 새 인덱스 생성 (`logs-2026.04.18`)
- ILM(Index Lifecycle Management) / ISM으로 자동 hot → warm → cold → delete

### Mapping
- Dynamic mapping은 편하지만 **타입 폭발** 위험. 운영은 명시적 mapping 권장
- `keyword` vs `text`: 정확 일치·집계는 `keyword`, 전문 검색은 `text`
- 업데이트는 **불가** — 새 인덱스 만들어 reindex

## 성능·안정성

### 색인 최적화

- **Bulk API**: 수천 건 묶어 한 번에 색인 → 수십 배 처리량
- **refresh_interval**: 기본 1초. 대량 색인 중에는 `-1` 또는 30초로 늘려 처리량↑ (실시간성↓)
- **replica 수 임시 0으로**: 초기 대량 적재 후 replica 복구

### 쿼리 최적화

- `filter` 컨텍스트 활용 — 점수 계산 없이 캐시 사용
- `doc_values` 컬럼으로 집계 (disk 기반 컬럼 저장)
- **Highlight·Sort**는 비싸므로 꼭 필요할 때만

### 흔한 장애·이슈

- **버전 충돌(Version Conflict)**: 동시 업데이트 시 `version_conflict_engine_exception` — 낙관적 동시성으로 재시도
- **형태소 분석 이슈**: 한국어에서 "오프셋 역전 현상" — Nori 옵션 조정(`decompound: true`, `deinflect: false`, `pos_tagging: false`)으로 해결되는 사례 있음
- **샤드 불균형**: 일부 샤드에 hot document 집중 → 라우팅 키 재설계
- **매핑 폭발**: 동적 필드 생성으로 메모리 급증 → `mapping.total_fields.limit` 설정

## 도입 사례 — 쿼리 병목 → 검색 엔진 전환

레거시 MySQL에서 **LIKE 대량 + IN 과다**로 쿼리가 수 초 걸리던 상황을 OpenSearch 도입으로 **최대 17초 → 200ms**까지 단축한 케이스가 보고된다.

- 이런 전환은 보통 MySQL 업그레이드·스키마 최적화로 해결이 안 될 때 선택
- 초기 적재는 배치로, 이후 동기화는 CDC/이벤트로
- 카나리·점진 배포로 리스크 관리

## 면접 체크포인트

- **역색인이 빠른 이유** — "문서→단어" 대신 "단어→문서" 인덱스
- **Elasticsearch vs OpenSearch** 라이선스·생태계 차이
- **CQRS with Search** 아키텍처와 장애 격리 이점
- **샤드 수 결정 기준**과 Rollover 패턴
- **refresh_interval** 조정이 색인 성능에 미치는 영향
- **LIKE 성능 한계**와 검색 엔진을 도입해야 하는 상황 판단

## 출처
- [컬리 — OpenSearch 도입기 (MySQL LIKE 17s → 200ms)](https://helloworld.kurly.com/blog/2023-review-opensearch/)

## 관련 문서
- [[CDC-Debezium|CDC · Debezium (동기화 원천)]]
- [[CQRS|CQRS]]
- [[Index|DB Index (B-Tree 비교)]]
- [[MongoDB-Schema-Design|MongoDB 스키마 설계]]
