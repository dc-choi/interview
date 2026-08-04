---
tags: [database, rdbms, hierarchy, recursive-cte, closure-table, tree]
status: done
verified_at: 2026-08-04
category: "Data & Storage - RDB"
aliases: ["Hierarchical Data Modeling", "계층형 데이터 모델링", "Closure Table"]
---

# 계층형 데이터 모델링

조직, category와 댓글처럼 깊이가 변하는 구조는 table을 레벨별로 나누기보다 **노드와 관계**를 모델링한다. 기본 선택은 adjacency list이고, 실제 조상/자손 조회가 병목일 때 recursive CTE나 closure table로 확장한다.

## 먼저 query와 변경을 정의한다

- 한 노드와 직계 자식만 읽는가, 전체 subtree를 읽는가
- 조상 경로, depth, sibling 순서와 subtree 집계가 필요한가
- 노드 추가보다 subtree 이동이 얼마나 자주 일어나는가
- 최대 깊이가 제한되는가, cycle을 어떻게 막는가
- 삭제가 subtree 전체인지, 자식을 승격하는지

고정 UI depth를 schema의 영구 제약으로 착각하지 않는다. category가 현재 3단계여도 정책이 바뀔 수 있다면 self-reference가 더 자연스럽다.

## Adjacency list

각 node가 직접 parent만 참조한다.

```sql
CREATE TABLE category (
  id BIGINT PRIMARY KEY,
  parent_id BIGINT NULL,
  name VARCHAR(200) NOT NULL,
  sort_order INT NOT NULL,
  CONSTRAINT fk_category_parent
    FOREIGN KEY (parent_id) REFERENCES category(id),
  INDEX idx_category_parent_sort (parent_id, sort_order)
);
```

직계 자식과 한 노드 이동은 단순하다. 전체 subtree는 application 반복 query보다 recursive CTE 한 번으로 가져오는 편이 network 왕복을 줄인다.

## Recursive CTE

```sql
WITH RECURSIVE subtree AS (
  SELECT id, parent_id, name, 0 AS depth
  FROM category
  WHERE id = ?

  UNION ALL

  SELECT c.id, c.parent_id, c.name, s.depth + 1
  FROM category c
  JOIN subtree s ON c.parent_id = s.id
  WHERE s.depth < ?
)
SELECT * FROM subtree;
```

- anchor member가 시작 node를 정하고 recursive member가 다음 edge를 따라간다.
- `parent_id` index가 없으면 단계마다 큰 scan이 생길 수 있다.
- 잘못된 data의 cycle과 폭주에 대비해 입력 검증, depth guard와 server recursion limit을 둔다.
- path 문자열을 만들 때 anchor가 추론한 type/length가 뒤의 path를 담을 만큼 충분한지 확인한다.
- CTE라는 문법만으로 빠름이 보장되지 않는다. subtree 크기와 실행 계획을 측정한다.

## Closure table

모든 조상과 자손 관계를 별도 table에 미리 저장한다.

```sql
CREATE TABLE category_closure (
  ancestor_id BIGINT NOT NULL,
  descendant_id BIGINT NOT NULL,
  depth INT NOT NULL,
  PRIMARY KEY (ancestor_id, descendant_id),
  INDEX idx_closure_descendant (descendant_id, ancestor_id),
  FOREIGN KEY (ancestor_id) REFERENCES category(id),
  FOREIGN KEY (descendant_id) REFERENCES category(id)
);
```

각 node는 `(self, self, 0)` row를 가진다. 새 node를 parent 아래 넣을 때 parent의 모든 조상과 새 node의 관계를 복사하고 self row를 추가한다. 이 전체 변경은 node insert와 같은 transaction에 둔다.

### 강점

- subtree와 ancestor 조회가 단순한 indexed join이다.
- depth와 경로 길이를 바로 필터링할 수 있다.
- 읽기 비중이 크고 tree가 비교적 안정적일 때 유리하다.

### 비용

- chain 형태에서는 관계 row가 `O(n²)`까지 늘 수 있다.
- subtree 이동은 기존 외부 관계 삭제와 새 조상 관계 삽입이 필요하다.
- 두 table이 어긋나면 잘못된 경로가 나온다. FK만으로 closure의 완전성을 보장하지 못한다.

closure table과 materialized path/path enumeration은 다른 모델이다. 전자는 조상-자손 pair를 row로, 후자는 node의 path를 문자열이나 배열로 저장한다.

## 무결성과 동시성

- 자기 자신을 parent로 두지 못하게 한다.
- 새 parent가 이동할 subtree 안에 있는지 검사해 cycle을 막는다.
- 동시에 같은 subtree를 이동하지 못하도록 변경 대상의 version/lock 정책을 둔다.
- node와 파생 관계를 한 transaction에서 갱신하고 실패하면 함께 rollback한다.
- 주기적으로 adjacency와 closure를 대조해 누락, 잘못된 depth와 고아 node를 탐지한다.

DB의 일반 `CHECK` 하나로 임의 깊이 cycle을 검사할 수는 없다. application command와 transaction 안의 ancestor query로 검증하고, 위험이 큰 경우 저장 procedure/trigger나 별도 consistency job을 보완한다.

## 선택표

| 상황 | 우선 선택 |
|---|---|
| 직계 자식 중심, 쓰기/이동 많음 | Adjacency list |
| 가변 깊이 subtree 조회, 규모 보통 | Adjacency list + recursive CTE |
| 조상/자손 조회가 매우 많고 이동 적음 | Closure table |
| 경로 prefix 검색과 subtree 이동이 단순해야 함 | Materialized path도 비교 |

처음부터 closure table을 도입하기보다 adjacency list의 실제 query latency와 load를 측정한 뒤 읽기 최적화로 추가하는 편이 변경 비용을 줄인다.

## TypeORM 적용

TypeORM은 adjacency list와 closure table tree entity를 지원한다. decorator가 domain 정책까지 보장하지는 않는다.

- `@TreeParent`, `@TreeChildren` relation의 cascade 범위를 명시한다.
- tree repository가 만든 SQL과 index 사용을 production 규모에서 확인한다.
- 이동 command는 authorization, cycle 검증과 transaction을 application service에 둔다.
- API 응답은 무제한 recursive serialization 대신 depth/page 제한을 둔다.

## 출처

- [MySQL 8.4, WITH Common Table Expressions](https://dev.mysql.com/doc/refman/8.4/en/with.html)
- [Oracle AI Database 26ai, Hierarchical Queries](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/Hierarchical-Queries.html)
- [TypeORM, Tree entities](https://typeorm.io/docs/entity/entities/#tree-entities)
- [Oracle 11g 강의, 계층형 query](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4669)
- [김영한 강사, 계층 구조 설계가 필요한 이유](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401954)
- [김영한 강사, 인접 리스트 모델](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401955)
- [김영한 강사, 계층 구조 조회의 어려움](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401956)
- [김영한 강사, CTE와 재귀 query 1](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401957)
- [김영한 강사, CTE와 재귀 query 2](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401958)
- [김영한 강사, Closure table 1](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401959)
- [김영한 강사, Closure table 2](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401960)
- [김영한 강사, 계층 구조 설계 정리](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401961)

## 관련 문서

- [[Foreign-Key-Integrity|외래 키와 참조 무결성]]
- [[Index|B-Tree index]]
- [[Schema-Design|Schema design]]
- [[Oracle-Sequences-and-Hierarchical-Queries|Oracle sequence와 계층형 query]]
