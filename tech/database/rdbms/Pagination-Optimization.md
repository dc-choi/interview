---
tags: [database, rdbms, pagination, performance, index, cursor]
status: done
category: "Data & Storage - RDB"
aliases: ["Pagination Optimization", "페이징 성능 개선", "No Offset", "Cursor Pagination"]
---

# 페이징 성능 최적화

전통적인 `OFFSET/LIMIT` 페이징은 **페이지가 깊어질수록 선형적으로 느려진다.** 수억 행 테이블에서는 뒤쪽 페이지 조회가 수십 초까지 걸리는 경우도 흔함. 해결책은 `OFFSET` 자체를 피하거나, `OFFSET`을 유지하되 **커버링 인덱스**로 I/O를 줄이거나, **카운트 비용을 줄이는** 세 가지 축.

## 왜 `OFFSET/LIMIT`이 느린가

`OFFSET 10000 LIMIT 20`을 실행하면 DB는:

1. 정렬 기준으로 **앞에서부터 10,020개 레코드를 읽고**
2. 앞 10,000개는 버린 뒤
3. 나머지 20개를 반환

즉 **읽었다가 버리는 레코드**가 `OFFSET`에 비례. 페이지가 깊어질수록 시간이 선형 증가.

추가로 **COUNT 쿼리 비용**도 만만치 않다. 전체 row를 스캔해야 총 개수를 알 수 있어 데이터 조회 쿼리만큼 느릴 수 있음.

## 해법 1 — No Offset (Cursor-based Pagination)

OFFSET 대신 **마지막으로 본 레코드의 ID**를 기준으로 다음 페이지를 조회.

```sql
SELECT * FROM books
WHERE id < :lastId       -- 이전 페이지의 마지막 ID
  AND category = 'IT'
ORDER BY id DESC
LIMIT 20;
```

- PK에 인덱스가 있으므로 **정확한 시작점**으로 바로 jump
- 페이지 깊이와 관계없이 **상수 시간**에 가까움 (1억 행 기준 26s → 0.08s 보고 사례)

### 장점
- **깊은 페이지에서도 빠름**
- "더 보기"·무한 스크롤 UX와 자연스럽게 맞음

### 한계
- **임의 페이지 점프 불가** — 7페이지로 바로 갈 수 없음
- **유니크한 정렬 키 필요** — 중복이 있으면 경계에서 누락·중복 위험 (보통 PK 또는 복합 키로)
- **뒤로 가기**도 별도 구현 필요 (양방향 커서)

### 복합 조건 정렬

단순 ID가 아닌 `created_at DESC, id DESC` 같은 복합 정렬이면 커서도 복합:

