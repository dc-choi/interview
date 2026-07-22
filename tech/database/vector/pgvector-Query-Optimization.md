---
tags: [database, postgresql, pgvector, hnsw, query-optimization, operations, pgbouncer]
status: done
verified_at: 2026-07-21
category: "데이터&저장소(Data&Storage)"
aliases: ["pgvector Query Optimization", "pgvector 쿼리 최적화", "ef_search LIMIT", "iterative index scan", "relaxed order", "pgvector 운영"]
---

# pgvector 쿼리 최적화와 운영

pgvector는 기본적으로 exact nearest-neighbor search를 수행하고, HNSW나 IVFFlat 인덱스를 추가하면 approximate nearest-neighbor search를 선택할 수 있다. **검색 후 필터** 현상은 주로 이 근사 인덱스 경로에서 발생한다. 쿼리 패턴, 후보 탐색량, iterative scan의 종료 상한, 메모리와 리인덱싱까지 함께 설계해야 결과 수와 지연을 예측할 수 있다. 타입과 인덱스 선택은 [[pgvector|pgvector]] 참고.

## 쿼리 패턴 — 참조 벡터 방어

벡터 검색 쿼리는 두 형태다.

1. 비교할 벡터 값을 쿼리에 **직접** 넣는다.
2. 다른 테이블에서 특정 ID의 임베딩을 가져와 그 값과 비교한다.

2번에서 scalar subquery로 참조 벡터를 가져오면 0행 결과가 scalar `NULL`이 된다. 이 패턴은 `EXISTS`로 가드해야 하지만, `INNER JOIN`이나 `CROSS JOIN`으로 참조 행을 결합하면 대상이 없을 때 전체 결과가 자연히 0행이므로 별도 `EXISTS`가 필수는 아니다. 다음처럼 참조 행 존재 여부를 query shape에 포함한다.

```sql
WITH target AS (SELECT embedding FROM items WHERE id = $1)
SELECT i.id, i.embedding <=> target.embedding AS distance
FROM items AS i CROSS JOIN target
WHERE i.id <> $1
ORDER BY distance
LIMIT 20;
```

## ef_search와 LIMIT의 함정 — 근사 검색 후 필터

HNSW 근사 검색에 일반 `WHERE` 조건을 결합했을 때의 개념적 순서:

```
① ef_search 만큼 후보 수집  →  ② WHERE 필터 적용  →  ③ LIMIT 만큼 반환
```

- `LIMIT 100`을 줘도 `ef_search=40`이면 후보가 40개까지만 나올 수 있다.
- 여기에 `WHERE` 필터가 붙으면 최종 결과는 **40보다 더 줄어든다.**
- 근사 인덱스가 후보를 탐색한 뒤 일반 filter를 적용하므로, 선택도가 낮으면 원하는 개수를 못 채운다. 반대로 scalar filter가 적은 행만 남긴다면 해당 컬럼의 B-tree 등으로 좁힌 뒤 exact search를 수행하는 계획이 더 빠를 수 있다.

## iterative index scan (pgvector 0.8.0+)

0.8.0부터 **iterative index scan**이 도입됐다. 충분한 결과를 찾을 때까지 인덱스를 점진적으로 더 탐색하되, HNSW는 `hnsw.max_scan_tuples`와 `hnsw.scan_mem_multiplier`, IVFFlat은 `ivfflat.max_probes`의 제한을 받는다.

- 이전: 결과가 부족하면 애플리케이션이 `ef_search`를 키워 **재시도**해야 했다.
- 이후: **DB 내부에서 점진적으로** 후보를 더 찾으므로 운영 부담이 준다.
- 충분한 결과를 찾기 전에 상한에 닿으면 iterative scan을 켜도 `LIMIT`보다 적게 반환할 수 있다. Dead tuple, `NULL` vector, filter 선택도도 결과 수에 영향을 준다.

가능하면 0.8.0 이상에서 iterative index scan을 쓰는 것이 좋다.

### relaxed order vs strict order

| 모드 | 거리 순서 | 특성 | 적합 |
|------|-----------|------|------|
| `relaxed_order` | 약간 어긋날 수 있음 | 더 많은 결과를 빠르게 확보 | 유사 후보 충분 확보가 우선일 때 |
| `strict_order` | 거리순을 엄격히 보장 | 같은 탐색 예산에서 relaxed보다 recall이 낮을 수 있음 | 거리 순서가 중요할 때 |

후보 확보가 우선이면 `relaxed_order`를 검토하고, 최종 거리순이 필요하면 materialized CTE 바깥에서 다시 정렬한다. 모드는 representative query set의 recall과 latency로 결정한다.

## LIMIT은 필요한 만큼만

