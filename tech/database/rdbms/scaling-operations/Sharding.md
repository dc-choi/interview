---
tags: [database, rdbms]
status: done
category: "Data & Storage - RDB"
aliases: ["Sharding"]
---

# Sharding

Row 단위로 나눠서 테이블을 저장하는 방법이다. 데이터를 각자 다른 데이터베이스 서버에 저장한다.

```
1. 인덱스의 사이즈가 너무 큰 경우에 나누면 데이터베이스 접근시 시간이 줄어듬
2. 지역별로 나누는 경우 데이터베이스 분산이 되어서 더 빠른 처리 속도를 가진다.
3. 샤딩은 최후의 수단으로 다른 방법을 최대한 찾아보고 그 방법이 다 사용할 수 없는 경우 사용해야 한다. 프로그램의 복잡도를 높이고 한 곳에서 데이터를 사용하지 못하게 된다.
```

## 키 → 서버 매핑 방식

어느 키가 어느 서버에 있는지 정하는 규칙에 따라 확장성과 부하 분산이 갈린다.

- **모듈로 해싱** (`hash(key) % 서버수`): 단순하지만 서버 수가 바뀌면 거의 모든 키의 위치가 바뀌어 대량 재배치가 일어난다. 서버 한 대만 추가해도 캐시 미스가 폭주하므로 증설, 장애에 취약.
- **Range Sharding** (ID 범위로 분할, 예: 1~10000은 1번 서버, 10001~20000은 2번 서버): 이해와 조회가 쉽다. 단 특정 구간에 데이터, 트래픽이 몰리면(예: 이벤트 기간 가입자가 특정 ID 구간에 집중) 그 서버만 과부하되는 쏠림이 생긴다. 분포와 트래픽 패턴을 모르면 위험.
- **Consistent Hashing**: 노드 추가, 제거 시 평균 1/N만 재배치돼 증설과 장애 복구에 유리하다. 가상 노드로 분포를 균등화한다 → [[Consistent-Hashing]].
- **고정 슬롯**: Redis Cluster의 16384 슬롯처럼 슬롯을 노드에 명시 할당해 운영자가 분배를 제어 → [[Redis-Cluster-Sharding]].

## 출처
- [우아한테크 — Redis 운영, 자료구조, 분산 설계](https://www.youtube.com/watch?v=mPB2CZiAkKM)

## 관련 문서
- [[Clustering|Cluster]]
- [[Replication]]
- [[Normalization|정규화]]
- [[Consistent-Hashing|Consistent Hashing]]
- [[Redis-Cluster-Sharding|Redis Cluster, Hash Slot]]
