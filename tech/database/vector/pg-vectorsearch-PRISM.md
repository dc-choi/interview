---
tags: [postgresql, vector, ann, prism, quantization]
status: done
verified_at: 2026-10-16
category: "데이터&저장소(Data&Storage)"
aliases: ["pg_vectorsearch", "PRISM 벡터 인덱스"]
---

# pg_vectorsearch와 PRISM 인덱스

`pg_vectorsearch`는 PostgreSQL에 PRISM ANN 인덱스를 추가하는 확장이다. 그래프의 이웃을 따라가는 HNSW와 달리 압축한 벡터가 담긴 클러스터를 탐색한다.

## 탐색 흐름

계층형 중심점 구조로 조회할 클러스터를 고르고, RaBitQ 양자화의 거리 추정과 오차 경계를 활용해 원본 벡터를 다시 비교할 후보를 줄인다. 검색 범위를 줄이는 만큼 exact 결과 대비 recall을 확인해야 한다.

## pgvector와의 호환 경계

공식 README는 자체 `vec32`, `vec16` 타입 외에 기존 pgvector `vector`, `halfvec` 컬럼에 PRISM 인덱스를 만들 수 있다고 설명한다. 테이블과 조회문의 형태를 유지하더라도 확장 설치, 거리별 operator class 선택과 인덱스 생성 작업은 필요하다.

기존 HNSW 인덱스를 즉시 지우지 않고 새 인덱스의 `EXPLAIN` 경로, recall과 지연을 확인한다. 필터, 갱신과 삭제 및 인덱스 유지보수도 같은 입력으로 시험한다.

## 벤치마크의 확인 수준

2026-10-15 GeekNews 입력은 개발팀의 1억 벡터, recall 95% 조건에서 PRISM이 128GiB 인스턴스에서 중앙값 6ms, pgvector HNSW가 512GiB에서 8ms였다고 소개한다. 서로 다른 메모리 구성과 개발팀 측정이므로 일반적인 우위로 바꾸지 않는다.

2026-10-16 공식 저장소에서 PRISM 방식, 기존 타입 호환과 조정 및 유지보수 경로를 확인했다. 위 숫자의 전체 dataset, 동시성, warm/cold cache와 재현 스크립트는 추가 확인 대상이며 직접 실행하지 않았다.

## 평가 순서

1. 동일한 embedding, 거리 함수와 필터로 exact 정답을 만든다.
2. Recall@k를 맞춘 뒤 p50/p95/p99와 처리량을 비교한다.
3. build 시간, 디스크 및 메모리와 증분 쓰기 비용을 포함한다.
4. 지원 PostgreSQL 버전과 운영 환경의 확장 허용 여부를 확인한다.

## 출처

- [pg_vectorsearch — GitHub, Timescale](https://github.com/timescale/pg_vectorsearch)
- [pg_vectorsearch, Tuning Guide](https://github.com/timescale/pg_vectorsearch/blob/main/docs/tuning.md)
- GeekNews, 2026-10-15 제공 발췌: Pg_vectorsearch - pgvector의 IVFFlat과 HNSW보다 빠른 인덱스 (벤치마크 수치의 상세 조건 미대조)

## 관련 문서

- [[Vector-Similarity-Search|벡터 유사도 검색]]
- [[pgvector|pgvector]]
- [[pgvector-Query-Optimization|pgvector 쿼리 최적화]]
