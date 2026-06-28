---
tags: [database, vector, embedding, pgvector, hnsw]
status: index
category: "데이터&저장소(Data&Storage)"
aliases: ["vector", "벡터 검색", "Vector Search"]
---

# 벡터 검색 (vector 인덱스)

임베딩 기반 유사도 검색 문서 모음. 개념과 HNSW 원리에서 시작해 PostgreSQL 구현(pgvector)의 타입, 테이블 설계, 쿼리 최적화, 운영까지.

- [[Vector-Similarity-Search|벡터 유사도 검색 (임베딩 흐름, ANN, HNSW 원리, m/ef_construction/ef_search, L2/코사인/내적)]]
- [[pgvector|pgvector (CREATE EXTENSION, vector vs halfvec, HNSW 선택, 파티셔닝, 데드 튜플, 비동기 임베딩)]]
- [[pgvector-Query-Optimization|pgvector 쿼리 최적화 (검색 후 필터, ef_search/LIMIT 함정, iterative scan 0.8.0, relaxed/strict, shared_buffers/pg_prewarm, PgBouncer, REINDEX)]]

## 관련 문서
- [[데이터&저장소(Data&Storage)|카테고리 인덱스]]
- [[OpenSearch|OpenSearch kNN (검색 엔진 쪽 벡터 검색)]]
- [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링 (벡터 + BM25)]]