```sql
WHERE (created_at, id) < (:lastCreatedAt, :lastId)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

튜플 비교로 정렬 일관성 유지. QueryDSL·jOOQ·네이티브 SQL로 구현.

## 해법 2 — Covering Index (OFFSET 유지하면서 가속)

관리자 페이지처럼 **페이지 번호 UI가 필수**여서 No Offset을 못 쓸 때, `OFFSET`은 유지하되 **필요 컬럼을 모두 인덱스에 포함**시켜 본 테이블 접근을 최소화.

### 구조

쿼리를 2단계로 분리:

1. **인덱스만 스캔**해서 결과의 PK 목록 획득
2. 그 PK로 본 테이블 조인해 나머지 컬럼 가져오기

```sql
SELECT b.*
FROM books b
JOIN (
  SELECT id
  FROM books
  WHERE category = 'IT'
  ORDER BY id DESC
  LIMIT 20 OFFSET 10000
) AS ids ON b.id = ids.id;
```

서브쿼리는 **커버링 인덱스(`category, id`)** 만으로 처리되므로 데이터 블록 접근 없음. 본 테이블은 **실제 반환할 20건**만 읽음.

### 성능 차이

1억 행 기준 보고 수치:
- 일반 OFFSET: ~26초
- QueryDSL 커버링: ~0.57초
- JdbcTemplate 커버링(단일 쿼리): ~0.27초

**JPQL은 FROM 절 서브쿼리 미지원**이라 QueryDSL로는 쿼리를 2번 쏘는 형태. JdbcTemplate·네이티브 SQL이면 1번에 끝남.

### 한계
- 인덱스 설계 부담 — WHERE·ORDER BY·LIMIT/OFFSET에 쓰이는 모든 컬럼이 포함돼야
- 인덱스가 많아지면 **쓰기 성능·저장 공간 비용** 증가
- 커버링 조건이 안 맞으면 효과 소멸 → [[Index]]·[[Covering-Index]] 참고

## 해법 3 — COUNT 쿼리 최적화

전체 건수를 매번 세지 않는 3가지 접근.

### 3-A. 고정 페이지 수 (Fixed Page Count)

검색 최초에는 **실제 전체 수 대신 고정값(예: 10페이지)** 을 표시. 사용자가 페이지 버튼을 실제로 누를 때만 실제 COUNT 실행.

- 대부분의 트래픽은 **첫 검색 + 첫 페이지**이므로 COUNT 비용 대부분 제거
- Google 검색이 쓰는 패턴과 동일
- **트레이드오프**: UX상 "실제 전체 건수"를 원할 때 어긋남. 기획 합의 필요

```
검색 버튼 클릭 → COUNT 생략, 10페이지 고정
페이지 버튼 클릭 → 실제 COUNT
잘못된 페이지 요청 → 마지막 유효 페이지로 리다이렉트
```

### 3-B. Count 캐싱 (Client-Side)

첫 조회에 함께 받은 전체 건수를 **프론트가 저장** → 이후 페이지 전환 요청 시 `cachedCount` 파라미터로 서버에 전달.

```java
long total = cachedCount != null ? cachedCount : query.fetchCount();
```

- 같은 검색 결과 안에서 COUNT 재실행 회피
- 브라우저 새로고침 시 캐시 날아감 (의도된 초기화)
- **실시간 변동 데이터**에는 부적합

### 3-C. LIMIT + 1 기법

"다음 페이지가 있는지"만 알면 되는 UX(무한 스크롤)에서는 COUNT 자체를 안 쓴다.

- `LIMIT pageSize + 1` 로 하나 더 조회
- 반환이 `pageSize + 1`이면 다음 페이지 존재, 아니면 끝
- COUNT 쿼리 0회

### 3-D. 추정치 (대용량 한정)

PostgreSQL은 `pg_class.reltuples`, MySQL은 `SHOW TABLE STATUS` 같은 **옵티마이저 통계**로 대략적 건수를 얻을 수 있다. 정확성이 중요하지 않은 대시보드에 적합.

## 선택 가이드

| 요구사항 | 권장 조합 |
|---|---|
| 무한 스크롤·더 보기 | No Offset + LIMIT+1 |
| 관리자 페이지·번호 UI 필수, 데이터 큼 | Covering Index + Count 캐싱 |
| 검색 결과 화면, 대부분 1페이지만 봄 | OFFSET + **고정 페이지 수** |
| 실시간 카운트 필수 | 인덱스 튜닝 + Redis 실시간 집계 |

## 흔한 실수

- **OFFSET 페이징을 깊은 페이지에서 그대로 운영** → 수십 초 지연, DB CPU 포화
- **COUNT 쿼리를 매 요청 실행** → 데이터 조회 쿼리보다 느릴 수도
- **No Offset에 유니크 정렬 키 누락** → 중복 레코드에서 경계 오류
- **Covering Index를 위해 컬럼 10개 포함** → 인덱스 비대화, 쓰기 성능 붕괴
- **JPQL의 FROM 서브쿼리 제한 무시** → QueryDSL 2번 쿼리·JdbcTemplate 전환 필요한 상황 못 알아봄
- **페이지 번호를 유저가 직접 입력하는 API** 에 커서 페이징 적용 → UX 충돌

## 면접 체크포인트

- `OFFSET/LIMIT`이 깊은 페이지에서 **느려지는 근본 원인**
- **No Offset(Cursor)** 패턴의 구조와 한계 (임의 점프 불가·유니크 키 필요)
- **Covering Index** 2단계 쿼리 구조 (인덱스 스캔 → PK로 본 테이블 접근)
- **COUNT 쿼리 비용**을 줄이는 3~4가지 전략 (고정·캐싱·LIMIT+1·추정치)
- 관리자 페이지처럼 **번호 UI가 필수**인 경우의 Covering Index 필요성
- JPQL이 FROM 서브쿼리를 지원하지 않아 생기는 제약

## 출처
- [jojoldu — 1억건 대용량 페이징 성능 개선 1편 (No Offset)](https://jojoldu.tistory.com/528)
- [jojoldu — 2편 (Covering Index)](https://jojoldu.tistory.com/529)
- [jojoldu — 3편 (Count 캐싱)](https://jojoldu.tistory.com/530)
- [jojoldu — 4편 (고정 페이지 수)](https://jojoldu.tistory.com/531)

## 관련 문서
- [[Index|DB Index]]
- [[Covering-Index|Covering Index]]
- [[Execution-Plan|실행 계획]]
- [[API-Conventions|API Conventions (페이징 파라미터)]]
- [[JPA-Persistence-Context|JPA 영속성 컨텍스트]]
