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

## 관련 문서
- [[Index]]
- [[SQL]]
