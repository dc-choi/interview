---
tags: [database, rdbms]
status: done
category: "Data & Storage - RDB"
aliases: ["Replication"]
---

# Replication

데이터베이스 구조의 복제본을 가진다는 것.

## 특징

1. 데이터가 여러 곳에 복제되므로 한 DB에 문제가 생겨도 다른 DB에 같은 데이터가 저장되어 있어 데이터를 잃지 않을 수 있다.
2. 여러 곳에 데이터베이스를 두면 지연을 줄일 수 있다.
3. **Replication Lag**: 다른 복제본으로 복사되는 시간. 복사 시간이 길어지면 데이터 일관성이 달라질 수 있다.

## 동기 vs 비동기 복제

- **Synchronous replication**: 클라이언트가 쓰기를 요청하면 모든 복제본에 변경된 데이터를 적용한 후에 쓰기 성공 메시지를 보낸다. 데이터 일관성은 지킬 수 있으나 모든 복제본에 쓰기를 해야 해 시간이 오래 걸리고, 복제본 하나라도 쓰기에 실패하면 쓰기 자체가 실패한다.
- **Asynchronous replication**: 클라이언트가 쓰기를 요청하면 원본에 적용한 후 바로 쓰기 성공 메시지를 보내고, 그 뒤에 변경 메시지를 다른 복제본으로 보내 적용한다. 쓰기는 빨라지지만 일부 복제본이 실패하면 데이터 일관성이 깨질 수 있다.

## 참고
- [AWS RDS Read Replicas](https://aws.amazon.com/ko/rds/features/read-replicas/)

## 관련 문서
- [[Clustering|Cluster]]
- [[Sharding]]
