---
tags: [database, rdbms, mysql, migration, postgresql, comparison]
status: index
category: "Database - RDBMS"
aliases: ["MySQL Migration and Comparison", "MySQL 마이그레이션과 제품 비교"]
---

# MySQL 마이그레이션과 제품 비교

운영 중인 MySQL의 문자셋을 바꾸거나 다른 엔진으로 옮길 때 필요한 절차와, 그 판단의 근거가 되는 엔진 비교를 모은다. 이관의 실제 비용은 데이터 전송이 아니라 스키마, 쿼리와 앱 코드의 차이에서 나온다.

- [[MySQL-Charset-Migration|utf8mb4 마이그레이션]]: 인덱스 키 길이 767/3072, collation 충돌, 클론 리허설, latin1 복구
- [[MySQL-to-PostgreSQL-Migration|MySQL → PostgreSQL 이기종 마이그레이션]]: 타입 매핑, 함수 재작성, DMS Full Load와 CDC, 컷오버와 롤백
- [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL]]: 프로세스 모델, MVCC, Hash Join, Partial Index, Online DDL, 선택 가이드와 Aurora 이관 사례

## 함께 볼 문서

- [[mysql|MySQL]]
