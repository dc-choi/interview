---
tags: [database, rdbms, mysql, schema, collation]
status: index
category: "Database - RDBMS"
aliases: ["MySQL Columns", "MySQL 컬럼과 타입"]
---

# MySQL 컬럼과 타입

컬럼 타입 선택과 문자 비교 규칙이 저장 비용, 인덱스와 마이그레이션에 미치는 영향을 다루는 문서를 모은다.

- [[MySQL-String-Types|MySQL 문자열 타입 선택]]: CHAR, VARCHAR, TEXT의 저장, 행 크기, 인덱스와 조회 비용
- [[MySQL-Numeric-and-Temporal-Types|MySQL 숫자와 날짜 시간 타입]]: 정수 범위와 UNSIGNED, AUTO_INCREMENT 소진과 감시, DATETIME과 TIMESTAMP의 범위와 2038년 상한
- [[MySQL-Collation|MySQL Collation]]: utf8mb4, 비교 규칙과 가중치, 한글 자모 함정, coercibility, 인덱스와 마이그레이션
- [[MySQL-Generated-Columns-and-Functional-Indexes|MySQL 생성 컬럼과 함수 인덱스]]: VIRTUAL, STORED, 표현식 인덱스, JSON 경로와 multi-valued index, 변경 제한
- [[MySQL-JSON-Functions|MySQL JSON 함수]]: 값 추출과 타입, JSON 비교 규칙, 포함 검색, 수정 함수의 키 존재 의미, JSON_TABLE

## 함께 볼 문서

- [[MySQL-Fundamentals|MySQL 기본기]]
