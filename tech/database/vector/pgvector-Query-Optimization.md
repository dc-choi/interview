---
tags: [database, postgresql, pgvector, hnsw, query-optimization, operations, pgbouncer]
status: done
category: "데이터&저장소(Data&Storage)"
aliases: ["pgvector Query Optimization", "pgvector 쿼리 최적화", "ef_search LIMIT", "iterative index scan", "relaxed order", "pgvector 운영"]
---

# pgvector 쿼리 최적화와 운영

pgvector의 검색은 "필터 후 검색"이 아니라 대체로 **"검색 후 필터"**로 동작한다. 이 동작 모델을 모르면 `LIMIT`을 줘도 결과가 모자라거나, `WHERE`가 먹지 않는 것처럼 보인다. 쿼리 패턴, `ef_search`/`LIMIT` 상호작용, 0.8.0의 iterative scan, 서버 메모리와 리인덱싱까지 함께 설계해야 안정적으로 운영된다. 타입/인덱스/테이블 설계는 [[pgvector|pgvector]] 참고.

## 쿼리 패턴 — 참조 벡터 방어

벡터 검색 쿼리는 두 형태다.

1. 비교할 벡터 값을 쿼리에 **직접** 넣는다.
2. 다른 테이블에서 특정 ID의 임베딩을 가져와 그 값과 비교한다.

2번에서 **비교 대상 벡터가 없을 때**를 반드시 방어해야 한다. `EXISTS` 조건 없이 작성하면 참조 벡터가 없어도 검색이 실행돼 결과가 반환되고, **거리 값이 `NULL`**이 될 수 있다. 참조 벡터가 없으면 검색 자체가 실행되지 않도록 가드를 넣는다.

## ef_search와 LIMIT의 함정 — "검색 후 필터"

HNSW 검색의 실행 순서:

```
① ef_search 만큼 후보 수집  →  ② WHERE 필터 적용  →  ③ LIMIT 만큼 반환
```

- `LIMIT 100`을 줘도 `ef_search=40`이면 후보가 40개까지만 나올 수 있다.
- 여기에 `WHERE` 필터가 붙으면 최종 결과는 **40보다 더 줄어든다.**
- 곧 `WHERE`로 먼저 좁히고 검색하는 게 아니라, **검색으로 후보를 뽑은 뒤 필터링**한다. 필터 선택도가 낮으면 원하는 개수를 못 채운다.

## iterative index scan (pgvector 0.8.0+)

0.8.0부터 **iterative index scan**이 도입됐다. `WHERE`와 `LIMIT`을 만족할 때까지 **HNSW 인덱스를 추가로 탐색**한다.

- 이전: 결과가 부족하면 애플리케이션이 `ef_search`를 키워 **재시도**해야 했다.
- 이후: **DB 내부에서 점진적으로** 후보를 더 찾으므로 운영 부담이 준다.
- 탐색이 무한정 늘지는 않는다 — 탐색 노드 수와 메모리 사용량에 **상한**이 있고, 기본값만으로도 대개 출발점으로 충분하다.

가능하면 0.8.0 이상에서 iterative index scan을 쓰는 것이 좋다.

### relaxed order vs strict order

| 모드 | 거리 순서 | 특성 | 적합 |
|------|-----------|------|------|
| `relaxed_order` | 약간 어긋날 수 있음 | 더 많은 결과를 빠르게 확보 | 유사 후보 충분 확보가 우선일 때 |
| `strict_order` | 엄격히 보장 | 어긋나는 후보를 버려 **결과 수↓, 성능↓** | 정확한 순서가 중요할 때 |

실무에서는 보통 `relaxed_order`를 기본으로 둔다(후보 확보 우선).

## LIMIT은 필요한 만큼만

- **0.8.0 미만**: `WHERE`가 있으면 필터링 손실을 감안해 `LIMIT`을 **넉넉히** 잡는다(검색 후 필터로 깎이므로).
- **0.8.0 이상 + iterative scan**: 원하는 결과 수만큼만 `LIMIT`을 잡으면 된다.
- 단 `LIMIT`이 곧 탐색량 → **불필요하게 크게 잡으면 성능이 나빠진다.**
- 벡터 DB에서 가져온 뒤 외부 DB에서 재필터링한다면, 그 **필터링 비율을 감안해 약간 여유 있게** 가져온다.

## 서버 용량 — 인덱스가 메모리에 올라가야 한다

HNSW 성능은 **인덱스가 버퍼 캐시(shared_buffers)에 올라와 있는지**에 크게 좌우된다. 쿼리 하나가 많은 인덱스 페이지를 읽기 때문에, 디스크 I/O가 잦으면 응답 시간이 급격히 나빠진다.

- 최소한 **주요 벡터 인덱스가 `shared_buffers`에 올라갈 수준**의 인스턴스를 선택한다.
- 읽기 트래픽이 많으면 **리더 인스턴스로 읽기 분산**([[Read-Replica-Routing|Read Replica 라우팅]]).
- 새 리더 추가 시 **`pg_prewarm`으로 인덱스를 미리 캐시에 적재**해 초기 지연(콜드 캐시)을 줄인다.

## 운영 — PgBouncer, 리인덱싱

- **PgBouncer**: PostgreSQL은 커넥션마다 프로세스를 쓰므로 커넥션이 많으면 메모리가 커진다. **PgBouncer** 같은 커넥션 풀러로 완화([[Connection-Pool|커넥션 풀]]). 단 PgBouncer는 **트래픽 분산기가 아니다** — 읽기 분산은 별도 구조로 설계.
- **리인덱싱(블로팅)**: HNSW는 블로팅에 민감하다. 대량 삭제 후 VACUUM으로 데드 튜플은 정리돼도 **인덱스 파일 크기는 줄지 않는다.** 필요하면 서비스 중 무중단 재색인:

```sql
REINDEX INDEX CONCURRENTLY index_name;
```

HNSW는 읽는 페이지가 많아 **인덱스 블로팅이 성능에 더 크게** 작용한다.

## 면접 체크포인트

- pgvector가 "검색 후 필터"로 동작하는 이유와 ef_search/WHERE/LIMIT 실행 순서
- `LIMIT 100`인데 결과가 모자라는 현상의 원인(ef_search 상한 + 필터 손실)
- iterative index scan(0.8.0)이 앱 레벨 ef_search 재시도를 대체하는 방식
- relaxed_order vs strict_order의 트레이드오프
- HNSW가 shared_buffers에 올라가야 하는 이유, pg_prewarm으로 콜드 캐시 완화
- PgBouncer의 역할과 한계(분산기 아님), HNSW 블로팅과 REINDEX CONCURRENTLY

## 사례
- 대규모 서비스가 pgvector 0.8.0의 iterative index scan + `relaxed_order`를 기본으로 쓰고, 리더 분리와 `pg_prewarm`으로 읽기 부하와 콜드 캐시를 관리한 사례가 있다.

## 출처
- [pgvector 검색 최적화 — HNSW, halfvec, 쿼리 패턴, 운영 (YouTube)](https://www.youtube.com/watch?v=n3_LY7YFCwE&list=PLaHcMRg2hoBoFR-9MlfJP56xrcIxBInCm&index=6)

## 관련 문서
- [[pgvector|pgvector (타입, 인덱스, 테이블 설계)]]
- [[Vector-Similarity-Search|벡터 유사도 검색 (HNSW, ef_search)]]
- [[Connection-Pool|커넥션 풀 (PgBouncer)]]
- [[Read-Replica-Routing|Read Replica 라우팅]]
- [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL (MVCC, VACUUM, 데드 튜플)]]
