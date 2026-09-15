---
tags: [database, search, opensearch, inverted-index, rest-api, query-dsl]
status: done
verified_at: 2026-08-08
category: "Data & Storage - NoSQL"
---

# OpenSearch 기초 — 개념과 역색인의 실물

[[OpenSearch|학습 지도]] 0단계 전의 진입 계단이다. 실행 중인 cluster가 없다면 [[OpenSearch-Local-Quickstart|Local Docker Quickstart]]를 먼저 따른다. 다른 문서들은 인덱스, 매핑, analyzer, term 같은 단어의 실물을 이미 봤다고 전제한다. 이 문서는 그 실물을 처음 보여준다. 인덱스 하나를 만들고 문서를 넣고 검색해 응답을 읽을 수 있으면 통과다.

## 무엇을 위한 엔진인가

OpenSearch는 JSON document를 색인한 뒤 검색과 분석을 함께 수행하는 분산 엔진이다. 단일 node에서도 실행할 수 있고, 데이터와 부하가 커지면 shard copy를 여러 node에 배치해 확장할 수 있다.

| 워크로드 | OpenSearch가 제공하는 가치 |
|---|---|
| 서비스 검색 | 전문 검색, filter, 관련도 순위와 aggregation을 한 query에서 결합 |
| 로그와 보안 분석 | 대량 event를 조건으로 검색하고 집계해 패턴과 이상 징후를 조사 |

검색엔진 도입은 원장 DB를 자동으로 대체한다는 뜻이 아니다. 어떤 요구에서 별도 검색 read model이 필요한지는 [[OpenSearch-vs-RDB-Search|RDB 검색과의 경계]]에서 판단한다.

## RDB 개념 대응표

진입용 비유다. 일대일 등가가 아니고, join과 다중 행 transaction이 없다는 차이는 [[OpenSearch-vs-RDB-Search|0단계 문서]]가 다룬다.

| RDB | OpenSearch | 차이 |
|---|---|---|
| table | index | 새 필드 추가는 자유롭지만 이미 만든 필드의 타입은 바꿀 수 없어 재색인이 필요 |
| row | document | 고정 컬럼이 아니라 중첩 가능한 JSON 문서 |
| column | field | 타입에 따라 색인 구조가 달라짐 |
| schema (DDL) | mapping | 필드 타입과 분석 방식을 정의하는 JSON |
| SQL | Query DSL | 애플리케이션 검색의 주 경로인 JSON 질의. OpenSearch SQL/PPL과 Dashboards DQL은 별도 목적 인터페이스 |

## 역색인의 실물

RDB 인덱스는 값에서 행 위치를 찾는다. 역색인(inverted index)은 반대로 단어에서 문서 목록을 찾는다. 문서 3개를 색인하면 아래처럼 저장된다.

```text
문서 1: "무선 블루투스 이어폰"
문서 2: "블루투스 스피커"
문서 3: "유선 이어폰"

term (정렬된 단어 사전)   posting list (문서 ID 목록)
무선                  → [1]
블루투스              → [1, 2]
스피커                → [2]
유선                  → [3]
이어폰                → [1, 3]
```

- Analyzer는 raw text에 0개 이상의 character filter, 정확히 1개의 tokenizer, 0개 이상의 token filter를 순서대로 적용한다. Tokenizer가 position과 offset 같은 metadata를 가진 token을 만들고, token filter 단계를 지난 최종 token value가 역색인의 term dictionary에 저장되어 matching에 쓰이는 term이다. 세부 단계는 [[OpenSearch-Mapping-Text-Analysis-Analyzer#Analyzer 파이프라인|Analyzer 파이프라인]]에서 다룬다.
- 정렬된 term 목록이 term dictionary, term마다 붙은 문서 ID 목록이 posting list다 (다른 문서에서는 postings로도 쓴다). 기본 `text` field의 postings에는 빈도와 token position도 저장되며, position은 phrase query의 단어 순서와 거리를 판정할 때 사용한다.
- 블루투스 이어폰 검색은 두 term의 posting list를 조회해 합치는 것으로 끝난다. 문서 전체를 훑지 않는다.

기본 standard analyzer는 Unicode 단어 경계 기준으로 쪼갠 뒤 대소문자가 있는 문자를 소문자로 정규화한다 (한국어는 대소문자가 없어 그대로다). 위처럼 띄어쓰기된 한국어는 공백 단위로 나뉘고, 조사가 붙는 실전 한국어(예: 이어폰을)는 형태소 분석이 필요하다. [[OpenSearch-Korean-Text-Analysis|Nori]]가 그 역할이다. 이 구조를 B-tree와 같은 데이터로 비교한 그림 버전은 [[OpenSearch-Architecture-Map|아키텍처 한 장 지도]]에 있다.

## 출처

- [OpenSearch Documentation, Introduction to OpenSearch](https://docs.opensearch.org/latest/getting-started/intro/), [OpenSearch Documentation, OpenSearch concepts](https://docs.opensearch.org/latest/getting-started/concepts/)
- [OpenSearch Documentation, Standard analyzer](https://docs.opensearch.org/latest/analyzers/supported-analyzers/standard/)

## 관련 문서

- [[OpenSearch-Basics|OpenSearch 기초 목차]]
- [[OpenSearch-Basics-REST-Walkthrough|다음: 인덱스 생성부터 검색까지]]
- [[OpenSearch-Basics-Query-Vocabulary|쿼리의 최소 어휘와 통과 기준]]
