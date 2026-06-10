---
tags: [database, rdbms]
status: done
category: "Data & Storage - RDB"
aliases: ["실행계획", "Execution Plan"]
---

# 실행계획

## select_type — SELECT 문의 유형

- **SIMPLE**: 단순 쿼리문
- **PRIMARY**: 서브쿼리를 감싸는 외부 쿼리, UNION이 포함될 경우 첫 번째 쿼리문
- **SUBQUERY**: 독립적으로 수행되는 서브쿼리 (SELECT, WHERE에 추가된 서브쿼리)
- **DERIVED**: FROM 절에 작성된 서브쿼리 (UNION, UNION ALL로 합쳐진 SELECT 문)
- **DEPENDENT SUBQUERY**: 서브쿼리가 바깥쪽 SELECT 쿼리에 정의된 컬럼을 사용
- **DEPENDENT UNION**: 외부에 정의된 컬럼을 UNION으로 결합된 쿼리에서 사용
- **MATERIALIZED**: IN 구문의 서브쿼리를 임시 테이블로 생성한 뒤 조인을 수행
- **UNCACHEABLE SUBQUERY**: RAND(), UUID() 같이 조회마다 결과가 달라지는 경우

## type — 테이블 접근 방식

- **SYSTEM**: 테이블에 데이터가 없거나 한 개만 있는 경우
- **CONST**: 조회되는 데이터가 단 1건일 때
- **EQ_REF**: 조인이 수행될 때 테이블의 데이터에 PK 혹은 고유 인덱스로 딱 1건의 데이터 조회
- **REF**: EQ_REF와 비슷하지만 데이터가 2건 이상일 경우
- **INDEX**: 인덱스 풀 스캔
- **RANGE**: 인덱스 레인지 스캔
- **ALL**: 테이블 풀 스캔

## 기타 필드

- **key**: 옵티마이저가 실제로 선택한 인덱스
- **key_len**: 실제로 사용할 인덱스의 길이
- **ref**: key 안의 인덱스와 비교하는 컬럼
- **rows**: SQL문을 수행하기 위해 접근하는 데이터의 모든 행 수

## extra

- **Using index**: 물리적인 데이터 파일을 읽지 않고 인덱스만 읽어서 처리 (커버링 인덱스)
- **Using where**: WHERE 절로 필터링
- **Distinct**: 중복 제거
- **Using temporary**: 데이터의 중간 결과를 저장하고자 임시 테이블을 생성. 보통 DISTINCT, GROUP BY, ORDER BY 구문이 포함된 경우
- **Using filesort**: 정렬 발생

실행계획은 서술된 순서대로 처리되는 것이 이상적임.

## EXPLAIN · ANALYZE · EXPLAIN ANALYZE 차이

DB 튜닝의 첫 단계는 세 명령어를 정확히 구분해서 쓰는 것.

| 명령 | 동작 | 비용 | 용도 |
|---|---|---|---|
| `EXPLAIN` | 쿼리 실행 없이 옵티마이저의 **예상 실행 계획**만 표시 | 매우 가벼움 | 평소 튜닝의 기본 |
| `ANALYZE TABLE` | 테이블·인덱스의 **통계 정보 갱신**. 옵티마이저가 더 정확한 계획을 세우도록 돕는 보조 작업 | 중간 (잠금 가능) | 데이터 분포가 크게 바뀐 뒤 |
| `EXPLAIN ANALYZE` | **쿼리를 실제로 실행한 뒤** 예상치 vs 실측치 비교 (MySQL 8.0.18+) | 실제 쿼리 비용 | 예상-실측 괴리 디버깅 |

운영 환경에서 `EXPLAIN ANALYZE`는 진짜로 쿼리를 돌리므로 **읽기 전용 슬레이브에서 실행**하거나 트래픽 낮은 시간대에만.

## 단일 테이블 컬럼으로 조인 전 필터링

여러 테이블을 조인할 때, 필터 조건을 **조인된 테이블의 컬럼이 아니라 메인 테이블의 동등한 컬럼**으로 옮기면 큰 폭의 성능 향상이 가능하다.

비효율: `WHERE course."id" IN (?)`  — 조인 결과에서 필터링
효율: `WHERE review."course_id" IN (?)` — 조인 전에 필터링

같은 의미인데 후자는 옵티마이저가 **메인 테이블에서 먼저 행을 줄인 뒤** 조인을 수행 → 조인 비용·메모리 사용 모두 감소. 실제 사례에서 189ms → 18.5ms (약 10배) 개선.

핵심 원리: **조인 술어를 분석해서 동등한 필터 조건을 메인 테이블에 적용**할 수 있는지 항상 검토. 특히 다중 조인·대용량 데이터셋에서 효과가 크다.

## 출처
- [요즘IT — 쿼리 튜닝 기초 (EXPLAIN / ANALYZE)](https://yozm.wishket.com/magazine/detail/2260/)
- [jojoldu — 단일 테이블 컬럼을 최대한 활용하기](https://jojoldu.tistory.com/788)

## 관련 문서
- [[Index]]
- [[SQL]]
- [[Covering-Index|커버링 인덱스]]
