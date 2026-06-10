---
tags: [database, rdbms, mysql, index, performance]
status: done
category: "Data & Storage - RDB"
aliases: ["Covering Index", "커버링 인덱스"]
---

# 커버링 인덱스 (Covering Index)

쿼리가 필요로 하는 **모든 컬럼이 인덱스에 포함**되어, 실제 데이터 페이지에 접근하지 않고 인덱스만으로 결과를 반환하는 패턴. 랜덤 I/O를 제거해 SELECT 성능을 수 배~수십 배 끌어올린다.

## 왜 빠른가

InnoDB Non-Clustered Index의 리프 노드는 **(인덱스 컬럼 값, PK 값)**을 저장한다. 일반적인 인덱스 활용 시:
1. 인덱스에서 조건을 만족하는 행을 찾고 PK 값을 얻음
2. PK로 클러스터드 인덱스(실제 데이터)에 가서 나머지 컬럼 조회 → **랜덤 I/O 발생**

커버링 인덱스는 **2단계를 생략**한다. 인덱스에 이미 SELECT가 요구하는 모든 컬럼이 있으므로 디스크 데이터 페이지를 읽을 필요 없음.

EXPLAIN의 `Extra`에 **`Using index`**가 표시되면 커버링 인덱스가 동작한 것.

## 적용 조건

쿼리의 **SELECT, WHERE, ORDER BY, GROUP BY**에 등장하는 모든 컬럼이 단일 인덱스에 포함되어야 한다.

```sql
-- 인덱스: (status, created_at, user_id)
-- 커버링 동작
SELECT user_id FROM orders
WHERE status = 'PAID'
ORDER BY created_at DESC
LIMIT 100;

-- 커버링 안 됨 (amount 컬럼이 인덱스에 없음)
SELECT user_id, amount FROM orders
WHERE status = 'PAID'
ORDER BY created_at DESC;
```

## 성능 사례

- **WHERE + GROUP BY** — 일반 인덱스 5.683초 → 커버링 인덱스 1.6초 (3.5배)
- **WHERE + ORDER BY + LIMIT** — 200만 행 기준 3.49초 → 1.09초 (3배)
- **WHERE LIKE 조건** — 동등 조건과 달리 LIKE는 인덱스 탐색이 비효율 → 커버링 인덱스 효과 더 크게 체감

## 자주 쓰는 패턴

### Look-up 컬럼 추가
페이지네이션·목록 화면에서 자주 쓰이는 SELECT 컬럼을 인덱스 끝에 추가.

```sql
CREATE INDEX idx_status_created_user ON orders(status, created_at, user_id);
```

ORDER BY가 인덱스 정렬과 일치하면 추가 정렬(filesort) 없이 바로 응답.

### MySQL 8.0+ Descending Index
이전엔 `ORDER BY ... DESC` 인덱스가 실질적으로 동작하지 않았다 (인덱스를 거꾸로 스캔). MySQL 8.0+에서 `INDEX (created_at DESC)`로 명시 가능.

### NoSQL 스타일 "Index-Only" 쿼리
PK 외에 자주 조회하는 컬럼 한두 개만 가진 작은 테이블이라면, 커버링 인덱스를 의도적으로 설계해 디스크 접근을 거의 0으로.

## 함정과 트레이드오프

### 인덱스 비대화
컬럼을 많이 포함시키면 인덱스 크기가 커지고:
- 인덱스 페이지가 메모리(buffer pool)에 덜 들어감 → 효율 저하
- INSERT/UPDATE/DELETE 비용 증가 (인덱스 갱신)
- 디스크 사용량 증가

권장: **자주 함께 조회되는 3~5개 컬럼**까지만. 무작정 SELECT 컬럼을 다 넣지 말 것.

### LIKE 조건의 한계
`WHERE name LIKE 'foo%'`는 인덱스 활용 가능하지만, `LIKE '%foo'` 또는 `LIKE '%foo%'`는 인덱스 무력화. 커버링 인덱스가 있어도 풀스캔 → `Using temporary` + `Using filesort`.

### ORDER BY 인덱스 미활용 시 재앙
WHERE는 인덱스를 타지만 ORDER BY가 인덱스와 다르게 정렬되면 → 결과를 메모리/디스크에 쌓고 정렬 → **30분 timeout 사례**도 보고됨. ORDER BY 컬럼 순서까지 인덱스에 맞춰야 함.

### MySQL 5.x DESC Index
MySQL 8.0 이전엔 `ORDER BY DESC` 시 인덱스를 역순 스캔하지만 진짜 DESC 인덱스는 없었음. 8.0부터 진짜 DESC 인덱스 가능 → ASC/DESC 혼합 정렬 시 큰 차이.

## 설계 가이드

1. **EXPLAIN으로 시작** — `Using index` 안 보이면 커버링 안 됨
2. **WHERE → ORDER BY → SELECT 순으로 컬럼 배치** 검토
3. **인덱스 한 개당 컬럼 5개 이내** 권장
4. **쓰기 트래픽이 큰 테이블**에선 추가 인덱스 비용 감안
5. **PK는 자동 포함**되므로 인덱스 끝에 명시 불필요 (InnoDB)

## 면접 체크포인트

- 커버링 인덱스가 빠른 이유 (랜덤 I/O 제거)
- EXPLAIN에서 어떻게 확인 (`Using index`)
- 일반 인덱스의 리프 노드에 무엇이 저장되는가 (PK)
- 커버링 인덱스의 단점·트레이드오프
- LIKE·ORDER BY 인덱스 미활용 시 어떤 일이 일어나는가

## 출처
- [jojoldu — 커버링 인덱스](https://jojoldu.tistory.com/476)
- [jojoldu — 커버링 인덱스 심화](https://jojoldu.tistory.com/481)

## 관련 문서
- [[Index|Index — 클러스터링·복합 인덱스]]
- [[Execution-Plan|Execution Plan — Using index]]
- [[B-Tree-Index-Depth|B-Tree 인덱스 깊이]]
