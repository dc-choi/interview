---
tags: [database, search, opensearch, lucene, shard, replication]
status: done
verified_at: 2026-08-19
category: "Data & Storage - NoSQL"
---

# OpenSearch 프로젝트 계보와 호환성 경계

## 선택: 프로젝트 계보와 호환성 경계

OpenSearch와 OpenSearch Dashboards는 각각 Elasticsearch와 Kibana의 마지막 Apache 2.0 릴리스인 7.10.2를 기반으로 2021년에 시작한 포크다. 이후 독립된 roadmap으로 발전했으며 현재 Linux Foundation 산하 OpenSearch Software Foundation의 지원과 프로젝트 TSC의 기술 방향 아래 Apache 2.0으로 배포된다. 엔진 프로젝트와 AWS 관리형 상품인 Amazon OpenSearch Service는 같은 대상이 아니다.

분기의 직접 계기는 7.11의 라이선스 변경이었다. Elastic은 2024년 Elasticsearch와 Kibana 무료 부분의 source code에 AGPLv3를 ELv2, SSPL과 함께 선택할 수 있도록 추가했지만 기본 배포판은 계속 ELv2로 제공한다. 따라서 OpenSearch는 Apache 2.0, Elasticsearch는 SSPL이라고만 단순화하지 않고 source code와 배포판의 라이선스, 거버넌스, 기능, API, plugin 생태계를 각각 확인한다.

공통 조상은 영구적인 기능 동등성과 client 호환성을 보장하지 않는다. OpenSearch 2.x 이상에서는 [[OpenSearch-JavaScript-Client|OpenSearch client]]를 기본으로 사용하고, migration 때 source와 target version뿐 아니라 index 생성 version, mapping, plugin, API와 snapshot 호환성을 함께 검증한다. 제품 선택은 source와 배포판 라이선스, 관리형 서비스 조건, 지원 기능의 target version, 운영 역량, 지원 계약, migration 비용과 실제 workload의 총비용을 함께 본다.

### 비교 벤치마크를 읽는 법

제품 비교 수치는 version, 라이선스 배포판, hardware, mapping, query mix와 engine을 고정한 snapshot이다. P90 service time은 요청의 90퍼센트가 그 값 이하인 경계이고, 아래 연구는 반복 실행별 P90의 중앙값과 category별 기하평균을 사용하며 outlier도 포함했다. 따라서 처리량, 자원 비용과 안정성 전체의 승자를 뜻하지 않는다.

- OpenSearch 2.17.1과 Elasticsearch 8.15.4의 Big5 동일 가중치 비교에서는 OpenSearch가 text query에서 2.42배 느렸고 term aggregation은 3.38배, date histogram은 16.55배 빨랐으며 전체 기하평균은 1.56배 빨랐다. 실제 query 비율이 다르면 전체 결과도 달라진다.
- 10M, 768차원 ANN에서는 OpenSearch 기본 NMSLIB가 Elasticsearch Lucene보다 11퍼센트 빨랐지만 OpenSearch Lucene은 Elasticsearch Lucene보다 258.2퍼센트 느렸다. 현재 NMSLIB는 deprecated이므로 이 수치를 현재 제품과 engine의 보편적 우열로 사용하지 않는다. OpenSearch Agentic Search와 Elasticsearch Agent Builder도 product boundary와 packaging이 다르므로 feature 이름만으로 선택하지 않는다.

## 출처

- [OpenSearch vs Elasticsearch 비교 — YouTube](https://www.youtube.com/watch?v=EPGVqk9TrTI), [Benchmarking OpenSearch and Elasticsearch — Trail of Bits](https://blog.trailofbits.com/2025/03/06/benchmarking-opensearch-and-elasticsearch/), [OpenSearch Documentation, Methods and engines](https://docs.opensearch.org/latest/mappings/supported-field-types/knn-methods-engines/)
- [About OpenSearch — OpenSearch](https://opensearch.org/About/)
- [OpenSearch Software Foundation — OpenSearch](https://opensearch.org/foundation/)
- [Software licensing FAQ — Elastic](https://www.elastic.co/pricing/faq/licensing/), [Elastic Documentation, Elastic Agent Builder](https://www.elastic.co/docs/explore-analyze/ai-features/elastic-agent-builder)
- [OpenSearch Documentation, Language clients](https://docs.opensearch.org/latest/clients/)

## 관련 문서

- [[OpenSearch-Architecture|OpenSearch 아키텍처와 분산 실행 모델]]
- [[OpenSearch-Architecture-Topology|제품 구성, 계층 구조와 노드 역할]]
- [[OpenSearch-Architecture-Routing-Read-Write|문서 라우팅과 읽기, 쓰기 경로]]
- [[OpenSearch-Architecture-Cluster-State|Cluster state, quorum과 health]]
