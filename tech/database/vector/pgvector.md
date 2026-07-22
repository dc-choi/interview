---
tags: [database, postgresql, pgvector, vector, halfvec, hnsw, embedding]
status: done
verified_at: 2026-07-21
category: "데이터&저장소(Data&Storage)"
aliases: ["pgvector", "halfvec", "vector 타입", "PostgreSQL 벡터 검색", "벡터 테이블 설계"]
---

# pgvector (PostgreSQL 벡터 검색)

pgvector는 PostgreSQL에서 **벡터 저장과 유사도 검색**을 가능하게 하는 확장이다. 별도 벡터 DB를 도입하지 않고 **기존 PostgreSQL 인프라, SQL, 운영 도구를 그대로** 쓰면서 벡터 검색을 시작할 수 있는 게 최대 장점이다. 다만 데이터가 커지고 트래픽이 늘면 일반 인덱스처럼 생각하면 안 된다 — HNSW는 메모리, 캐시, 테이블 구조, 필터링 방식에 민감하다. 벡터 검색 개념과 HNSW 원리는 [[Vector-Similarity-Search|벡터 유사도 검색]] 참고.

## 기본 사용

```sql
CREATE EXTENSION vector;

CREATE TABLE items (
  id        bigserial PRIMARY KEY,
  embedding vector(768)
);

CREATE INDEX ON items USING hnsw (embedding vector_cosine_ops);
```

벡터 컬럼이 있는 테이블에 일반 컬럼도 함께 둘 수 있다. **Aurora PostgreSQL은 DB 버전마다 지원하는 pgvector 버전이 정해져** 있고, DB 버전은 두고 pgvector만 따로 올리기는 어렵다 — 도입 전 호환성 확인 필수.

## 도입 전 3가지 결정

