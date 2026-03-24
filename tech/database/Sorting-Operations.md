---
tags: [database, mysql, sorting, performance]
status: seminar
category: "데이터&저장소(Data&Storage)"
aliases: ["정렬이 발생하는 연산"]
---

# 정렬이발생하는5가지연산

DB에서 정렬은 CPU와 메모리를 많이 소모하는 비용이 큰 작업이다. 다음 5가지 연산에서 내부적으로 정렬이 발생할 수 있다.

## ORDER BY
- 명시적으로 결과를 정렬하는 연산
- MySQL은 적절한 인덱스가 있으면 인덱스 순서를 그대로 활용하여 정렬을 생략함
- 인덱스가 없으면 `filesort` 알고리즘을 사용함
  - **single-pass**: 필요한 모든 컬럼을 sort buffer에 올려 한 번에 정렬. I/O가 적어 일반적으로 사용됨
  - **two-pass**: rowid만 정렬한 뒤 다시 테이블을 읽어 데이터를 가져옴. 행 크기가 클 때 사용됨
  - MySQL 8.0.20에서 `max_length_for_sort_data`가 deprecated되어, 옵티마이저가 자동으로 알고리즘을 선택함
- `sort_buffer_size`를 초과하면 디스크 임시파일을 사용하므로 성능이 급격히 저하됨
- EXPLAIN에서 `Using filesort`가 표시되면 정렬이 발생하고 있다는 의미

## DISTINCT
- 내부적으로 GROUP BY와 동일하게 처리됨 (GROUP BY의 최적화가 그대로 적용)
- 중복 제거를 위해 정렬 또는 해싱을 사용함. distinct 값이 적으면 해싱이, 많으면 정렬이 선택됨
- DISTINCT 대상 컬럼이 인덱스에 포함되어 있으면 인덱스 스캔으로 중복 제거 가능
- 그렇지 않으면 임시 테이블 생성 + 정렬이 발생함
- EXPLAIN에서 `Using temporary`, `Using filesort`가 함께 나타날 수 있음
- SELECT하는 컬럼 수가 많을수록 정렬 비용이 증가하므로 필요한 컬럼만 조회할 것

## UNION
- `UNION`은 두 결과를 합친 뒤 중복을 제거하므로 정렬 또는 해싱이 발생함
- 내부적으로 임시 테이블을 생성하여 중복 제거를 수행함 (정렬 기반 또는 해시 기반 중 옵티마이저가 선택)
- `UNION ALL`은 중복 제거를 하지 않으므로 정렬이 발생하지 않음 (MySQL 5.7.3+부터는 임시 테이블도 생성하지 않음)
- 중복이 없다는 것이 확실하면 `UNION ALL`을 사용하는 것이 성능상 유리함

## JOIN
- Oracle에는 **Sort-Merge Join**이 있어 양쪽 테이블을 정렬 후 병합하므로 정렬이 발생하지만, MySQL에는 이 방식이 없음
- MySQL의 기본 조인 방식은 **Nested Loop Join(NLJ)** 으로, 인덱스를 활용한 반복 탐색이므로 정렬이 발생하지 않음
- MySQL 8.0.18부터 **Hash Join**을 지원하며, 8.0.20부터는 기존 Block Nested Loop(BNL)를 완전히 대체함 (정렬 불필요)
- 즉, MySQL에서는 JOIN 자체가 정렬을 유발하지 않음. 단, JOIN 결과에 ORDER BY가 붙으면 조인 후 filesort가 추가로 발생함
- 조인 컬럼에 인덱스가 있는지가 성능의 핵심

## GROUP BY
- 그룹핑을 위해 내부적으로 정렬 또는 해싱이 필요함
- **MySQL 8.0 이전**: GROUP BY가 암묵적으로 정렬까지 수행함
- **MySQL 8.0**: 암묵적 정렬 제거, **8.0.13**: `GROUP BY ASC/DESC` 문법까지 완전히 제거. 정렬이 필요하면 반드시 ORDER BY를 명시해야 함
- 인덱스를 활용한 최적화 방식:
  - **Loose Index Scan**: 인덱스의 일부만 읽어서 그룹핑 (가장 효율적)
  - **Tight Index Scan**: 인덱스를 전체 스캔하여 그룹핑
- 인덱스가 없으면 임시 테이블을 생성하여 처리함

## 정렬비용을줄이는방법
1. **인덱스 설계**: ORDER BY, GROUP BY, DISTINCT 대상 컬럼에 인덱스를 설정
2. **UNION ALL 활용**: 중복이 없다면 UNION 대신 UNION ALL 사용
3. **필요한 컬럼만 SELECT**: 정렬 대상 데이터 크기를 줄임
4. **sort_buffer_size 튜닝**: 디스크 임시파일 사용을 줄임 (무조건 크게 잡으면 메모리 낭비)
5. **EXPLAIN 확인**: `Using filesort`, `Using temporary`가 나타나는 쿼리를 식별하여 개선