- 애플리케이션에 필요한 결과가 k개면 SQL의 `LIMIT`은 우선 k로 둔다. `LIMIT`은 반환 상한이지 충분한 결과를 보장하는 탐색 예산이 아니다.
- 0.8.0 미만에서는 `ef_search`나 `probes`를 늘리거나 애플리케이션 재시도가 필요할 수 있다. 0.8.0 이상에서도 iterative scan의 종료 상한을 recall과 latency 측정으로 조정한다.
- 벡터 DB에서 가져온 뒤 외부 DB에서 재필터링한다면, 그 **필터링 비율을 감안해 약간 여유 있게** 가져온다.

## 서버 용량 — working set과 캐시 적중률을 잰다

HNSW 인덱스가 메모리보다 커도 검색은 동작한다. 다만 자주 읽는 페이지가 PostgreSQL buffer cache와 OS page cache에서 재사용될수록 I/O가 줄어드는 것은 다른 인덱스와 같다. PostgreSQL은 OS cache도 사용하므로 인덱스 전체를 `shared_buffers`에 넣는 것을 용량 계약으로 삼으면 안 된다.

- `pg_relation_size`, `EXPLAIN (ANALYZE, BUFFERS)`, storage latency와 cache hit 추이로 대표 query의 working set을 측정한 뒤 RAM과 storage를 정한다.
- 읽기 트래픽이 많으면 **리더 인스턴스로 읽기 분산**([[Read-Replica-Routing|Read Replica 라우팅]]).
- 새 리더의 cold cache가 실제 SLO를 깨는 경우 `pg_prewarm`을 검토한다. 기본 `buffer` 모드는 relation block을 shared buffer에 넣으므로 다른 working set을 밀어낼 수 있어 전후 지표로 효과를 확인한다.

## 운영 — PgBouncer, 리인덱싱

- **PgBouncer**: PostgreSQL은 커넥션마다 프로세스를 쓰므로 커넥션이 많으면 메모리가 커진다. **PgBouncer** 같은 커넥션 풀러로 완화([[Connection-Pool|커넥션 풀]]). 단 PgBouncer는 **트래픽 분산기가 아니다** — 읽기 분산은 별도 구조로 설계.
- **리인덱싱(블로팅)**: HNSW는 블로팅에 민감하다. 대량 삭제 후 VACUUM으로 데드 튜플은 정리돼도 **인덱스 파일 크기는 줄지 않는다.** 읽기와 쓰기를 계속 허용해야 하면 concurrent 재색인을 검토한다:

```sql
REINDEX INDEX CONCURRENTLY index_name;
```

pgvector 공식 운영 가이드는 HNSW의 VACUUM이 오래 걸릴 때 concurrent reindex 후 `VACUUM`을 수행하는 순서를 제시한다. 작업 시간, 추가 디스크와 I/O 여유를 먼저 검증한다.

## 면접 체크포인트

- Exact search와 근사 인덱스 경로를 구분하고, 근사 검색에서 filter가 후보 탐색 뒤 적용되는 이유
- `LIMIT 100`인데 결과가 모자라는 현상의 원인(ef_search 상한 + 필터 손실)
- iterative index scan(0.8.0)의 자동 추가 탐색과 종료 상한
- relaxed_order vs strict_order의 트레이드오프
- PostgreSQL과 OS cache를 함께 고려한 working set 측정, pg_prewarm의 조건부 사용
- PgBouncer의 역할과 한계(분산기 아님), HNSW 블로팅과 REINDEX CONCURRENTLY

## 사례
- 대규모 서비스가 pgvector 0.8.0의 iterative index scan + `relaxed_order`를 기본으로 쓰고, 리더 분리와 `pg_prewarm`으로 읽기 부하와 콜드 캐시를 관리한 사례가 있다.

## 출처
- [pgvector README — exact/approximate search, filtering, iterative scans, memory and operations](https://github.com/pgvector/pgvector)
- [PostgreSQL Resource Consumption — shared_buffers와 OS cache](https://www.postgresql.org/docs/current/runtime-config-resource.html)
- [PostgreSQL pg_prewarm](https://www.postgresql.org/docs/current/pgprewarm.html)
- [pgvector 검색 최적화 — HNSW, halfvec, 쿼리 패턴, 운영 (YouTube)](https://www.youtube.com/watch?v=n3_LY7YFCwE&list=PLaHcMRg2hoBoFR-9MlfJP56xrcIxBInCm&index=6)

## 관련 문서
- [[pgvector|pgvector (타입, 인덱스, 테이블 설계)]]
- [[Vector-Similarity-Search|벡터 유사도 검색 (HNSW, ef_search)]]
- [[Connection-Pool|커넥션 풀 (PgBouncer)]]
- [[Read-Replica-Routing|Read Replica 라우팅]]
- [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL (MVCC, VACUUM, 데드 튜플)]]
