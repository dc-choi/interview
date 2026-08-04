---
tags: [database, mysql, operations]
status: index
category: "Database - RDBMS"
aliases: ["MySQL Operations", "MySQL 운영"]
---

# MySQL 운영

MySQL 운영은 설정값 하나를 고르는 일이 아니라 변경 안전성, 데이터 생명주기, 작업 재시도와 복구 가능성을 함께 설계하는 일이다.

## 목차

- [[MySQL-Configuration-Change-Management|MySQL 설정 변경 관리]]: scope, 동적 변경, 영속화, canary와 rollback
- [[MySQL-Compression-and-Archiving|MySQL 압축과 아카이빙]]: 압축 벤치마크, 보존 정책, 복구 훈련과 안전한 삭제
- [[MySQL-Job-Queue|MySQL Job Queue]]: `SKIP LOCKED`, lease, 멱등 처리와 재시도

## 함께 볼 문서

- [[MySQL-Architecture|MySQL 아키텍처]]
- [[MySQL-Long-Transactions-and-Batch|MySQL 장기 트랜잭션과 배치]]
- [[Replication|Replication]]
- [[MySQL-Backup|MySQL 백업과 복구]]

## 출처

- [인프런, Hong, 5천억건이 넘는 금융 데이터를 처리하는 토스 개발자에게 배우는 MySQL, 강의 소개](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=335916)
