---
tags: [aws, elasticache, redis, memcached, valkey, serverless]
status: done
category: "Infrastructure - AWS"
aliases: ["ElastiCache 엔진 선택", "ElastiCache 클러스터 구조", "ElastiCache Serverless"]
verified_at: 2026-07-21
---

# Amazon ElastiCache — 엔진 선택, 운영 기능과 클러스터 구조

## 왜 필요한가

- **DB 부담 완화**: 복잡한 조인, 집계 결과를 캐시해 재계산 제거
- **지연 절감**: 메모리 기반 조회로 반복적인 데이터베이스 접근을 줄인다. 실제 지연과 사용자 영향은 데이터 크기, 네트워크, 명령, 워크로드에서 측정한다.
- **스파이크 흡수, 글로벌 상태 공유**: 순간 트래픽 증가 시 DB 폭주를 막는 버퍼가 되고, 여러 앱 서버가 세션, 락, 카운터를 공유

## 엔진 선택 — node-based Redis/Valkey vs Memcached

| 항목 | Redis / Valkey | Memcached |
|---|---|---|
| 자료구조 | String, Hash, List, Set, Sorted Set, Stream, Bitmap | String만 |
| 백업 | node-based 배포에서 RDB 기반 백업과 스냅샷 지원 | node-based Memcached는 미지원 |
| 복제, 클러스터 | 공식 지원 | 제한적 |
| Pub/Sub | 지원 | 미지원 |
| 분산락 | SETNX, Redlock | 미지원 |
| 사용 패턴 | 다양한 자료구조, 복잡한 로직 | 단순 KV 캐시, 멀티스레드 고속 |

자료구조, 복제, 장애 조치가 필요하면 **Valkey 또는 Redis OSS**를 검토한다. Memcached는 단순하고 폐기 가능한 KV 캐시에 적합하다. 단, ElastiCache Serverless for Memcached는 snapshot과 restore를 지원하므로 node-based Memcached의 백업 미지원 특성을 전체 Memcached 배포에 일반화하면 안 된다.

**Valkey**는 Redis OSS 7.2에서 갈라져 Linux Foundation이 관리하는 오픈소스 프로젝트다. Redis OSS 프로토콜과 명령 호환성이 높지만, 마이그레이션 전에는 사용하는 엔진 버전과 명령, 클라이언트 호환성을 확인한다.

## ElastiCache 운영 기능

| 기능 | 설명 |
|---|---|
| **Multi-AZ with Auto Failover** | 프라이머리 장애 시 레플리카 자동 승격 |
| **Global Datastore** | 리전 간 복제 (Redis/Valkey 한정) |
| **Backup, Snapshot** | S3로 자동 백업, 특정 시점 복구 |
| **In-transit / At-rest Encryption** | TLS, KMS 연동 |
| **ElastiCache Serverless** | 사용량 기반 자동 스케일, 99.99% 가용성 SLA(조건과 보상 범위는 아래 참조) |

### ElastiCache Serverless 주의점

부분 검증(2026-10-15): AWS의 배포 옵션과 SLA를 대조했다. Serverless는 여러 AZ에 데이터를 복제하며 99.99% 가용성 SLA를 제공한다. 이 수치를 애플리케이션 전체의 무중단이나 관측된 가동률로 해석하지 않는다. SLA는 월별 가동률과 적용 조건에 따른 서비스 크레딧 기준이며, 보상을 받으려면 AWS Support에 필요한 오류 기록 등과 함께 청구해야 한다. 자동 지급이나 데이터 무손실 보장을 뜻하지 않는다. 아래의 확장 한도와 원본 DB 우회 설계는 별도로 필요하다.

- **스토리지와 요청량 과금** — Serverless는 저장 데이터를 GB-hour로, 요청 처리를 ElastiCache Processing Unit(ECPU)으로 측정한다. 엔진별 최소 측정 스토리지가 있으므로 유휴 비용도 0으로 단정할 수 없다
- 비용 우위는 최소 저장량, 데이터 처리량, 노드 사용률과 엔진에 따라 달라지므로 예측 부하는 Serverless와 노드 기반 구성을 계산기로 비교한다. 트래픽 패턴이 예측 불가하거나 변동이 큰 워크로드에는 Serverless가 유리하다

### Serverless 확장 한도와 사전 준비

2026-10-14 AWS 공식 확장 가이드와 요금 문서 부분 대조 기준이다. 자동 확장도 허용 용량과 확장 속도의 경계를 가지므로, 급증하는 모든 요청을 즉시 처리한다고 가정하지 않는다.

