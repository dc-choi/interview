---
tags: [database, rdbms, migration, history, lifecycle]
status: index
category: "Data & Storage - RDB"
aliases: ["Schema Lifecycle", "스키마 수명주기와 이력"]
---

# 스키마 수명주기와 이력

스키마와 데이터가 시간에 따라 변할 때의 버전 관리, 안전한 변경과 이력 보존을 모은다.

- [[Schema-Versioning|스키마 버전 관리]]: 마이그레이션 히스토리 정본, 드리프트, roll-forward
- [[Schema-Migration-Large-Table|대용량 테이블 스키마 변경]]: INSTANT/INPLACE/COPY, pt-osc, gh-ost
- [[Soft-Delete-and-Data-Lifecycle|소프트 삭제와 데이터 생명주기]]: deleted_at, 유니크 제약, purge와 보존 정책
- [[Operational-Data-History-and-Audit|운영 데이터 이력과 감사]]: snapshot, temporal history, audit log
- [[SCD-Type2|SCD Type 2]]: 차원 데이터 이력 관리, 변경 이력 행 적재

## 함께 볼 문서

- [[Schema-Design|스키마 설계]]
