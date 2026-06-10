---
tags: [database, rdbms]
status: done
category: "Data & Storage - RDB"
aliases: ["Cluster", "Clustering"]
---

# Cluster

DB 서버를 여러 대 두는 방법이다.

## 특징

1. 데이터베이스 서버 간의 동기화를 통해 항상 일관성 있는 데이터를 얻을 수 있다.
2. 로드밸런싱을 통해 각 서버에서 트래픽을 나눠 처리할 수 있다.
3. HA(High Availability)를 통해 접근이 거의 항상 가능하다.
4. 여러 서버가 한 개의 DB 스토리지를 공유하므로 DB 스토리지에서 병목이 생길 수 있다.

## 관련 문서
- [[Replication]]
- [[Sharding]]