| 설정 | 한도에 도달했을 때의 영향 |
|---|---|
| 데이터 저장량 최대값 | TTL이 있는 항목을 LRU 방식으로 축출하며, 축출 가능한 항목이 없으면 추가 데이터를 쓰는 요청에 OOM 오류 발생 |
| 초당 ECPU 최대값 | 사용량이 최대값을 넘으면 요청을 throttling |
| 저장량 또는 초당 ECPU 최소값 | 예상 급증을 위한 pre-scaling에 사용하며, 반영 뒤 실제 사용량이 적어도 설정한 최소량부터 과금 |

최소 용량을 높이는 변경은 반영에 최대 60분이 걸릴 수 있다. 예상 피크보다 최소 60분 앞서 설정하고 완료 이벤트를 확인한다. 최소 용량은 캐시 전체의 합산 규모를 대상으로 하므로 특정 키와 슬롯에 몰리는 부하까지 해소한다고 보지 않는다.

ECPU는 애플리케이션 API 호출 수가 아니다. 단순 GET/SET은 전송 KB를 기준으로 계산하며 명령당 최소 1 ECPU를 소비한다. CPU 소모가 큰 명령은 전송량뿐 아니라 CPU도 반영한다. API 한 번에 캐시 명령을 여러 번 실행하면 각 명령의 처리량을 함께 계산해야 한다.

운영 점검 제안: `BytesUsedForCache`와 `ElastiCacheProcessingUnits`에 최대값 도달 전 경보를 두고, 축출과 throttling 때 원본 DB로 몰릴 부하도 시험한다. 캐시의 처리량, API 지연과 실제 비용을 따로 측정한다. 이 절만 추가 대조했으므로 기존 문서 전체의 검증일은 유지한다.

## 클러스터, 노드 구조 (시험 관점)

node-based ElastiCache는 **Node**를 서비스 단위로 사용한다. Node는 인스턴스 타입에 따른 메모리와 endpoint를 가지며 AWS가 관리형 인프라 작업을 수행한다. Serverless는 이 node 구성을 사용자에게 추상화하므로 아래 구조와 동일하게 해석하지 않는다.

**Node-based Memcached**: `Cluster ↔ Node` 2계층. 노드를 여러 AZ에 분산할 수 있지만 노드 사이 복제와 replica 승격 방식의 failover는 지원하지 않는다. 용량은 노드 추가뿐 아니라 노드 유형 변경으로도 늘릴 수 있다. 2026-10-14 공식 가이드 기준으로 수직 확장은 Memcached 엔진 1.5 이상과 Auto Discovery 활성화가 필요하다. 기존 클러스터에도 적용할 수 있으며, 대상 클러스터에서 허용되는 노드 유형은 `ListAllowedNodeTypeModifications`로 확인한다.

**Redis / Valkey**: `Cluster → Shard → Node` 3계층. Shard = Primary 1 + Replica N. Cluster 모드 비활성 시 **Shard 1개**(복제만), 활성 시 **다수 Shard로 키스페이스 샤딩**. 복제본 → **Failover, Multi-AZ 지원**.

### Failover, HA 핵심

| 엔진 | Failover | Multi-AZ | 백업 |
|------|----------|----------|------|
| node-based Memcached | 불가 | 노드 분산만 | 없음 |
| node-based Redis/Valkey | **자동 승격** | 지원 | RDB 기반 백업과 스냅샷, S3 저장 |
| Serverless Memcached | 서비스가 가용성과 확장을 관리 | Serverless 배포 모델 | snapshot과 restore 지원 |

복제, 자동 장애 조치, 백업이 필요하면 Valkey 또는 Redis OSS를 선택한다. 어느 엔진이든 캐시를 유일한 원본 데이터 저장소로 두는지는 복구 요구와 데이터 손실 허용 범위를 따로 검토한다.

### Multi-AZ 장애 복구와 데이터 손실 경계

이 절은 2026-10-07 AWS 공식 문서 기준이다. Multi-AZ는 AZ 분산을, automatic failover는 장애 시 replica 승격을 다루지만, 현재 공식 설정 안내에서는 Multi-AZ 활성화가 자동 장애 조치를 함께 켠다. 각 shard에 primary와 다른 AZ의 replica가 최소 하나 필요하다. Automatic failover만 켠 구성은 AZ 분산을 보장하지 않는다.

