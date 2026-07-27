---
tags: [database, search, opensearch, lucene, segment, index]
status: index
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Segment Index", "OpenSearch 세그먼트 폴더 인덱스"]
---

# OpenSearch 세그먼트 폴더 인덱스

Lucene segment 안팎의 저장 구조와 복제 방식을 다룬다. 측정된 문제가 있을 때 보는 심화 갈래다.

- [[OpenSearch-Inverted-Index-Structures|역색인 내부 구조]] — FST, postings, BKD와 doc_values
- [[OpenSearch-Segment-Merge|Segment merge]] — merge policy와 codec 압축
- [[OpenSearch-Segment-Replication|Segment replication]] — remote-backed storage와 OR1

## 관련 문서

- [[OpenSearch|OpenSearch 학습 지도]]