| 결정 | 선택지 | 영향 |
|------|--------|------|
| **타입** | `vector` vs `halfvec` | 정밀도 vs 저장공간/메모리/I/O |
| **탐색** | exact vs HNSW vs IVFFlat | recall, latency, build/insert 비용 |
| **거리** | L2 / 코사인 / 내적 | 임베딩 모델 특성에 맞춤 ([[Vector-Similarity-Search#거리 계산 방식\|거리]]) |

세 선택이 검색 품질, 저장 공간, 응답 속도, 서버 비용에 직접 영향을 준다.

## vector vs halfvec — 정밀도와 비용의 교환

| 타입 | 정밀도 | 행 저장량 | 타입 저장 한도 | HNSW/IVFFlat 한도 |
|------|--------|-----------|----------------|-------------------|
| `vector` | 32비트 float | `4d + 8` bytes | 16,000차원 | 2,000차원 |
| `halfvec` | 16비트 float | `2d + 8` bytes | 16,000차원 | 4,000차원 |

`d`는 차원 수다. 고차원에서는 `halfvec`의 저장량이 `vector`의 절반에 가까워 메모리와 I/O를 줄이지만 8-byte header 때문에 정확히 절반은 아니다. 표의 2,000/4,000은 타입 자체가 아니라 ANN 인덱스 한도이므로 그보다 큰 벡터도 저장하고 exact search할 수 있다. **검색 품질 차이가 크지 않다면 halfvec이 유리**하지만, 실제 임베딩을 변환해 recall과 ranking 회귀를 먼저 검증한다.

## Exact baseline에서 ANN으로 확장

인덱스가 없으면 pgvector는 exact search로 perfect recall을 제공한다. Filter가 적은 행만 남기거나 데이터가 작다면 scalar B-tree와 exact search가 단순하고 빠를 수 있다. 이 경로가 latency SLO를 넘을 때 ANN 인덱스를 검토한다.

- **HNSW**: IVFFlat보다 speed-recall trade-off가 좋은 대신 build가 느리고 메모리 사용과 insert 비용이 크다. 학습 단계 없이 빈 테이블에도 만들 수 있다.
- **IVFFlat**: build가 빠르고 메모리를 덜 쓰지만 적절한 학습 데이터, `lists`와 `probes` 튜닝이 필요하다.
- HNSW의 `m=16`, `ef_construction=64`, `ef_search=40`은 현재 기본값이다. 기본값을 출발점으로 삼되 exact 결과 대비 recall, p95/p99와 쓰기 처리량으로 검증한다.

## Filter 선택 사다리

벡터 인덱스 하나에 scalar 컬럼을 함께 넣는 다중 컬럼 HNSW 인덱스는 만들 수 없지만, 곧바로 파티셔닝해야 한다는 뜻은 아니다. 공식 가이드의 선택 순서는 다음과 같다.

1. Filter가 적은 비율의 행만 남기면 filter 컬럼에 B-tree 또는 적합한 일반 인덱스를 만들고 exact search를 측정한다. 여러 scalar 컬럼은 일반 다중 컬럼 인덱스도 가능하다.
2. 넓은 범위를 검색해야 하면 공용 HNSW 또는 IVFFlat과 iterative scan을 사용한다.
3. Filter 값 종류가 적고 고정적이면 조건별 partial HNSW index를 검토한다.
4. Filter 값 종류가 많거나 tenant 격리가 필요하면 partitioning 또는 별도 테이블을 검토한다.

파티셔닝은 partition pruning으로 탐색 범위를 줄이지만 partition 수, planning 비용, skew와 운영 복잡성을 만든다. 데이터 건수만으로 선택하지 말고 filter 분포와 query workload로 결정한다.

## 벡터 테이블에는 "자주 안 바뀌는 컬럼"만

벡터 테이블에는 **필터링에 자주 쓰이면서 변경이 적은 컬럼**만 함께 둔다(지역, 카테고리, 타입 등). 자주 바뀌는 컬럼은 별도 테이블로 분리한다.

- 이유: 자주 UPDATE하면 **데드 튜플**이 늘고, HNSW 검색이 이미 삭제/갱신된 튜플을 후보로 집었다가 거른다.
- 결과: 성능 저하뿐 아니라 **요청한 개수보다 적은 결과**가 반환될 수 있다(후보가 필터링으로 깎임). 블로팅 운영은 [[pgvector-Query-Optimization#운영 — PgBouncer, 리인덱싱|리인덱싱]] 참고.

## 임베딩 생성은 비동기로

임베딩 생성은 외부 모델/API에 의존해 **지연이 크고 실패 가능성**이 있다. 사용자 요청 흐름에서 동기 처리하면 서비스 안정성이 떨어진다.

- **메시지 큐나 배치**로 비동기 생성하고, **실패 시 재처리** 구조를 함께 둔다([[Transactional-Outbox|Outbox]], 메시지 큐 패턴).

## 면접 체크포인트

- pgvector의 장점(기존 PG 인프라 재사용)과 "일반 인덱스처럼 생각하면 안 되는" 이유
- vector vs halfvec 트레이드오프, halfvec 도입 전 정밀도 검증
- Exact search와 HNSW, IVFFlat의 recall, latency, build/insert 비용 비교
- Scalar index exact search → 공용 ANN → partial index → partitioning 선택 사다리
- 벡터 테이블에 자주 바뀌는 컬럼을 두면 안 되는 이유(데드 튜플 → 결과 수 부족)
- 임베딩 생성을 비동기 + 재처리로 빼는 이유

## 사례
- 대규모 중고거래 서비스가 리소스 효율을 위해 주로 `halfvec` + HNSW + 코사인 거리를 기본으로 쓰고, vector와 정확도를 비교했을 때 큰 차이가 없었던 사례가 있다. HNSW 튜닝 파라미터는 기본값을 사용한다.

## 출처
- [pgvector README — indexing, filtering, iterative scans and scaling](https://github.com/pgvector/pgvector)
- [Aurora PostgreSQL extension versions — AWS Documentation](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.Extensions.html)
- [pgvector 검색 최적화 — HNSW, halfvec, 쿼리 패턴, 운영 (YouTube)](https://www.youtube.com/watch?v=n3_LY7YFCwE&list=PLaHcMRg2hoBoFR-9MlfJP56xrcIxBInCm&index=6)

## 관련 문서
- [[Vector-Similarity-Search|벡터 유사도 검색]] — 개념, HNSW 원리, 거리 계산
- [[pgvector-Query-Optimization|pgvector 쿼리 최적화]] — 쿼리 패턴, ef_search/LIMIT, iterative scan, 운영
- [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL]] — PostgreSQL 특성(MVCC, 데드 튜플)
- [[Transactional-Outbox|Transactional Outbox]] — 비동기 임베딩 생성, 재처리
- [[OpenSearch-Vector-Search|OpenSearch k-NN]] — 검색 엔진 쪽 벡터 검색 대안
