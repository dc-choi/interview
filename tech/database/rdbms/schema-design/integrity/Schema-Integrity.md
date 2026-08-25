---
tags: [database, rdbms, integrity, constraint, primary-key, foreign-key]
status: index
category: "Data & Storage - RDB"
aliases: ["Schema Integrity", "키와 무결성"]
---

# 키와 무결성

잘못된 데이터가 DB에 들어오지 못하게 막는 키 설계와 제약, 그 방어선을 어디에 둘지의 판단을 모은다.

- [[Primary-Key-Strategy|PK 생성 전략]]: AUTO_INCREMENT, UUID v4와 v7, ULID, Snowflake, 클러스터링 인덱스 영향
- [[Foreign-Key-Integrity|외래 키와 참조 무결성]]: 보장 범위, referential action, 앱 관리 대안
- [[Data-Integrity-Constraints|데이터 무결성 제약]]: NOT NULL, UNIQUE, CHECK, FK, cross-row invariant, Enum vs 참조 테이블
- [[Business-Logic-App-vs-DB|비즈니스 로직 위치]]: App vs DB 로직 배치, 확장성 비대칭, Stored Procedure는 측정된 병목에 한정

## 함께 볼 문서

- [[Schema-Design|스키마 설계]]