Durability를 사용하지 않는 구성의 primary 장애에서는 복제 지연이 가장 작은 replica를 승격하고 대체 replica를 만든다. AZ 전체 장애라면 해당 AZ의 복구 전까지 대체 replica 생성이 지연될 수 있다. Primary endpoint의 DNS가 갱신돼도 기존 연결의 재연결 동작은 애플리케이션에서 확인해야 한다. 개별 replica endpoint를 직접 사용하는 클라이언트는 승격 후 읽기 대상 변경도 확인한다.

데이터 손실 범위는 내구성 설정에 따라 다르다.

| 구성 | 장애 조치 때 확인할 경계 |
|---|---|
| Durability를 사용하지 않는 비동기 복제 | replica로 전달되지 않은 쓰기가 유실될 수 있음 |
| Valkey 9.0+의 durability와 synchronous writes | 성공 응답 전에 Multi-AZ transactional log에 저장, primary 장애 조치 후에도 성공한 쓰기의 강한 일관성 유지 |
| Durability와 asynchronous writes | 로그 저장 전에 응답할 수 있어 장애 시 최대 10초의 승인된 쓰기가 유실될 수 있음 |

Synchronous writes 구성에서도 replica 읽기는 최종 일관성이므로 최신 쓰기의 즉시 조회를 보장하지 않는다. **Multi-AZ 활성화만으로 무손실을 단정하지 않는다.**

Durability는 지원 노드 유형의 Valkey 9.0 이상에서 cluster mode enabled와 Multi-AZ, shard당 replica 최소 하나를 요구한다. Serverless와 Global Datastore에는 적용되지 않는다. 클러스터 생성 때 활성화해야 하며 기존 비내구성 클러스터에 나중에 켤 수 없다. 활성화한 뒤 sync와 async 모드는 바꿀 수 있지만 durability 자체를 끌 수는 없다.

개발 또는 검증 환경의 `TestFailover`로 쓰기 중단, 클라이언트 복구와 오류 처리를 확인한다. 이 API는 장애 시 애플리케이션 동작을 시험하기 위한 기능이며 운영 장애를 해결하는 도구로 설계되지 않았다.

### Endpoint와 replica 읽기

2026-10-14 ElastiCache 사용자 가이드 기준이다. 노드가 여럿인 cluster mode disabled 구성은 endpoint가 세 가지다.

| Endpoint | 가리키는 대상 | 운영 포인트 |
|---|---|---|
| Primary | 항상 현재 primary 노드 | replica 승격 같은 변경에도 이름이 그대로라 쓰기에 사용 |
| Reader | replica 중 하나를 round robin으로 돌려주는 DNS 기록 | load balancer가 아니다. 연결을 replica에 고르게 나누지만 실제 분산은 연결을 언제 만들고 얼마나 재사용하는지가 정한다. replica 추가와 제거는 실시간으로 반영 |
| Node | 특정 노드 | replica를 더하거나 지우면 앱 설정도 바꿔야 함 |

cluster mode enabled는 configuration endpoint 하나로 shard별 primary와 read endpoint를 찾으므로 cluster를 지원하는 client가 필요하다. replica에서 읽는 cache-aside 앱은 replica가 응답하지 않을 때 그 읽기를 miss로 보고 원본 DB로 우회할지 정하고, 우회한 부하를 원본이 감당할 수 있는 범위로 제한한다([[Cache-Decision|캐시 장애 대비]]).

## 엔진 업그레이드와 클라이언트 복구

이 절은 2026-10-07 AWS 공식 문서로 확인한 **node-based Valkey와 Redis OSS**의 범위다. Serverless에 같은 노드 교체 절차를 적용하지 않는다. 다른 절 전체의 검증일을 갱신한 것은 아니다.

현재 공식 가이드는 shard마다 새 엔진의 노드를 만들고 기존 primary와 동기화한 뒤 새 노드를 primary로 승격한다고 설명한다. 나머지 새 노드가 새 primary와 동기화하면 기존 노드를 제거한다. 여러 shard의 작업은 병렬이지만 shard당 업그레이드 작업은 하나이며, primary failover는 전체 shard에서 하나씩 진행한다.

업그레이드는 기존 클라이언트 연결을 종료한다. 토폴로지에 기존 노드와 새 노드가 잠시 함께 보이고, 데이터를 적재 중인 새 replica로 연결하면 오류가 날 수 있다. 클라이언트의 재연결, 오류 재시도와 exponential backoff를 검증한다. 짧은 failover도 애플리케이션의 무중단을 보장하지 않는다.

| 조건 | 확인할 영향 |
|---|---|
| 단일 Redis OSS 클러스터 또는 Multi-AZ 비활성 | 업그레이드 중 primary가 요청을 처리하지 못할 수 있으며 스냅샷에 필요한 메모리 여유도 확인 |
| Multi-AZ 구성 | 쓰기 트래픽이 적은 시간에 수행하고 failover 중 쓰기 오류와 복구 확인 |
| 메이저 엔진 버전 변경 | 새 엔진과 호환되는 parameter group 선택 |
| 캐시를 유일한 데이터 원본으로 사용 | 데이터 보존은 성공적인 복제에 의존하므로 복구 계획을 별도로 검증 |

운영 점검에서는 읽기 성공과 쓰기 성공을 따로 측정한다. 재시도할 쓰기가 중복 실행돼도 안전한지, 캐시 실패 때 원본 DB로 몰리는 부하를 감당하는지도 확인한다. 이는 업그레이드 기능의 보장 사항이 아니라 애플리케이션의 검증 책임이다.

복구를 임의 버전의 제자리 downgrade로 가정하지 않는다. 현재 공식 가이드의 cross-engine rollback은 **Valkey 7.2에서 Redis OSS 7.1로** 한정하며 연결된 user와 user group의 엔진 유형은 `REDIS`여야 한다. 다른 버전의 복원 가능성과 전환 경로는 작업 전에 따로 확인한다.

## 비용, 사이징

- **인스턴스 타입**: 데이터 크기, eviction, CPU, 네트워크와 엔진 호환성을 측정해 선택한다. Graviton 계열의 가격 대비 성능도 워크로드에서 비교한다.
- **예약 메모리**: 노드 기반 Valkey와 Redis OSS는 parameter group의 `reserved-memory-percent`(기본 25%)만큼을 데이터가 아닌 용도로 남기고 나머지를 `maxmemory`로 쓴다. 예약분은 replica의 client output buffer, 단편화, fork한 bgsave의 copy-on-write에 쓰이며, AWS는 이 값을 낮추지 말라고 안내한다. forked bgsave나 full sync 중에는 메모리 사용량이 트래픽에 따라 두 배 이상이 될 수 있다. `FreeableMemory`가 모자라면 ElastiCache가 forkless 저장으로 바꾸는데, 메모리는 덜 쓰지만 큰 항목에서 client 지연을 늘릴 수 있어 그 지연이 문제면 예약분을 늘린다. 운영용 small 인스턴스는 30%, micro는 50%로 올리도록 권한다(2026-10-14 사용자 가이드 기준).
- **샤딩**: 단일 노드 메모리 한도(100GB+) 넘으면 Redis Cluster 모드로 샤딩
- **비용 지표**: 인스턴스 시간 + 데이터 전송 + 스냅샷 스토리지

## 출처

- [AWS, Amazon ElastiCache Service Level Agreement](https://aws.amazon.com/elasticache/sla/) — 2026-10-15 Serverless 월별 가동률과 서비스 크레딧 청구 조건 확인
- [ElastiCache Memcached 노드 기반 수직 확장의 지원 조건](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Scaling-self-designed.mem-heading.html)
- [ElastiCache Serverless 확장 한도와 pre-scaling](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Scaling-serverless.html)
- [ElastiCache 노드 기반 업그레이드 고려사항](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/VersionManagement-upgrade-considerations.html)
- [ElastiCache 엔진 업그레이드와 엔진 전환](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/VersionManagement.HowTo.html)
- [ElastiCache Multi-AZ와 자동 장애 조치](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/AutoFailover.html)
- [ElastiCache 내구성 구성의 일관성](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Durability.Consistency.html)
- [ElastiCache 내구성 지원 조건과 제한](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Durability.Limitations.html)
- [ElastiCache 배포 옵션](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/WhatIs.deployment.html)
- [ElastiCache 요금](https://aws.amazon.com/elasticache/pricing/)
- [ElastiCache 백업과 복원](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/backups.html)
- [ElastiCache 엔진 버전 고려사항](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/VersionManagementConsiderations.html)
- [ElastiCache 엔진 선택](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/SelectEngine.html)
- [ElastiCache 연결 endpoint 찾기](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Endpoints.html)
- [ElastiCache Valkey와 Redis OSS 예약 메모리 관리](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/redis-memory-management.html)

## 관련 문서

- [[ElastiCache|Amazon ElastiCache]]
- [[ElastiCache-Use-Cases|ElastiCache 주요 사용 사례]]
- [[ElastiCache-Caching-Strategy|ElastiCache 캐시 전략과 체크포인트]]
- [[Connection-Pool|Connection Pool]]
